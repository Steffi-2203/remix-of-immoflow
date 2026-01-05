import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type BankAccount = Tables<'bank_accounts'>;
export type BankAccountInsert = TablesInsert<'bank_accounts'>;
export type BankAccountUpdate = TablesUpdate<'bank_accounts'>;

export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('account_name', { ascending: true });
      
      if (error) throw error;
      return data as BankAccount[];
    },
  });
}

export function useBankAccount(id?: string) {
  return useQuery({
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
    enabled: !!id,
  });
}

// Hook to calculate bank balance using the database function
export function useBankBalance(accountId?: string, asOfDate?: string) {
  return useQuery({
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
    enabled: !!accountId,
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (account: BankAccountInsert) => {
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
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: BankAccountUpdate & { id: string }) => {
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
  
  return useMutation({
    mutationFn: async (id: string) => {
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
