import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface MaintenanceInvoice {
  id: string;
  organization_id: string | null;
  maintenance_task_id: string | null;
  invoice_number: string | null;
  invoice_date: string;
  amount: number;
  contractor_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  document_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  maintenance_tasks?: {
    title: string;
    properties?: { name: string } | null;
  } | null;
}

export function useMaintenanceInvoices(status?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['maintenance-invoices', user?.id, status],
    queryFn: async () => {
      let query = supabase
        .from('maintenance_invoices')
        .select(`
          *,
          maintenance_tasks(title, properties(name))
        `)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MaintenanceInvoice[];
    },
    enabled: !!user?.id,
  });
}

export function usePendingInvoices() {
  return useMaintenanceInvoices('pending');
}

export function useApproveInvoice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      // 1. Rechnung mit Task-Daten laden und freigeben
      const { data: invoice, error } = await supabase
        .from('maintenance_invoices')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .select(`
          *,
          maintenance_tasks(property_id, title, properties(name))
        `)
        .single();

      if (error) throw error;

      // 2. Automatische Buchung in transactions erstellen
      const propertyId = invoice.maintenance_tasks?.property_id;
      if (propertyId) {
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            organization_id: invoice.organization_id,
            property_id: propertyId,
            transaction_date: invoice.invoice_date,
            amount: -Math.abs(invoice.amount), // Negativ = Ausgabe
            description: `Wartungsrechnung: ${invoice.invoice_number || 'Ohne Nr.'} - ${invoice.contractor_name}`,
            counterpart_name: invoice.contractor_name,
            status: 'pending',
            notes: `Wartungsauftrag: ${invoice.maintenance_tasks?.title || 'Unbekannt'}`,
          });

        if (txError) {
          console.error('Buchung konnte nicht erstellt werden:', txError);
        }
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Rechnung freigegeben',
        description: 'Die Rechnung wurde zur Zahlung freigegeben und verbucht.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: 'Die Rechnung konnte nicht freigegeben werden.',
        variant: 'destructive',
      });
      console.error('Error approving invoice:', error);
    },
  });
}

export function useRejectInvoice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ invoiceId, reason }: { invoiceId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('maintenance_invoices')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-invoices'] });
      toast({
        title: 'Rechnung abgelehnt',
        description: 'Die Rechnung wurde abgelehnt.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: 'Die Rechnung konnte nicht abgelehnt werden.',
        variant: 'destructive',
      });
      console.error('Error rejecting invoice:', error);
    },
  });
}

export function useCreateMaintenanceInvoice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoice: {
      maintenance_task_id: string;
      invoice_number?: string;
      invoice_date: string;
      amount: number;
      contractor_name: string;
      document_url?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('maintenance_invoices')
        .insert({
          ...invoice,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-invoices'] });
      toast({
        title: 'Rechnung erstellt',
        description: 'Die Rechnung wurde erfolgreich erstellt.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: 'Die Rechnung konnte nicht erstellt werden.',
        variant: 'destructive',
      });
      console.error('Error creating invoice:', error);
    },
  });
}
