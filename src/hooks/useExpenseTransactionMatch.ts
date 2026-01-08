import { useMemo } from 'react';
import { useTransactions } from './useTransactions';
import { Expense } from './useExpenses';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface TransactionMatch {
  transactionId: string;
  amount: number;
  date: string;
  counterpartName: string | null;
  description: string | null;
  confidence: number;
  matchReasons: string[];
}

export interface ExpenseWithMatches extends Expense {
  suggestedMatches: TransactionMatch[];
  linkedTransaction?: {
    id: string;
    amount: number;
    date: string;
    counterpartName: string | null;
  };
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

// Check if dates are within range (±7 days)
function datesWithinRange(date1: string, date2: string, rangeDays: number = 7): boolean {
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

export function useExpenseTransactionMatch(expenses: Expense[]) {
  const { data: transactions = [] } = useTransactions();
  
  // Find potential matches for each expense
  const expensesWithMatches = useMemo((): ExpenseWithMatches[] => {
    return expenses.map(expense => {
      // If already linked, find the linked transaction
      if (expense.transaction_id) {
        const linkedTx = transactions.find(t => t.id === expense.transaction_id);
        return {
          ...expense,
          suggestedMatches: [],
          linkedTransaction: linkedTx ? {
            id: linkedTx.id,
            amount: Number(linkedTx.amount),
            date: linkedTx.transaction_date,
            counterpartName: linkedTx.counterpart_name,
          } : undefined,
        };
      }
      
      // Find matching transactions (negative amounts = expenses in bank)
      const potentialMatches: TransactionMatch[] = [];
      
      for (const tx of transactions) {
        const txAmount = Number(tx.amount);
        
        // Skip positive amounts (income) and already matched transactions
        if (txAmount >= 0) continue;
        
        // Check if this transaction is already linked to another expense
        const isAlreadyLinked = expenses.some(
          e => e.transaction_id === tx.id && e.id !== expense.id
        );
        if (isAlreadyLinked) continue;
        
        // Amount matching (expense.betrag should match abs(tx.amount))
        const expenseAmount = Number(expense.betrag);
        const txAbsAmount = Math.abs(txAmount);
        const amountDiff = Math.abs(expenseAmount - txAbsAmount);
        const amountMatch = amountDiff < 0.01; // Exact match
        const closeAmountMatch = amountDiff / expenseAmount < 0.05; // Within 5%
        
        if (!amountMatch && !closeAmountMatch) continue;
        
        // Date matching (within ±7 days)
        if (!datesWithinRange(expense.datum, tx.transaction_date, 14)) continue;
        
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
        const dateScore = dateProximityScore(expense.datum, tx.transaction_date);
        confidence += dateScore * 0.3;
        if (dateScore >= 0.9) {
          matchReasons.push('Gleiches/nächstes Datum');
        } else if (dateScore >= 0.5) {
          matchReasons.push('Naheliegendes Datum');
        }
        
        // Supplier/description matching
        const supplierMatch = fuzzyMatch(expense.bezeichnung, tx.counterpart_name);
        const descriptionMatch = fuzzyMatch(expense.bezeichnung, tx.description);
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
            transactionId: tx.id,
            amount: txAmount,
            date: tx.transaction_date,
            counterpartName: tx.counterpart_name,
            description: tx.description,
            confidence: Math.min(confidence, 1),
            matchReasons,
          });
        }
      }
      
      // Sort by confidence (highest first)
      potentialMatches.sort((a, b) => b.confidence - a.confidence);
      
      return {
        ...expense,
        suggestedMatches: potentialMatches.slice(0, 3), // Top 3 matches
      };
    });
  }, [expenses, transactions]);
  
  return expensesWithMatches;
}

// Hook to link/unlink expense with transaction
export function useLinkExpenseTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ expenseId, transactionId }: { expenseId: string; transactionId: string | null }) => {
      const { error } = await supabase
        .from('expenses')
        .update({ transaction_id: transactionId })
        .eq('id', expenseId);
      
      if (error) throw error;
    },
    onSuccess: (_, { transactionId }) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      if (transactionId) {
        toast.success('Kosten mit Transaktion verknüpft');
      } else {
        toast.success('Verknüpfung aufgehoben');
      }
    },
    onError: (error) => {
      console.error('Error linking expense:', error);
      toast.error('Fehler beim Verknüpfen');
    },
  });
}

// Auto-match all unlinked expenses
export function useAutoMatchExpenses() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (matches: Array<{ expenseId: string; transactionId: string }>) => {
      const results = await Promise.all(
        matches.map(async ({ expenseId, transactionId }) => {
          const { error } = await supabase
            .from('expenses')
            .update({ transaction_id: transactionId })
            .eq('id', expenseId);
          
          return { expenseId, transactionId, error };
        })
      );
      
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`${errors.length} Fehler beim Verknüpfen`);
      }
      
      return results.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`${count} Kosten automatisch verknüpft`);
    },
    onError: (error) => {
      console.error('Error auto-matching:', error);
      toast.error('Fehler beim automatischen Verknüpfen');
    },
  });
}
