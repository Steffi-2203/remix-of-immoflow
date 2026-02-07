import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
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
    queryKey: ['/api/weg/assemblies', propertyId],
    queryFn: async () => {
      const params = propertyId ? `?propertyId=${propertyId}` : '';
      const res = await fetch(`/api/weg/assemblies${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Fehler beim Laden');
      return res.json() as Promise<WegAssembly[]>;
    },
  });
}

export function useCreateWegAssembly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assembly: Omit<WegAssembly, 'id' | 'created_at' | 'updated_at'>) => {
      const res = await apiRequest('POST', '/api/weg/assemblies', assembly);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/weg/assemblies'] });
      toast.success('Versammlung erstellt');
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });
}

export function useUpdateWegAssembly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<WegAssembly>) => {
      const res = await apiRequest('PATCH', `/api/weg/assemblies/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/weg/assemblies'] });
      toast.success('Versammlung aktualisiert');
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });
}

export function useWegVotes(assemblyId?: string) {
  return useQuery({
    queryKey: ['/api/weg/votes', assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/weg/votes?assemblyId=${assemblyId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Fehler beim Laden');
      return res.json() as Promise<WegVote[]>;
    },
    enabled: !!assemblyId,
  });
}

export function useCreateWegVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vote: Omit<WegVote, 'id' | 'created_at'>) => {
      const res = await apiRequest('POST', '/api/weg/votes', vote);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/weg/votes'] });
      toast.success('Abstimmung gespeichert');
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });
}

export function useReserveFund(propertyId?: string) {
  return useQuery({
    queryKey: ['/api/weg/reserve-fund', propertyId],
    queryFn: async () => {
      const params = propertyId ? `?propertyId=${propertyId}` : '';
      const res = await fetch(`/api/weg/reserve-fund${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Fehler beim Laden');
      return res.json() as Promise<ReserveFundEntry[]>;
    },
  });
}

export function useCreateReserveFundEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Omit<ReserveFundEntry, 'id' | 'created_at'>) => {
      const res = await apiRequest('POST', '/api/weg/reserve-fund', entry);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/weg/reserve-fund'] });
      toast.success('Rücklage-Eintrag erstellt');
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });
}
