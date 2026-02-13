import { db } from "../db";
import { tenants, units, properties, payments, monthlyInvoices } from "@shared/schema";
import { eq, and, inArray, between, sql } from "drizzle-orm";
import { roundMoney } from "@shared/utils";

// ── Shared Types ─────────────────────────────────────────────────────────

export interface TenantAllocationResult {
  tenant: {
    id: string;
    first_name: string;
    last_name: string;
    unit_id: string;
    grundmiete: number;
    betriebskosten_vorschuss: number;
    heizungskosten_vorschuss: number;
    status: string;
    mietbeginn: string | null;
    mietende: string | null;
  };
  unit: {
    id: string;
    top_nummer: string;
    type: string;
    property_id: string;
  } | null;
  sollBk: number;
  sollHk: number;
  sollMiete: number;
  totalSoll: number;
  istBk: number;
  istHk: number;
  istMiete: number;
  totalIst: number;
  diffBk: number;
  diffHk: number;
  diffMiete: number;
  ueberzahlung: number;
  unterzahlung: number;
  saldo: number;
  oldestOverdueDays: number;
  mahnstatus: 'aktuell' | 'Zahlungserinnerung' | '1. Mahnung' | '2. Mahnung';
  status: 'vollstaendig' | 'teilbezahlt' | 'offen' | 'ueberzahlt';
}

export interface AllocationTotals {
  sollBk: number;
  sollHk: number;
  sollMiete: number;
  totalSoll: number;
  istBk: number;
  istHk: number;
  istMiete: number;
  totalIst: number;
  totalUnterzahlung: number;
  totalUeberzahlung: number;
  saldo: number;
  paymentCount: number;
}

export interface MrgAllocationResponse {
  allocations: TenantAllocationResult[];
  totals: AllocationTotals;
}

// ── Core Calculation (pure function, no DB) ──────────────────────────────

export function calculateMrgAllocation(
  sollBk: number,
  sollHk: number,
  sollMiete: number,
  totalIst: number
): {
  istBk: number;
  istHk: number;
  istMiete: number;
  ueberzahlung: number;
  unterzahlung: number;
} {
  let remaining = totalIst;

  const istBk = Math.min(remaining, sollBk);
  remaining -= istBk;

  const istHk = Math.min(remaining, sollHk);
  remaining -= istHk;

  const istMiete = Math.min(remaining, sollMiete);
  remaining -= istMiete;

  const ueberzahlung = remaining > 0 ? remaining : 0;
  const unterzahlung = (sollBk - istBk) + (sollHk - istHk) + (sollMiete - istMiete);

  return { istBk, istHk, istMiete, ueberzahlung, unterzahlung };
}

// ── Payment Allocation (BK → HK → Miete) ────────────────────────────────

export interface PaymentAllocationInput {
  zahlungsbetrag: number;
  grundmiete: number;
  betriebskosten: number;
  heizungskosten: number;
  mitUst?: boolean;
}

export interface PaymentAllocationOutput {
  betriebskosten_anteil: number;
  heizung_anteil: number;
  miete_anteil: number;
  ust_anteil: number;
  ueberzahlung: number;
  unterzahlung: number;
  vollstaendig_bezahlt: boolean;
  status: 'vollstaendig' | 'teilbezahlt' | 'ueberzahlt';
  beschreibung: string;
}

