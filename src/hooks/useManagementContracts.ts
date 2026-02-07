import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useManagementContracts() {
  return useQuery({
    queryKey: ['management-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('management_contracts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateManagementContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contract: {
      organization_id: string;
      property_id?: string;
      owner_name?: string;
      contract_type?: string;
      title: string;
      start_date: string;
      end_date?: string;
      auto_renew?: boolean;
      renewal_months?: number;
      notice_period_months?: number;
      notice_deadline?: string;
      monthly_fee?: number;
      fee_type?: string;
      notes?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from('management_contracts')
        .insert(contract)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-contracts'] });
      toast.success('Vertrag gespeichert');
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });
}

export function useUpdateManagementContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('management_contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-contracts'] });
      toast.success('Vertrag aktualisiert');
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });
}

export function useDeleteManagementContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('management_contracts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-contracts'] });
      toast.success('Vertrag gelöscht');
    },
    onError: () => toast.error('Fehler beim Löschen'),
  });
}
