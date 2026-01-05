import { supabase } from '@/integrations/supabase/client';
import { useAccountCategories } from './useAccountCategories';
import { useOrganization } from './useOrganization';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PaymentInsert } from './usePayments';
import type { TablesInsert } from '@/integrations/supabase/types';

type TransactionInsert = TablesInsert<'transactions'>;

export function usePaymentSync() {
  const queryClient = useQueryClient();
  const { data: categories } = useAccountCategories();
  const { data: organization } = useOrganization();

  // Get the Mieteinnahmen category
  const getMieteinnahmenCategory = () => {
    return categories?.find(c => c.name === 'Mieteinnahmen' && c.type === 'income');
  };

  // Create payment and sync to transactions
  const createPaymentWithSync = useMutation({
    mutationFn: async (params: {
      payment: PaymentInsert;
      unitId?: string;
      skipTransactionSync?: boolean;
    }) => {
      const { payment, unitId, skipTransactionSync } = params;

      // 1. Create the payment
      const { data: createdPayment, error: paymentError } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Sync to transactions (if not skipped)
      if (!skipTransactionSync && organization?.id) {
        const mieteinnahmenCategory = getMieteinnahmenCategory();
        
        if (mieteinnahmenCategory) {
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              organization_id: organization.id,
              unit_id: unitId || null,
              tenant_id: payment.tenant_id,
              amount: payment.betrag,
              currency: 'EUR',
              transaction_date: payment.eingangs_datum,
              booking_date: payment.buchungs_datum,
              description: `Mietzahlung ${payment.referenz || ''}`.trim(),
              reference: payment.referenz || null,
              category_id: mieteinnahmenCategory.id,
              status: unitId ? 'matched' : 'unmatched',
            });

          if (transactionError) {
            console.error('Failed to sync payment to transactions:', transactionError);
            // Don't throw - payment was created successfully
          }
        }
      }

      return createdPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Mieteinnahme erfolgreich erfasst');
    },
    onError: (error) => {
      toast.error('Fehler beim Erfassen der Mieteinnahme');
      console.error('Create payment with sync error:', error);
    },
  });

  // Create transaction and sync to payments (if it's a Mieteinnahme with tenant)
  const createTransactionWithSync = useMutation({
    mutationFn: async (params: {
      transaction: TransactionInsert;
      skipPaymentSync?: boolean;
    }) => {
      const { transaction, skipPaymentSync } = params;

      // 1. Create the transaction
      const { data: createdTransaction, error: transactionError } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();

      if (transactionError) throw transactionError;

      // 2. Sync to payments (if it's a Mieteinnahme with tenant)
      if (!skipPaymentSync && transaction.tenant_id && transaction.amount && transaction.amount > 0) {
        const mieteinnahmenCategory = getMieteinnahmenCategory();
        
        if (mieteinnahmenCategory && transaction.category_id === mieteinnahmenCategory.id) {
          const { error: paymentError } = await supabase
            .from('payments')
            .insert({
              tenant_id: transaction.tenant_id,
              invoice_id: null,
              betrag: transaction.amount,
              zahlungsart: 'ueberweisung',
              referenz: transaction.reference || transaction.description || null,
              eingangs_datum: transaction.transaction_date,
              buchungs_datum: transaction.booking_date || transaction.transaction_date,
            });

          if (paymentError) {
            console.error('Failed to sync transaction to payments:', paymentError);
            // Don't throw - transaction was created successfully
          }
        }
      }

      return createdTransaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Buchung erfolgreich erfasst');
    },
    onError: (error) => {
      toast.error('Fehler beim Erfassen der Buchung');
      console.error('Create transaction with sync error:', error);
    },
  });

  return {
    createPaymentWithSync,
    createTransactionWithSync,
    getMieteinnahmenCategory,
  };
}
