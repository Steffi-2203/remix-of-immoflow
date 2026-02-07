import { useDemoData } from '@/contexts/DemoDataContext';
import { useJournalEntries, useAccountBalances, type JournalEntry, type AccountBalance } from './useJournalEntries';
import { useChartOfAccounts, type ChartAccount } from './useChartOfAccounts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  mockJournalEntries,
  mockChartOfAccounts,
  calculateMockAccountBalances,
  mockFixedAssets,
  type DemoFixedAsset,
} from '@/data/mockAccountingData';

/**
 * Demo-aware wrapper hooks for accounting.
 * In demo mode (tester role), returns mock data.
 * In full mode, delegates to the real Supabase hooks.
 */

export function useDemoJournalEntries(filters?: {
  startDate?: string;
  endDate?: string;
  sourceType?: string;
  propertyId?: string;
}) {
  const { isDemoMode } = useDemoData();
  const realQuery = useJournalEntries(isDemoMode ? undefined : filters);

  if (isDemoMode) {
    let entries = [...mockJournalEntries];
    if (filters?.startDate) entries = entries.filter(e => e.entry_date >= filters.startDate!);
    if (filters?.endDate) entries = entries.filter(e => e.entry_date <= filters.endDate!);
    if (filters?.sourceType) entries = entries.filter(e => e.source_type === filters.sourceType);
    if (filters?.propertyId) entries = entries.filter(e => e.property_id === filters.propertyId);

    return {
      data: entries,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useJournalEntries>;
  }

  return realQuery;
}

export function useDemoAccountBalances(startDate?: string, endDate?: string) {
  const { isDemoMode } = useDemoData();
  const realQuery = useAccountBalances(
    isDemoMode ? undefined : startDate,
    isDemoMode ? undefined : endDate
  );

  if (isDemoMode) {
    return {
      data: calculateMockAccountBalances(startDate, endDate),
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAccountBalances>;
  }

  return realQuery;
}

export function useDemoChartOfAccounts() {
  const { isDemoMode } = useDemoData();
  const realQuery = useChartOfAccounts();

  if (isDemoMode) {
    return {
      data: mockChartOfAccounts,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useChartOfAccounts>;
  }

  return realQuery;
}

export function useDemoFixedAssets() {
  const { isDemoMode } = useDemoData();

  const realQuery = useQuery({
    queryKey: ['fixed_assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_assets')
        .select('*')
        .order('acquisition_date', { ascending: false });
      if (error) throw error;
      return data as DemoFixedAsset[];
    },
    enabled: !isDemoMode,
  });

  if (isDemoMode) {
    return {
      data: mockFixedAssets,
      isLoading: false,
      error: null,
    } as typeof realQuery;
  }

  return realQuery;
}
