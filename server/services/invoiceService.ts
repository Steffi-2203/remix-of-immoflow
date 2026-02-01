import { db } from "../db";
import { 
  tenants, 
  units, 
  monthlyInvoices, 
  invoiceLines,
  payments, 
  propertyManagers 
} from "@shared/schema";
import { eq, and, inArray, gte, lte } from "drizzle-orm";
import { writeAudit } from "../lib/auditLog";
import type { Tenant } from "@shared/schema";
import { roundMoney } from "@shared/utils";

interface InvoiceLine {
  invoiceId: string;
  expenseType: string;
  description: string;
  netAmount: string;
  vatRate: number;
  grossAmount: string;
  allocationReference: string;
}

interface CarryForward {
  vortragMiete: number;
  vortragBk: number;
  vortragHk: number;
  vortragSonstige: number;
}

interface VatRates {
  ustSatzMiete: number;
  ustSatzBk: number;
  ustSatzHeizung: number;
}

interface InvoiceData {
  tenantId: string;
  unitId: string | null;
  year: number;
  month: number;
  grundmiete: string;
  betriebskosten: string;
  heizungskosten: string;
  gesamtbetrag: string;
  ust: string;
  ustSatzMiete: number;
  ustSatzBk: number;
  ustSatzHeizung: number;
  status: "offen" | "bezahlt" | "teilbezahlt" | "ueberfaellig";
  faelligAm: string;
  vortragMiete: string;
  vortragBk: string;
  vortragHk: string;
  vortragSonstige: string;
}

interface GenerateInvoicesResult {
  success: boolean;
  created: number;
  skipped: number;
  carryForwardsCalculated: number;
  invoices: any[];
  message: string;
}

export class InvoiceService {
  getVatRates(unitType: string): VatRates {
    const isCommercial = ['geschaeft', 'garage', 'stellplatz', 'lager'].includes(unitType?.toLowerCase() || '');
    return {
      ustSatzMiete: isCommercial ? 20 : 10,
      ustSatzBk: isCommercial ? 20 : 10,
      ustSatzHeizung: 20,
    };
  }

  calculateVatFromGross(grossAmount: number, vatRate: number): number {
    if (vatRate === 0) return 0;
    return grossAmount - (grossAmount / (1 + vatRate / 100));
  }

