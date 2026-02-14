import { db } from "../db";
import { eq, and, inArray, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import { roundMoney } from "@shared/utils";

interface OwnerSettlementResult {
  ownerId: string;
  ownerName: string;
  unitId: string;
  unitTop: string;
  meaShare: number;
  meaRatio: number;
  categories: CategoryAllocation[];
  totalSoll: number;
  totalIst: number;
  saldo: number;
  ruecklageAnteil: number;
  sonderumlagen: number;
}

interface CategoryAllocation {
  category: string;
  label: string;
  totalCost: number;
  ownerShare: number;
  allocationKey: string;
}

interface WegSettlementSummary {
  propertyId: string;
  propertyName: string;
  year: number;
  totalExpenses: number;
  totalPrepayments: number;
  totalDifference: number;
  ownerCount: number;
  totalMea: number;
  reserveFundBalance: number;
}

export function distributeWithRemainder(
  totalAmount: number,
  shares: { id: string; ratio: number }[]
): { id: string; amount: number }[] {
  if (shares.length === 0) return [];

  const results = shares.map((s) => ({
    id: s.id,
    amount: roundMoney(totalAmount * s.ratio),
    ratio: s.ratio,
  }));

  const sumOfRounded = results.reduce((sum, r) => sum + r.amount, 0);
  const remainder = roundMoney(totalAmount - sumOfRounded);

  if (remainder !== 0) {
    let maxIdx = 0;
    for (let i = 1; i < results.length; i++) {
      if (results[i].ratio > results[maxIdx].ratio) {
        maxIdx = i;
      }
    }
    results[maxIdx].amount = roundMoney(results[maxIdx].amount + remainder);
  }

  return results.map(({ id, amount }) => ({ id, amount }));
}

export async function getReserveFundBalance(
  propertyId: string,
  orgId: string
): Promise<number> {
  const entries = await db
    .select()
    .from(schema.wegReserveFund)
    .where(
      and(
        eq(schema.wegReserveFund.propertyId, propertyId),
        eq(schema.wegReserveFund.organizationId, orgId)
      )
    );

  const balance = entries.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );
  return roundMoney(balance);
}

export async function getOwnerPrepayments(
  ownerId: string,
  unitId: string,
  year: number
): Promise<number> {
  const vorschreibungen = await db
    .select()
    .from(schema.wegVorschreibungen)
    .where(
      and(
        eq(schema.wegVorschreibungen.ownerId, ownerId),
        eq(schema.wegVorschreibungen.unitId, unitId),
        eq(schema.wegVorschreibungen.year, year)
      )
    );

  const total = vorschreibungen
    .filter((v) => v.status === "bezahlt" || v.status === "teilbezahlt")
    .reduce((sum, v) => sum + (Number(v.gesamtbetrag) || 0), 0);

  return roundMoney(total);
}

