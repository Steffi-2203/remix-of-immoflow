import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useDemoData } from '@/contexts/DemoDataContext';

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
  const { isDemoMode, properties: demoProperties } = useDemoData();

  const realQuery = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !isDemoMode,
  });

  if (isDemoMode) {
    return {
      data: demoProperties,
      isLoading: false,
      error: null,
      isError: false,
    };
  }

  return realQuery;
}

export function useProperty(id: string | undefined) {
  const { isDemoMode, properties: demoProperties } = useDemoData();

  const realQuery = useQuery({
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
    enabled: !!id && !isDemoMode,
  });

  if (isDemoMode) {
    const property = demoProperties.find(p => p.id === id) || null;
    return {
      data: property,
      isLoading: false,
      error: null,
      isError: false,
    };
  }

  return realQuery;
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode, addProperty } = useDemoData();

  return useMutation({
    mutationFn: async (property: PropertyInsert) => {
      if (isDemoMode) {
        const newProperty = addProperty({
          name: property.name,
          address: property.address,
          city: property.city,
          postal_code: property.postal_code,
          country: property.country || 'Österreich',
          building_year: property.building_year || null,
          total_units: 0,
          total_qm: property.total_qm || 0,
          total_mea: property.total_mea || 0,
          bk_anteil_wohnung: property.bk_anteil_wohnung || 0,
          bk_anteil_geschaeft: property.bk_anteil_geschaeft || 0,
          bk_anteil_garage: property.bk_anteil_garage || 0,
          heizung_anteil_wohnung: property.heizung_anteil_wohnung || 0,
          heizung_anteil_geschaeft: property.heizung_anteil_geschaeft || 0,
          betriebskosten_gesamt: property.betriebskosten_gesamt || 0,
          heizungskosten_gesamt: property.heizungskosten_gesamt || 0,
        });
        return newProperty;
      }

      if (!user) throw new Error('Not authenticated');

      // Create deterministically so we can assign ownership even if INSERT can't RETURN the row
      const propertyId = crypto.randomUUID();

      const { error: createError } = await supabase
        .from('properties')
        .insert({ id: propertyId, ...property });

      if (createError) throw createError;

      const { error: assignError } = await supabase.from('property_managers').insert({
        user_id: user.id,
        property_id: propertyId,
      });

      if (assignError) {
        // Best-effort cleanup (may fail depending on RLS)
        await supabase.from('properties').delete().eq('id', propertyId);
        throw assignError;
      }

      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (fetchError) throw fetchError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['managed_properties_count'] });
      queryClient.invalidateQueries({ queryKey: ['property_managers'] });
      toast.success('Liegenschaft erfolgreich erstellt');
    },
    onError: (error) => {
      const message = (error as any)?.message ? `: ${(error as any).message}` : '';
      toast.error(`Fehler beim Erstellen der Liegenschaft${message}`);
      console.error('Create property error:', error);
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  const { isDemoMode, updateProperty: updateDemoProperty } = useDemoData();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: PropertyInsert & { id: string }) => {
      if (isDemoMode) {
        updateDemoProperty(id, updates);
        return { id, ...updates };
      }

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
  const { isDemoMode, deleteProperty: deleteDemoProperty } = useDemoData();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        deleteDemoProperty(id);
        return;
      }

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
