import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChartAccount {
  id: string;
  organization_id: string | null;
  account_number: string;
  name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  parent_id: string | null;
  is_system: boolean;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useChartOfAccounts() {
  return useQuery({
    queryKey: ['chart_of_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_number', { ascending: true });
      if (error) throw error;
      return data as ChartAccount[];
    },
  });
}

export function useChartOfAccountsByType(type: ChartAccount['account_type']) {
  return useQuery({
    queryKey: ['chart_of_accounts', type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('account_type', type)
        .eq('is_active', true)
        .order('account_number', { ascending: true });
      if (error) throw error;
      return data as ChartAccount[];
    },
  });
}
