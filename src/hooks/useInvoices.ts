import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Invoice = Tables<'monthly_invoices'>;
export type InvoiceInsert = TablesInsert<'monthly_invoices'>;
export type InvoiceUpdate = TablesUpdate<'monthly_invoices'>;

export function useInvoices(year?: number, month?: number) {
  return useQuery({
    queryKey: ['invoices', year, month],
    queryFn: async () => {
      let query = supabase
        .from('monthly_invoices')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .order('created_at', { ascending: false });

      if (year) {
        query = query.eq('year', year);
      }
      if (month) {
        query = query.eq('month', month);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useInvoicesByTenant(tenantId: string) {
  return useQuery({
    queryKey: ['invoices', 'tenant', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useGenerateInvoices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ year, month }: { year?: number; month?: number }) => {
      const { data, error } = await supabase.functions.invoke('generate-monthly-invoices', {
        body: { year, month },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      bezahltAm 
    }: { 
      id: string; 
      status: Invoice['status']; 
      bezahltAm?: string;
    }) => {
      const updateData: InvoiceUpdate = { status };
      if (bezahltAm) {
        updateData.bezahlt_am = bezahltAm;
      }

      const { data, error } = await supabase
        .from('monthly_invoices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('monthly_invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
