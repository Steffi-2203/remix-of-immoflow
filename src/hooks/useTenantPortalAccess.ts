import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useTenantPortalAccess() {
  return useQuery({
    queryKey: ['tenant-portal-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_portal_access')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTenantPortalAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (access: { tenant_id: string; email: string }) => {
      const { data, error } = await supabase
        .from('tenant_portal_access')
        .insert(access)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-portal-access'] });
      toast.success('Portal-Zugang erstellt');
    },
    onError: (e: any) => {
      if (e.message?.includes('duplicate')) {
        toast.error('Dieser Mieter hat bereits einen Zugang');
      } else {
        toast.error('Fehler beim Erstellen des Zugangs');
      }
    },
  });
}

export function useToggleTenantPortalAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('tenant_portal_access')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-portal-access'] });
      toast.success('Zugang aktualisiert');
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });
}
