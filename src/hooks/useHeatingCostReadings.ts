import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HeatingCostReading {
  id: string;
  organization_id: string | null;
  property_id: string;
  unit_id: string;
  period_from: string;
  period_to: string;
  consumption: number;
  consumption_unit: string;
  cost_share: number;
  source: 'csv' | 'manual';
  provider: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useHeatingCostReadings(propertyId?: string, periodFrom?: string, periodTo?: string) {
  return useQuery({
    queryKey: ['heating-cost-readings', propertyId, periodFrom, periodTo],
    queryFn: async () => {
      let query = supabase
        .from('heating_cost_readings' as any)
        .select('*')
        .order('period_from', { ascending: false });

      if (propertyId) query = query.eq('property_id', propertyId);
      if (periodFrom) query = query.gte('period_from', periodFrom);
      if (periodTo) query = query.lte('period_to', periodTo);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as HeatingCostReading[];
    },
    enabled: !!propertyId,
  });
}

export function useCreateHeatingCostReading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reading: Omit<HeatingCostReading, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('heating_cost_readings' as any)
        .insert(reading as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heating-cost-readings'] });
      toast.success('Heizkostenablesung gespeichert');
    },
    onError: () => {
      toast.error('Fehler beim Speichern der Ablesung');
    },
  });
}

export function useBulkCreateHeatingCostReadings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (readings: Omit<HeatingCostReading, 'id' | 'created_at' | 'updated_at'>[]) => {
      const { data, error } = await supabase
        .from('heating_cost_readings' as any)
        .insert(readings as any)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['heating-cost-readings'] });
      toast.success(`${(data as any[]).length} Ablesungen importiert`);
    },
    onError: () => {
      toast.error('Fehler beim Import');
    },
  });
}

export function useDeleteHeatingCostReading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('heating_cost_readings' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heating-cost-readings'] });
      toast.success('Ablesung gelöscht');
    },
    onError: () => {
      toast.error('Fehler beim Löschen');
    },
  });
}
