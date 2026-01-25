import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type VpiAdjustmentStatus = 'pending' | 'applied' | 'rejected';

export interface VpiAdjustment {
  id: string;
  tenant_id: string;
  adjustment_date: string;
  previous_rent: number;
  new_rent: number;
  vpi_old: number | null;
  vpi_new: number | null;
  percentage_change: number | null;
  notification_sent: boolean | null;
  notification_date: string | null;
  effective_date: string | null;
  notes: string | null;
  created_at: string | null;
  tenants?: {
    id: string;
    first_name: string;
    last_name: string;
    grundmiete: number;
    units?: {
      id: string;
      top_nummer: string;
      properties?: {
        id: string;
        name: string;
      };
    };
  };
}

export interface VpiAdjustmentInsert {
  tenant_id: string;
  adjustment_date: string;
  previous_rent: number;
  new_rent: number;
  vpi_old?: number | null;
  vpi_new?: number | null;
  percentage_change?: number | null;
  notification_sent?: boolean | null;
  notification_date?: string | null;
  effective_date?: string | null;
  notes?: string | null;
}

export interface VpiAdjustmentUpdate {
  id: string;
  tenant_id?: string;
  adjustment_date?: string;
  previous_rent?: number;
  new_rent?: number;
  vpi_old?: number | null;
  vpi_new?: number | null;
  percentage_change?: number | null;
  notification_sent?: boolean | null;
  notification_date?: string | null;
  effective_date?: string | null;
  notes?: string | null;
}

export function getVpiStatus(adjustment: VpiAdjustment): VpiAdjustmentStatus {
  if (adjustment.notification_sent && adjustment.effective_date) {
    const effectiveDate = new Date(adjustment.effective_date);
    const today = new Date();
    if (effectiveDate <= today) {
      return 'applied';
    }
  }
  if (adjustment.notification_sent === false && adjustment.effective_date === null) {
    return 'rejected';
  }
  return 'pending';
}

export function useVpiAdjustments() {
  return useQuery({
    queryKey: ['vpi-adjustments'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await (supabase as any)
        .from('vpi_adjustments')
        .select('*, tenants(id, first_name, last_name, grundmiete, units(id, top_nummer, properties(id, name)))')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as VpiAdjustment[];
    },
  });
}

export function useVpiAdjustment(id: string | undefined) {
  return useQuery({
    queryKey: ['vpi-adjustments', id],
    queryFn: async () => {
      if (!id || !supabase) return null;
      
      const { data, error } = await (supabase as any)
        .from('vpi_adjustments')
        .select('*, tenants(id, first_name, last_name, grundmiete, units(id, top_nummer, properties(id, name)))')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as VpiAdjustment | null;
    },
    enabled: !!id,
  });
}

export function useCreateVpiAdjustment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (adjustment: VpiAdjustmentInsert) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await (supabase as any)
        .from('vpi_adjustments')
        .insert(adjustment)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vpi-adjustments'] });
      toast.success('VPI-Anpassung erfolgreich erstellt');
    },
    onError: (error) => {
      toast.error('Fehler beim Erstellen der VPI-Anpassung');
      console.error('Create VPI adjustment error:', error);
    },
  });
}

export function useUpdateVpiAdjustment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: VpiAdjustmentUpdate) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await (supabase as any)
        .from('vpi_adjustments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vpi-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['vpi-adjustments', data.id] });
      toast.success('VPI-Anpassung erfolgreich aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren der VPI-Anpassung');
      console.error('Update VPI adjustment error:', error);
    },
  });
}

export function useApplyVpiAdjustment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, sendNotification }: { id: string; sendNotification: boolean }) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data: adjustment, error: fetchError } = await (supabase as any)
        .from('vpi_adjustments')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { error: updateTenantError } = await supabase
        .from('tenants')
        .update({ grundmiete: adjustment.new_rent })
        .eq('id', adjustment.tenant_id);
      
      if (updateTenantError) throw updateTenantError;
      
      const today = new Date().toISOString().split('T')[0];
      const { data, error: updateAdjError } = await (supabase as any)
        .from('vpi_adjustments')
        .update({
          notification_sent: sendNotification,
          notification_date: sendNotification ? today : null,
          effective_date: today,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (updateAdjError) throw updateAdjError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vpi-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('VPI-Anpassung erfolgreich angewendet');
    },
    onError: (error) => {
      toast.error('Fehler beim Anwenden der VPI-Anpassung');
      console.error('Apply VPI adjustment error:', error);
    },
  });
}

export function useRejectVpiAdjustment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await (supabase as any)
        .from('vpi_adjustments')
        .update({
          notification_sent: false,
          effective_date: null,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vpi-adjustments'] });
      toast.success('VPI-Anpassung abgelehnt');
    },
    onError: (error) => {
      toast.error('Fehler beim Ablehnen der VPI-Anpassung');
      console.error('Reject VPI adjustment error:', error);
    },
  });
}

export function useDeleteVpiAdjustment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { error } = await (supabase as any)
        .from('vpi_adjustments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vpi-adjustments'] });
      toast.success('VPI-Anpassung erfolgreich gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen der VPI-Anpassung');
      console.error('Delete VPI adjustment error:', error);
    },
  });
}
