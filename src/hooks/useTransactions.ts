import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Transaction {
  id: string;
  organization_id: string | null;
  unit_id: string | null;
  tenant_id: string | null;
  amount: number;
  currency: string;
  transaction_date: string;
  booking_date: string | null;
  description: string | null;
  reference: string | null;
  counterpart_name: string | null;
  counterpart_iban: string | null;
  status: 'matched' | 'unmatched' | 'ignored';
  match_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionInsert {
  organization_id?: string | null;
  unit_id?: string | null;
  tenant_id?: string | null;
  amount: number;
  currency?: string;
  transaction_date: string;
  booking_date?: string | null;
  description?: string | null;
  reference?: string | null;
  counterpart_name?: string | null;
  counterpart_iban?: string | null;
  status?: 'matched' | 'unmatched' | 'ignored';
  match_confidence?: number | null;
}

export interface TransactionUpdate {
  unit_id?: string | null;
  tenant_id?: string | null;
  status?: 'matched' | 'unmatched' | 'ignored';
  match_confidence?: number | null;
}

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    },
  });
}

export function useTransactionsByUnit(unitId?: string) {
  return useQuery({
    queryKey: ['transactions', 'unit', unitId],
    queryFn: async () => {
      if (!unitId) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('unit_id', unitId)
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!unitId,
  });
}

export function useRecentTransactions(limit: number = 10) {
  return useQuery({
    queryKey: ['transactions', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Transaction[];
    },
  });
}

export function useUnmatchedTransactions() {
  return useQuery({
    queryKey: ['transactions', 'unmatched'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'unmatched')
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transaction: TransactionInsert) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();
      
      if (error) throw error;
      return data as Transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      console.error('Create transaction error:', error);
    },
  });
}

export function useCreateTransactions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transactions: TransactionInsert[]) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactions)
        .select();
      
      if (error) throw error;
      return data as Transaction[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`${data.length} Transaktionen erfolgreich importiert`);
    },
    onError: (error) => {
      toast.error('Fehler beim Importieren der Transaktionen');
      console.error('Create transactions error:', error);
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: TransactionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaktion aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren der Transaktion');
      console.error('Update transaction error:', error);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaktion gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen der Transaktion');
      console.error('Delete transaction error:', error);
    },
  });
}
