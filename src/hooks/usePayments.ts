import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Payment = Tables<'payments'>;
export type PaymentInsert = TablesInsert<'payments'>;
export type PaymentUpdate = TablesUpdate<'payments'>;

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, tenants(first_name, last_name, unit_id, units(top_nummer, property_id, properties(name)))')
        .order('eingangs_datum', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function usePaymentsByTenant(tenantId?: string) {
  return useQuery({
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
    enabled: !!tenantId,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payment: PaymentInsert) => {
      const { data, error } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Zahlung erfolgreich erfasst');
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
  
  return useMutation({
    mutationFn: async (id: string) => {
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
