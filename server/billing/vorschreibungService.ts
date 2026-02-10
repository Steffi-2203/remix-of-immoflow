import { db } from "../db";
import { tenants, units, properties, monthlyInvoices, invoiceLines } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { roundMoney } from "@shared/utils";
import { InvoiceService } from "./invoiceService";

/**
 * Vorschreibung facade – generates monthly rent prescriptions.
 * Wraps InvoiceService for a cleaner test/API surface.
 */

interface VorschreibungParams {
  tenantId: string;
  organizationId: string;
  year: number;
  month: number;
}

interface VorschreibungLine {
  lineType: string;
  description: string;
  netAmount: number;
  vatRate: number;
  grossAmount: number;
}

interface VorschreibungResult {
  tenantId: string;
  unitId: string | null;
  year: number;
  month: number;
  grundmiete: number;
  betriebskosten: number;
  heizungskosten: number;
  ust: number;
  gesamtbetrag: number;
  faelligAm: string;
  lines: VorschreibungLine[];
}

const invoiceSvc = new InvoiceService();

export class VorschreibungService {
  /**
   * Calculate a Vorschreibung (monthly prescription) for a tenant.
   */
  async generateVorschreibung(params: VorschreibungParams): Promise<VorschreibungResult | null> {
    const { tenantId, organizationId, year, month } = params;

    if (!organizationId) {
      throw new Error("organizationId is required for Vorschreibung generation.");
    }

    // Org-scoped tenant lookup via unit → property
    const result = await db.select({ tenant: tenants, unit: units })
      .from(tenants)
      .innerJoin(units, eq(tenants.unitId, units.id))
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .where(and(eq(tenants.id, tenantId), eq(properties.organizationId, organizationId)))
      .limit(1);

    const tenant = result[0]?.tenant;
    if (!tenant) return null;

    const unit = result[0]?.unit || null;

    const unitType = unit?.type || 'wohnung';
    const vatRates = invoiceSvc.getVatRates(unitType);

    const grundmiete = roundMoney(Number(tenant.grundmiete || 0));
    const bk = roundMoney(Number(tenant.betriebskostenVorschuss || 0));
    const hk = roundMoney(Number(tenant.heizkostenVorschuss || 0));

    const ustMiete = roundMoney(grundmiete * vatRates.ustSatzMiete / 100);
    const ustBk = roundMoney(bk * vatRates.ustSatzBk / 100);
    const ustHk = roundMoney(hk * vatRates.ustSatzHeizung / 100);
    const ust = roundMoney(ustMiete + ustBk + ustHk);

    const gesamtbetrag = roundMoney(grundmiete + bk + hk + ust);
    const faelligAm = `${year}-${String(month).padStart(2, '0')}-05`;

    const lines: VorschreibungLine[] = [];

    if (grundmiete > 0) {
      lines.push({
        lineType: 'grundmiete', description: 'Grundmiete',
        netAmount: grundmiete, vatRate: vatRates.ustSatzMiete,
        grossAmount: roundMoney(grundmiete + ustMiete),
      });
    }

    if (bk > 0) {
      lines.push({
        lineType: 'betriebskosten', description: 'BK-Vorschuss',
        netAmount: bk, vatRate: vatRates.ustSatzBk,
        grossAmount: roundMoney(bk + ustBk),
      });
    }

    if (hk > 0) {
      lines.push({
        lineType: 'heizungskosten', description: 'HK-Vorschuss',
        netAmount: hk, vatRate: vatRates.ustSatzHeizung,
        grossAmount: roundMoney(hk + ustHk),
      });
    }

    return {
      tenantId, unitId: tenant.unitId, year, month,
      grundmiete, betriebskosten: bk, heizungskosten: hk,
      ust, gesamtbetrag, faelligAm, lines,
    };
  }

  /**
   * Calculate pro-rata rent for mid-month move-in/out.
   */
  calculateProRata(fullAmount: number, daysInMonth: number, occupiedDays: number): number {
    return roundMoney(fullAmount * (occupiedDays / daysInMonth));
  }
}

export const vorschreibungService = new VorschreibungService();
