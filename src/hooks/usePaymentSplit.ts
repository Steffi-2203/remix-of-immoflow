import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PaymentSplitResult {
  bkAmount: number;
  hkAmount: number;
  mietAmount: number;
  unterzahlung: number;
  splits: Array<{
    category_id: string;
    amount: number;
    description: string;
  }>;
}

/**
 * Splits a payment according to MRG priority:
 * 1. Betriebskosten (BK) - highest priority
 * 2. Heizungskosten (HK) - second priority  
 * 3. Grundmiete - gets the rest
 * 
 * If payment is less than expected, BK and HK are filled first (MRG-compliant)
 */
export function calculatePaymentSplit(
  paymentAmount: number,
  bkSoll: number,
  hkSoll: number,
  mieteSoll: number,
  categories: { bkCategoryId: string; hkCategoryId: string; mieteCategoryId: string }
): PaymentSplitResult {
  let remaining = paymentAmount;
  
  // Priority 1: Betriebskosten
  const bkAmount = Math.min(remaining, bkSoll);
  remaining -= bkAmount;
  
  // Priority 2: Heizungskosten
  const hkAmount = Math.min(remaining, hkSoll);
  remaining -= hkAmount;
  
  // Priority 3: Miete (rest)
  const mietAmount = remaining;
  
  // Calculate underpayment
  const totalSoll = bkSoll + hkSoll + mieteSoll;
  const unterzahlung = Math.max(0, totalSoll - paymentAmount);
  
  const splits: PaymentSplitResult['splits'] = [];
  
  if (bkAmount > 0) {
    splits.push({
      category_id: categories.bkCategoryId,
      amount: bkAmount,
      description: 'Betriebskostenvorauszahlung',
    });
  }
  
  if (hkAmount > 0) {
    splits.push({
      category_id: categories.hkCategoryId,
      amount: hkAmount,
      description: 'Heizungskostenvorauszahlung',
    });
  }
  
  if (mietAmount > 0) {
    splits.push({
      category_id: categories.mieteCategoryId,
      amount: mietAmount,
      description: 'Grundmiete',
    });
  }
  
  return {
    bkAmount,
    hkAmount,
    mietAmount,
    unterzahlung,
    splits,
  };
}

export function useAssignPaymentWithSplit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      transactionId,
      tenantId,
      unitId,
      paymentAmount,
      tenant,
      categories,
    }: {
      transactionId: string;
      tenantId: string;
      unitId: string;
      paymentAmount: number;
      tenant: {
        betriebskosten_vorschuss: number;
        heizungskosten_vorschuss: number;
        grundmiete: number;
      };
      categories: {
        bkCategoryId: string;
        hkCategoryId: string;
        mieteCategoryId: string;
      };
    }) => {
      // Calculate the split
      const splitResult = calculatePaymentSplit(
        paymentAmount,
        tenant.betriebskosten_vorschuss,
        tenant.heizungskosten_vorschuss,
        tenant.grundmiete,
        categories
      );
      
      // Delete existing splits for this transaction
      await supabase
        .from('transaction_splits')
        .delete()
        .eq('transaction_id', transactionId);
      
      // Create new splits
      if (splitResult.splits.length > 0) {
        const splitsToInsert = splitResult.splits.map(s => ({
          transaction_id: transactionId,
          category_id: s.category_id,
          amount: s.amount,
          description: s.description,
        }));
        
        const { error: splitError } = await supabase
          .from('transaction_splits')
          .insert(splitsToInsert);
        
        if (splitError) {
          console.error('Error creating splits:', splitError);
          throw splitError;
        }
      }
      
      // Update the transaction
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          tenant_id: tenantId,
          unit_id: unitId,
          status: 'matched',
          matched_at: new Date().toISOString(),
          is_split: splitResult.splits.length > 1,
          // Keep the main category as Mieteinnahmen for the parent transaction
          category_id: categories.mieteCategoryId,
        })
        .eq('id', transactionId);
      
      if (updateError) {
        throw updateError;
      }
      
      return splitResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction_splits'] });
      
      const parts: string[] = [];
      if (result.bkAmount > 0) parts.push(`BK: €${result.bkAmount.toFixed(2)}`);
      if (result.hkAmount > 0) parts.push(`HK: €${result.hkAmount.toFixed(2)}`);
      if (result.mietAmount > 0) parts.push(`Miete: €${result.mietAmount.toFixed(2)}`);
      
      toast.success('Zahlung aufgeteilt', {
        description: parts.join(' | '),
      });
      
      if (result.unterzahlung > 0) {
        toast.warning(`Unterzahlung: €${result.unterzahlung.toFixed(2)}`);
      }
    },
    onError: (error) => {
      console.error('Payment split error:', error);
      toast.error('Fehler beim Aufteilen der Zahlung');
    },
  });
}

// Hook to get the required categories
export function usePaymentCategories() {
  return async () => {
    const { data: categories } = await supabase
      .from('account_categories')
      .select('id, name')
      .in('name', ['Betriebskostenvorauszahlungen', 'Heizungskostenvorauszahlungen', 'Mieteinnahmen'])
      .eq('type', 'income');
    
    if (!categories || categories.length < 2) {
      throw new Error('Erforderliche Kategorien nicht gefunden');
    }
    
    const bk = categories.find(c => c.name === 'Betriebskostenvorauszahlungen');
    const hk = categories.find(c => c.name === 'Heizungskostenvorauszahlungen');
    const miete = categories.find(c => c.name === 'Mieteinnahmen');
    
    return {
      bkCategoryId: bk?.id || '',
      hkCategoryId: hk?.id || miete?.id || '', // Fallback to Miete if HK doesn't exist
      mieteCategoryId: miete?.id || '',
    };
  };
}
