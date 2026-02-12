import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TenantAnnouncement {
  id: string;
  organization_id: string;
  property_id: string | null;
  title: string;
  content: string;
  category: 'allgemein' | 'wartung' | 'wichtig' | 'veranstaltung';
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_by: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  allgemein: 'Allgemein',
  wartung: 'Wartung',
  wichtig: 'Wichtig',
  veranstaltung: 'Veranstaltung',
};

export { CATEGORY_LABELS };

export function useAnnouncements(propertyId?: string) {
  return useQuery({
    queryKey: ['announcements', propertyId],
    queryFn: async () => {
      if (!supabase) throw new Error('Backend nicht konfiguriert');
      let query = (supabase.from('tenant_announcements' as any) as any)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (propertyId) query = query.eq('property_id', propertyId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as TenantAnnouncement[];
    },
    enabled: !!supabase,
  });
}

export function useAllAnnouncements() {
  return useQuery({
    queryKey: ['announcements', 'all'],
    queryFn: async () => {
      if (!supabase) throw new Error('Backend nicht konfiguriert');
      const { data, error } = await (supabase.from('tenant_announcements' as any) as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as TenantAnnouncement[];
    },
    enabled: !!supabase,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (announcement: Omit<TenantAnnouncement, 'id' | 'created_at'>) => {
      if (!supabase) throw new Error('Backend nicht konfiguriert');
      const { data, error } = await (supabase.from('tenant_announcements' as any) as any)
        .insert(announcement)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Ankündigung erstellt');
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TenantAnnouncement> & { id: string }) => {
      if (!supabase) throw new Error('Backend nicht konfiguriert');
      const { error } = await (supabase.from('tenant_announcements' as any) as any)
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Ankündigung aktualisiert');
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Backend nicht konfiguriert');
      const { error } = await (supabase.from('tenant_announcements' as any) as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Ankündigung gelöscht');
    },
    onError: () => toast.error('Fehler beim Löschen'),
  });
}
