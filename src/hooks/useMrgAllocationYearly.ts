import { useQuery } from '@tanstack/react-query';
import { TenantAllocation } from './useMrgAllocation';

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

const EMPTY_TOTALS = {
  sollBk: 0, sollHk: 0, sollMiete: 0, totalSoll: 0,
  istBk: 0, istHk: 0, istMiete: 0, totalIst: 0,
  totalUnterzahlung: 0, totalUeberzahlung: 0, saldo: 0,
  paymentCount: 0,
};

/**
 * Hook für MRG-konforme SOLL/IST-Berechnung – KUMULIERT ÜBER GESAMTES JAHR.
 * ⚠️ Berechnung erfolgt SERVER-SEITIG über POST /api/billing/mrg-allocation-yearly
 */
export function useMrgAllocationYearly(
  selectedPropertyId: string = 'all',
  year: number,
  monthCount: number = 12
): MrgAllocationYearlyResult {
  const { data, isLoading } = useQuery({
    queryKey: ['mrg-allocation-yearly', selectedPropertyId, year, monthCount],
    queryFn: async () => {
      const res = await fetch('/api/billing/mrg-allocation-yearly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ propertyId: selectedPropertyId, year, monthCount }),
      });
      if (!res.ok) throw new Error('MRG allocation yearly failed');
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
