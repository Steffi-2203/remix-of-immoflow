import { useMemo } from 'react';
import { useExpenses } from './useExpenses';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  amount: number;
  transaction_date: string;
  counterpart_name: string | null;
  description: string | null;
  property_id?: string | null;
}

export interface ExpenseMatch {
  expenseId: string;
  bezeichnung: string;
  betrag: number;
  datum: string;
  propertyName: string | null;
  beleg_url: string | null;
  confidence: number;
  matchReasons: string[];
}

// Fuzzy string matching helper
function fuzzyMatch(str1: string | null, str2: string | null): number {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Check for common words
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
  
  if (commonWords.length > 0) {
    return 0.5 + (commonWords.length / Math.max(words1.length, words2.length)) * 0.3;
  }
  
  return 0;
}

// Check if dates are within range (±14 days by default)
function datesWithinRange(date1: string, date2: string, rangeDays: number = 14): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= rangeDays;
}

// Calculate date proximity score (closer = higher)
function dateProximityScore(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffDays = Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
  
  if (diffDays === 0) return 1;
  if (diffDays <= 1) return 0.9;
  if (diffDays <= 3) return 0.7;
  if (diffDays <= 7) return 0.5;
  return 0.3;
}

// Find matching expenses for a transaction (Transaction-First workflow)
export function useTransactionExpenseMatch(transaction: Transaction | null) {
  const { data: expenses = [] } = useExpenses();
  
  const suggestedExpenses = useMemo((): ExpenseMatch[] => {
    if (!transaction) return [];
    
    const txAmount = Number(transaction.amount);
    
    // Only match outgoing transactions (negative amounts)
    if (txAmount >= 0) return [];
    
    const potentialMatches: ExpenseMatch[] = [];
    
    for (const expense of expenses) {
      // Skip already linked expenses
      if (expense.transaction_id) continue;
      
      // Amount matching
      const expenseAmount = Number(expense.betrag);
      const txAbsAmount = Math.abs(txAmount);
      const amountDiff = Math.abs(expenseAmount - txAbsAmount);
      const amountMatch = amountDiff < 0.01; // Exact match
      const closeAmountMatch = amountDiff / expenseAmount < 0.05; // Within 5%
      
      if (!amountMatch && !closeAmountMatch) continue;
      
      // Date matching (within ±14 days)
      if (!datesWithinRange(expense.datum, transaction.transaction_date, 14)) continue;
      
      // Calculate confidence score
      const matchReasons: string[] = [];
      let confidence = 0;
      
      // Amount score
      if (amountMatch) {
        confidence += 0.5;
        matchReasons.push('Exakter Betrag');
      } else if (closeAmountMatch) {
        confidence += 0.3;
        matchReasons.push('Ähnlicher Betrag');
      }
      
      // Date score
      const dateScore = dateProximityScore(expense.datum, transaction.transaction_date);
      confidence += dateScore * 0.3;
      if (dateScore >= 0.9) {
        matchReasons.push('Gleiches/nächstes Datum');
      } else if (dateScore >= 0.5) {
        matchReasons.push('Naheliegendes Datum');
      }
      
      // Description matching
      const supplierMatch = fuzzyMatch(expense.bezeichnung, transaction.counterpart_name);
      const descriptionMatch = fuzzyMatch(expense.bezeichnung, transaction.description);
      const bestTextMatch = Math.max(supplierMatch, descriptionMatch);
      
      if (bestTextMatch > 0) {
        confidence += bestTextMatch * 0.2;
        if (bestTextMatch >= 0.7) {
          matchReasons.push('Lieferant erkannt');
        } else if (bestTextMatch >= 0.4) {
          matchReasons.push('Ähnliche Beschreibung');
        }
      }
      
      if (confidence >= 0.4) {
        potentialMatches.push({
          expenseId: expense.id,
          bezeichnung: expense.bezeichnung,
          betrag: expenseAmount,
          datum: expense.datum,
          propertyName: (expense as any).properties?.name || null,
          beleg_url: expense.beleg_url || null,
          confidence: Math.min(confidence, 1),
          matchReasons,
        });
      }
    }
    
    // Sort by confidence (highest first)
    potentialMatches.sort((a, b) => b.confidence - a.confidence);
    
    return potentialMatches.slice(0, 5); // Top 5 matches
  }, [transaction, expenses]);
  
  return suggestedExpenses;
}

// Hook to link transaction with expense (from transaction side)
export function useLinkTransactionToExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ expenseId, transactionId }: { expenseId: string; transactionId: string }) => {
      const { error } = await supabase
        .from('expenses')
        .update({ transaction_id: transactionId })
        .eq('id', expenseId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaktion mit Kostenbeleg verknüpft');
    },
    onError: (error) => {
      console.error('Error linking transaction to expense:', error);
      toast.error('Fehler beim Verknüpfen');
    },
  });
}
