import { db } from "../db";
import { 
  settlements, 
  settlementDetails,
  expenseAllocations,
  expenses,
  tenants,
  units,
  properties,
  monthlyInvoices,
  distributionKeys,
  unitDistributionValues
} from "@shared/schema";
import { waterReadings } from "../db/models/water_readings";
import { eq, and, inArray, between, sql } from "drizzle-orm";
import { writeAudit } from "../lib/auditLog";
import { logAuditEvent } from "../audit/auditEvents.service";
import { roundMoney } from "@shared/utils";
import { calculateProRataShares, calculateOccupancyDays, type OccupancyPeriod } from "./proRataCalculator";

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

  /**
   * Pre-load all distribution values for a property's units in one batch query
   * Call once before processing multiple tenants to avoid N+1 queries
   */
  async preloadDistributionValues(
    propertyUnits: Array<typeof units.$inferSelect>
  ): Promise<Map<string, Array<{ unitId: string; value: number }>>> {
    const unitIds = propertyUnits.map(u => u.id);
    if (unitIds.length === 0) return new Map();

    const allValues = await db.select()
      .from(unitDistributionValues)
      .where(inArray(unitDistributionValues.unitId, unitIds));

    const byKey = new Map<string, Array<{ unitId: string; value: number }>>();
    for (const v of allValues) {
      const keyId = v.keyId;
      if (!byKey.has(keyId)) byKey.set(keyId, []);
      byKey.get(keyId)!.push({ unitId: v.unitId, value: Number(v.value) || 0 });
    }
    return byKey;
  }

  getDistributionValueFromCache(
    unitId: string,
    keyId: string,
    propertyUnits: Array<typeof units.$inferSelect>,
    cache: Map<string, Array<{ unitId: string; value: number }>>
  ): { unitValue: number; totalValue: number } {
    const cached = cache.get(keyId);
    if (cached && cached.length > 0) {
      const unitDistValue = cached.find(v => v.unitId === unitId);
      const unitValue = unitDistValue?.value || 0;
      const totalValue = cached.reduce((sum, v) => sum + v.value, 0);

      if (totalValue > 0) {
        return { unitValue, totalValue };
      }
    }

    // Fallback to area-based distribution
    const unit = propertyUnits.find(u => u.id === unitId);
    const unitSize = Number(unit?.flaeche) || 1;
    const totalSize = propertyUnits.reduce((sum, u) => sum + (Number(u.flaeche) || 1), 0);
    return { unitValue: unitSize, totalValue: totalSize };
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
    organizationId: string,
    distCache?: Map<string, Array<{ unitId: string; value: number }>>
  ): Promise<TenantSettlementResult | null> {
    const tenant = await db.select({ t: tenants })
      .from(tenants)
      .innerJoin(units, eq(tenants.unitId, units.id))
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .where(and(eq(tenants.id, tenantId), eq(properties.organizationId, organizationId)))
      .limit(1)
      .then(r => r.map(row => row.t));
    
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
        
        // Use cached distribution values if available (avoids N+1 queries)
        const { unitValue, totalValue } = distCache
          ? this.getDistributionValueFromCache(unit.id, key?.id || '', propertyUnits, distCache)
          : await this.getDistributionValue(unit.id, key?.id || '', propertyUnits);

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

    // Pre-load ALL distribution values in one batch query (eliminates N+1)
    const distCache = await this.preloadDistributionValues(propertyUnits);

    const unitIds = propertyUnits.map(u => u.id);
    
    // Fetch ALL tenants (active + inactive) for pro-rata mid-year change handling
    const allPropertyTenants = await db.select().from(tenants)
      .where(inArray(tenants.unitId, unitIds));

    // Group tenants by unit to detect mid-year changes
    const tenantsByUnit = new Map<string, typeof allPropertyTenants>();
    for (const t of allPropertyTenants) {
      const uid = t.unitId || '';
      if (!tenantsByUnit.has(uid)) tenantsByUnit.set(uid, []);
      tenantsByUnit.get(uid)!.push(t);
    }

    // Build pro-rata occupancy periods per unit
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    // Calculate settlements with pro-rata for units with multiple tenants
    const settlementPromises: Promise<TenantSettlementResult | null>[] = [];

    for (const [unitId, unitTenants] of tenantsByUnit) {
      if (unitTenants.length > 1) {
        // Mid-year tenant change: calculate pro-rata for each tenant
        const periods: Array<{ tenantId: string; moveIn: Date; moveOut: Date | null }> = unitTenants.map(t => ({
          tenantId: t.id,
          moveIn: t.mietbeginn ? new Date(t.mietbeginn) : yearStart,
          moveOut: t.mietende ? new Date(t.mietende) : (t.status === 'aktiv' ? null : yearEnd),
        }));

        for (const t of unitTenants) {
          const days = calculateOccupancyDays(
            t.mietbeginn ? new Date(t.mietbeginn) : yearStart,
            t.mietende ? new Date(t.mietende) : (t.status === 'aktiv' ? null : yearEnd),
            yearStart, yearEnd
          );
          if (days > 0) {
            settlementPromises.push(
              this.calculateTenantSettlement(
                t.id, propertyId, year, propertyUnits,
                byCategory, byDistributionKey, organizationId, distCache
              )
            );
          }
        }
      } else {
        // Single tenant — standard calculation
        settlementPromises.push(
          this.calculateTenantSettlement(
            unitTenants[0].id, propertyId, year, propertyUnits,
            byCategory, byDistributionKey, organizationId, distCache
          )
        );
      }
    }

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

      await logAuditEvent(tx, {
        actor: createdBy,
        eventType: 'settlement_create',
        entity: 'settlements',
        entityId: newSettlement.id,
        operation: 'insert',
        new: {
          propertyId,
          year,
          totalExpenses,
          totalPrepayments,
          totalDifference,
          tenantCount: tenantResults.length,
        },
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
