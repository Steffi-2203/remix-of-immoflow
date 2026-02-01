import { useMemo } from 'react';
import { useTenants } from './useTenants';
import { useUnits } from './useUnits';
import { useCombinedPayments } from './useCombinedPayments';
import { useInvoices } from './useInvoices';
import { getActiveTenantsForPeriod } from '@/utils/tenantFilterUtils';

/**
 * MRG-konforme Zahlungsaufteilung pro Mieter
 * Priorität: BK → HK → Miete
 */
export interface TenantAllocation {
  tenant: {
    id: string;
    first_name: string;
    last_name: string;
    unit_id: string;
    grundmiete: number;
    betriebskosten_vorschuss: number;
    heizungskosten_vorschuss: number;
    status: string;
    mietbeginn: string;
    mietende?: string | null;
  };
  unit: {
    id: string;
    top_nummer: string;
    type: string;
    property_id: string;
  } | null;
  // SOLL-Werte (aus Mieterstammdaten)
  sollBk: number;
  sollHk: number;
  sollMiete: number;
  totalSoll: number;
  // IST-Werte (MRG-konform aufgeteilt)
  istBk: number;
  istHk: number;
  istMiete: number;
  totalIst: number;
  // Differenzen
  diffBk: number;
  diffHk: number;
  diffMiete: number;
  // Saldo
  ueberzahlung: number;
  unterzahlung: number;
  saldo: number;  // positiv = Überzahlung, negativ = Unterzahlung
  // Mahnstatus
  oldestOverdueDays: number;
  mahnstatus: 'aktuell' | 'Zahlungserinnerung' | '1. Mahnung' | '2. Mahnung';
  // Status
  status: 'vollstaendig' | 'teilbezahlt' | 'offen' | 'ueberzahlt';
}

