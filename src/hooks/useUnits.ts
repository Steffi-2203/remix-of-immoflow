import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useDemoData } from '@/contexts/DemoDataContext';

export type Unit = Tables<'units'>;
export type UnitInsert = TablesInsert<'units'>;
export type UnitUpdate = TablesUpdate<'units'>;

export function useUnits(propertyId?: string) {
  const { isDemoMode, units: demoUnits, tenants: demoTenants } = useDemoData();

  const realQuery = useQuery({
    queryKey: ['units', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('units')
        .select('*, tenants(*)')
        .select('*, tenants(*)');
      
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      
      const { data, error } = await query.order('top_nummer').limit(500);
      
      if (error) throw error;
      return data;
    },
    enabled: !isDemoMode,
  });

  if (isDemoMode) {
    const filtered = propertyId 
      ? demoUnits.filter(u => u.property_id === propertyId) 
      : demoUnits;
    // Attach tenants to units
    const unitsWithTenants = filtered.map(u => ({
      ...u,
      tenants: demoTenants.filter(t => t.unit_id === u.id),
    }));
    return {
      data: unitsWithTenants as any,
      isLoading: false,
      error: null,
      isError: false,
    };
  }

  return realQuery;
}

export function useUnit(id: string | undefined) {
  const { isDemoMode, units: demoUnits, tenants: demoTenants } = useDemoData();

  const realQuery = useQuery({
    queryKey: ['unit', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('units')
        .select('*, tenants(*)')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id && !isDemoMode,
  });

  if (isDemoMode) {
    const unit = demoUnits.find(u => u.id === id);
    if (!unit) return { data: null, isLoading: false, error: null, isError: false };
    return {
      data: { ...unit, tenants: demoTenants.filter(t => t.unit_id === id) } as any,
      isLoading: false,
      error: null,
      isError: false,
    };
  }

  return realQuery;
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  const { isDemoMode, addUnit } = useDemoData();
  
  return useMutation({
    mutationFn: async (unit: UnitInsert) => {
      if (isDemoMode) {
        return addUnit(unit as any);
      }
      const { data, error } = await supabase
        .from('units')
        .insert(unit)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['units', data.property_id] });
      toast.success('Einheit erfolgreich erstellt');
    },
    onError: (error) => {
      toast.error('Fehler beim Erstellen der Einheit');
      console.error('Create unit error:', error);
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  const { isDemoMode, updateUnit: updateDemoUnit } = useDemoData();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: UnitUpdate & { id: string }) => {
      if (isDemoMode) {
        updateDemoUnit(id, updates as any);
        return { id, ...updates };
      }
      const { data, error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['unit', data.id] });
      toast.success('Einheit erfolgreich aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren der Einheit');
      console.error('Update unit error:', error);
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  const { isDemoMode, deleteUnit: deleteDemoUnit } = useDemoData();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        deleteDemoUnit(id);
        return;
      }
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success('Einheit erfolgreich gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen der Einheit');
      console.error('Delete unit error:', error);
    },
  });
}
