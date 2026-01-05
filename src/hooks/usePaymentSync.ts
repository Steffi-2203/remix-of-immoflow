import { supabase } from '@/integrations/supabase/client';
import { useAccountCategories } from './useAccountCategories';
import { useOrganization } from './useOrganization';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PaymentInsert } from './usePayments';
import type { TablesInsert, Enums } from '@/integrations/supabase/types';

type TransactionInsert = TablesInsert<'transactions'>;
type ExpenseCategory = Enums<'expense_category'>;
type ExpenseType = Enums<'expense_type'>;

// Mapping von Buchhaltungs-Kategorien zu Expense-Kategorien für BK-Abrechnung
const CATEGORY_TO_EXPENSE_MAPPING: Record<string, {
  category: ExpenseCategory;
  expenseType: ExpenseType;
}> = {
  'Versicherungen': { category: 'betriebskosten_umlagefaehig', expenseType: 'versicherung' },
  'Grundsteuer': { category: 'betriebskosten_umlagefaehig', expenseType: 'grundsteuer' },
  'Müllabfuhr': { category: 'betriebskosten_umlagefaehig', expenseType: 'muellabfuhr' },
  'Wasser/Abwasser': { category: 'betriebskosten_umlagefaehig', expenseType: 'wasser_abwasser' },
  'Heizung': { category: 'betriebskosten_umlagefaehig', expenseType: 'heizung' },
  'Strom Allgemein': { category: 'betriebskosten_umlagefaehig', expenseType: 'strom_allgemein' },
  'Hausbetreuung/Reinigung': { category: 'betriebskosten_umlagefaehig', expenseType: 'hausbetreuung' },
  'Lift/Aufzug': { category: 'betriebskosten_umlagefaehig', expenseType: 'lift' },
  'Gartenpflege': { category: 'betriebskosten_umlagefaehig', expenseType: 'gartenpflege' },
  'Schneeräumung': { category: 'betriebskosten_umlagefaehig', expenseType: 'schneeraeumung' },
  'Verwaltungskosten': { category: 'betriebskosten_umlagefaehig', expenseType: 'verwaltung' },
  'Instandhaltung': { category: 'instandhaltung', expenseType: 'sonstiges' },
  'Reparaturen': { category: 'instandhaltung', expenseType: 'reparatur' },
};

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

  // Helper: Get category name by ID
  const getCategoryNameById = (categoryId: string | null | undefined) => {
    if (!categoryId) return null;
    return categories?.find(c => c.id === categoryId)?.name || null;
  };

  // Create expense from transaction (for BK-Abrechnung sync)
  const createExpenseFromTransaction = async (
    transaction: {
      description?: string | null;
      amount: number;
      transaction_date: string;
      reference?: string | null;
      property_id?: string | null;
    },
    categoryName: string
  ) => {
    const mapping = CATEGORY_TO_EXPENSE_MAPPING[categoryName];
    if (!mapping || !transaction.property_id) {
      console.log('Skipping expense sync: no mapping or property_id', { categoryName, property_id: transaction.property_id });
      return null;
    }
    
    const date = new Date(transaction.transaction_date);
    
    const { data, error } = await supabase.from('expenses').insert({
      property_id: transaction.property_id,
      category: mapping.category,
      expense_type: mapping.expenseType,
      bezeichnung: transaction.description || categoryName,
      betrag: Math.abs(transaction.amount), // Positiver Wert in expenses
      datum: transaction.transaction_date,
      beleg_nummer: transaction.reference || null,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    }).select().single();
    
    if (error) {
      console.error('Failed to sync transaction to expenses:', error);
      return null;
    }
    
    return data;
  };

  // Create transaction and sync to payments/expenses
  const createTransactionWithSync = useMutation({
    mutationFn: async (params: {
      transaction: TransactionInsert;
      skipPaymentSync?: boolean;
      skipExpenseSync?: boolean;
    }) => {
      const { transaction, skipPaymentSync, skipExpenseSync } = params;

      // 1. Create the transaction
      const { data: createdTransaction, error: transactionError } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Get category name for sync logic
      const categoryName = getCategoryNameById(transaction.category_id);

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
          }
        }
      }

      // 3. Sync to expenses (if it's a BK-relevant expense with property)
      if (!skipExpenseSync && transaction.amount && transaction.amount < 0 && categoryName) {
        if (CATEGORY_TO_EXPENSE_MAPPING[categoryName] && transaction.property_id) {
          await createExpenseFromTransaction(
            {
              description: transaction.description,
              amount: transaction.amount,
              transaction_date: transaction.transaction_date,
              reference: transaction.reference,
              property_id: transaction.property_id,
            },
            categoryName
          );
        }
      }

      return createdTransaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
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
    getCategoryNameById,
    CATEGORY_TO_EXPENSE_MAPPING,
  };
}

export { CATEGORY_TO_EXPENSE_MAPPING };
