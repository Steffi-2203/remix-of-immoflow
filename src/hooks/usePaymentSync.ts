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

/**
 * ============================================================================
 * SINGLE SOURCE OF TRUTH ARCHITECTURE
 * ============================================================================
 * 
 * DATA OWNERSHIP:
 * - payments table: LEADING for rent income (supports invoice_id, allocation)
 * - transactions table: LEADING for bank transactions (all money movements)
 * - expenses table: LEADING for operating cost settlement (BK-Abrechnung)
 * 
 * SYNC RULES:
 * 1. payments → transactions: One-way sync, creates transaction copy for banking overview
 * 2. transactions → expenses: One-way sync, creates expense for BK-Abrechnung
 * 3. transactions → payments: DISABLED (prevents duplicates)
 * 
 * For reports:
 * - Rent income: Use payments table (via useCombinedPayments)
 * - All bank movements: Use transactions table
 * - Operating costs: Use expenses table
 * ============================================================================
 */

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

  // Helper: Get category name by ID
  const getCategoryNameById = (categoryId: string | null | undefined) => {
    if (!categoryId) return null;
    return categories?.find(c => c.id === categoryId)?.name || null;
  };

  /**
   * Create payment (LEADING) and optionally sync to transactions
   * Use this when recording rent payments manually or from SEPA
   */
  const createPaymentWithSync = useMutation({
    mutationFn: async (params: {
      payment: PaymentInsert;
      unitId?: string;
      propertyId?: string;
      skipTransactionSync?: boolean;
    }) => {
      const { payment, unitId, propertyId, skipTransactionSync } = params;

      // 1. Create the payment (LEADING SOURCE)
      const { data: createdPayment, error: paymentError } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Sync to transactions for banking overview (optional, one-way)
      if (!skipTransactionSync && organization?.id) {
        const mieteinnahmenCategory = getMieteinnahmenCategory();
        
        if (mieteinnahmenCategory) {
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              organization_id: organization.id,
              unit_id: unitId || null,
              tenant_id: payment.tenant_id,
              property_id: propertyId || null,
              amount: payment.betrag,
              currency: 'EUR',
              transaction_date: payment.eingangs_datum,
              booking_date: payment.buchungs_datum,
              description: `Mietzahlung ${payment.referenz || ''}`.trim(),
              reference: payment.referenz || null,
              category_id: mieteinnahmenCategory.id,
              status: 'matched',
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

  // Create expense from transaction (for BK-Abrechnung sync)
  const createExpenseFromTransaction = async (
    transaction: {
      id?: string;
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
      transaction_id: transaction.id || null, // Link back to transaction
    }).select().single();
    
    if (error) {
      console.error('Failed to sync transaction to expenses:', error);
      return null;
    }
    
    return data;
  };

  /**
   * Create transaction (from banking import)
   * Does NOT sync to payments to prevent duplicates!
   * Syncs to expenses for BK-Abrechnung if relevant category
   */
  const createTransactionWithSync = useMutation({
    mutationFn: async (params: {
      transaction: TransactionInsert;
      skipExpenseSync?: boolean;
    }) => {
      const { transaction, skipExpenseSync } = params;

      // 1. Create the transaction
      const { data: createdTransaction, error: transactionError } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Get category name for sync logic
      const categoryName = getCategoryNameById(transaction.category_id);

      // 2. DO NOT sync to payments - payments is the leading source for rent!
      // If this is a rent payment from banking, the user should record it via
      // the payment form which will then sync TO transactions.

      // 3. Sync to expenses (if it's a BK-relevant expense with property)
      if (!skipExpenseSync && transaction.amount && transaction.amount < 0 && categoryName) {
        if (CATEGORY_TO_EXPENSE_MAPPING[categoryName] && transaction.property_id) {
          await createExpenseFromTransaction(
            {
              id: createdTransaction.id,
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
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Buchung erfolgreich erfasst');
    },
    onError: (error) => {
      toast.error('Fehler beim Erfassen der Buchung');
      console.error('Create transaction with sync error:', error);
    },
  });

  /**
   * Sync existing transactions to expenses (for migration of historical data)
   * Only syncs expense transactions (negative amounts) with BK-relevant categories
   */
  const syncExistingTransactionsToExpenses = useMutation({
    mutationFn: async () => {
      if (!categories) throw new Error('Categories not loaded');

      // Get category IDs that are BK-relevant
      const relevantCategoryIds = categories
        .filter(c => CATEGORY_TO_EXPENSE_MAPPING[c.name])
        .map(c => c.id);

      if (relevantCategoryIds.length === 0) {
        return { synced: 0, skipped: 0 };
      }

      // Get all expense transactions with BK-relevant categories and property_id
      const { data: expenseTransactions, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .lt('amount', 0)
        .not('property_id', 'is', null)
        .in('category_id', relevantCategoryIds);

      if (fetchError) throw fetchError;
      if (!expenseTransactions || expenseTransactions.length === 0) {
        return { synced: 0, skipped: 0 };
      }

      // Get existing expenses to check for duplicates (check by transaction_id first)
      const { data: existingExpenses } = await supabase
        .from('expenses')
        .select('datum, betrag, property_id, transaction_id');

      let syncedCount = 0;
      let skippedCount = 0;

      for (const transaction of expenseTransactions) {
        const categoryName = categories.find(c => c.id === transaction.category_id)?.name;
        if (!categoryName || !transaction.property_id) {
          skippedCount++;
          continue;
        }

        // Check for duplicate by transaction_id (most reliable)
        const isLinked = existingExpenses?.some(e => e.transaction_id === transaction.id);
        if (isLinked) {
          skippedCount++;
          continue;
        }

        // Check for duplicate by data match (fallback)
        const isDuplicate = existingExpenses?.some(e =>
          e.datum === transaction.transaction_date &&
          Math.abs(Number(e.betrag) - Math.abs(transaction.amount)) < 0.01 &&
          e.property_id === transaction.property_id
        );

        if (isDuplicate) {
          skippedCount++;
          continue;
        }

        const result = await createExpenseFromTransaction(
          {
            id: transaction.id,
            description: transaction.description,
            amount: transaction.amount,
            transaction_date: transaction.transaction_date,
            reference: transaction.reference,
            property_id: transaction.property_id,
          },
          categoryName
        );

        if (result) {
          syncedCount++;
        } else {
          skippedCount++;
        }
      }

      return { synced: syncedCount, skipped: skippedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      if (result.synced > 0) {
        toast.success(`${result.synced} Buchung(en) erfolgreich zur BK-Abrechnung synchronisiert`);
      } else {
        toast.info('Keine neuen Buchungen zum Synchronisieren gefunden');
      }
    },
    onError: (error) => {
      toast.error('Fehler beim Synchronisieren der Buchungen');
      console.error('Sync transactions to expenses error:', error);
    },
  });

  /**
   * Sync existing payments to transactions (for migration)
   * One-way: payments → transactions
   * Use this to populate banking overview with historical rent payments
   */
  const syncExistingPaymentsToTransactions = useMutation({
    mutationFn: async () => {
      if (!categories || !organization?.id) throw new Error('Categories or organization not loaded');

      const mieteinnahmenCategory = getMieteinnahmenCategory();
      if (!mieteinnahmenCategory) throw new Error('Mieteinnahmen category not found');

      // Get all payments with tenant info
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*, tenants(unit_id, units(property_id))');

      if (paymentsError) throw paymentsError;
      if (!payments || payments.length === 0) {
        return { synced: 0, skipped: 0 };
      }

      // Get existing income transactions to check for duplicates
      const { data: existingTransactions } = await supabase
        .from('transactions')
        .select('transaction_date, amount, tenant_id')
        .eq('category_id', mieteinnahmenCategory.id)
        .gt('amount', 0);

      let syncedCount = 0;
      let skippedCount = 0;

      for (const payment of payments) {
        // Check for duplicate (same date, amount, tenant)
        const isDuplicate = existingTransactions?.some(t =>
          t.transaction_date === payment.eingangs_datum &&
          Math.abs(Number(t.amount) - Number(payment.betrag)) < 0.01 &&
          t.tenant_id === payment.tenant_id
        );

        if (isDuplicate) {
          skippedCount++;
          continue;
        }

        const tenantData = payment.tenants as { unit_id: string; units?: { property_id: string } } | null;
        
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            organization_id: organization.id,
            unit_id: tenantData?.unit_id || null,
            tenant_id: payment.tenant_id,
            property_id: tenantData?.units?.property_id || null,
            amount: Number(payment.betrag),
            currency: 'EUR',
            transaction_date: payment.eingangs_datum,
            booking_date: payment.buchungs_datum,
            description: `Mietzahlung ${payment.referenz || ''}`.trim(),
            reference: payment.referenz || null,
            category_id: mieteinnahmenCategory.id,
            status: 'matched',
          });

        if (transactionError) {
          console.error('Failed to sync payment to transaction:', transactionError);
          skippedCount++;
        } else {
          syncedCount++;
        }
      }

      return { synced: syncedCount, skipped: skippedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (result.synced > 0) {
        toast.success(`${result.synced} Mieteinnahme(n) erfolgreich zur Banking-Übersicht synchronisiert`);
      } else {
        toast.info('Alle Mieteinnahmen bereits synchronisiert');
      }
    },
    onError: (error) => {
      toast.error('Fehler beim Synchronisieren der Mieteinnahmen');
      console.error('Sync payments to transactions error:', error);
    },
  });

  /**
   * Delete transaction with cascade sync
   * Deletes linked expenses and transaction splits
   * Does NOT delete payments (payments is leading for rent)
   */
  const deleteTransactionWithSync = useMutation({
    mutationFn: async (transactionId: string) => {
      // 1. Get the transaction first
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError) throw fetchError;
      if (!transaction) throw new Error('Transaction not found');

      // 2. Delete transaction splits
      const { error: splitsError } = await supabase
        .from('transaction_splits')
        .delete()
        .eq('transaction_id', transactionId);

      if (splitsError) {
        console.error('Failed to delete transaction splits:', splitsError);
      }

      // 3. Delete related expense (linked by transaction_id)
      const { error: expenseError } = await supabase
        .from('expenses')
        .delete()
        .eq('transaction_id', transactionId);

      if (expenseError) {
        console.error('Failed to delete related expense:', expenseError);
      }

      // 4. DO NOT delete related payment - payments is leading!
      // If user wants to delete a rent payment, they should delete from payments,
      // which will then need its own cleanup of the synced transaction.

      // 5. Delete the transaction itself
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (deleteError) throw deleteError;

      return { transactionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast.success('Buchung und verknüpfte Daten gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen der Buchung');
      console.error('Delete transaction with sync error:', error);
    },
  });

  /**
   * Delete payment with cascade sync
   * Deletes the payment and also removes the synced transaction copy
   */
  const deletePaymentWithSync = useMutation({
    mutationFn: async (paymentId: string) => {
      // 1. Get the payment first
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (fetchError) throw fetchError;
      if (!payment) throw new Error('Payment not found');

      // 2. Delete the synced transaction (if exists)
      const mieteinnahmenCategory = getMieteinnahmenCategory();
      if (mieteinnahmenCategory) {
        const { error: transactionError } = await supabase
          .from('transactions')
          .delete()
          .eq('tenant_id', payment.tenant_id)
          .eq('transaction_date', payment.eingangs_datum)
          .gte('amount', Number(payment.betrag) - 0.01)
          .lte('amount', Number(payment.betrag) + 0.01)
          .eq('category_id', mieteinnahmenCategory.id);

        if (transactionError) {
          console.error('Failed to delete synced transaction:', transactionError);
        }
      }

      // 3. Delete the payment itself
      const { error: deleteError } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (deleteError) throw deleteError;

      return { paymentId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Zahlung gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen der Zahlung');
      console.error('Delete payment with sync error:', error);
    },
  });

  return {
    // Create operations
    createPaymentWithSync,
    createTransactionWithSync,
    // Delete operations  
    deleteTransactionWithSync,
    deletePaymentWithSync,
    // Migration operations
    syncExistingTransactionsToExpenses,
    syncExistingPaymentsToTransactions,
    // Helpers
    getMieteinnahmenCategory,
    getCategoryNameById,
    CATEGORY_TO_EXPENSE_MAPPING,
  };
}

export { CATEGORY_TO_EXPENSE_MAPPING };
