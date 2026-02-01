import { useMemo } from 'react';
import { useTenants } from './useTenants';
import { useUnits } from './useUnits';
import { useCombinedPayments } from './useCombinedPayments';
import { useInvoices } from './useInvoices';
import { getActiveTenantsForPeriod } from '@/utils/tenantFilterUtils';
import { TenantAllocation, calculateMrgAllocation } from './useMrgAllocation';

export interface MrgAllocationYearlyResult {
  allocations: TenantAllocation[];
  totals: {
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
  };
  isLoading: boolean;
}

/**
 * Hook für MRG-konforme SOLL/IST-Berechnung pro Mieter - KUMULIERT ÜBER GESAMTES JAHR
 * Berechnet SOLL basierend auf Anzahl der aktiven Monate pro Mieter
 */
export function useMrgAllocationYearly(
  selectedPropertyId: string = 'all',
  year: number,
  monthCount: number = 12 // Wieviele Monate des Jahres berücksichtigt werden sollen
): MrgAllocationYearlyResult {
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: units, isLoading: unitsLoading } = useUnits();
  const { data: combinedPayments, isLoading: paymentsLoading } = useCombinedPayments();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();

  const isLoading = tenantsLoading || unitsLoading || paymentsLoading || invoicesLoading;

  const result = useMemo(() => {
    if (!tenants || !units || !combinedPayments) {
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

    const now = new Date();
    const dayOfMonth = now.getDate();

    // Filter units by property (support both camelCase and snake_case)
    const propertyUnitIds = selectedPropertyId === 'all'
      ? null
      : units.filter(u => (u.propertyId ?? u.property_id) === selectedPropertyId).map(u => u.id);

    const relevantUnits = propertyUnitIds
      ? units.filter(u => propertyUnitIds.includes(u.id))
      : units;

    // Sammle alle aktiven Mieter über alle relevanten Monate
    const tenantMonthMap = new Map<string, {
      tenant: typeof tenants[0];
      activeMonths: number;
    }>();

    for (let month = 1; month <= monthCount; month++) {
      const activeTenants = getActiveTenantsForPeriod(
        relevantUnits,
        tenants,
        selectedPropertyId,
        year,
        month
      );
      
      activeTenants.forEach(tenant => {
        const existing = tenantMonthMap.get(tenant.id);
        if (existing) {
          existing.activeMonths += 1;
        } else {
          tenantMonthMap.set(tenant.id, { tenant, activeMonths: 1 });
        }
      });
    }

    // Filter payments for the whole year (support both camelCase and snake_case)
    const yearPayments = combinedPayments.filter(p => {
      const date = new Date(p.date);
      const paymentYear = date.getFullYear();
      const paymentMonth = date.getMonth() + 1;
      
      if (paymentYear !== year || paymentMonth > monthCount) return false;
      
      // Filter by property if selected
      if (propertyUnitIds) {
        const paymentTenantId = p.tenantId ?? p.tenant_id;
        const tenant = tenants.find(t => t.id === paymentTenantId);
        const tenantUnitId = tenant?.unitId ?? tenant?.unit_id;
        return tenant && tenantUnitId && propertyUnitIds.includes(tenantUnitId);
      }
      return true;
    });

    const allocations: TenantAllocation[] = Array.from(tenantMonthMap.values()).map(({ tenant, activeMonths }) => {
      // SOLL: Summiere Vorschreibungen (monthlyInvoices) für den Mieter im gesamten Zeitraum
      // Fallback auf Mieter-Stammdaten × aktive Monate nur wenn keine Vorschreibungen existieren
      const tenantInvoices = invoices?.filter(inv => 
        (inv.tenantId ?? inv.tenant_id) === tenant.id && 
        inv.year === year && 
        inv.month <= monthCount
      ) || [];
      
      let sollBk: number, sollHk: number, sollMiete: number;
      
      if (tenantInvoices.length > 0) {
        // Summiere alle Vorschreibungen für den Zeitraum
        // Support both camelCase and snake_case invoice field names
        sollBk = tenantInvoices.reduce((sum, invoice) => {
          const inv = invoice as any;
          return sum + Number(inv.betriebskosten ?? inv.betriebskostenVorschuss ?? inv.betriebskosten_vorschuss ?? 0);
        }, 0);
        sollHk = tenantInvoices.reduce((sum, invoice) => {
          const inv = invoice as any;
          return sum + Number(inv.heizkosten ?? inv.heizkostenVorschuss ?? inv.heizkosten_vorschuss ?? inv.heizungskosten ?? inv.heizungskosten_vorschuss ?? 0);
        }, 0);
        sollMiete = tenantInvoices.reduce((sum, invoice) => 
          sum + Number((invoice as any).grundmiete || 0), 0);
      } else {
        // Fallback auf Mieter-Stammdaten × aktive Monate (support both camelCase and snake_case)
        const sollBkMonthly = Number(tenant.betriebskostenVorschuss ?? tenant.betriebskosten_vorschuss ?? 0);
        // Schema uses heizkostenVorschuss (without "ungs"), also support alternative spellings
        const sollHkMonthly = Number(tenant.heizkostenVorschuss ?? tenant.heizungskostenVorschuss ?? tenant.heizungskosten_vorschuss ?? 0);
        const sollMieteMonthly = Number(tenant.grundmiete || 0);
        
        sollBk = sollBkMonthly * activeMonths;
        sollHk = sollHkMonthly * activeMonths;
        sollMiete = sollMieteMonthly * activeMonths;
      }
      
      const totalSoll = sollBk + sollHk + sollMiete;

      // IST = Summe aller Zahlungen des Mieters im Jahr
      const tenantPayments = yearPayments.filter(p => (p.tenantId ?? p.tenant_id) === tenant.id);
      const totalIst = tenantPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      // MRG-konforme Aufteilung über das Jahr
      const { istBk, istHk, istMiete, ueberzahlung, unterzahlung } = 
        calculateMrgAllocation(sollBk, sollHk, sollMiete, totalIst);

      // Differenzen
      const diffBk = sollBk - istBk;
      const diffHk = sollHk - istHk;
      const diffMiete = sollMiete - istMiete;

      // Saldo: positiv = Unterzahlung (offene Forderung), negativ = Überzahlung (Guthaben)
      const saldo = totalSoll - totalIst;

      // Days overdue: nur wenn wir im aktuellen Jahr sind
      const isCurrentYear = year === now.getFullYear();
      const daysOverdue = isCurrentYear && saldo > 0 ? Math.max(0, dayOfMonth - 5) : 0;

      // Determine Mahnstatus
      let mahnstatus: 'aktuell' | 'Zahlungserinnerung' | '1. Mahnung' | '2. Mahnung' = 'aktuell';
      if (daysOverdue > 30) mahnstatus = '2. Mahnung';
      else if (daysOverdue > 14) mahnstatus = '1. Mahnung';
      else if (daysOverdue > 0) mahnstatus = 'Zahlungserinnerung';

      // Status
      let status: 'vollstaendig' | 'teilbezahlt' | 'offen' | 'ueberzahlt' = 'offen';
      if (saldo < -0.01) {
        status = 'ueberzahlt';
      } else if (Math.abs(saldo) < 0.01 && totalIst > 0) {
        status = 'vollstaendig';
      } else if (totalIst > 0 && saldo > 0.01) {
        status = 'teilbezahlt';
      }

      const tenantUnitId = tenant.unitId ?? tenant.unit_id;
      const unit = units.find(u => u.id === tenantUnitId) || null;

      return {
        tenant: {
          id: tenant.id,
          first_name: tenant.firstName ?? tenant.first_name,
          last_name: tenant.lastName ?? tenant.last_name,
          unit_id: tenantUnitId,
          grundmiete: Number(tenant.grundmiete || 0),
          betriebskosten_vorschuss: Number(tenant.betriebskostenVorschuss ?? tenant.betriebskosten_vorschuss ?? 0),
          heizungskosten_vorschuss: Number(tenant.heizungskostenVorschuss ?? tenant.heizungskosten_vorschuss ?? 0),
          status: tenant.status,
          mietbeginn: tenant.mietbeginn,
          mietende: tenant.mietende,
        },
        unit: unit ? {
          id: unit.id,
          top_nummer: unit.topNummer ?? unit.top_nummer,
          type: unit.type,
          property_id: unit.propertyId ?? unit.property_id,
        } : null,
        sollBk,
        sollHk,
        sollMiete,
        totalSoll,
        istBk,
        istHk,
        istMiete,
        totalIst,
        diffBk,
        diffHk,
        diffMiete,
        ueberzahlung,
        unterzahlung,
        saldo,
        oldestOverdueDays: daysOverdue,
        mahnstatus,
        status,
      };
    });

    // Sort by saldo descending (most underpayment first, then show overpayments)
    allocations.sort((a, b) => b.saldo - a.saldo);

    // Calculate totals
    const totals = allocations.reduce((acc, a) => ({
      sollBk: acc.sollBk + a.sollBk,
      sollHk: acc.sollHk + a.sollHk,
      sollMiete: acc.sollMiete + a.sollMiete,
      totalSoll: acc.totalSoll + a.totalSoll,
      istBk: acc.istBk + a.istBk,
      istHk: acc.istHk + a.istHk,
      istMiete: acc.istMiete + a.istMiete,
      totalIst: acc.totalIst + a.totalIst,
      totalUnterzahlung: acc.totalUnterzahlung + a.unterzahlung,
      totalUeberzahlung: acc.totalUeberzahlung + a.ueberzahlung,
      saldo: acc.saldo + a.saldo,
      paymentCount: acc.paymentCount,
    }), {
      sollBk: 0, sollHk: 0, sollMiete: 0, totalSoll: 0,
      istBk: 0, istHk: 0, istMiete: 0, totalIst: 0,
      totalUnterzahlung: 0, totalUeberzahlung: 0, saldo: 0,
      paymentCount: yearPayments.length,
    });

    return { allocations, totals };
  }, [tenants, units, combinedPayments, selectedPropertyId, year, monthCount]);

  return { ...result, isLoading };
}