export interface MrgAllocationResult {
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
 * Berechnet MRG-konforme Zahlungsaufteilung für einen Mieter
 * Priorität: BK → HK → Miete
 * 
 * @param sollBk - Betriebskosten SOLL (netto)
 * @param sollHk - Heizkosten SOLL (netto)
 * @param sollMiete - Miete SOLL (netto)
 * @param totalIst - Tatsächliche Zahlung (brutto)
 * @param totalSollBrutto - Gesamtbetrag inkl. USt (optional, für korrekte Überzahlungsberechnung)
 */
export function calculateMrgAllocation(
  sollBk: number,
  sollHk: number,
  sollMiete: number,
  totalIst: number,
  totalSollBrutto?: number
): {
  istBk: number;
  istHk: number;
  istMiete: number;
  ueberzahlung: number;
  unterzahlung: number;
} {
  // MRG-konforme Aufteilung: BK → HK → Miete
  let remaining = totalIst;
  
  const istBk = Math.min(remaining, sollBk);
  remaining -= istBk;
  
  const istHk = Math.min(remaining, sollHk);
  remaining -= istHk;
  
  const istMiete = Math.min(remaining, sollMiete);
  remaining -= istMiete;
  
  // WICHTIG: Überzahlung basiert auf BRUTTO-SOLL (gesamtbetrag inkl. USt)
  // Wenn totalSollBrutto übergeben wird, verwende diesen für die Berechnung
  // Sonst verwende die Summe der Netto-Werte (Fallback)
  const sollGesamt = totalSollBrutto ?? (sollBk + sollHk + sollMiete);
  
  // Überzahlung = Zahlung > Brutto-SOLL (echte Überzahlung, nicht nur USt-Anteil)
  const ueberzahlung = totalIst > sollGesamt ? totalIst - sollGesamt : 0;
  
  // Unterzahlung = Brutto-SOLL > Zahlung
  const unterzahlung = sollGesamt > totalIst ? sollGesamt - totalIst : 0;
  
  return { istBk, istHk, istMiete, ueberzahlung, unterzahlung };
}

/**
 * Hook für MRG-konforme SOLL/IST-Berechnung pro Mieter
 * Wird von PaymentList.tsx, Reports.tsx und PDF-Exporten verwendet
 */
export function useMrgAllocation(
  selectedPropertyId: string = 'all',
  year: number,
  month: number
): MrgAllocationResult {
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

    // Get active tenants for the period
    const activeTenants = getActiveTenantsForPeriod(
      relevantUnits,
      tenants,
      selectedPropertyId,
      year,
      month
    );

    // Filter payments for this period (support both camelCase and snake_case)
    const periodPayments = combinedPayments.filter(p => {
      const date = new Date(p.date);
      if (date.getFullYear() !== year || date.getMonth() + 1 !== month) return false;
      
      // Filter by property if selected
      if (propertyUnitIds) {
        const tenantId = p.tenantId ?? p.tenant_id;
        const tenant = tenants.find(t => t.id === tenantId);
        const unitId = tenant?.unitId ?? tenant?.unit_id;
        return tenant && propertyUnitIds.includes(unitId);
      }
      return true;
    });

    const allocations: TenantAllocation[] = activeTenants.map(tenant => {
      // SOLL: Bevorzugt aus Vorschreibung (monthlyInvoice) für den spezifischen Monat
      // Fallback auf Mieter-Stammdaten nur wenn keine Vorschreibung existiert
      const tenantInvoice = invoices?.find(inv => 
        (inv.tenantId ?? inv.tenant_id) === tenant.id && 
        inv.year === year && 
        inv.month === month
      );
      
      let sollBk: number, sollHk: number, sollMiete: number;
      let totalSollBrutto: number; // Gesamtbetrag inkl. USt für Saldo
      
      if (tenantInvoice) {
        // Vorschreibung vorhanden - verwende diese (inkl. aller Änderungen)
        // Support both camelCase and snake_case invoice field names
        const inv = tenantInvoice as any;
        sollBk = Number(inv.betriebskosten ?? inv.betriebskostenVorschuss ?? inv.betriebskosten_vorschuss ?? 0);
        sollHk = Number(inv.heizkosten ?? inv.heizkostenVorschuss ?? inv.heizkosten_vorschuss ?? inv.heizungskosten ?? inv.heizungskosten_vorschuss ?? 0);
        sollMiete = Number(inv.grundmiete || 0);
        // WICHTIG: Verwende gesamtbetrag (brutto) für Saldo, da Zahlungen brutto sind
        totalSollBrutto = Number(inv.gesamtbetrag ?? 0);
      } else {
        // Fallback auf Mieter-Stammdaten (support both camelCase and snake_case)
        // Schema uses heizkostenVorschuss (without "ungs"), also support alternative spellings
        sollBk = Number(tenant.betriebskostenVorschuss ?? tenant.betriebskosten_vorschuss ?? 0);
        sollHk = Number(tenant.heizkostenVorschuss ?? tenant.heizungskostenVorschuss ?? tenant.heizungskosten_vorschuss ?? 0);
        sollMiete = Number(tenant.grundmiete || 0);
        // Fallback: Berechne Brutto mit geschätztem USt-Satz (10% auf alles)
        totalSollBrutto = (sollBk + sollHk + sollMiete) * 1.1;
      }
      
      const totalSoll = sollBk + sollHk + sollMiete;

      // IST from combined payments for this tenant and period
      const tenantPayments = periodPayments.filter(p => (p.tenantId ?? p.tenant_id) === tenant.id);
      const totalIst = tenantPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      // MRG-konforme Aufteilung (mit Brutto-SOLL für korrekte Überzahlungsberechnung)
      const { istBk, istHk, istMiete, ueberzahlung, unterzahlung } = 
        calculateMrgAllocation(sollBk, sollHk, sollMiete, totalIst, totalSollBrutto);

      // Differenzen
      const diffBk = sollBk - istBk;
      const diffHk = sollHk - istHk;
      const diffMiete = sollMiete - istMiete;

      // Saldo: SOLL (brutto) - IST = positiv = Unterzahlung, negativ = Überzahlung
      // WICHTIG: Verwende totalSollBrutto (gesamtbetrag inkl. USt), da Zahlungen brutto sind
      const saldo = totalSollBrutto - totalIst;

      // Days overdue: if we're past the 5th of the month and saldo is positive (underpayment)
      const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
      const daysOverdue = isCurrentMonth && saldo > 0 && dayOfMonth > 5 ? dayOfMonth - 5 : 0;

      // Determine Mahnstatus based on days overdue
      let mahnstatus: 'aktuell' | 'Zahlungserinnerung' | '1. Mahnung' | '2. Mahnung' = 'aktuell';
      if (daysOverdue > 30) {
        mahnstatus = '2. Mahnung';
      } else if (daysOverdue > 14) {
        mahnstatus = '1. Mahnung';
      } else if (daysOverdue > 0) {
        mahnstatus = 'Zahlungserinnerung';
      }

      // Status: basierend auf Saldo (positiv = Unterzahlung, negativ = Überzahlung)
      let status: 'vollstaendig' | 'teilbezahlt' | 'offen' | 'ueberzahlt' = 'offen';
      if (saldo < 0) {
        status = 'ueberzahlt';
      } else if (saldo === 0 && totalIst > 0) {
        status = 'vollstaendig';
      } else if (totalIst > 0 && saldo > 0) {
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
          heizungskosten_vorschuss: Number(tenant.heizkostenVorschuss ?? tenant.heizungskostenVorschuss ?? tenant.heizungskosten_vorschuss ?? 0),
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

    // ====== LEERSTAND (Vacancy) SUPPORT ======
    // Finde Einheiten mit Leerstand-Vorschreibungen für diesen Monat
    const vacancyInvoices = invoices?.filter(inv => 
      (inv as any).isVacancy === true || (inv as any).is_vacancy === true
    ) || [];
    
    // Filter für diesen Monat
    const monthVacancyInvoices = vacancyInvoices.filter(inv => 
      inv.year === year && inv.month === month
    );
    
    // Gruppiere nach Unit
    const vacancyByUnit = new Map<string, typeof monthVacancyInvoices>();
    monthVacancyInvoices.forEach(inv => {
      const unitId = (inv as any).unitId ?? (inv as any).unit_id;
      if (!unitId) return;
      
      // Filter by property if selected
      if (propertyUnitIds && !propertyUnitIds.includes(unitId)) return;
      
      if (!vacancyByUnit.has(unitId)) {
        vacancyByUnit.set(unitId, []);
      }
      vacancyByUnit.get(unitId)!.push(inv);
    });
    
    // Erstelle Leerstand-Allocations
    const vacancyAllocations: TenantAllocation[] = [];
    vacancyByUnit.forEach((unitVacancyInvoices, unitId) => {
      const unit = units.find(u => u.id === unitId);
      if (!unit) return;
      
      // SOLL aus Leerstand-Vorschreibungen
      const sollBk = unitVacancyInvoices.reduce((sum, inv) => {
        const invAny = inv as any;
        return sum + Number(invAny.betriebskosten ?? invAny.betriebskostenVorschuss ?? 0);
      }, 0);
      const sollHk = unitVacancyInvoices.reduce((sum, inv) => {
        const invAny = inv as any;
        return sum + Number(invAny.heizungskosten ?? invAny.heizkostenVorschuss ?? invAny.heizkosten ?? 0);
      }, 0);
      const sollMiete = 0;
      const totalSoll = sollBk + sollHk;
      
      // IST: Nutze paid_amount aus Vorschreibungen
      const totalPaid = unitVacancyInvoices.reduce((sum, inv) => {
        const paid = Number((inv as any).paidAmount ?? (inv as any).paid_amount ?? 0);
        return sum + paid;
      }, 0);
      
      // Proportionale Verteilung
      const sollTotal = sollBk + sollHk;
      const istBk = sollTotal > 0 ? (sollBk / sollTotal) * totalPaid : 0;
      const istHk = sollTotal > 0 ? (sollHk / sollTotal) * totalPaid : 0;
      const istMiete = 0;
      const totalIst = istBk + istHk;
      
      const diffBk = sollBk - istBk;
      const diffHk = sollHk - istHk;
      const diffMiete = 0;
      const saldo = totalSoll - totalIst;
      
      vacancyAllocations.push({
        tenant: {
          id: `vacancy-${unitId}-${year}-${month}`,
          first_name: 'Leerstand',
          last_name: `(${unit.topNummer ?? unit.top_nummer})`,
          unit_id: unitId,
          grundmiete: 0,
          betriebskosten_vorschuss: sollBk,
          heizungskosten_vorschuss: sollHk,
          status: 'leerstand',
          mietbeginn: '',
          mietende: null,
        },
        unit: {
          id: unit.id,
          top_nummer: (unit as any).topNummer ?? (unit as any).top_nummer,
          type: (unit as any).type,
          property_id: (unit as any).propertyId ?? (unit as any).property_id,
        },
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
        ueberzahlung: 0,
        unterzahlung: saldo > 0 ? saldo : 0,
        saldo,
        oldestOverdueDays: 0,
        mahnstatus: 'aktuell',
        status: saldo > 0 ? 'offen' : 'vollstaendig',
      });
    });
    
    // Füge Leerstand-Allocations hinzu
    allocations.push(...vacancyAllocations);

    // Sort by saldo ascending (most debt first)
    allocations.sort((a, b) => a.saldo - b.saldo);

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
      paymentCount: periodPayments.length,
    });

    return { allocations, totals };
  }, [tenants, units, combinedPayments, selectedPropertyId, year, month]);

