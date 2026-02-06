import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useDemoData } from '@/contexts/DemoDataContext';

export type Tenant = Tables<'tenants'>;
export type TenantInsert = TablesInsert<'tenants'>;
export type TenantUpdate = TablesUpdate<'tenants'>;

export function useTenants() {
  const { isDemoMode, tenants: demoTenants, units: demoUnits, properties: demoProperties } = useDemoData();

  const realQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*, units(*, properties(*))')
        .order('last_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !isDemoMode,
  });

  if (isDemoMode) {
    // Enrich tenants with unit and property data
    const enriched = demoTenants.map(t => {
      const unit = demoUnits.find(u => u.id === t.unit_id);
      const property = unit ? demoProperties.find(p => p.id === unit.property_id) : null;
      return {
        ...t,
        units: unit ? { ...unit, properties: property ? { name: property.name } : null } : null,
      };
    });
    return { data: enriched as any, isLoading: false, error: null, isError: false, refetch: () => Promise.resolve({} as any) };
  }

  return realQuery;
}

export function useTenantsByUnit(unitId?: string) {
  const { isDemoMode, tenants: demoTenants } = useDemoData();

  const realQuery = useQuery({
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
    enabled: !!unitId && !isDemoMode,
  });

  if (isDemoMode) {
    return {
      data: demoTenants.filter(t => t.unit_id === unitId) as any,
      isLoading: false,
      error: null,
      isError: false,
    };
  }

  return realQuery;
}

export function useTenant(id: string | undefined) {
  const { isDemoMode, tenants: demoTenants, units: demoUnits, properties: demoProperties } = useDemoData();

  const realQuery = useQuery({
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
    enabled: !!id && !isDemoMode,
  });

  if (isDemoMode) {
    const tenant = demoTenants.find(t => t.id === id);
    if (!tenant) return { data: null, isLoading: false, error: null, isError: false };
    const unit = demoUnits.find(u => u.id === tenant.unit_id);
    const property = unit ? demoProperties.find(p => p.id === unit.property_id) : null;
    return {
      data: { ...tenant, units: unit ? { ...unit, properties: property ? { name: property.name } : null } : null } as any,
      isLoading: false,
      error: null,
      isError: false,
    };
  }

  return realQuery;
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  const { isDemoMode, addTenant } = useDemoData();
  
  return useMutation({
    mutationFn: async (tenant: TenantInsert) => {
      if (isDemoMode) {
        return addTenant(tenant as any);
      }

      // If the new tenant is "aktiv", first set all other active tenants of the same unit to "beendet"
      if (tenant.status === 'aktiv' && tenant.unit_id) {
        const { error: updateError } = await supabase
          .from('tenants')
          .update({ 
            status: 'beendet',
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
  const { isDemoMode, updateTenant: updateDemoTenant } = useDemoData();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: TenantUpdate & { id: string }) => {
      if (isDemoMode) {
        updateDemoTenant(id, updates as any);
        return { id, ...updates };
      }

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
    onSuccess: (data: any) => {
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
  const { isDemoMode, deleteTenant: deleteDemoTenant } = useDemoData();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        deleteDemoTenant(id);
        return;
      }
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