export async function calculateOwnerSettlement(
  propertyId: string,
  year: number,
  orgId: string
): Promise<{
  ownerResults: OwnerSettlementResult[];
  summary: WegSettlementSummary;
}> {
  const propertyExpenses = await db
    .select()
    .from(schema.expenses)
    .where(
      and(
        eq(schema.expenses.propertyId, propertyId),
        eq(schema.expenses.year, year),
        eq(schema.expenses.istUmlagefaehig, true)
      )
    );

  const unitOwners = await db
    .select()
    .from(schema.wegUnitOwners)
    .where(
      and(
        eq(schema.wegUnitOwners.propertyId, propertyId),
        eq(schema.wegUnitOwners.organizationId, orgId)
      )
    );

  if (unitOwners.length === 0) {
    throw new Error("Keine Eigentümer für diese Liegenschaft hinterlegt");
  }

  const totalMea = unitOwners.reduce(
    (s, uo) => s + (Number(uo.meaShare) || 0),
    0
  );
  if (totalMea <= 0) {
    throw new Error("Gesamt-MEA ist 0, bitte Anteile pflegen");
  }

  const unitIds = [...new Set(unitOwners.map((uo) => uo.unitId))];
  const unitsData =
    unitIds.length > 0
      ? await db
          .select()
          .from(schema.units)
          .where(inArray(schema.units.id, unitIds))
      : [];

  const ownerIds = [...new Set(unitOwners.map((uo) => uo.ownerId))];
  const ownersData =
    ownerIds.length > 0
      ? await db
          .select()
          .from(schema.owners)
          .where(inArray(schema.owners.id, ownerIds))
      : [];

  const budgetLines = await db
    .select()
    .from(schema.wegBudgetLines)
    .innerJoin(
      schema.wegBudgetPlans,
      eq(schema.wegBudgetLines.budgetPlanId, schema.wegBudgetPlans.id)
    )
    .where(
      and(
        eq(schema.wegBudgetPlans.propertyId, propertyId),
        eq(schema.wegBudgetPlans.year, year),
        eq(schema.wegBudgetPlans.organizationId, orgId)
      )
    );

  const allocationKeyMap = new Map<string, string>();
  for (const bl of budgetLines) {
    const cat = (bl.weg_budget_lines.category || "").toLowerCase();
    const key = bl.weg_budget_lines.allocationKey || "mea";
    allocationKeyMap.set(cat, key);
  }

  const expensesByCategory = new Map<
    string,
    { totalCost: number; label: string }
  >();
  let totalExpenses = 0;

  for (const expense of propertyExpenses) {
    const amount = Number(expense.betrag) || 0;
    totalExpenses += amount;
    const category =
      expense.expenseType || expense.mrgKategorie || expense.category || "sonstiges";
    const existing = expensesByCategory.get(category);
    if (existing) {
      existing.totalCost += amount;
    } else {
      expensesByCategory.set(category, { totalCost: amount, label: category });
    }
  }
  totalExpenses = roundMoney(totalExpenses);

  const totalNutzflaeche = unitsData.reduce(
    (s, u) => s + (Number(u.flaeche) || 0),
    0
  );
  const totalUnits = unitOwners.length;

  const ownerMap = new Map<
    string,
    {
      ownerId: string;
      unitId: string;
      meaShare: number;
      categories: CategoryAllocation[];
      totalSoll: number;
      ruecklageAnteil: number;
    }
  >();

  for (const uo of unitOwners) {
    const key = `${uo.ownerId}_${uo.unitId}`;
    if (!ownerMap.has(key)) {
      ownerMap.set(key, {
        ownerId: uo.ownerId,
        unitId: uo.unitId,
        meaShare: Number(uo.meaShare) || 0,
        categories: [],
        totalSoll: 0,
        ruecklageAnteil: 0,
      });
    }
  }

  for (const [category, { totalCost, label }] of expensesByCategory) {
    const catLower = category.toLowerCase();
    const allocKey = allocationKeyMap.get(catLower) || "mea";
    const roundedTotal = roundMoney(totalCost);

    let shares: { id: string; ratio: number }[] = [];

    if (allocKey === "nutzflaeche" && totalNutzflaeche > 0) {
      for (const [key, ownerData] of ownerMap) {
        const unit = unitsData.find((u) => u.id === ownerData.unitId);
        const unitArea = Number(unit?.flaeche) || 0;
        shares.push({ id: key, ratio: unitArea / totalNutzflaeche });
      }
    } else if (allocKey === "einheiten" && totalUnits > 0) {
      for (const [key] of ownerMap) {
        shares.push({ id: key, ratio: 1 / totalUnits });
      }
    } else {
      for (const [key, ownerData] of ownerMap) {
        shares.push({ id: key, ratio: ownerData.meaShare / totalMea });
      }
    }

    const distributed = distributeWithRemainder(roundedTotal, shares);

    for (const dist of distributed) {
      const ownerData = ownerMap.get(dist.id);
      if (!ownerData) continue;

      const allocationLabel =
        allocKey === "nutzflaeche"
          ? "Nutzfläche"
          : allocKey === "einheiten"
            ? "Einheiten"
            : "MEA";

      ownerData.categories.push({
        category,
        label,
        totalCost: roundedTotal,
        ownerShare: dist.amount,
        allocationKey: allocationLabel,
      });
      ownerData.totalSoll += dist.amount;

      const isReserve =
        catLower.includes("rücklage") ||
        catLower.includes("ruecklage") ||
        catLower.includes("rucklage");
      if (isReserve) {
        ownerData.ruecklageAnteil += dist.amount;
      }
    }
  }

  const specialAssessments = await db
    .select()
    .from(schema.wegSpecialAssessments)
    .where(
      and(
        eq(schema.wegSpecialAssessments.propertyId, propertyId),
        eq(schema.wegSpecialAssessments.organizationId, orgId)
      )
    );

  const yearAssessments = specialAssessments.filter(
    (sa) =>
      sa.createdAt &&
      new Date(sa.createdAt).getFullYear() === year &&
      sa.status === "beschlossen"
  );

  const sonderumlagenByOwner = new Map<string, number>();
  for (const sa of yearAssessments) {
    const saAmount = Number(sa.totalAmount) || 0;
    const shares: { id: string; ratio: number }[] = [];
    for (const [key, ownerData] of ownerMap) {
      shares.push({ id: key, ratio: ownerData.meaShare / totalMea });
    }
    const distributed = distributeWithRemainder(saAmount, shares);
    for (const dist of distributed) {
      const current = sonderumlagenByOwner.get(dist.id) || 0;
      sonderumlagenByOwner.set(dist.id, current + dist.amount);
    }
  }

  const [property] = await db
    .select()
    .from(schema.properties)
    .where(eq(schema.properties.id, propertyId))
    .limit(1);

  const reserveFundBalance = await getReserveFundBalance(propertyId, orgId);

  const ownerResults: OwnerSettlementResult[] = [];

  for (const [key, ownerData] of ownerMap) {
    const owner = ownersData.find((o) => o.id === ownerData.ownerId);
    const unit = unitsData.find((u) => u.id === ownerData.unitId);

    const prepayments = await getOwnerPrepayments(
      ownerData.ownerId,
      ownerData.unitId,
      year
    );

    const totalSoll = roundMoney(ownerData.totalSoll);
    const saldo = roundMoney(totalSoll - prepayments);
    const sonderumlagen = roundMoney(sonderumlagenByOwner.get(key) || 0);

    ownerResults.push({
      ownerId: ownerData.ownerId,
      ownerName: owner
        ? `${owner.firstName} ${owner.lastName}`
        : "Unbekannt",
      unitId: ownerData.unitId,
      unitTop: unit?.topNummer || "?",
      meaShare: ownerData.meaShare,
      meaRatio: ownerData.meaShare / totalMea,
      categories: ownerData.categories,
      totalSoll,
      totalIst: prepayments,
      saldo,
      ruecklageAnteil: roundMoney(ownerData.ruecklageAnteil),
      sonderumlagen,
    });
  }

  const totalPrepayments = roundMoney(
    ownerResults.reduce((s, r) => s + r.totalIst, 0)
  );
  const totalDifference = roundMoney(
    ownerResults.reduce((s, r) => s + r.saldo, 0)
  );

  return {
    ownerResults,
    summary: {
      propertyId,
      propertyName: property?.name || "",
      year,
      totalExpenses,
      totalPrepayments,
      totalDifference,
      ownerCount: ownerResults.length,
      totalMea,
      reserveFundBalance,
    },
  };
}

