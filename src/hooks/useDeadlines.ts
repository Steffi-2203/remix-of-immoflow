import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Deadline {
  id: string;
  organization_id: string | null;
  property_id: string | null;
  title: string;
  description: string | null;
  deadline_date: string;
  reminder_days: number;
  reminder_sent_at: string | null;
  category: 'vertrag' | 'versicherung' | 'wartung' | 'abrechnung' | 'steuer' | 'sonstiges';
  source_type: string | null;
  source_id: string | null;
  is_recurring: boolean;
  recurrence_months: number | null;
  status: 'offen' | 'erledigt' | 'uebersprungen';
  created_at: string;
  updated_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  vertrag: 'Vertrag',
  versicherung: 'Versicherung',
  wartung: 'Wartung',
  abrechnung: 'Abrechnung',
  steuer: 'Steuer',
  sonstiges: 'Sonstiges',
};

export function getCategoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] || cat;
}

export function useDeadlines(filters?: { status?: string; category?: string; propertyId?: string }) {
  return useQuery({
    queryKey: ['deadlines', filters],
    queryFn: async () => {
      let query = supabase.from('deadlines' as any).select('*').order('deadline_date', { ascending: true });
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.propertyId) query = query.eq('property_id', filters.propertyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Deadline[];
    },
  });
}

export function useCreateDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deadline: Omit<Deadline, 'id' | 'created_at' | 'updated_at' | 'reminder_sent_at'>) => {
      const { data, error } = await supabase.from('deadlines' as any).insert(deadline as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deadlines'] }); toast.success('Frist erstellt'); },
    onError: () => { toast.error('Fehler beim Erstellen'); },
  });
}

export function useUpdateDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Deadline>) => {
      const { data, error } = await supabase.from('deadlines' as any).update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deadlines'] }); toast.success('Frist aktualisiert'); },
    onError: () => { toast.error('Fehler'); },
  });
}

export function useDeleteDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('deadlines' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deadlines'] }); toast.success('Frist gelöscht'); },
    onError: () => { toast.error('Fehler'); },
  });
}
