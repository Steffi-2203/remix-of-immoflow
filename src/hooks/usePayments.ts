import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { allocatePayment, formatAllocationForDisplay, type InvoiceAmounts } from '@/lib/paymentAllocation';
import { useDemoData } from '@/contexts/DemoDataContext';

export type Payment = Tables<'payments'>;
export type PaymentInsert = TablesInsert<'payments'>;
export type PaymentUpdate = TablesUpdate<'payments'>;

export interface PaymentWithAllocation extends Payment {
  allocation?: {
    betriebskosten_anteil: number;
    heizung_anteil: number;
    miete_anteil: number;
    ust_anteil: number;
    beschreibung: string;
  };
}

export function usePayments() {
  const { isDemoMode, payments: demoPayments } = useDemoData();

  const realQuery = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, tenants(first_name, last_name, unit_id, units(top_nummer, property_id, properties(name)))')
        .order('eingangs_datum', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !isDemoMode,
  });

  if (isDemoMode) {
    return { data: demoPayments as any, isLoading: false, error: null, isError: false };
  }

  return realQuery;
}

export function usePaymentsByTenant(tenantId?: string) {
  const { isDemoMode, payments: demoPayments } = useDemoData();

  const realQuery = useQuery({
    queryKey: ['payments', 'tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('eingangs_datum', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !isDemoMode,
  });

  if (isDemoMode) {
    return {
      data: demoPayments.filter(p => p.tenant_id === tenantId) as any,
      isLoading: false,
      error: null,
      isError: false,
    };
  }

  return realQuery;
}

export function usePaymentsWithAllocation(invoiceId?: string) {
  return useQuery({
    queryKey: ['payments', 'allocation', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      
      const [invoiceResult, paymentsResult] = await Promise.all([
        supabase.from('monthly_invoices').select('*').eq('id', invoiceId).single(),
        supabase.from('payments').select('*').eq('invoice_id', invoiceId).order('eingangs_datum', { ascending: true })
      ]);
      
      if (invoiceResult.error) throw invoiceResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      
      const invoice = invoiceResult.data;
      const payments = paymentsResult.data || [];
      
      let remainingInvoice: InvoiceAmounts = {
        grundmiete: invoice.grundmiete,
        betriebskosten: invoice.betriebskosten,
        heizungskosten: invoice.heizungskosten,
        gesamtbetrag: invoice.gesamtbetrag
      };
      
      const paymentsWithAllocation: PaymentWithAllocation[] = payments.map(payment => {
        const result = allocatePayment(payment.betrag, remainingInvoice);
        
        remainingInvoice = {
          betriebskosten: Math.max(0, remainingInvoice.betriebskosten - result.allocation.betriebskosten_anteil / 1.10),
          heizungskosten: Math.max(0, remainingInvoice.heizungskosten - result.allocation.heizung_anteil / 1.20),
          grundmiete: Math.max(0, remainingInvoice.grundmiete - result.allocation.miete_anteil),
          gesamtbetrag: 0
        };
        remainingInvoice.gesamtbetrag = 
          remainingInvoice.betriebskosten + remainingInvoice.heizungskosten + remainingInvoice.grundmiete;
        
        return {
          ...payment,
          allocation: {
            betriebskosten_anteil: result.allocation.betriebskosten_anteil,
            heizung_anteil: result.allocation.heizung_anteil,
            miete_anteil: result.allocation.miete_anteil,
            ust_anteil: result.allocation.ust_anteil,
            beschreibung: result.beschreibung
          }
        };
      });
      
      return paymentsWithAllocation;
    },
    enabled: !!invoiceId,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const { isDemoMode, addPayment } = useDemoData();
  
  return useMutation({
    mutationFn: async (payment: PaymentInsert) => {
      if (isDemoMode) {
        return addPayment(payment as any);
      }
      const { data, error } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single();
      
      if (error) throw error;
      
      if (payment.invoice_id) {
        const { data: invoice } = await supabase
          .from('monthly_invoices')
          .select('*')
          .eq('id', payment.invoice_id)
          .single();
        
        if (invoice) {
          const invoiceAmounts: InvoiceAmounts = {
            grundmiete: invoice.grundmiete,
            betriebskosten: invoice.betriebskosten,
            heizungskosten: invoice.heizungskosten,
            gesamtbetrag: invoice.gesamtbetrag
          };
          
          const result = allocatePayment(payment.betrag, invoiceAmounts);
          const lines = formatAllocationForDisplay(result.allocation);
          
          toast.success('Zahlung erfasst', {
            description: lines.slice(0, 3).join(' | ')
          });
          return data;
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      toast.error('Fehler beim Erfassen der Zahlung');
      console.error('Create payment error:', error);
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  const { isDemoMode, updatePayment: updateDemoPayment } = useDemoData();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: PaymentUpdate & { id: string }) => {
      if (isDemoMode) {
        updateDemoPayment(id, updates as any);
        return { id, ...updates };
      }
      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Zahlung aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren der Zahlung');
      console.error('Update payment error:', error);
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  const { isDemoMode, deletePayment: deleteDemoPayment } = useDemoData();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        deleteDemoPayment(id);
        return;
      }
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Zahlung gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen der Zahlung');
      console.error('Delete payment error:', error);
    },
  });
}
