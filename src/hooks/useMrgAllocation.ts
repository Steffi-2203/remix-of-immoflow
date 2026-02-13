import { useQuery } from '@tanstack/react-query';

/**
 * MRG-konforme Zahlungsaufteilung pro Mieter
 * Priorität: BK → HK → Miete
 *
 * ⚠️ Berechnung erfolgt SERVER-SEITIG über POST /api/billing/mrg-allocation
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
 * MRG-konforme Aufteilung BK → HK → Miete (pure function for display/preview only).
 * Die autoritative Berechnung erfolgt serverseitig.
 * @deprecated Use server endpoint POST /api/billing/mrg-allocation instead
 */
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

const EMPTY_TOTALS = {
  sollBk: 0, sollHk: 0, sollMiete: 0, totalSoll: 0,
  istBk: 0, istHk: 0, istMiete: 0, totalIst: 0,
  totalUnterzahlung: 0, totalUeberzahlung: 0, saldo: 0,
  paymentCount: 0,
};

/**
 * Hook für MRG-konforme SOLL/IST-Berechnung pro Mieter.
 * Daten werden SERVER-SEITIG berechnet – kein Client-Side BK-Logik.
 */
export function useMrgAllocation(
  selectedPropertyId: string = 'all',
  year: number,
  month: number
): MrgAllocationResult {
  const { data, isLoading } = useQuery({
    queryKey: ['mrg-allocation', selectedPropertyId, year, month],
    queryFn: async () => {
      const res = await fetch('/api/billing/mrg-allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ propertyId: selectedPropertyId, year, month }),
      });
      if (!res.ok) throw new Error('MRG allocation failed');
      return res.json() as Promise<{ allocations: TenantAllocation[]; totals: typeof EMPTY_TOTALS }>;
    },
    staleTime: 30_000,
  });

  return {
    allocations: data?.allocations ?? [],
    totals: data?.totals ?? EMPTY_TOTALS,
    isLoading,
  };
}

/**
 * @deprecated Use server endpoint POST /api/billing/mrg-allocation instead
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

    const tenantPayments = payments.filter(p => p.tenant_id === tenant.id);
    const totalIst = tenantPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const { istBk, istHk, istMiete, ueberzahlung, unterzahlung } =
      calculateMrgAllocation(sollBk, sollHk, sollMiete, totalIst);

    const diffBk = sollBk - istBk;
    const diffHk = sollHk - istHk;
    const diffMiete = sollMiete - istMiete;
    const saldo = totalSoll - totalIst;

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
      sollBk, sollHk, sollMiete, totalSoll,
      istBk, istHk, istMiete, totalIst,
      diffBk, diffHk, diffMiete,
      ueberzahlung, unterzahlung, saldo,
      oldestOverdueDays: daysOverdue,
      mahnstatus,
      status,
    };
  }).sort((a, b) => a.saldo - b.saldo);
}