export function allocatePaymentServer(input: PaymentAllocationInput): PaymentAllocationOutput {
  const { zahlungsbetrag, grundmiete, betriebskosten, heizungskosten, mitUst = true } = input;
  let remaining = zahlungsbetrag;

  const bkBrutto = mitUst ? betriebskosten * 1.10 : betriebskosten;
  const heizungBrutto = mitUst ? heizungskosten * 1.20 : heizungskosten;
  const mieteBrutto = grundmiete;
  const gesamtSoll = bkBrutto + heizungBrutto + mieteBrutto;

  const bkZuordnung = Math.min(remaining, bkBrutto);
  remaining -= bkZuordnung;

  const heizungZuordnung = Math.min(remaining, heizungBrutto);
  remaining -= heizungZuordnung;

  const mieteZuordnung = Math.min(remaining, mieteBrutto);
  remaining -= mieteZuordnung;

  const ustBk = mitUst && bkZuordnung > 0 ? bkZuordnung - (bkZuordnung / 1.10) : 0;
  const ustHeizung = mitUst && heizungZuordnung > 0 ? heizungZuordnung - (heizungZuordnung / 1.20) : 0;

  const vollstaendig_bezahlt = Math.abs(zahlungsbetrag - gesamtSoll) < 0.01;

  let status: 'vollstaendig' | 'teilbezahlt' | 'ueberzahlt';
  let beschreibung: string;

  if (vollstaendig_bezahlt) {
    status = 'vollstaendig';
    beschreibung = 'Rechnung vollständig bezahlt';
  } else if (remaining > 0) {
    status = 'ueberzahlt';
    beschreibung = `Überzahlung: ${roundMoney(remaining).toFixed(2)} €`;
  } else {
    status = 'teilbezahlt';
    beschreibung = `Teilzahlung - Offen: ${roundMoney(gesamtSoll - zahlungsbetrag).toFixed(2)} €`;
  }

  return {
    betriebskosten_anteil: roundMoney(bkZuordnung),
    heizung_anteil: roundMoney(heizungZuordnung),
    miete_anteil: roundMoney(mieteZuordnung),
    ust_anteil: roundMoney(ustBk + ustHeizung),
    ueberzahlung: remaining > 0 ? roundMoney(remaining) : 0,
    unterzahlung: zahlungsbetrag < gesamtSoll ? roundMoney(gesamtSoll - zahlungsbetrag) : 0,
    vollstaendig_bezahlt,
    status,
    beschreibung,
  };
}

// ── Service Class (DB-backed) ────────────────────────────────────────────

export class MrgAllocationService {

  /**
   * Monthly MRG allocation: SOLL/IST per tenant for a property/month.
   */
  async calculateMonthly(params: {
    organizationId: string;
    propertyId?: string;
    year: number;
    month: number;
  }): Promise<MrgAllocationResponse> {
    const { organizationId, propertyId, year, month } = params;

    // Fetch units (optionally filtered by property)
    const allUnits = propertyId
      ? await db.select().from(units)
          .innerJoin(properties, eq(units.propertyId, properties.id))
          .where(and(eq(units.propertyId, propertyId), eq(properties.organizationId, organizationId)))
          .then(rows => rows.map(r => r.units))
      : await db.select().from(units)
          .innerJoin(properties, eq(units.propertyId, properties.id))
          .where(eq(properties.organizationId, organizationId))
          .then(rows => rows.map(r => r.units));

    const unitIds = allUnits.map(u => u.id);
    if (unitIds.length === 0) return this.emptyResult();

    // Fetch active tenants for these units
    const allTenants = await db.select().from(tenants)
      .where(inArray(tenants.unitId, unitIds));

    // Filter for tenants active in this period
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);
    const activeTenants = allTenants.filter(t => {
      if (t.status === 'beendet' && t.mietende) {
        const endDate = new Date(t.mietende);
        if (endDate < periodStart) return false;
      }
      if (t.mietbeginn) {
        const startDate = new Date(t.mietbeginn);
        if (startDate > periodEnd) return false;
      }
      return true;
    });

    // Fetch payments for this month
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${periodEnd.getDate()}`;

    const monthPayments = await db.select().from(payments)
      .where(and(
        inArray(payments.tenantId, activeTenants.map(t => t.id)),
        between(payments.buchungsDatum, monthStart, monthEnd)
      ));

    return this.buildAllocations(activeTenants, allUnits, monthPayments, year, month);
  }

  /**
   * Yearly MRG allocation: cumulative SOLL/IST per tenant.
   */
  async calculateYearly(params: {
    organizationId: string;
    propertyId?: string;
    year: number;
    monthCount?: number;
  }): Promise<MrgAllocationResponse> {
    const { organizationId, propertyId, year, monthCount = 12 } = params;

    const allUnits = propertyId
      ? await db.select().from(units)
          .innerJoin(properties, eq(units.propertyId, properties.id))
          .where(and(eq(units.propertyId, propertyId), eq(properties.organizationId, organizationId)))
          .then(rows => rows.map(r => r.units))
      : await db.select().from(units)
          .innerJoin(properties, eq(units.propertyId, properties.id))
          .where(eq(properties.organizationId, organizationId))
          .then(rows => rows.map(r => r.units));

    const unitIds = allUnits.map(u => u.id);
    if (unitIds.length === 0) return this.emptyResult();

    const allTenants = await db.select().from(tenants)
      .where(inArray(tenants.unitId, unitIds));

    // Count active months per tenant
    const tenantMonthMap = new Map<string, { tenant: typeof allTenants[0]; activeMonths: number }>();

    for (let m = 1; m <= monthCount; m++) {
      const periodStart = new Date(year, m - 1, 1);
      const periodEnd = new Date(year, m, 0);

      for (const t of allTenants) {
        if (t.status === 'beendet' && t.mietende) {
          if (new Date(t.mietende) < periodStart) continue;
        }
        if (t.mietbeginn && new Date(t.mietbeginn) > periodEnd) continue;

        const existing = tenantMonthMap.get(t.id);
        if (existing) {
          existing.activeMonths += 1;
        } else {
          tenantMonthMap.set(t.id, { tenant: t, activeMonths: 1 });
        }
      }
    }

    // Fetch year payments
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-${String(monthCount).padStart(2, '0')}-31`;
    const yearPayments = await db.select().from(payments)
      .where(and(
        inArray(payments.tenantId, Array.from(tenantMonthMap.keys())),
        between(payments.buchungsDatum, yearStart, yearEnd)
      ));