  return { ...result, isLoading };
}

/**
 * Berechnet MRG-Aufteilung aus übergebenen Daten (für PDF-Export)
 * Ohne React-Hooks, kann direkt aufgerufen werden
 */
export function calculateMrgAllocationsFromData(
  activeTenants: {
    id: string;
    first_name: string;
    last_name: string;
    unit_id: string;
    grundmiete: number;
    betriebskosten_vorschuss: number;
    heizungskosten_vorschuss: number;
    status: string;
    mietbeginn: string;
    mietende?: string | null;
  }[],
  units: {
    id: string;
    top_nummer: string;
    type: string;
    property_id: string;
  }[],
  payments: {
    tenant_id: string;
    amount: number;
    date: string;
  }[],
  year: number,
  month: number
): TenantAllocation[] {
  const now = new Date();
  const dayOfMonth = now.getDate();

  return activeTenants.map(tenant => {
    const sollBk = Number(tenant.betriebskosten_vorschuss || 0);
    const sollHk = Number(tenant.heizungskosten_vorschuss || 0);
    const sollMiete = Number(tenant.grundmiete || 0);
    const totalSoll = sollBk + sollHk + sollMiete;
    // Brutto = Netto + geschätzte USt (10% auf alles)
    const totalSollBrutto = totalSoll * 1.1;

    const tenantPayments = payments.filter(p => p.tenant_id === tenant.id);
    const totalIst = tenantPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const { istBk, istHk, istMiete, ueberzahlung, unterzahlung } = 
      calculateMrgAllocation(sollBk, sollHk, sollMiete, totalIst, totalSollBrutto);

    const diffBk = sollBk - istBk;
    const diffHk = sollHk - istHk;
    const diffMiete = sollMiete - istMiete;
    // Saldo: SOLL (brutto) - IST = positiv = Unterzahlung, negativ = Überzahlung
    const saldo = totalSollBrutto - totalIst;

    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    const daysOverdue = isCurrentMonth && saldo > 0 && dayOfMonth > 5 ? dayOfMonth - 5 : 0;

    let mahnstatus: 'aktuell' | 'Zahlungserinnerung' | '1. Mahnung' | '2. Mahnung' = 'aktuell';
    if (daysOverdue > 30) mahnstatus = '2. Mahnung';
    else if (daysOverdue > 14) mahnstatus = '1. Mahnung';
    else if (daysOverdue > 0) mahnstatus = 'Zahlungserinnerung';

    let status: 'vollstaendig' | 'teilbezahlt' | 'offen' | 'ueberzahlt' = 'offen';
    if (saldo < 0) status = 'ueberzahlt';
    else if (saldo === 0 && totalIst > 0) status = 'vollstaendig';
    else if (totalIst > 0 && saldo > 0) status = 'teilbezahlt';

    const unit = units.find(u => u.id === tenant.unit_id) || null;

    return {
      tenant: {
        id: tenant.id,
        first_name: tenant.first_name,
        last_name: tenant.last_name,
        unit_id: tenant.unit_id,
        grundmiete: tenant.grundmiete,
        betriebskosten_vorschuss: tenant.betriebskosten_vorschuss,
        heizungskosten_vorschuss: tenant.heizungskosten_vorschuss,
        status: tenant.status,
        mietbeginn: tenant.mietbeginn,
        mietende: tenant.mietende,
      },
      unit: unit ? {
        id: unit.id,
        top_nummer: unit.top_nummer,
        type: unit.type,
        property_id: unit.property_id,
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
  }).sort((a, b) => a.saldo - b.saldo);
}
