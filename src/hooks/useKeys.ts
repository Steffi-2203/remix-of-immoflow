import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KeyInventoryItem {
  id: string;
  property_id: string;
  unit_id: string | null;
  key_type: string;
  key_number: string | null;
  description: string | null;
  total_count: number | null;
  available_count: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  properties?: {
    id: string;
    name: string;
  };
  units?: {
    id: string;
    top_nummer: string;
  } | null;
}

export interface KeyInventoryInsert {
  property_id: string;
  unit_id?: string | null;
  key_type: string;
  key_number?: string | null;
  description?: string | null;
  total_count?: number;
  available_count?: number;
  notes?: string | null;
}

export interface KeyInventoryUpdate extends Partial<KeyInventoryInsert> {
  id: string;
}

export interface KeyHandover {
  id: string;
  key_inventory_id: string;
  tenant_id: string | null;
  recipient_name: string | null;
  handover_date: string;
  return_date: string | null;
  quantity: number | null;
  status: string | null;
  handover_protocol: string | null;
  notes: string | null;
  created_at: string | null;
  tenants?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface KeyHandoverInsert {
  key_inventory_id: string;
  tenant_id?: string | null;
  recipient_name?: string | null;
  handover_date: string;
  return_date?: string | null;
  quantity?: number;
  status?: string;
  handover_protocol?: string | null;
  notes?: string | null;
}

export const KEY_TYPE_LABELS: Record<string, string> = {
  hauptschluessel: 'Haupteingang',
  wohnungsschluessel: 'Wohnung',
  kellerschluessel: 'Keller',
  garagenschluessel: 'Garage',
  briefkastenschluessel: 'Briefkasten',
  sonstiges: 'Sonstiges',
};

export const KEY_STATUS_LABELS: Record<string, string> = {
  vorhanden: 'Vorhanden',
  ausgegeben: 'Ausgegeben',
  verloren: 'Verloren',
  gesperrt: 'Gesperrt',
};

export function useKeyInventory(propertyId?: string) {
  return useQuery({
    queryKey: ['key-inventory', propertyId],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not configured');
      
      let query = (supabase as any)
        .from('key_inventory')
        .select('*, properties(id, name), units(id, top_nummer)')
        .order('created_at', { ascending: false });
      
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as KeyInventoryItem[];
    },
  });
}

export function useKeyInventoryItem(id: string | undefined) {
  return useQuery({
    queryKey: ['key-inventory', 'item', id],
    queryFn: async () => {
      if (!id || !supabase) return null;
      
      const { data, error } = await (supabase as any)
        .from('key_inventory')
        .select('*, properties(id, name), units(id, top_nummer)')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as KeyInventoryItem | null;
    },
    enabled: !!id,
  });
}

export function useCreateKeyInventory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (key: KeyInventoryInsert) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await (supabase as any)
        .from('key_inventory')
        .insert(key)
        .select()
        .single();
      
      if (error) throw error;
      return data as KeyInventoryItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key-inventory'] });
      toast.success('Schlüssel erfolgreich angelegt');
    },
    onError: (error) => {
      toast.error('Fehler beim Anlegen des Schlüssels');
      console.error('Create key error:', error);
    },
  });
}

export function useUpdateKeyInventory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: KeyInventoryUpdate) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await (supabase as any)
        .from('key_inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as KeyInventoryItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['key-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['key-inventory', 'item', data.id] });
      toast.success('Schlüssel erfolgreich aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren des Schlüssels');
      console.error('Update key error:', error);
    },
  });
}

export function useDeleteKeyInventory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { error } = await (supabase as any)
        .from('key_inventory')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key-inventory'] });
      toast.success('Schlüssel erfolgreich gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen des Schlüssels');
      console.error('Delete key error:', error);
    },
  });
}

export function useKeyHandovers(keyInventoryId: string | undefined) {
  return useQuery({
    queryKey: ['key-handovers', keyInventoryId],
    queryFn: async () => {
      if (!keyInventoryId || !supabase) return [];
      
      const { data, error } = await (supabase as any)
        .from('key_handovers')
        .select('*, tenants(id, first_name, last_name)')
        .eq('key_inventory_id', keyInventoryId)
        .order('handover_date', { ascending: false });
      
      if (error) throw error;
      return data as KeyHandover[];
    },
    enabled: !!keyInventoryId,
  });
}

export function useCreateKeyHandover() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (handover: KeyHandoverInsert) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await (supabase as any)
        .from('key_handovers')
        .insert(handover)
        .select()
        .single();
      
      if (error) throw error;
      return data as KeyHandover;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['key-handovers', data.key_inventory_id] });
      queryClient.invalidateQueries({ queryKey: ['key-inventory'] });
      toast.success('Schlüsselübergabe erfolgreich erfasst');
    },
    onError: (error) => {
      toast.error('Fehler beim Erfassen der Schlüsselübergabe');
      console.error('Create handover error:', error);
    },
  });
}