    // Build allocations with yearly multiplier
    const now = new Date();
    const dayOfMonth = now.getDate();
    const allocations: TenantAllocationResult[] = [];

    for (const { tenant, activeMonths } of tenantMonthMap.values()) {
      const sollBk = roundMoney(Number(tenant.betriebskostenVorschuss || 0) * activeMonths);
      const sollHk = roundMoney(Number(tenant.heizkostenVorschuss || 0) * activeMonths);
      const sollMiete = roundMoney(Number(tenant.grundmiete || 0) * activeMonths);
      const totalSoll = roundMoney(sollBk + sollHk + sollMiete);

      const tenantPayments = yearPayments.filter(p => p.tenantId === tenant.id);
      const totalIst = roundMoney(tenantPayments.reduce((sum, p) => sum + Number(p.betrag || 0), 0));

      const { istBk, istHk, istMiete, ueberzahlung, unterzahlung } =
        calculateMrgAllocation(sollBk, sollHk, sollMiete, totalIst);

      const saldo = roundMoney(totalSoll - totalIst);
      const isCurrentYear = year === now.getFullYear();
      const daysOverdue = isCurrentYear && saldo > 0 ? Math.max(0, dayOfMonth - 5) : 0;

      const unit = allUnits.find(u => u.id === tenant.unitId) || null;

      allocations.push(this.buildAllocationItem(
        tenant, unit, sollBk, sollHk, sollMiete, totalSoll,
        istBk, istHk, istMiete, totalIst, saldo, ueberzahlung, unterzahlung, daysOverdue
      ));
    }

