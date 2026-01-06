import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Tenant = Tables<'tenants'>;
export type TenantInsert = TablesInsert<'tenants'>;
export type TenantUpdate = TablesUpdate<'tenants'>;

export function useTenants() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*, units(*, properties(*))')
        .order('last_name');
      
      if (error) throw error;
      return data;
    },
  });
}

export function useTenantsByUnit(unitId?: string) {
  return useQuery({
    queryKey: ['tenants', 'unit', unitId],
    queryFn: async () => {
      if (!unitId) return [];
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('unit_id', unitId)
        .order('mietbeginn', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!unitId,
  });
}

export function useTenant(id: string | undefined) {
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('tenants')
        .select('*, units(*, properties(*))')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tenant: TenantInsert) => {
      // If the new tenant is "aktiv", first set all other active tenants of the same unit to "beendet"
      if (tenant.status === 'aktiv' && tenant.unit_id) {
        const { error: updateError } = await supabase
          .from('tenants')
          .update({ 
            status: 'beendet',
            // Set mietende to day before new tenant's mietbeginn if not already set
            mietende: tenant.mietbeginn ? 
              new Date(new Date(tenant.mietbeginn).getTime() - 86400000).toISOString().split('T')[0] 
              : new Date().toISOString().split('T')[0]
          })
          .eq('unit_id', tenant.unit_id)
          .eq('status', 'aktiv');
        
        if (updateError) {
          console.warn('Could not update existing tenants:', updateError);
        }
      }

      const { data, error } = await supabase
        .from('tenants')
        .insert(tenant)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success('Mieter erfolgreich erstellt');
    },
    onError: (error) => {
      toast.error('Fehler beim Erstellen des Mieters');
      console.error('Create tenant error:', error);
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: TenantUpdate & { id: string }) => {
      // If updating status to "aktiv", first deactivate all other active tenants of the same unit
      if (updates.status === 'aktiv' && updates.unit_id) {
        const { error: updateError } = await supabase
          .from('tenants')
          .update({ status: 'beendet' })
          .eq('unit_id', updates.unit_id)
          .eq('status', 'aktiv')
          .neq('id', id);
        
        if (updateError) {
          console.warn('Could not deactivate other tenants:', updateError);
        }
      }

      const { data, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', data.id] });
      toast.success('Mieter erfolgreich aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren des Mieters');
      console.error('Update tenant error:', error);
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success('Mieter erfolgreich gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen des Mieters');
      console.error('Delete tenant error:', error);
    },
  });
}
