import { db } from "../db";
import { 
  settlements, 
  settlementDetails,
  expenseAllocations,
  expenses,
  tenants,
  units,
  monthlyInvoices,
  distributionKeys,
  unitDistributionValues
} from "@shared/schema";
import { waterReadings } from "../db/models/water_readings";
import { eq, and, inArray, between, sql } from "drizzle-orm";
import { writeAudit } from "../lib/auditLog";
import { roundMoney } from "@shared/utils";

interface TenantSettlementResult {
  tenantId: string;
  tenantName: string;
  unitId: string;
  unitName: string;
  anteil: number;
  sollBetrag: number;
  istBetrag: number;
  differenz: number;
  details: SettlementDetailItem[];
}

interface SettlementDetailItem {
  category: string;
  description: string;
  totalCost: number;
  tenantShare: number;
  distributionKey: string;
}

interface CreateSettlementParams {
  propertyId: string;
  year: number;
  organizationId: string;
  createdBy: string;
}

interface SettlementSummary {
  propertyId: string;
  year: number;
  totalExpenses: number;
  totalPrepayments: number;
  totalDifference: number;
  tenantCount: number;
  unitCount: number;
}

export class SettlementService {
  /**
   * Calculate consumption-based water cost shares for a property/year.
   * Uses water_readings with coefficient, falls back to equal distribution.
   */
  async calculateWaterCostShares(
    propertyId: string,
    year: number,
    totalWaterCost: number,
    propertyUnits: Array<typeof units.$inferSelect>
  ): Promise<Map<string, { share: number; provisional: boolean }>> {
    const result = new Map<string, { share: number; provisional: boolean }>();
    const periodStart = `${year}-01-01`;
    const periodEnd = `${year}-12-31`;
    const unitIds = propertyUnits.map(u => u.id);

    if (unitIds.length === 0) return result;

    // Fetch weighted consumption per unit
    const readings = await db
      .select({
        unitId: waterReadings.unitId,
        weightedTotal: sql<number>`SUM(${waterReadings.consumption} * ${waterReadings.coefficient})`,
      })
      .from(waterReadings)
      .where(
        and(
          inArray(waterReadings.unitId, unitIds),
          between(waterReadings.readingDate, periodStart, periodEnd)
        )
      )
      .groupBy(waterReadings.unitId);

    const buildingTotal = readings.reduce((sum, r) => sum + Number(r.weightedTotal || 0), 0);

    if (buildingTotal > 0) {
      for (const r of readings) {
        const unitTotal = Number(r.weightedTotal || 0);
        const share = roundMoney((unitTotal / buildingTotal) * totalWaterCost);
        result.set(r.unitId, { share, provisional: false });
      }
    } else {
      // Fallback: equal distribution
      const perUnit = roundMoney(totalWaterCost / unitIds.length);
      for (const uid of unitIds) {
        result.set(uid, { share: perUnit, provisional: true });
      }
    }

    return result;
  }

  async calculatePropertyExpenses(propertyId: string, year: number): Promise<{
    totalExpenses: number;
    byCategory: Map<string, number>;
    byDistributionKey: Map<string, { amount: number; keyId: string | null }[]>;
    expenses: Array<typeof expenses.$inferSelect>;
  }> {
    const propertyExpenses = await db.select()
      .from(expenses)
      .where(and(
        eq(expenses.propertyId, propertyId),
        eq(expenses.year, year),
        eq(expenses.istUmlagefaehig, true)
      ));

    const byCategory = new Map<string, number>();
    const byDistributionKey = new Map<string, { amount: number; keyId: string | null }[]>();
    let totalExpenses = 0;

    for (const expense of propertyExpenses) {
      const amount = Number(expense.betrag) || 0;
      totalExpenses += amount;
      
      const category = expense.mrgKategorie || expense.category || 'sonstige';
      byCategory.set(category, (byCategory.get(category) || 0) + amount);

      const keyId = expense.distributionKeyId || null;
      if (!byDistributionKey.has(category)) {
        byDistributionKey.set(category, []);
      }
      byDistributionKey.get(category)!.push({ amount, keyId });
    }

    return {
      totalExpenses: roundMoney(totalExpenses),
      byCategory,
      byDistributionKey,
      expenses: propertyExpenses
    };
  }

