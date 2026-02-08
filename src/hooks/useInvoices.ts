import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useDemoData } from '@/contexts/DemoDataContext';

export type Invoice = Tables<'monthly_invoices'>;
export type InvoiceInsert = TablesInsert<'monthly_invoices'>;
export type InvoiceUpdate = TablesUpdate<'monthly_invoices'>;

export function useInvoices(year?: number, month?: number) {
  const { isDemoMode } = useDemoData();

  const realQuery = useQuery({
    queryKey: ['invoices', year, month],
    queryFn: async () => {
      let query = supabase
        .from('monthly_invoices')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);

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
    enabled: !isDemoMode,
  });

  if (isDemoMode) {
    return { data: [] as Invoice[], isLoading: false, error: null, isError: false, refetch: realQuery.refetch };
  }

  return realQuery;
}

export function useInvoicesByTenant(tenantId: string) {
  const { isDemoMode } = useDemoData();

  const realQuery = useQuery({
    queryKey: ['invoices', 'tenant', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !isDemoMode,
  });

  if (isDemoMode) {
    return { data: [] as Invoice[], isLoading: false, error: null, isError: false };
  }

  return realQuery;
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { isDemoMode } = useDemoData();

  return useMutation({
    mutationFn: async (invoice: InvoiceInsert) => {
      if (isDemoMode) {
        toast.info('Vorschreibungen erstellen ist im Demo-Modus nicht verfügbar');
        return {} as Invoice;
      }
      const { data, error } = await supabase
        .from('monthly_invoices')
        .insert(invoice)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (!isDemoMode) {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        toast.success('Vorschreibung erfolgreich erstellt');
      }
    },
    onError: (error) => {
      toast.error('Fehler beim Erstellen der Vorschreibung');
      console.error('Create invoice error:', error);
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: InvoiceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('monthly_invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Vorschreibung aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren der Vorschreibung');
      console.error('Update invoice error:', error);
    },
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
      toast.success('Vorschreibung gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen der Vorschreibung');
      console.error('Delete invoice error:', error);
    },
  });
}
