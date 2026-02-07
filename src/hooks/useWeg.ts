import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WegAssembly {
  id: string;
  organization_id: string | null;
  property_id: string;
  title: string;
  assembly_date: string;
  location: string | null;
  protocol_url: string | null;
  status: 'geplant' | 'durchgefuehrt' | 'protokolliert';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WegVote {
  id: string;
  assembly_id: string;
  topic: string;
  description: string | null;
  votes_yes: number;
  votes_no: number;
  votes_abstain: number;
  result: 'angenommen' | 'abgelehnt' | 'vertagt' | null;
  created_at: string;
}

export interface ReserveFundEntry {
  id: string;
  organization_id: string | null;
  property_id: string;
  year: number;
  month: number;
  amount: number;
  description: string | null;
  entry_type: 'einzahlung' | 'entnahme';
  created_at: string;
}

export function useWegAssemblies(propertyId?: string) {
  return useQuery({
    queryKey: ['weg-assemblies', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('weg_assemblies' as any)
        .select('*')
        .order('assembly_date', { ascending: false });
      if (propertyId) query = query.eq('property_id', propertyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as WegAssembly[];
    },
  });
}

export function useCreateWegAssembly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assembly: Omit<WegAssembly, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('weg_assemblies' as any).insert(assembly as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['weg-assemblies'] }); toast.success('Versammlung erstellt'); },
    onError: () => { toast.error('Fehler beim Erstellen'); },
  });
}

export function useUpdateWegAssembly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<WegAssembly>) => {
      const { data, error } = await supabase.from('weg_assemblies' as any).update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['weg-assemblies'] }); toast.success('Versammlung aktualisiert'); },
    onError: () => { toast.error('Fehler beim Aktualisieren'); },
  });
}

export function useWegVotes(assemblyId?: string) {
  return useQuery({
    queryKey: ['weg-votes', assemblyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('weg_votes' as any).select('*').eq('assembly_id', assemblyId).order('created_at');
      if (error) throw error;
      return data as unknown as WegVote[];
    },
    enabled: !!assemblyId,
  });
}

export function useCreateWegVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vote: Omit<WegVote, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('weg_votes' as any).insert(vote as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['weg-votes'] }); toast.success('Abstimmung gespeichert'); },
    onError: () => { toast.error('Fehler'); },
  });
}

export function useUpdateWegVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<WegVote>) => {
      const { data, error } = await supabase.from('weg_votes' as any).update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['weg-votes'] }); },
    onError: () => { toast.error('Fehler'); },
  });
}

export function useReserveFund(propertyId?: string) {
  return useQuery({
    queryKey: ['weg-reserve-fund', propertyId],
    queryFn: async () => {
      let query = supabase.from('weg_reserve_fund' as any).select('*').order('year', { ascending: false }).order('month', { ascending: false });
      if (propertyId) query = query.eq('property_id', propertyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ReserveFundEntry[];
    },
  });
}

export function useCreateReserveFundEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Omit<ReserveFundEntry, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('weg_reserve_fund' as any).insert(entry as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['weg-reserve-fund'] }); toast.success('Eintrag gespeichert'); },
    onError: () => { toast.error('Fehler'); },
  });
}
