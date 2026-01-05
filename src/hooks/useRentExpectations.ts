import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type RentExpectation = Tables<'rent_expectations'>;
export type RentExpectationInsert = TablesInsert<'rent_expectations'>;
export type RentExpectationUpdate = TablesUpdate<'rent_expectations'>;

export function useRentExpectations() {
  return useQuery({
    queryKey: ['rent_expectations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_expectations')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as RentExpectation[];
    },
  });
}

export function useRentExpectationsByUnit(unitId?: string) {
  return useQuery({
    queryKey: ['rent_expectations', 'unit', unitId],
    queryFn: async () => {
      if (!unitId) return [];
      const { data, error } = await supabase
        .from('rent_expectations')
        .select('*')
        .eq('unit_id', unitId)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as RentExpectation[];
    },
    enabled: !!unitId,
  });
}

export function useCurrentRentExpectation(unitId?: string) {
  return useQuery({
    queryKey: ['rent_expectations', 'current', unitId],
    queryFn: async () => {
      if (!unitId) return null;
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('rent_expectations')
        .select('*')
        .eq('unit_id', unitId)
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as RentExpectation | null;
    },
    enabled: !!unitId,
  });
}

export function useCreateRentExpectation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (expectation: RentExpectationInsert) => {
      const { data, error } = await supabase
        .from('rent_expectations')
        .insert(expectation)
        .select()
        .single();
      
      if (error) throw error;
      return data as RentExpectation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent_expectations'] });
      toast.success('Soll-Miete erfolgreich angelegt');
    },
    onError: (error) => {
      toast.error('Fehler beim Anlegen der Soll-Miete');
      console.error('Create rent expectation error:', error);
    },
  });
}

export function useUpdateRentExpectation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: RentExpectationUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('rent_expectations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as RentExpectation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent_expectations'] });
      toast.success('Soll-Miete aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren der Soll-Miete');
      console.error('Update rent expectation error:', error);
    },
  });
}

export function useDeleteRentExpectation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rent_expectations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent_expectations'] });
      toast.success('Soll-Miete gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen der Soll-Miete');
      console.error('Delete rent expectation error:', error);
    },
  });
}