    allocations.sort((a, b) => b.saldo - a.saldo);
    return { allocations, totals: this.computeTotals(allocations, yearPayments.length) };
  }

  // ── Internal helpers ───────────────────────────────────────────────────

  private buildAllocations(
    activeTenants: (typeof tenants.$inferSelect)[],
    allUnits: (typeof units.$inferSelect)[],
    periodPayments: (typeof payments.$inferSelect)[],
    year: number,
    month: number
  ): MrgAllocationResponse {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const allocations: TenantAllocationResult[] = [];

    for (const tenant of activeTenants) {
      const sollBk = roundMoney(Number(tenant.betriebskostenVorschuss || 0));
      const sollHk = roundMoney(Number(tenant.heizkostenVorschuss || 0));
      const sollMiete = roundMoney(Number(tenant.grundmiete || 0));
      const totalSoll = roundMoney(sollBk + sollHk + sollMiete);

      const tenantPayments = periodPayments.filter(p => p.tenantId === tenant.id);
      const totalIst = roundMoney(tenantPayments.reduce((sum, p) => sum + Number(p.betrag || 0), 0));

      const { istBk, istHk, istMiete, ueberzahlung, unterzahlung } =
        calculateMrgAllocation(sollBk, sollHk, sollMiete, totalIst);

      const saldo = roundMoney(totalSoll - totalIst);
      const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
      const daysOverdue = isCurrentMonth && saldo > 0 && dayOfMonth > 5 ? dayOfMonth - 5 : 0;

      const unit = allUnits.find(u => u.id === tenant.unitId) || null;

      allocations.push(this.buildAllocationItem(
        tenant, unit, sollBk, sollHk, sollMiete, totalSoll,
        istBk, istHk, istMiete, totalIst, saldo, ueberzahlung, unterzahlung, daysOverdue
      ));
    }

    allocations.sort((a, b) => a.saldo - b.saldo);
    return { allocations, totals: this.computeTotals(allocations, periodPayments.length) };
  }

  private buildAllocationItem(
    tenant: typeof tenants.$inferSelect,
    unit: typeof units.$inferSelect | null,
    sollBk: number, sollHk: number, sollMiete: number, totalSoll: number,
    istBk: number, istHk: number, istMiete: number, totalIst: number,
    saldo: number, ueberzahlung: number, unterzahlung: number, daysOverdue: number
  ): TenantAllocationResult {
    let mahnstatus: TenantAllocationResult['mahnstatus'] = 'aktuell';
    if (daysOverdue > 30) mahnstatus = '2. Mahnung';
    else if (daysOverdue > 14) mahnstatus = '1. Mahnung';
    else if (daysOverdue > 0) mahnstatus = 'Zahlungserinnerung';

    let status: TenantAllocationResult['status'] = 'offen';
    if (saldo < -0.01) status = 'ueberzahlt';
    else if (Math.abs(saldo) < 0.01 && totalIst > 0) status = 'vollstaendig';
    else if (totalIst > 0 && saldo > 0.01) status = 'teilbezahlt';

    return {
      tenant: {
        id: tenant.id,
        first_name: tenant.firstName || '',
        last_name: tenant.lastName || '',
        unit_id: tenant.unitId,
        grundmiete: Number(tenant.grundmiete || 0),
        betriebskosten_vorschuss: Number(tenant.betriebskostenVorschuss || 0),
        heizungskosten_vorschuss: Number(tenant.heizkostenVorschuss || 0),
        status: tenant.status || 'aktiv',
        mietbeginn: tenant.mietbeginn,
        mietende: tenant.mietende,
      },
      unit: unit ? {
        id: unit.id,
        top_nummer: unit.topNummer,
        type: unit.type || 'wohnung',
        property_id: unit.propertyId,
      } : null,
      sollBk, sollHk, sollMiete, totalSoll,
      istBk, istHk, istMiete, totalIst,
      diffBk: roundMoney(sollBk - istBk),
      diffHk: roundMoney(sollHk - istHk),
      diffMiete: roundMoney(sollMiete - istMiete),
      ueberzahlung: roundMoney(ueberzahlung),
      unterzahlung: roundMoney(unterzahlung),
      saldo: roundMoney(saldo),
      oldestOverdueDays: daysOverdue,
      mahnstatus,
      status,
    };
  }

  private computeTotals(allocations: TenantAllocationResult[], paymentCount: number): AllocationTotals {
    return allocations.reduce((acc, a) => ({
      sollBk: roundMoney(acc.sollBk + a.sollBk),
      sollHk: roundMoney(acc.sollHk + a.sollHk),
      sollMiete: roundMoney(acc.sollMiete + a.sollMiete),
      totalSoll: roundMoney(acc.totalSoll + a.totalSoll),
      istBk: roundMoney(acc.istBk + a.istBk),
      istHk: roundMoney(acc.istHk + a.istHk),
      istMiete: roundMoney(acc.istMiete + a.istMiete),
      totalIst: roundMoney(acc.totalIst + a.totalIst),
      totalUnterzahlung: roundMoney(acc.totalUnterzahlung + a.unterzahlung),
      totalUeberzahlung: roundMoney(acc.totalUeberzahlung + a.ueberzahlung),
      saldo: roundMoney(acc.saldo + a.saldo),
      paymentCount,
    }), {
      sollBk: 0, sollHk: 0, sollMiete: 0, totalSoll: 0,
      istBk: 0, istHk: 0, istMiete: 0, totalIst: 0,
      totalUnterzahlung: 0, totalUeberzahlung: 0, saldo: 0,
      paymentCount,
    });
  }

  private emptyResult(): MrgAllocationResponse {
    return {
      allocations: [],
      totals: {
        sollBk: 0, sollHk: 0, sollMiete: 0, totalSoll: 0,
        istBk: 0, istHk: 0, istMiete: 0, totalIst: 0,
        totalUnterzahlung: 0, totalUeberzahlung: 0, saldo: 0,
        paymentCount: 0,
      },
    };
  }
}

export const mrgAllocationService = new MrgAllocationService();