  async getTenantPrepayments(tenantId: string, year: number): Promise<number> {
    const yearInvoices = await db.select()
      .from(monthlyInvoices)
      .where(and(
        eq(monthlyInvoices.tenantId, tenantId),
        eq(monthlyInvoices.year, year)
      ));

    const totalPrepayments = yearInvoices.reduce((sum, inv) => {
      return sum + Number(inv.betriebskosten || 0) + Number(inv.heizungskosten || 0);
    }, 0);

    return roundMoney(totalPrepayments);
  }

  async getDistributionValue(
    unitId: string,
    keyId: string,
    propertyUnits: Array<typeof units.$inferSelect>
  ): Promise<{ unitValue: number; totalValue: number }> {
    const unitDistValues = await db.select()
      .from(unitDistributionValues)
      .where(eq(unitDistributionValues.keyId, keyId));

    const unitDistValue = unitDistValues.find(v => v.unitId === unitId);
    const unitValue = unitDistValue ? Number(unitDistValue.value) || 0 : 0;
    const totalValue = unitDistValues.reduce((sum, v) => sum + (Number(v.value) || 0), 0);

    if (totalValue === 0) {
      const unit = propertyUnits.find(u => u.id === unitId);
      const unitSize = Number(unit?.flaeche) || 1;
      const totalSize = propertyUnits.reduce((sum, u) => sum + (Number(u.flaeche) || 1), 0);
      return { unitValue: unitSize, totalValue: totalSize };
    }

    return { unitValue, totalValue };
  }

  async calculateTenantSettlement(
    tenantId: string,
    propertyId: string,
    year: number,
    propertyUnits: Array<typeof units.$inferSelect>,
    expensesByCategory: Map<string, number>,
    byDistributionKey: Map<string, { amount: number; keyId: string | null }[]>,
    organizationId: string
  ): Promise<TenantSettlementResult | null> {
    const tenant = await db.select().from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    
    if (!tenant.length) return null;

    const unit = propertyUnits.find(u => u.id === tenant[0].unitId);
    if (!unit) return null;

    const prepayments = await this.getTenantPrepayments(tenantId, year);
    
    const details: SettlementDetailItem[] = [];
    let totalShare = 0;

    const allKeys = await db.select().from(distributionKeys)
      .where(eq(distributionKeys.isActive, true));
    const orgKeys = allKeys.filter(k => k.organizationId === organizationId || k.isSystem);
    const keyMap = new Map(allKeys.map(k => [k.id, k]));

    const unitFlaeche = Number(unit.flaeche) || 1;
    const totalFlaeche = propertyUnits.reduce((sum, u) => sum + (Number(u.flaeche) || 1), 0);
    const anteil = totalFlaeche > 0 ? (unitFlaeche / totalFlaeche) : 0;

    for (const [category, categoryExpenses] of byDistributionKey) {
      const totalCost = expensesByCategory.get(category) || 0;
      let categoryShare = 0;
      
      for (const exp of categoryExpenses) {
        let key = exp.keyId ? keyMap.get(exp.keyId) : null;
        if (!key) {
          key = orgKeys.find(k => k.keyCode === category) || 
                orgKeys.find(k => k.inputType === 'flaeche') ||
                orgKeys[0];
        }
        
        const { unitValue, totalValue } = await this.getDistributionValue(
          unit.id, 
          key?.id || '', 
          propertyUnits
        );

        const share = totalValue > 0 ? roundMoney(exp.amount * unitValue / totalValue) : 0;
        categoryShare = roundMoney(categoryShare + share);
      }
      
      totalShare = roundMoney(totalShare + categoryShare);
      
      const primaryKey = categoryExpenses.find(e => e.keyId)?.keyId;
      const keyName = primaryKey ? keyMap.get(primaryKey)?.name : 
                      orgKeys.find(k => k.keyCode === category)?.name || 'Fläche';

      details.push({
        category,
        description: `Anteil an ${category}`,
        totalCost: roundMoney(totalCost),
        tenantShare: roundMoney(categoryShare),
        distributionKey: keyName || 'Fläche'
      });
    }

    return {
      tenantId,
      tenantName: `${tenant[0].firstName} ${tenant[0].lastName}`,
      unitId: unit.id,
      unitName: unit.topNummer || `Einheit`,
      anteil: Math.round(anteil * 10000) / 10000,
      sollBetrag: roundMoney(totalShare),
      istBetrag: prepayments,
      differenz: roundMoney(prepayments - totalShare),
      details
    };
  }