  async calculateTenantCarryForward(tenantId: string, year: number): Promise<CarryForward> {
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
        return { vortragMiete: differenz, vortragBk: 0, vortragHk: 0, vortragSonstige: 0 };
      }
      return { vortragMiete: 0, vortragBk: 0, vortragHk: 0, vortragSonstige: 0 };
    }

    let remaining = istGesamt;
    const paidBk = Math.min(remaining, sollBk);
    remaining -= paidBk;
    const paidHk = Math.min(remaining, sollHk);
    remaining -= paidHk;
    const paidMiete = Math.min(remaining, sollMiete);

    return {
      vortragMiete: roundMoney(Math.max(0, sollMiete - paidMiete)),
      vortragBk: roundMoney(Math.max(0, sollBk - paidBk)),
      vortragHk: roundMoney(Math.max(0, sollHk - paidHk)),
      vortragSonstige: 0,
    };
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
    
    const grundmiete = Number(tenant.grundmiete) || 0;
    const betriebskosten = Number(tenant.betriebskostenVorschuss) || 0;
    const heizungskosten = Number(tenant.heizkostenVorschuss) || 0;
    
    const ustMiete = this.calculateVatFromGross(grundmiete, vatRates.ustSatzMiete);
    const ustBk = this.calculateVatFromGross(betriebskosten, vatRates.ustSatzBk);
    const ustHeizung = this.calculateVatFromGross(heizungskosten, vatRates.ustSatzHeizung);
    const ust = ustMiete + ustBk + ustHeizung;

    const vortragGesamt = carryForward.vortragMiete + carryForward.vortragBk + 
                         carryForward.vortragHk + carryForward.vortragSonstige;
    
    const gesamtbetrag = grundmiete + betriebskosten + heizungskosten + vortragGesamt;

    return {
      tenantId: tenant.id,
      unitId: tenant.unitId,
      year,
      month,
      grundmiete: grundmiete.toString(),
      betriebskosten: betriebskosten.toString(),
      heizungskosten: heizungskosten.toString(),
      gesamtbetrag: gesamtbetrag.toString(),
      ust: roundMoney(ust).toString(),
      ustSatzMiete: vatRates.ustSatzMiete,
      ustSatzBk: vatRates.ustSatzBk,
      ustSatzHeizung: vatRates.ustSatzHeizung,
      status: "offen",
      faelligAm: dueDate,
      vortragMiete: carryForward.vortragMiete.toString(),
      vortragBk: carryForward.vortragBk.toString(),
      vortragHk: carryForward.vortragHk.toString(),
      vortragSonstige: carryForward.vortragSonstige.toString(),
    };
  }

  buildInvoiceLines(
    invoiceId: string,
    tenant: Tenant,
    vatRates: VatRates,
    month: number,
    year: number
  ): InvoiceLine[] {
    const lines: InvoiceLine[] = [];
    const monthName = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                       'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][month - 1];

    const grundmiete = Number(tenant.grundmiete) || 0;
    if (grundmiete > 0) {
      const netMiete = grundmiete / (1 + vatRates.ustSatzMiete / 100);
      lines.push({
        invoiceId,
        expenseType: 'grundmiete',
        description: `Nettomiete ${monthName} ${year}`,
        netAmount: roundMoney(netMiete).toString(),
        vatRate: vatRates.ustSatzMiete,
        grossAmount: grundmiete.toString(),
        allocationReference: 'MRG §15',
      });
    }

    const bk = Number(tenant.betriebskostenVorschuss) || 0;
    if (bk > 0) {
      const netBk = bk / (1 + vatRates.ustSatzBk / 100);
      lines.push({
        invoiceId,
        expenseType: 'betriebskosten',
        description: `BK-Vorschuss ${monthName} ${year}`,
        netAmount: roundMoney(netBk).toString(),
        vatRate: vatRates.ustSatzBk,
        grossAmount: bk.toString(),
        allocationReference: 'MRG §21',
      });
    }

    const hk = Number(tenant.heizkostenVorschuss) || 0;
    if (hk > 0) {
      const netHk = hk / (1 + vatRates.ustSatzHeizung / 100);
      lines.push({
        invoiceId,
        expenseType: 'heizkosten',
        description: `HK-Vorschuss ${monthName} ${year}`,
        netAmount: roundMoney(netHk).toString(),
        vatRate: vatRates.ustSatzHeizung,
        grossAmount: hk.toString(),
        allocationReference: 'HeizKG',
      });
    }

    const wasser = Number(tenant.wasserkostenVorschuss) || 0;
    if (wasser > 0) {
      const netWasser = wasser / (1 + 10 / 100);
      lines.push({
        invoiceId,
        expenseType: 'wasserkosten',
        description: `Wasserkosten-Vorschuss ${monthName} ${year}`,
        netAmount: roundMoney(netWasser).toString(),
        vatRate: 10,
        grossAmount: wasser.toString(),
        allocationReference: 'MRG §21',
      });
    }

    const sonstigeKosten = tenant.sonstigeKosten as Record<string, { betrag: number; ust: number; schluessel?: string }> | null;
    if (sonstigeKosten && typeof sonstigeKosten === 'object') {
      for (const [key, value] of Object.entries(sonstigeKosten)) {
        if (value && value.betrag > 0) {
          const betrag = Number(value.betrag);
          const ust = Number(value.ust) || 10;
          const netBetrag = betrag / (1 + ust / 100);
          lines.push({
            invoiceId,
            expenseType: 'sonstige',
            description: `${key} ${monthName} ${year}`,
            netAmount: roundMoney(netBetrag).toString(),
            vatRate: ust,
            grossAmount: betrag.toString(),
            allocationReference: value.schluessel || 'Vereinbarung',
          });
        }
      }
    }

    return lines;
  }

  async generateMonthlyInvoices(
    userId: string, 
    year: number, 
    month: number
  ): Promise<GenerateInvoicesResult> {
    const isJanuary = month === 1;

    const managedProperties = await db.select({ propertyId: propertyManagers.propertyId })
      .from(propertyManagers)
      .where(eq(propertyManagers.userId, userId));

    if (!managedProperties.length) {
      return { 
        success: true, 
        message: "No managed properties found", 
        created: 0, 
        skipped: 0, 
        carryForwardsCalculated: 0, 
        invoices: [] 
      };
    }

    const propertyIds = managedProperties.map(p => p.propertyId);

    const unitsData = await db.select()
      .from(units)
      .where(inArray(units.propertyId, propertyIds));

    if (!unitsData.length) {
      return { 
        success: true, 
        message: "No units found", 
        created: 0, 
        skipped: 0, 
        carryForwardsCalculated: 0, 
        invoices: [] 
      };
    }

    const unitIds = unitsData.map(u => u.id);
    const unitTypeMap = new Map(unitsData.map(u => [u.id, u.type || 'wohnung']));

    const tenantsData = await db.select()
      .from(tenants)
      .where(and(
        inArray(tenants.unitId, unitIds),
        eq(tenants.status, 'aktiv')
      ));

    if (!tenantsData.length) {
      return { 
        success: true, 
        message: "No active tenants found", 
        created: 0, 
        skipped: 0, 
        carryForwardsCalculated: 0, 
        invoices: [] 
      };
    }

    const existingInvoices = await db.select({ tenantId: monthlyInvoices.tenantId })
      .from(monthlyInvoices)
      .where(and(
        eq(monthlyInvoices.year, year),
        eq(monthlyInvoices.month, month)
      ));

    const existingTenantIds = new Set(existingInvoices.map(inv => inv.tenantId));
    const tenantsToInvoice = tenantsData.filter(t => !existingTenantIds.has(t.id));

    if (!tenantsToInvoice.length) {
      return { 
        success: true, 
        message: `All ${tenantsData.length} tenants already have invoices for ${month}/${year}`,
        created: 0,
        skipped: tenantsData.length,
        carryForwardsCalculated: 0,
        invoices: []
      };
    }

    const dueDate = new Date(year, month - 1, 5);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const carryForwardMap = new Map<string, CarryForward>();
    if (isJanuary) {
      for (const tenant of tenantsToInvoice) {
        const carryForward = await this.calculateTenantCarryForward(tenant.id, year);
        carryForwardMap.set(tenant.id, carryForward);
      }
    }

    const tenantMap = new Map(tenantsToInvoice.map(t => [t.id, t]));
    const invoicesToCreate = tenantsToInvoice.map(tenant => {
      const unitType = unitTypeMap.get(tenant.unitId || '') || 'wohnung';
      const carryForward = carryForwardMap.get(tenant.id) || {
        vortragMiete: 0, vortragBk: 0, vortragHk: 0, vortragSonstige: 0,
      };
      return this.buildInvoiceData(tenant, unitType, year, month, dueDateStr, carryForward);
    });

    const createdInvoices = await db.transaction(async (tx) => {
      const inserted = await tx.insert(monthlyInvoices)
        .values(invoicesToCreate)
        .returning();

      let totalLinesCreated = 0;
      for (const invoice of inserted) {
        const tenant = tenantMap.get(invoice.tenantId);
        const unitType = unitTypeMap.get(invoice.unitId || '') || 'wohnung';
        const vatRates = this.getVatRates(unitType);

        const lines = this.buildInvoiceLines(invoice.id, tenant!, vatRates, month, year);
        if (lines.length > 0) {
          await tx.insert(invoiceLines).values(lines);
          totalLinesCreated += lines.length;
        }

        await writeAudit(tx, userId, 'monthly_invoices', invoice.id, 'create', null, {
          invoiceId: invoice.id,
          tenantId: invoice.tenantId,
          year: invoice.year,
          month: invoice.month,
          gesamtbetrag: invoice.gesamtbetrag,
          countLines: lines.length,
        });
      }

      return inserted;
    });

    return { 
      success: true, 
      message: `Successfully created ${createdInvoices.length} invoices for ${month}/${year}`,
      created: createdInvoices.length,
      skipped: existingTenantIds.size,
      carryForwardsCalculated: isJanuary ? carryForwardMap.size : 0,
      invoices: createdInvoices
    };
  }

  async getInvoiceSummary(tenantId: string, year: number): Promise<{
    totalSoll: number;
    totalIst: number;
    saldo: number;
    invoiceCount: number;
  }> {
    const yearInvoices = await db.select()
      .from(monthlyInvoices)
      .where(and(
        eq(monthlyInvoices.tenantId, tenantId),
        eq(monthlyInvoices.year, year)
      ));

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    const yearPayments = await db.select()
      .from(payments)
      .where(and(
        eq(payments.tenantId, tenantId),
        gte(payments.buchungsDatum, startDate),
        lte(payments.buchungsDatum, endDate)
      ));

    const totalSoll = yearInvoices.reduce((sum, inv) => sum + Number(inv.gesamtbetrag || 0), 0);
    const totalIst = yearPayments.reduce((sum, p) => sum + Number(p.betrag || 0), 0);

    return {
      totalSoll: roundMoney(totalSoll),
      totalIst: roundMoney(totalIst),
      saldo: roundMoney(totalSoll - totalIst),
      invoiceCount: yearInvoices.length
    };
  }
}

export const invoiceService = new InvoiceService();
