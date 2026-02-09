import { db } from "../db";
import { expenses, units, tenants, properties, monthlyInvoices } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { roundMoney } from "@shared/utils";
import { SettlementService } from "./settlementService";

/**
 * BK-Abrechnung facade for integration testing and API usage.
 * Delegates heavy lifting to SettlementService.
 */

interface BKAbrechnungParams {
  propertyId: string;
  year: number;
  organizationId: string;
}

interface BKAbrechnungItem {
  tenantId: string;
  tenantName: string;
  unitId: string;
  anteil: number;        // share ratio
  sollBetrag: number;    // allocated cost
  istBetrag: number;     // prepayments made
  differenz: number;     // Nachzahlung (+) / Gutschrift (-)
}

interface BKAbrechnungResult {
  propertyId: string;
  year: number;
  total: number;
  totalUmlagefaehig: number;
  totalNichtUmlagefaehig: number;
  items: BKAbrechnungItem[];
}

const settlement = new SettlementService();

export class BKAbrechnungService {
  /**
   * Generate a BK-Abrechnung for a property and year.
   * Only umlagefähige expenses are distributed to tenants.
   */
  async generateBKAbrechnung(params: BKAbrechnungParams): Promise<BKAbrechnungResult> {
    const { propertyId, year, organizationId } = params;

    // Fetch all expenses for the property/year
    const allExpenses = await db.select().from(expenses)
      .where(and(eq(expenses.propertyId, propertyId), eq(expenses.year, year)));

    const totalAll = roundMoney(allExpenses.reduce((s, e) => s + Number(e.betrag || 0), 0));
    const umlagefaehig = allExpenses.filter(e => e.istUmlagefaehig);
    const totalUmlagefaehig = roundMoney(umlagefaehig.reduce((s, e) => s + Number(e.betrag || 0), 0));
    const totalNichtUmlagefaehig = roundMoney(totalAll - totalUmlagefaehig);

    // Fetch units for this property
    const propertyUnits = await db.select().from(units)
      .where(eq(units.propertyId, propertyId));

    const totalArea = propertyUnits.reduce((s, u) => s + Number(u.flaeche || 0), 0);

    // Fetch active tenants
    const items: BKAbrechnungItem[] = [];
    for (const unit of propertyUnits) {
      const unitTenants = await db.select().from(tenants)
        .where(and(eq(tenants.unitId, unit.id), eq(tenants.status, 'aktiv')));

      for (const tenant of unitTenants) {
        const unitArea = Number(unit.flaeche || 0);
        const anteil = totalArea > 0 ? roundMoney(unitArea / totalArea) : 0;
        const sollBetrag = roundMoney(totalUmlagefaehig * (unitArea / (totalArea || 1)));

        // Prepayments from monthly invoices
        const istBetrag = await settlement.getTenantPrepayments(tenant.id, year);
        const differenz = roundMoney(sollBetrag - istBetrag);

        items.push({
          tenantId: tenant.id,
          tenantName: `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim(),
          unitId: unit.id,
          anteil,
          sollBetrag,
          istBetrag,
          differenz,
        });
      }
    }

    return {
      propertyId,
      year,
      total: totalUmlagefaehig,
      totalUmlagefaehig,
      totalNichtUmlagefaehig,
      items,
    };
  }
}

export const bkAbrechnungService = new BKAbrechnungService();
