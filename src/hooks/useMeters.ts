import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
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
      const url = unitId ? `/api/meters?unit_id=${unitId}` : '/api/meters';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch meters');
      return response.json() as Promise<Meter[]>;
    },
  });
}

export function useMeter(id: string | undefined) {
  return useQuery({
    queryKey: ['meters', 'detail', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/meters/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch meter');
      return response.json() as Promise<Meter | null>;
    },
    enabled: !!id,
  });
}

export function useCreateMeter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (meter: MeterInsert) => {
      const response = await apiRequest('POST', '/api/meters', meter);
      return response.json() as Promise<Meter>;
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
      const response = await apiRequest('PATCH', `/api/meters/${id}`, updates);
      return response.json() as Promise<Meter>;
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
      await apiRequest('DELETE', `/api/meters/${id}`);
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
      if (!meterId) return [];
      const response = await fetch(`/api/meters/${meterId}/readings`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch meter readings');
      return response.json() as Promise<MeterReading[]>;
    },
    enabled: !!meterId,
  });
}

export function useLatestMeterReadings(meterIds: string[]) {
  return useQuery({
    queryKey: ['meter-readings', 'latest', meterIds],
    queryFn: async () => {
      if (meterIds.length === 0) return {};
      
      const results: Record<string, MeterReading[]> = {};
      
      for (const meterId of meterIds) {
        const response = await fetch(`/api/meters/${meterId}/readings?limit=2`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch meter readings');
        results[meterId] = await response.json();
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
      const response = await apiRequest('POST', `/api/meters/${reading.meter_id}/readings`, reading);
      return response.json() as Promise<MeterReading>;
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
