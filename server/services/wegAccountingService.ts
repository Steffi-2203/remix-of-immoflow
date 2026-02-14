import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import { roundMoney } from "@shared/utils";
import { distributeWithRemainder, getReserveFundBalance } from "./wegSettlementService";
import crypto from "crypto";

export async function bookReserveInterest(
  propertyId: string,
  orgId: string,
  year: number,
  month: number,
  interestAmount: number,
  description: string
): Promise<typeof schema.wegReserveFund.$inferSelect> {
  const [entry] = await db
    .insert(schema.wegReserveFund)
    .values({
      organizationId: orgId,
      propertyId,
      year,
      month,
      amount: roundMoney(interestAmount).toString(),
      description: description || "Zinsen auf Rücklage",
      entryType: "zinsen",
    })
    .returning();

  return entry;
}

export async function withdrawFromReserve(
  propertyId: string,
  orgId: string,
  amount: number,
  description: string,
  voteId?: string,
  isEmergency?: boolean
): Promise<{
  entry: typeof schema.wegReserveFund.$inferSelect;
  updatedBalance: number;
}> {
  if (!isEmergency && !voteId) {
    throw new Error("Entnahme nur mit Beschluss möglich");
  }

  if (isEmergency && !description.startsWith("NOTFALL:")) {
    throw new Error(
      'Notfall-Entnahme erfordert Beschreibung mit Präfix "NOTFALL:"'
    );
  }

  const currentBalance = await getReserveFundBalance(propertyId, orgId);
  if (currentBalance < amount) {
    throw new Error(
      `Unzureichendes Guthaben. Verfügbar: ${currentBalance.toFixed(2)} EUR, angefordert: ${amount.toFixed(2)} EUR`
    );
  }

  const now = new Date();
  const [entry] = await db
    .insert(schema.wegReserveFund)
    .values({
      organizationId: orgId,
      propertyId,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      amount: (-roundMoney(amount)).toString(),
      description,
      entryType: "entnahme",
    })
    .returning();

  const updatedBalance = await getReserveFundBalance(propertyId, orgId);

  return { entry, updatedBalance };
}

export async function bookInsuranceClaim(
  propertyId: string,
  orgId: string,
  params: {
    totalDamage: number;
    insurancePayout: number;
    description: string;
    voteId?: string;
  }
): Promise<{
  entry: typeof schema.wegReserveFund.$inferSelect;
  remainderToDistribute: number;
  isFullyCovered: boolean;
}> {
  const { totalDamage, insurancePayout, description } = params;
  const now = new Date();

  const [entry] = await db
    .insert(schema.wegReserveFund)
    .values({
      organizationId: orgId,
      propertyId,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      amount: roundMoney(insurancePayout).toString(),
      description: `Versicherungsleistung: ${description}`,
      entryType: "versicherung",
    })
    .returning();

  const remainder = roundMoney(totalDamage - insurancePayout);
  const isFullyCovered = remainder <= 0;

  return {
    entry,
    remainderToDistribute: isFullyCovered ? 0 : remainder,
    isFullyCovered,
  };
}

export async function getReserveFundOverview(
  propertyId: string,
  orgId: string
): Promise<{
  currentBalance: number;
  entriesByYear: Record<number, typeof schema.wegReserveFund.$inferSelect[]>;
  interestEarned: number;
  totalWithdrawals: number;
  sonderumlagenTotal: number;
}> {
  const entries = await db
    .select()
    .from(schema.wegReserveFund)
    .where(
      and(
        eq(schema.wegReserveFund.propertyId, propertyId),
        eq(schema.wegReserveFund.organizationId, orgId)
      )
    );

  const currentBalance = entries.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );

  const entriesByYear: Record<
    number,
    typeof schema.wegReserveFund.$inferSelect[]
  > = {};
  let interestEarned = 0;
  let totalWithdrawals = 0;

  for (const entry of entries) {
    const y = entry.year;
    if (!entriesByYear[y]) entriesByYear[y] = [];
    entriesByYear[y].push(entry);

    if (entry.entryType === "zinsen") {
      interestEarned += Number(entry.amount) || 0;
    }
    if (entry.entryType === "entnahme") {
      totalWithdrawals += Math.abs(Number(entry.amount) || 0);
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

  const sonderumlagenTotal = specialAssessments.reduce(
    (sum, sa) => sum + (Number(sa.totalAmount) || 0),
    0
  );

  return {
    currentBalance: roundMoney(currentBalance),
    entriesByYear,
    interestEarned: roundMoney(interestEarned),
    totalWithdrawals: roundMoney(totalWithdrawals),
    sonderumlagenTotal: roundMoney(sonderumlagenTotal),
  };
}

export async function createSpecialAssessmentInvoices(
  assessmentId: string,
  orgId: string
): Promise<{
  created: typeof schema.wegVorschreibungen.$inferSelect[];
  reserveEntry?: typeof schema.wegReserveFund.$inferSelect;
}> {
  const [assessment] = await db
    .select()
    .from(schema.wegSpecialAssessments)
    .where(
      and(
        eq(schema.wegSpecialAssessments.id, assessmentId),
        eq(schema.wegSpecialAssessments.organizationId, orgId)
      )
    );

  if (!assessment) {
    throw new Error("Sonderumlage nicht gefunden");
  }

  const unitOwners = await db
    .select()
    .from(schema.wegUnitOwners)
    .where(
      and(
        eq(schema.wegUnitOwners.propertyId, assessment.propertyId),
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
    throw new Error("Gesamt-MEA ist 0");
  }

  const totalAmount = Number(assessment.totalAmount) || 0;
  const shares = unitOwners.map((uo) => ({
    id: uo.id,
    ratio: (Number(uo.meaShare) || 0) / totalMea,
  }));

  const distributed = distributeWithRemainder(totalAmount, shares);

  const now = new Date();
  const runId = crypto.randomUUID();

  const created: typeof schema.wegVorschreibungen.$inferSelect[] = [];

  await db.transaction(async (tx) => {
    for (const dist of distributed) {
      const uo = unitOwners.find((u) => u.id === dist.id);
      if (!uo) continue;

      const [vorschreibung] = await tx
        .insert(schema.wegVorschreibungen)
        .values({
          organizationId: orgId,
          propertyId: assessment.propertyId,
          unitId: uo.unitId,
          ownerId: uo.ownerId,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          meaShare: String(uo.meaShare),
          betriebskosten: "0",
          ruecklage: dist.amount.toString(),
          instandhaltung: "0",
          verwaltungshonorar: "0",
          heizung: "0",
          ust: "0",
          gesamtbetrag: dist.amount.toString(),
          status: "offen",
          faelligAm: assessment.dueDate || undefined,
          runId,
        })
        .returning();

      created.push(vorschreibung);
    }

    const isForReserve =
      (assessment.title || "").toLowerCase().includes("rücklage") ||
      (assessment.title || "").toLowerCase().includes("ruecklage") ||
      (assessment.description || "").toLowerCase().includes("rücklage");

    if (isForReserve) {
      await tx.insert(schema.wegReserveFund).values({
        organizationId: orgId,
        propertyId: assessment.propertyId,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        amount: totalAmount.toString(),
        description: `Sonderumlage: ${assessment.title}`,
        entryType: "einzahlung",
      });
    }
  });

  return { created };
}
