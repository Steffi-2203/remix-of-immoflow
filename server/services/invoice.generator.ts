import { db } from "../db";
import { roundMoney } from "@shared/utils";
import {
  monthlyInvoices,
  invoiceLines,
  distributionKeys,
  unitDistributionValues,
  expenses,
  tenants,
  units
} from "@shared/schema";
import {
  resolveVatProfile,
  DEFAULT_BILLING_RULES,
  renderDescription,
  type VatProfile,
  type BillingRules,
  type LineTypeConfig,
} from "../config/vatConfig";

export type { VatProfile as VatRates };

export type CarryForward = {
  vortragMiete: number;
  vortragBk: number;
  vortragHk: number;
  vortragSonstige: number;
  credit?: number;
};

export interface InvoiceData {
  tenantId: string;
  unitId: string | null;
  year: number;
  month: number;
  grundmiete: number;
  betriebskosten: number;
  heizungskosten: number;
  gesamtbetrag: number;
  ust: number;
  ustSatzMiete: number;
  ustSatzBk: number;
  ustSatzHeizung: number;
  status: "offen" | "teilbezahlt" | "bezahlt" | "ueberfaellig";
  faelligAm: string;
  vortragMiete: number;
  vortragBk: number;
  vortragHk: number;
  vortragSonstige: number;
  allocationDetail?: any;
}

export class InvoiceGenerator {
  private billingRules: BillingRules;

  constructor(rules?: Partial<BillingRules>) {
    this.billingRules = { ...DEFAULT_BILLING_RULES, ...rules };
  }

  getVatRates(unitType: string): VatProfile {
    return resolveVatProfile(unitType);
  }

  calculateVatFromGross(grossAmount: number, vatRate: number): number {
    if (!vatRate) return 0;
    return roundMoney(grossAmount - (grossAmount / (1 + vatRate / 100)));
  }

  buildInvoiceData(
    tenant: typeof tenants.$inferSelect,
    unitType: string,
    year: number,
    month: number,
    dueDate: string,
    carryForward: CarryForward
  ): InvoiceData {
    const vatRates = this.getVatRates(unitType);

    const grundmiete = roundMoney(Number(tenant.grundmiete) || 0);
    const betriebskosten = roundMoney(Number(tenant.betriebskostenVorschuss) || 0);
    const heizungskosten = roundMoney(Number(tenant.heizkostenVorschuss) || 0);

    const ustMiete = roundMoney(this.calculateVatFromGross(grundmiete, vatRates.ustSatzMiete));
    const ustBk = roundMoney(this.calculateVatFromGross(betriebskosten, vatRates.ustSatzBk));
    const ustHeizung = roundMoney(this.calculateVatFromGross(heizungskosten, vatRates.ustSatzHeizung));
    
    let sonstigeSum = 0;
    let ustSonstige = 0;
    const sonstigeKosten = tenant.sonstigeKosten as Record<string, { betrag: number; ust: number }> | null;
    if (sonstigeKosten && typeof sonstigeKosten === 'object') {
      for (const value of Object.values(sonstigeKosten)) {
        if (value && Number(value.betrag) > 0) {
          const betrag = roundMoney(Number(value.betrag));
          const ustRate = Number(value.ust) || 10;
          sonstigeSum += betrag;
          ustSonstige += roundMoney(this.calculateVatFromGross(betrag, ustRate));
        }
      }
    }
    
    const ust = roundMoney(ustMiete + ustBk + ustHeizung + ustSonstige);

    const vortragGesamt = roundMoney((carryForward.vortragMiete || 0) + (carryForward.vortragBk || 0) + (carryForward.vortragHk || 0) + (carryForward.vortragSonstige || 0));
    const gesamtbetrag = roundMoney(grundmiete + betriebskosten + heizungskosten + sonstigeSum + vortragGesamt);

    return {
      tenantId: tenant.id,
      unitId: tenant.unitId,
      year,
      month,
      grundmiete,
      betriebskosten,
      heizungskosten,
      gesamtbetrag,
      ust,
      ustSatzMiete: vatRates.ustSatzMiete,
      ustSatzBk: vatRates.ustSatzBk,
      ustSatzHeizung: vatRates.ustSatzHeizung,
      status: "offen",
      faelligAm: dueDate,
      vortragMiete: roundMoney(carryForward.vortragMiete || 0),
      vortragBk: roundMoney(carryForward.vortragBk || 0),
      vortragHk: roundMoney(carryForward.vortragHk || 0),
      vortragSonstige: roundMoney(carryForward.vortragSonstige || 0)
    };
  }

  buildInvoiceLines(
    invoiceId: string,
    tenant: typeof tenants.$inferSelect,
    vatRates: VatProfile,
    month: number,
    year: number,
    unitId?: string
  ): Array<{
    invoiceId: string;
    unitId?: string;
    lineType: string;
    description: string;
    amount: number;
    taxRate: number;
    meta?: Record<string, unknown>;
  }> {
    const lines: any[] = [];

    // Use configured line types instead of hardcoded ones
    for (const lineConfig of this.billingRules.lineTypes) {
      const rawAmount = Number((tenant as any)[lineConfig.tenantField]) || 0;
      const amount = roundMoney(rawAmount);
      if (amount > 0) {
        lines.push({
          invoiceId,
          unitId,
          lineType: lineConfig.key,
          description: renderDescription(lineConfig.descriptionTemplate, month, year),
          amount,
          taxRate: vatRates[lineConfig.vatKey],
          meta: { reference: lineConfig.reference },
        });
      }
    }

    // Dynamic sonstige Kosten (always kept flexible)
    const sonstigeKosten = tenant.sonstigeKosten as Record<string, { betrag: number; ust: number; schluessel?: string }> | null;
    if (sonstigeKosten && typeof sonstigeKosten === 'object') {
      const monthName = renderDescription('{monthName}', month, year);
      for (const [key, value] of Object.entries(sonstigeKosten)) {
        if (value && Number(value.betrag) > 0) {
          const betrag = roundMoney(Number(value.betrag));
          const ust = Number(value.ust) || 10;
          lines.push({
            invoiceId,
            unitId,
            lineType: 'sonstige',
            description: `${key} ${monthName} ${year}`,
            amount: betrag,
            taxRate: ust,
            meta: { reference: value.schluessel || 'Vereinbarung' }
          });
        }
      }
    }

    return lines;
  }
}

export const invoiceGenerator = new InvoiceGenerator();
