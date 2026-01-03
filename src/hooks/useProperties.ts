import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PropertyInsert {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country?: string;
  building_year?: number | null;
  total_qm?: number;
  total_mea?: number;
  bk_anteil_wohnung?: number;
  bk_anteil_geschaeft?: number;
  bk_anteil_garage?: number;
  heizung_anteil_wohnung?: number;
  heizung_anteil_geschaeft?: number;
  betriebskosten_gesamt?: number;
  heizungskosten_gesamt?: number;
}

export function useProperties() {
  return useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (property: PropertyInsert) => {
      const { data, error } = await supabase
        .from('properties')
        .insert(property)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Liegenschaft erfolgreich erstellt');
    },
    onError: (error) => {
      toast.error('Fehler beim Erstellen der Liegenschaft');
      console.error('Create property error:', error);
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: PropertyInsert & { id: string }) => {
      const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', data.id] });
      toast.success('Liegenschaft erfolgreich aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren der Liegenschaft');
      console.error('Update property error:', error);
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Liegenschaft erfolgreich gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen der Liegenschaft');
      console.error('Delete property error:', error);
    },
  });
}
