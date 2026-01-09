import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Transaction = Tables<'transactions'>;
export type TransactionInsert = TablesInsert<'transactions'>;
export type TransactionUpdate = TablesUpdate<'transactions'>;

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

export function useTransactionsByBankAccount(bankAccountId?: string) {
  return useQuery({
    queryKey: ['transactions', 'bank_account', bankAccountId],
    queryFn: async () => {
      if (!bankAccountId) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('bank_account_id', bankAccountId)
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!bankAccountId,
  });
}

export function useTransactionsByCategory(categoryId?: string) {
  return useQuery({
    queryKey: ['transactions', 'category', categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('category_id', categoryId)
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!categoryId,
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

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  incomeByCategory: { categoryId: string | null; categoryName: string; total: number }[];
  expensesByCategory: { categoryId: string | null; categoryName: string; total: number }[];
}

export function useTransactionSummary(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['transactions', 'summary', startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*, account_categories(id, name, type)');
      
      if (startDate) {
        query = query.gte('transaction_date', startDate);
      }
      if (endDate) {
        query = query.lte('transaction_date', endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const transactions = data as Array<Transaction & { account_categories: { id: string; name: string; type: string } | null }>;
      
      // Calculate totals
      const totalIncome = transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const totalExpenses = transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Group by category
      const incomeByCategory = new Map<string | null, { categoryName: string; total: number }>();
      const expensesByCategory = new Map<string | null, { categoryName: string; total: number }>();
      
      for (const t of transactions) {
        const categoryId = t.category_id;
        const categoryName = t.account_categories?.name || 'Nicht kategorisiert';
        const map = t.amount > 0 ? incomeByCategory : expensesByCategory;
        
        const existing = map.get(categoryId);
        if (existing) {
          existing.total += Number(t.amount);
        } else {
          map.set(categoryId, { categoryName, total: Number(t.amount) });
        }
      }
      
      return {
        totalIncome,
        totalExpenses,
        balance: totalIncome + totalExpenses,
        incomeByCategory: Array.from(incomeByCategory.entries()).map(([categoryId, data]) => ({
          categoryId,
          ...data
        })).sort((a, b) => b.total - a.total),
        expensesByCategory: Array.from(expensesByCategory.entries()).map(([categoryId, data]) => ({
          categoryId,
          ...data
        })).sort((a, b) => a.total - b.total), // Most negative first
      } as TransactionSummary;
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
      // Auto-set status to 'matched' if unit, tenant, property, or category is assigned
      const finalUpdates = { ...updates };
      
      // If any assignment field is being set, auto-update status to matched
      const hasAssignment = 
        updates.unit_id || 
        updates.tenant_id || 
        updates.property_id || 
        updates.category_id;
      
      // Only auto-update status if not explicitly set and there's an assignment
      if (hasAssignment && !updates.status) {
        finalUpdates.status = 'matched';
        finalUpdates.matched_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('transactions')
        .update(finalUpdates)
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
