import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TransactionSplit {
  id: string;
  transaction_id: string;
  category_id: string | null;
  amount: number;
  description: string | null;
  created_at: string;
}

export type TransactionSplitInsert = Omit<TransactionSplit, 'id' | 'created_at'>;
export type TransactionSplitUpdate = Partial<Omit<TransactionSplit, 'id' | 'created_at' | 'transaction_id'>>;

export function useTransactionSplits(transactionId?: string) {
  return useQuery({
    queryKey: ['transaction_splits', transactionId],
    queryFn: async () => {
      if (!transactionId) return [];
      const { data, error } = await supabase
        .from('transaction_splits')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as TransactionSplit[];
    },
    enabled: !!transactionId,
  });
}

export function useCreateTransactionSplit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (split: TransactionSplitInsert) => {
      const { data, error } = await supabase
        .from('transaction_splits')
        .insert(split)
        .select()
        .single();
      
      if (error) throw error;
      return data as TransactionSplit;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transaction_splits', data.transaction_id] });
      toast.success('Split hinzugefügt');
    },
    onError: (error) => {
      toast.error('Fehler beim Erstellen des Splits');
      console.error('Create split error:', error);
    },
  });
}

export function useCreateTransactionSplits() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (splits: TransactionSplitInsert[]) => {
      const { data, error } = await supabase
        .from('transaction_splits')
        .insert(splits)
        .select();
      
      if (error) throw error;
      return data as TransactionSplit[];
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['transaction_splits', data[0].transaction_id] });
      }
      toast.success('Splits hinzugefügt');
    },
    onError: (error) => {
      toast.error('Fehler beim Erstellen der Splits');
      console.error('Create splits error:', error);
    },
  });
}

export function useUpdateTransactionSplit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, transactionId, ...updates }: TransactionSplitUpdate & { id: string; transactionId: string }) => {
      const { data, error } = await supabase
        .from('transaction_splits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, transactionId } as TransactionSplit & { transactionId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transaction_splits', data.transactionId] });
      toast.success('Split aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren des Splits');
      console.error('Update split error:', error);
    },
  });
}

export function useDeleteTransactionSplit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, transactionId }: { id: string; transactionId: string }) => {
      const { error } = await supabase
        .from('transaction_splits')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { transactionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transaction_splits', data.transactionId] });
      toast.success('Split gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen des Splits');
      console.error('Delete split error:', error);
    },
  });
}

export function useDeleteTransactionSplits() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from('transaction_splits')
        .delete()
        .eq('transaction_id', transactionId);
      
      if (error) throw error;
      return { transactionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transaction_splits', data.transactionId] });
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen der Splits');
      console.error('Delete splits error:', error);
    },
  });
}
