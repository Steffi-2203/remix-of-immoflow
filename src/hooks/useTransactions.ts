import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';

export interface Transaction {
  id: string;
  bank_account_id: string | null;
  transaction_date: string;
  value_date: string | null;
  amount: number;
  currency: string;
  description: string | null;
  counterpart_name: string | null;
  counterpart_iban: string | null;
  reference: string | null;
  category_id: string | null;
  tenant_id: string | null;
  unit_id: string | null;
  property_id: string | null;
  is_matched: boolean;
  matched_expense_id: string | null;
  matched_payment_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TransactionInsert = Omit<Transaction, 'id' | 'created_at' | 'updated_at'>;
export type TransactionUpdate = Partial<TransactionInsert>;

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    staleTime: 60000,
    gcTime: 300000,
    queryFn: async () => {
      const response = await fetch('/api/transactions', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json() as Promise<Transaction[]>;
    },
  });
}

export function useTransactionsByUnit(unitId?: string) {
  return useQuery({
    queryKey: ['transactions', 'unit', unitId],
    staleTime: 60000,
    queryFn: async () => {
      if (!unitId) return [];
      const response = await fetch(`/api/transactions?unit_id=${unitId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json() as Promise<Transaction[]>;
    },
    enabled: !!unitId,
  });
}

export function useTransactionsByBankAccount(bankAccountId?: string) {
  return useQuery({
    queryKey: ['transactions', 'bank_account', bankAccountId],
    staleTime: 60000,
    queryFn: async () => {
      if (!bankAccountId) return [];
      const response = await fetch(`/api/bank-accounts/${bankAccountId}/transactions`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json() as Promise<Transaction[]>;
    },
    enabled: !!bankAccountId,
  });
}

export function useTransactionsByCategory(categoryId?: string) {
  return useQuery({
    queryKey: ['transactions', 'category', categoryId],
    staleTime: 60000,
    queryFn: async () => {
      if (!categoryId) return [];
      const response = await fetch(`/api/transactions?category_id=${categoryId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json() as Promise<Transaction[]>;
    },
    enabled: !!categoryId,
  });
}

export function useRecentTransactions(limit: number = 10) {
  return useQuery({
    queryKey: ['transactions', 'recent', limit],
    staleTime: 60000,
    queryFn: async () => {
      const response = await fetch(`/api/transactions?limit=${limit}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json() as Promise<Transaction[]>;
    },
  });
}

export function useUnmatchedTransactions() {
  return useQuery({
    queryKey: ['transactions', 'unmatched'],
    staleTime: 60000,
    queryFn: async () => {
      const response = await fetch('/api/transactions?unmatched=true', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json() as Promise<Transaction[]>;
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
  const { data: transactions } = useTransactions();
  
  return useQuery({
    queryKey: ['transactions', 'summary', startDate, endDate],
    staleTime: 60000,
    queryFn: async () => {
      const filtered = (transactions || []).filter(t => {
        if (startDate && t.transaction_date < startDate) return false;
        if (endDate && t.transaction_date > endDate) return false;
        return true;
      });
      
      const totalIncome = filtered
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const totalExpenses = filtered
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const incomeByCategory = new Map<string | null, { categoryName: string; total: number }>();
      const expensesByCategory = new Map<string | null, { categoryName: string; total: number }>();
      
      for (const t of filtered) {
        const categoryId = t.category_id;
        const categoryName = 'Nicht kategorisiert';
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
        })).sort((a, b) => a.total - b.total),
      } as TransactionSummary;
    },
    enabled: !!transactions,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transaction: TransactionInsert) => {
      const response = await apiRequest('POST', '/api/transactions', transaction);
      return response.json() as Promise<Transaction>;
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
      const results: Transaction[] = [];
      for (const t of transactions) {
        const response = await apiRequest('POST', '/api/transactions', t);
        results.push(await response.json());
      }
      return results;
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
      const finalUpdates = { ...updates };
      
      const hasAssignment = 
        updates.unit_id || 
        updates.tenant_id || 
        updates.property_id || 
        updates.category_id;
      
      if (hasAssignment) {
        finalUpdates.is_matched = true;
      }
      
      const response = await apiRequest('PATCH', `/api/transactions/${id}`, finalUpdates);
      return response.json() as Promise<Transaction>;
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
      await apiRequest('DELETE', `/api/transactions/${id}`);
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