  async createSettlement(params: CreateSettlementParams): Promise<{
    settlement: typeof settlements.$inferSelect;
    tenantResults: TenantSettlementResult[];
    summary: SettlementSummary;
  }> {
    const { propertyId, year, organizationId, createdBy } = params;

    const { totalExpenses, byCategory, byDistributionKey } = 
      await this.calculatePropertyExpenses(propertyId, year);

    const propertyUnits = await db.select().from(units)
      .where(eq(units.propertyId, propertyId));

    const unitIds = propertyUnits.map(u => u.id);
    const propertyTenants = await db.select().from(tenants)
      .where(inArray(tenants.unitId, unitIds));

    // Parallel tenant settlement calculation (Promise.all statt sequenziell)
    const settlementPromises = propertyTenants.map(tenant =>
      this.calculateTenantSettlement(
        tenant.id,
        propertyId,
        year,
        propertyUnits,
        byCategory,
        byDistributionKey,
        organizationId
      )
    );
    const settlementResults = await Promise.all(settlementPromises);
    const tenantResults = settlementResults.filter((r): r is TenantSettlementResult => r !== null);

    const totalPrepayments = tenantResults.reduce((sum, r) => sum + r.istBetrag, 0);
    const totalDifference = tenantResults.reduce((sum, r) => sum + r.differenz, 0);

    const { expenses: propertyExpenses } = await db.select()
      .from(expenses)
      .where(and(
        eq(expenses.propertyId, propertyId),
        eq(expenses.year, year),
        eq(expenses.istUmlagefaehig, true)
      ))
      .then(result => ({ expenses: result }));
    
    const [settlement] = await db.transaction(async (tx) => {
      const [newSettlement] = await tx.insert(settlements).values({
        propertyId,
        year,
        status: 'entwurf',
        gesamtausgaben: totalExpenses.toString(),
        gesamtvorschuss: totalPrepayments.toString(),
        differenz: totalDifference.toString(),
        berechnungsDatum: new Date(),
        createdBy,
      }).returning();

      for (const result of tenantResults) {
        const [detail] = await tx.insert(settlementDetails).values({
          settlementId: newSettlement.id,
          tenantId: result.tenantId,
          unitId: result.unitId,
          anteil: result.anteil.toString(),
          ausgabenAnteil: result.sollBetrag.toString(),
          vorschuss: result.istBetrag.toString(),
          differenz: result.differenz.toString(),
        }).returning();

        for (const d of result.details) {
          const matchingExpense = propertyExpenses.find(e => 
            (e.mrgKategorie || e.category) === d.category
          );
          
          if (matchingExpense) {
            await tx.insert(expenseAllocations).values({
              expenseId: matchingExpense.id,
              unitId: result.unitId,
              allocatedNet: d.tenantShare.toString(),
              allocationBasis: d.distributionKey,
              allocationDetail: JSON.stringify({
                settlementDetailId: detail.id,
                tenantId: result.tenantId,
                category: d.category,
                anteil: result.anteil,
                totalCost: d.totalCost,
              }),
            });
          }
        }
      }

      await writeAudit(tx, createdBy, 'settlements', newSettlement.id, 'create', null, {
        settlementId: newSettlement.id,
        propertyId,
        year,
        totalExpenses,
        totalPrepayments,
        totalDifference,
        tenantCount: tenantResults.length,
      });

      return [newSettlement];
    });

    return {
      settlement,
      tenantResults,
      summary: {
        propertyId,
        year,
        totalExpenses,
        totalPrepayments: roundMoney(totalPrepayments),
        totalDifference: roundMoney(totalDifference),
        tenantCount: tenantResults.length,
        unitCount: propertyUnits.length
      }
    };
  }

  async getSettlementPreview(propertyId: string, year: number): Promise<{
    expenses: typeof expenses.$inferSelect[];
    summary: {
      totalExpenses: number;
      byCategory: Record<string, number>;
      tenantCount: number;
    };
  }> {
    const { totalExpenses, byCategory, expenses: propertyExpenses } = 
      await this.calculatePropertyExpenses(propertyId, year);

    const propertyUnits = await db.select().from(units)
      .where(eq(units.propertyId, propertyId));

    const unitIds = propertyUnits.map(u => u.id);
    const propertyTenants = await db.select().from(tenants)
      .where(inArray(tenants.unitId, unitIds));

    return {
      expenses: propertyExpenses,
      summary: {
        totalExpenses,
        byCategory: Object.fromEntries(byCategory),
        tenantCount: propertyTenants.length
      }
    };
  }
}

export const settlementService = new SettlementService();
