import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useDemoData } from '@/contexts/DemoDataContext';

export type BankAccount = Tables<'bank_accounts'>;
export type BankAccountInsert = TablesInsert<'bank_accounts'>;
export type BankAccountUpdate = TablesUpdate<'bank_accounts'>;

export function useBankAccounts() {
  const { isDemoMode, bankAccounts: demoBankAccounts } = useDemoData();

  const realQuery = useQuery({
    queryKey: ['bank_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('account_name', { ascending: true });
      
      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !isDemoMode,
  });

  if (isDemoMode) {
    return { data: demoBankAccounts as any, isLoading: false, error: null, isError: false };
  }

  return realQuery;
}

export function useBankAccount(id?: string) {
  const { isDemoMode, bankAccounts: demoBankAccounts } = useDemoData();

  const realQuery = useQuery({
    queryKey: ['bank_accounts', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as BankAccount;
    },
    enabled: !!id && !isDemoMode,
  });

  if (isDemoMode) {
    return {
      data: demoBankAccounts.find(a => a.id === id) as any || null,
      isLoading: false,
      error: null,
      isError: false,
    };
  }

  return realQuery;
}

export function useBankBalance(accountId?: string, asOfDate?: string) {
  const { isDemoMode, bankAccounts: demoBankAccounts } = useDemoData();

  const realQuery = useQuery({
    queryKey: ['bank_balance', accountId, asOfDate],
    queryFn: async () => {
      if (!accountId) return null;
      
      const { data, error } = await supabase
        .rpc('calculate_bank_balance', { 
          account_id: accountId,
          as_of_date: asOfDate || new Date().toISOString().split('T')[0]
        });
      
      if (error) throw error;
      return data as number;
    },
    enabled: !!accountId && !isDemoMode,
  });

  if (isDemoMode) {
    const account = demoBankAccounts.find(a => a.id === accountId);
    return {
      data: account?.current_balance ?? 0,
      isLoading: false,
      error: null,
      isError: false,
    };
  }

  return realQuery;
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  const { isDemoMode, addBankAccount } = useDemoData();
  
  return useMutation({
    mutationFn: async (account: BankAccountInsert) => {
      if (isDemoMode) {
        return addBankAccount(account as any);
      }
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert(account)
        .select()
        .single();
      
      if (error) throw error;
      return data as BankAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast.success('Bankkonto erfolgreich angelegt');
    },
    onError: (error) => {
      toast.error('Fehler beim Anlegen des Bankkontos');
      console.error('Create bank account error:', error);
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();
  const { isDemoMode, updateBankAccount: updateDemoBankAccount } = useDemoData();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: BankAccountUpdate & { id: string }) => {
      if (isDemoMode) {
        updateDemoBankAccount(id, updates as any);
        return { id, ...updates } as any;
      }
      const { data, error } = await supabase
        .from('bank_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as BankAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank_balance'] });
      toast.success('Bankkonto aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren des Bankkontos');
      console.error('Update bank account error:', error);
    },
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();
  const { isDemoMode, deleteBankAccount: deleteDemoBankAccount } = useDemoData();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        deleteDemoBankAccount(id);
        return;
      }
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank_balance'] });
      toast.success('Bankkonto gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen des Bankkontos');
      console.error('Delete bank account error:', error);
    },
  });
}