export async function createWegSettlement(
  propertyId: string,
  year: number,
  orgId: string,
  createdBy: string
): Promise<{
  settlement: typeof schema.wegSettlements.$inferSelect;
  ownerResults: OwnerSettlementResult[];
  summary: WegSettlementSummary;
}> {
  const { ownerResults, summary } = await calculateOwnerSettlement(
    propertyId,
    year,
    orgId
  );

  const [settlement] = await db.transaction(async (tx) => {
    const [newSettlement] = await tx
      .insert(schema.wegSettlements)
      .values({
        organizationId: orgId,
        propertyId,
        year,
        totalExpenses: summary.totalExpenses.toString(),
        totalPrepayments: summary.totalPrepayments.toString(),
        totalDifference: summary.totalDifference.toString(),
        ownerCount: summary.ownerCount,
        totalMea: summary.totalMea.toString(),
        reserveFundBalance: summary.reserveFundBalance.toString(),
        status: "berechnet",
        createdBy,
      })
      .returning();

    for (const result of ownerResults) {
      await tx.insert(schema.wegSettlementDetails).values({
        settlementId: newSettlement.id,
        ownerId: result.ownerId,
        unitId: result.unitId,
        meaShare: result.meaShare.toString(),
        meaRatio: result.meaRatio.toString(),
        totalSoll: result.totalSoll.toString(),
        totalIst: result.totalIst.toString(),
        saldo: result.saldo.toString(),
        ruecklageAnteil: result.ruecklageAnteil.toString(),
        sonderumlagen: result.sonderumlagen.toString(),
        categoryDetails: result.categories,
      });
    }

    return [newSettlement];
  });

  return { settlement, ownerResults, summary };
}
