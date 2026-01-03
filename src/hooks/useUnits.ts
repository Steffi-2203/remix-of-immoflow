import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type UnitInsert = Database['public']['Tables']['units']['Insert'];

export function useUnits(propertyId?: string) {
  return useQuery({
    queryKey: ['units', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('units')
        .select('*, tenants(*)');
      
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      
      const { data, error } = await query.order('top_nummer');
      
      if (error) throw error;
      return data;
    },
  });
}

export function useUnit(id: string | undefined) {
  return useQuery({
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
    enabled: !!id,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (unit: UnitInsert) => {
      const { data, error } = await supabase
        .from('units')
        .insert(unit)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
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
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UnitInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
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
