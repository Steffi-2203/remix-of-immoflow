import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDemoData } from '@/contexts/DemoDataContext';

export interface TenantDeposit {
  id: string;
  tenant_id: string;
  deposit_amount: number;
  deposit_paid_date: string | null;
  deposit_type: 'bar' | 'bankgarantie' | 'sparbuch' | 'versicherung';
  interest_rate: number;
  interest_accrued: number;
  last_interest_calc_date: string | null;
  deposit_returned_date: string | null;
  deposit_returned_amount: number | null;
  deductions: number;
  deduction_notes: string | null;
  bank_account: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useTenantDeposit(tenantId?: string) {
  const { isDemoMode } = useDemoData();

  return useQuery({
    queryKey: ['tenant-deposit', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('tenant_deposits')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as TenantDeposit | null;
    },
    enabled: !!tenantId && !isDemoMode,
  });
}

export function useCreateTenantDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deposit: Omit<TenantDeposit, 'id' | 'created_at' | 'updated_at' | 'interest_accrued' | 'last_interest_calc_date' | 'deposit_returned_date' | 'deposit_returned_amount' | 'deductions' | 'deduction_notes'>) => {
      const { data, error } = await supabase
        .from('tenant_deposits')
        .insert(deposit as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-deposit', variables.tenant_id] });
      toast.success('Kaution erfasst');
    },
    onError: () => {
      toast.error('Fehler beim Erfassen der Kaution');
    },
  });
}

export function useUpdateTenantDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tenantId, ...updates }: { id: string; tenantId: string } & Partial<TenantDeposit>) => {
      const { data, error } = await supabase
        .from('tenant_deposits')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-deposit', variables.tenantId] });
      toast.success('Kaution aktualisiert');
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren');
    },
  });
}

export function useReturnTenantDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tenantId, returnedAmount, deductions, deductionNotes }: {
      id: string;
      tenantId: string;
      returnedAmount: number;
      deductions: number;
      deductionNotes?: string;
    }) => {
      const { error } = await supabase
        .from('tenant_deposits')
        .update({
          deposit_returned_date: new Date().toISOString().split('T')[0],
          deposit_returned_amount: returnedAmount,
          deductions,
          deduction_notes: deductionNotes,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-deposit', variables.tenantId] });
      toast.success('Kaution rückerstattet');
    },
    onError: () => {
      toast.error('Fehler bei Rückerstattung');
    },
  });
}
