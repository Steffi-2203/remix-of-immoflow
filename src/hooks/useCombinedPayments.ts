import { useMemo } from 'react';
import { usePayments } from './usePayments';
import { useTransactions } from './useTransactions';

/**
 * Interface for unified payment data from both payments and transactions tables
 */
export interface CombinedPayment {
  id: string;
  tenant_id: string;
  amount: number;
  date: string;
  source: 'payments' | 'transactions';
  description?: string;
  reference?: string;
}

/**
 * Hook that combines payment data from both the payments table 
 * AND transactions with tenant_id set (positive amounts only)
 * 
 * This ensures that income assigned via Banking shows up correctly
 * in all reports and payment lists.
 */
export function useCombinedPayments() {
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions();

  const combinedPayments = useMemo(() => {
    const combined: CombinedPayment[] = [];
    
    // Add all payments from payments table
    (payments || []).forEach(p => {
      combined.push({
        id: p.id,
        tenant_id: p.tenant_id,
        amount: Number(p.betrag),
        date: p.eingangs_datum,
        source: 'payments',
        reference: p.referenz || undefined,
      });
    });
    
    // Add transactions that have tenant_id and positive amount (income)
    // These are typically rent payments assigned via Banking
    (transactions || []).forEach(t => {
      if (t.tenant_id && t.amount > 0) {
        // Check if this transaction is not already represented in payments
        // (to avoid double-counting)
        const alreadyInPayments = combined.some(
          p => p.source === 'payments' && 
               p.tenant_id === t.tenant_id && 
               Math.abs(p.amount - t.amount) < 0.01 &&
               p.date === t.transaction_date
        );
        
        if (!alreadyInPayments) {
          combined.push({
            id: t.id,
            tenant_id: t.tenant_id,
            amount: Number(t.amount),
            date: t.transaction_date,
            source: 'transactions',
            description: t.description || undefined,
            reference: t.reference || undefined,
          });
        }
      }
    });
    
    return combined;
  }, [payments, transactions]);

  return {
    data: combinedPayments,
    isLoading: paymentsLoading || transactionsLoading,
  };
}

/**
 * Get combined payments filtered by tenant and period
 */
export function useCombinedPaymentsByTenant(
  tenantId: string,
  year: number,
  month?: number
) {
  const { data: allPayments, isLoading } = useCombinedPayments();
  
  const filtered = useMemo(() => {
    return (allPayments || []).filter(p => {
      if (p.tenant_id !== tenantId) return false;
      
      const date = new Date(p.date);
      const paymentYear = date.getFullYear();
      const paymentMonth = date.getMonth() + 1;
      
      if (month === undefined) {
        return paymentYear === year;
      }
      return paymentYear === year && paymentMonth === month;
    });
  }, [allPayments, tenantId, year, month]);
  
  return { data: filtered, isLoading };
}

/**
 * Get combined payments for a specific period
 */
export function useCombinedPaymentsForPeriod(
  year: number,
  month?: number,
  propertyUnitIds?: string[] | null,
  tenants?: { id: string; unit_id: string }[]
) {
  const { data: allPayments, isLoading } = useCombinedPayments();
  
  const filtered = useMemo(() => {
    return (allPayments || []).filter(p => {
      const date = new Date(p.date);
      const paymentYear = date.getFullYear();
      const paymentMonth = date.getMonth() + 1;
      
      // Period filter
      if (month === undefined) {
        if (paymentYear !== year) return false;
      } else {
        if (paymentYear !== year || paymentMonth !== month) return false;
      }
      
      // Property filter (via tenant's unit)
      if (propertyUnitIds && tenants) {
        const tenant = tenants.find(t => t.id === p.tenant_id);
        if (!tenant || !propertyUnitIds.includes(tenant.unit_id)) {
          return false;
        }
      }
      
      return true;
    });
  }, [allPayments, year, month, propertyUnitIds, tenants]);
  
  return { data: filtered, isLoading };
}
