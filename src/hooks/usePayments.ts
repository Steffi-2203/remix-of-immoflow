import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';
import { allocatePayment, formatAllocationForDisplay, type InvoiceAmounts } from '@/lib/paymentAllocation';

export interface Payment {
  id: string;
  tenantId: string;
  invoiceId: string | null;
  betrag: string;
  buchungsDatum: string;
  eingangsDatum?: string;
  paymentType: 'sepa' | 'ueberweisung' | 'bar' | 'sonstiges';
  verwendungszweck: string | null;
  transactionId: string | null;
  notizen: string | null;
  createdAt: string;
  tenants?: {
    firstName: string;
    lastName: string;
    unitId: string;
    units?: {
      topNummer: string;
      propertyId: string;
      properties?: { name: string };
    };
  };
}

export type PaymentInsert = Omit<Payment, 'id' | 'createdAt' | 'tenants'>;
export type PaymentUpdate = Partial<PaymentInsert>;

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
  return useQuery({
    queryKey: ['payments'],
    staleTime: 60000,
    gcTime: 300000,
    queryFn: async () => {
      const response = await fetch('/api/payments', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch payments');
      const payments = await response.json();
      
      const [tenantsRes, unitsRes, propsRes] = await Promise.all([
        fetch('/api/tenants', { credentials: 'include' }),
        fetch('/api/units', { credentials: 'include' }),
        fetch('/api/properties', { credentials: 'include' })
      ]);
      
      if (tenantsRes.ok && unitsRes.ok && propsRes.ok) {
        const tenants = await tenantsRes.json();
        const units = await unitsRes.json();
        const properties = await propsRes.json();
        
        return payments.map((payment: Payment) => {
          const tenant = tenants.find((t: any) => t.id === payment.tenantId);
          const unit = tenant ? units.find((u: any) => u.id === tenant.unitId) : null;
          const property = unit ? properties.find((p: any) => p.id === unit.propertyId) : null;
          
          return {
            ...payment,
            tenants: tenant ? {
              firstName: tenant.firstName,
              lastName: tenant.lastName,
              unitId: tenant.unitId,
              units: unit ? {
                topNummer: unit.topNummer,
                propertyId: unit.propertyId,
                properties: property ? { name: property.name } : undefined
              } : undefined
            } : undefined
          };
        });
      }
      
      return payments;
    },
  });
}

export function usePaymentsByTenant(tenantId?: string) {
  return useQuery({
    queryKey: ['payments', 'tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const response = await fetch(`/api/tenants/${tenantId}/payments`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch payments');
      return response.json();
    },
    enabled: !!tenantId,
  });
}

export function usePaymentsWithAllocation(invoiceId?: string) {
  return useQuery({
    queryKey: ['payments', 'allocation', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      
      const [invoiceRes, paymentsRes] = await Promise.all([
        fetch(`/api/invoices/${invoiceId}`, { credentials: 'include' }),
        fetch(`/api/invoices/${invoiceId}/payments`, { credentials: 'include' })
      ]);
      
      if (!invoiceRes.ok) throw new Error('Failed to fetch invoice');
      
      const invoice = await invoiceRes.json();
      const payments = paymentsRes.ok ? await paymentsRes.json() : [];
      
      let remainingInvoice: InvoiceAmounts = {
        grundmiete: invoice.grundmiete,
        betriebskosten: invoice.betriebskosten,
        heizungskosten: invoice.heizungskosten,
        gesamtbetrag: invoice.gesamtbetrag
      };
      
      const paymentsWithAllocation: PaymentWithAllocation[] = payments.map((payment: Payment) => {
        const result = allocatePayment(parseFloat(payment.betrag), remainingInvoice);
        
        remainingInvoice = {
          betriebskosten: Math.max(0, remainingInvoice.betriebskosten - result.allocation.betriebskosten_anteil / 1.10),
          heizungskosten: Math.max(0, remainingInvoice.heizungskosten - result.allocation.heizung_anteil / 1.20),
          grundmiete: Math.max(0, remainingInvoice.grundmiete - result.allocation.miete_anteil),
          gesamtbetrag: 0
        };
        remainingInvoice.gesamtbetrag = 
          remainingInvoice.betriebskosten + 
          remainingInvoice.heizungskosten + 
          remainingInvoice.grundmiete;
        
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
  
  return useMutation({
    mutationFn: async (payment: PaymentInsert) => {
      const response = await apiRequest('POST', '/api/payments', payment);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Zahlung erfasst');
    },
    onError: (error) => {
      toast.error('Fehler beim Erfassen der Zahlung');
      console.error('Create payment error:', error);
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: PaymentUpdate & { id: string }) => {
      const response = await apiRequest('PATCH', `/api/payments/${id}`, updates);
      return response.json();
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
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/payments/${id}`);
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
