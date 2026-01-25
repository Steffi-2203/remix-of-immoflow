import { db } from "../db";
import { 
  settlements, 
  settlementDetails,
  expenses,
  tenants,
  units,
  monthlyInvoices,
  distributionKeys,
  unitDistributionValues
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

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
  async calculatePropertyExpenses(propertyId: string, year: number): Promise<{
    totalExpenses: number;
    byCategory: Map<string, number>;
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
    let totalExpenses = 0;

    for (const expense of propertyExpenses) {
      const amount = Number(expense.betrag) || 0;
      totalExpenses += amount;
      
      const category = expense.mrgKategorie || expense.category || 'sonstige';
      byCategory.set(category, (byCategory.get(category) || 0) + amount);
    }

    return {
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      byCategory,
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

    return Math.round(totalPrepayments * 100) / 100;
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

    const keys = await db.select().from(distributionKeys)
      .where(eq(distributionKeys.organizationId, organizationId));

    const unitFlaeche = Number(unit.flaeche) || 1;
    const totalFlaeche = propertyUnits.reduce((sum, u) => sum + (Number(u.flaeche) || 1), 0);
    const anteil = totalFlaeche > 0 ? (unitFlaeche / totalFlaeche) : 0;

    for (const [category, totalCost] of expensesByCategory) {
      const key = keys.find(k => k.keyCode === category) || 
                  keys.find(k => k.inputType === 'flaeche') ||
                  keys[0];
      const keyName = key?.name || 'Fläche';
      
      const { unitValue, totalValue } = await this.getDistributionValue(
        unit.id, 
        key?.id || '', 
        propertyUnits
      );

      const share = totalValue > 0 ? (totalCost * unitValue / totalValue) : 0;
      totalShare += share;

      details.push({
        category,
        description: `Anteil an ${category}`,
        totalCost: Math.round(totalCost * 100) / 100,
        tenantShare: Math.round(share * 100) / 100,
        distributionKey: keyName
      });
    }

    return {
      tenantId,
      tenantName: `${tenant[0].firstName} ${tenant[0].lastName}`,
      unitId: unit.id,
      unitName: unit.topNummer || `Einheit`,
      anteil: Math.round(anteil * 10000) / 10000,
      sollBetrag: Math.round(totalShare * 100) / 100,
      istBetrag: prepayments,
      differenz: Math.round((prepayments - totalShare) * 100) / 100,
      details
    };
  }

  async createSettlement(params: CreateSettlementParams): Promise<{
    settlement: typeof settlements.$inferSelect;
    tenantResults: TenantSettlementResult[];
    summary: SettlementSummary;
  }> {
    const { propertyId, year, organizationId, createdBy } = params;

    const { totalExpenses, byCategory } = 
      await this.calculatePropertyExpenses(propertyId, year);

    const propertyUnits = await db.select().from(units)
      .where(eq(units.propertyId, propertyId));

    const unitIds = propertyUnits.map(u => u.id);
    const propertyTenants = await db.select().from(tenants)
      .where(inArray(tenants.unitId, unitIds));

    const tenantResults: TenantSettlementResult[] = [];

    for (const tenant of propertyTenants) {
      const result = await this.calculateTenantSettlement(
        tenant.id,
        propertyId,
        year,
        propertyUnits,
        byCategory,
        organizationId
      );
      if (result) {
        tenantResults.push(result);
      }
    }

    const totalPrepayments = tenantResults.reduce((sum, r) => sum + r.istBetrag, 0);
    const totalDifference = tenantResults.reduce((sum, r) => sum + r.differenz, 0);

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
        await tx.insert(settlementDetails).values({
          settlementId: newSettlement.id,
          tenantId: result.tenantId,
          unitId: result.unitId,
          anteil: result.anteil.toString(),
          ausgabenAnteil: result.sollBetrag.toString(),
          vorschuss: result.istBetrag.toString(),
          differenz: result.differenz.toString(),
        });
      }

      return [newSettlement];
    });

    return {
      settlement,
      tenantResults,
      summary: {
        propertyId,
        year,
        totalExpenses,
        totalPrepayments: Math.round(totalPrepayments * 100) / 100,
        totalDifference: Math.round(totalDifference * 100) / 100,
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
