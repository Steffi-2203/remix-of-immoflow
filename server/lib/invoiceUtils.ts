import { db } from "../db";
import { monthlyInvoices, payments } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export interface CarryForward {
  vortrag_miete: number;
  vortrag_bk: number;
  vortrag_hk: number;
  vortrag_sonstige: number;
}

export const getVatRates = (unitType: string) => {
  const isCommercial = ['geschaeft', 'garage', 'stellplatz', 'lager'].includes(unitType);
  return {
    ust_satz_miete: isCommercial ? 20 : 10,
    ust_satz_bk: isCommercial ? 20 : 10,
    ust_satz_heizung: 20,
  };
};

export const calculateVatFromGross = (grossAmount: number, vatRate: number): number => {
  if (vatRate === 0) return 0;
  return grossAmount - (grossAmount / (1 + vatRate / 100));
};

export async function calculateTenantCarryForward(
  tenantId: string,
  year: number
): Promise<CarryForward> {
  const previousYear = year - 1;

  const prevYearInvoices = await db.select()
    .from(monthlyInvoices)
    .where(and(
      eq(monthlyInvoices.tenantId, tenantId),
      eq(monthlyInvoices.year, previousYear)
    ));

  const startDate = `${previousYear}-01-01`;
  const endDate = `${previousYear}-12-31`;

  const prevYearPayments = await db.select()
    .from(payments)
    .where(and(
      eq(payments.tenantId, tenantId),
      gte(payments.buchungsDatum, startDate),
      lte(payments.buchungsDatum, endDate)
    ));

  const sollMiete = prevYearInvoices.reduce((sum, inv) => sum + Number(inv.grundmiete || 0), 0);
  const sollBk = prevYearInvoices.reduce((sum, inv) => sum + Number(inv.betriebskosten || 0), 0);
  const sollHk = prevYearInvoices.reduce((sum, inv) => sum + Number(inv.heizungskosten || 0), 0);
  const sollGesamt = sollMiete + sollBk + sollHk;

  const istGesamt = prevYearPayments.reduce((sum, p) => sum + Number(p.betrag || 0), 0);

  const differenz = sollGesamt - istGesamt;

  if (differenz <= 0) {
    if (differenz < 0) {
      return { vortrag_miete: differenz, vortrag_bk: 0, vortrag_hk: 0, vortrag_sonstige: 0 };
    }
    return { vortrag_miete: 0, vortrag_bk: 0, vortrag_hk: 0, vortrag_sonstige: 0 };
  }

  let remaining = istGesamt;
  const paidBk = Math.min(remaining, sollBk);
  remaining -= paidBk;
  const paidHk = Math.min(remaining, sollHk);
  remaining -= paidHk;
  const paidMiete = Math.min(remaining, sollMiete);

  return {
    vortrag_miete: Math.round(Math.max(0, sollMiete - paidMiete) * 100) / 100,
    vortrag_bk: Math.round(Math.max(0, sollBk - paidBk) * 100) / 100,
    vortrag_hk: Math.round(Math.max(0, sollHk - paidHk) * 100) / 100,
    vortrag_sonstige: 0,
  };
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  property_manager: "Hausverwalter",
  finance: "Buchhalter",
  viewer: "Betrachter",
  tester: "Tester",
};

export const VALID_UST_RATES_AT = [0, 10, 13, 20];
export const VALID_UST_RATES_DE = [0, 7, 19];
export const ALL_VALID_RATES = [...new Set([...VALID_UST_RATES_AT, ...VALID_UST_RATES_DE])];

export function formatCurrency(amount: number): string {
  return `€ ${amount.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
