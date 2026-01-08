import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LinkedExpense {
  id: string;
  bezeichnung: string;
  betrag: number;
  datum: string;
  beleg_url: string | null;
  beleg_nummer: string | null;
  transaction_id: string;
}

export function useLinkedExpenses() {
  return useQuery({
    queryKey: ['expenses', 'linked'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, bezeichnung, betrag, datum, beleg_url, beleg_nummer, transaction_id')
        .not('transaction_id', 'is', null);
      
      if (error) throw error;
      return data as LinkedExpense[];
    },
  });
}

export function useLinkedExpensesMap() {
  const { data: linkedExpenses = [] } = useLinkedExpenses();
  
  // Create a map from transaction_id to expense for quick lookup
  const expensesByTransactionId = useMemo(() => {
    const map = new Map<string, LinkedExpense>();
    for (const expense of linkedExpenses) {
      if (expense.transaction_id) {
        map.set(expense.transaction_id, expense);
      }
    }
    return map;
  }, [linkedExpenses]);
  
  return expensesByTransactionId;
}
