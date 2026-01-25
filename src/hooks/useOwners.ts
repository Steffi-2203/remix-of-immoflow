import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Owner = Tables<'property_owners'> & {
  properties?: {
    id: string;
    name: string;
    address: string | null;
  };
};
export type OwnerInsert = TablesInsert<'property_owners'>;
export type OwnerUpdate = TablesUpdate<'property_owners'>;

export function useOwners() {
  return useQuery({
    queryKey: ['owners'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await supabase
        .from('property_owners')
        .select('*, properties(id, name, address)')
        .order('name');
      
      if (error) throw error;
      return data as Owner[];
    },
  });
}

export function useOwner(id: string | undefined) {
  return useQuery({
    queryKey: ['owners', id],
    queryFn: async () => {
      if (!id || !supabase) return null;
      
      const { data, error } = await supabase
        .from('property_owners')
        .select('*, properties(id, name, address)')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Owner | null;
    },
    enabled: !!id,
  });
}

export function useCreateOwner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (owner: OwnerInsert) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await supabase
        .from('property_owners')
        .insert(owner)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      queryClient.invalidateQueries({ queryKey: ['property-owners'] });
      toast.success('Eigentümer erfolgreich angelegt');
    },
    onError: (error) => {
      toast.error('Fehler beim Anlegen des Eigentümers');
      console.error('Create owner error:', error);
    },
  });
}

export function useUpdateOwner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: OwnerUpdate & { id: string }) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await supabase
        .from('property_owners')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      queryClient.invalidateQueries({ queryKey: ['owners', data.id] });
      queryClient.invalidateQueries({ queryKey: ['property-owners'] });
      toast.success('Eigentümer erfolgreich aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren des Eigentümers');
      console.error('Update owner error:', error);
    },
  });
}

export function useDeleteOwner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { error } = await supabase
        .from('property_owners')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      queryClient.invalidateQueries({ queryKey: ['property-owners'] });
      toast.success('Eigentümer erfolgreich gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen des Eigentümers');
      console.error('Delete owner error:', error);
    },
  });
}

export function usePropertyOwnersForProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['owners', 'property', propertyId],
    queryFn: async () => {
      if (!propertyId || !supabase) return [];
      
      const { data, error } = await supabase
        .from('property_owners')
        .select('*, properties(id, name, address)')
        .eq('property_id', propertyId)
        .order('is_primary', { ascending: false })
        .order('ownership_share', { ascending: false });
      
      if (error) throw error;
      return data as Owner[];
    },
    enabled: !!propertyId,
  });
}
