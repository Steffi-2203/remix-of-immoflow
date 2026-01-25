import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Meter {
  id: string;
  unit_id: string;
  property_id: string | null;
  meter_number: string;
  meter_type: 'strom' | 'gas' | 'wasser' | 'heizung' | 'warmwasser' | 'sonstiges';
  location: string | null;
  is_active: boolean | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  units?: {
    id: string;
    top_nummer: string;
    property_id: string;
    properties?: {
      id: string;
      name: string;
      address: string;
    };
  };
}

export interface MeterReading {
  id: string;
  meter_id: string;
  reading_date: string;
  reading_value: number;
  is_estimated: boolean | null;
  read_by: string | null;
  image_url: string | null;
  notes: string | null;
  created_at: string | null;
}

export interface MeterInsert {
  unit_id: string;
  property_id?: string | null;
  meter_number: string;
  meter_type: 'strom' | 'gas' | 'wasser' | 'heizung' | 'warmwasser' | 'sonstiges';
  location?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export interface MeterUpdate {
  id: string;
  unit_id?: string;
  property_id?: string | null;
  meter_number?: string;
  meter_type?: 'strom' | 'gas' | 'wasser' | 'heizung' | 'warmwasser' | 'sonstiges';
  location?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export interface MeterReadingInsert {
  meter_id: string;
  reading_date: string;
  reading_value: number;
  is_estimated?: boolean;
  read_by?: string | null;
  notes?: string | null;
}

export function useMeters(unitId?: string) {
  return useQuery({
    queryKey: ['meters', unitId],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      let query = (supabase as any)
        .from('meters')
        .select('*, units(id, top_nummer, property_id, properties(id, name, address))')
        .order('meter_number');
      
      if (unitId) {
        query = query.eq('unit_id', unitId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Meter[];
    },
  });
}

export function useMeter(id: string | undefined) {
  return useQuery({
    queryKey: ['meters', 'detail', id],
    queryFn: async () => {
      if (!id || !supabase) return null;
      
      const { data, error } = await (supabase as any)
        .from('meters')
        .select('*, units(id, top_nummer, property_id, properties(id, name, address))')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Meter | null;
    },
    enabled: !!id,
  });
}

export function useCreateMeter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (meter: MeterInsert) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await (supabase as any)
        .from('meters')
        .insert(meter)
        .select()
        .single();
      
      if (error) throw error;
      return data as Meter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meters'] });
      toast.success('Zähler erfolgreich angelegt');
    },
    onError: (error) => {
      toast.error('Fehler beim Anlegen des Zählers');
      console.error('Create meter error:', error);
    },
  });
}

export function useUpdateMeter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: MeterUpdate) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await (supabase as any)
        .from('meters')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Meter;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meters'] });
      queryClient.invalidateQueries({ queryKey: ['meters', 'detail', data.id] });
      toast.success('Zähler erfolgreich aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren des Zählers');
      console.error('Update meter error:', error);
    },
  });
}

export function useDeleteMeter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { error } = await (supabase as any)
        .from('meters')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meters'] });
      toast.success('Zähler erfolgreich gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen des Zählers');
      console.error('Delete meter error:', error);
    },
  });
}

export function useMeterReadings(meterId: string | undefined) {
  return useQuery({
    queryKey: ['meter-readings', meterId],
    queryFn: async () => {
      if (!meterId || !supabase) return [];
      
      const { data, error } = await (supabase as any)
        .from('meter_readings')
        .select('*')
        .eq('meter_id', meterId)
        .order('reading_date', { ascending: false });
      
      if (error) throw error;
      return data as MeterReading[];
    },
    enabled: !!meterId,
  });
}

export function useLatestMeterReadings(meterIds: string[]) {
  return useQuery({
    queryKey: ['meter-readings', 'latest', meterIds],
    queryFn: async () => {
      if (!supabase || meterIds.length === 0) return {};
      
      const results: Record<string, MeterReading[]> = {};
      
      for (const meterId of meterIds) {
        const { data, error } = await (supabase as any)
          .from('meter_readings')
          .select('*')
          .eq('meter_id', meterId)
          .order('reading_date', { ascending: false })
          .limit(2);
        
        if (error) throw error;
        results[meterId] = data as MeterReading[];
      }
      
      return results;
    },
    enabled: meterIds.length > 0,
  });
}

export function useCreateMeterReading() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reading: MeterReadingInsert) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await (supabase as any)
        .from('meter_readings')
        .insert(reading)
        .select()
        .single();
      
      if (error) throw error;
      return data as MeterReading;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meter-readings'] });
      toast.success('Zählerstand erfolgreich erfasst');
    },
    onError: (error) => {
      toast.error('Fehler beim Erfassen des Zählerstands');
      console.error('Create meter reading error:', error);
    },
  });
}
