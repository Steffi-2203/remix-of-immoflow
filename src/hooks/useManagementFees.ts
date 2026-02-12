import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ManagementFee {
  id: string;
  organization_id: string;
  property_id: string;
  year: number;
  fee_type: 'verwaltung' | 'sonderverwaltung' | 'rechtsgeschaeft';
  basis_type: 'pro_einheit' | 'prozent_miete' | 'pauschal' | 'pro_qm';
  basis_value: number;
  unit_count: number | null;
  total_area: number | null;
  calculated_fee: number;
  vat_rate: number;
  vat_amount: number;
  total_with_vat: number;
  notes: string | null;
  created_at: string;
}

const FEE_TYPE_LABELS: Record<string, string> = {
  verwaltung: 'Verwaltungshonorar',
  sonderverwaltung: 'Sonderverwaltung',
  rechtsgeschaeft: 'Rechtsgeschäfte',
};

const BASIS_TYPE_LABELS: Record<string, string> = {
  pro_einheit: 'Pro Einheit',
  prozent_miete: '% der Miete',
  pauschal: 'Pauschal',
  pro_qm: 'Pro m²',
};

export { FEE_TYPE_LABELS, BASIS_TYPE_LABELS };

export function useManagementFees(propertyId?: string) {
  return useQuery({
    queryKey: ['management-fees', propertyId],
    queryFn: async () => {
      if (!supabase) throw new Error('Backend nicht konfiguriert');
      let query = (supabase.from('management_fees' as any) as any)
        .select('*')
        .order('year', { ascending: false });
      if (propertyId) query = query.eq('property_id', propertyId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ManagementFee[];
    },
    enabled: !!supabase,
  });
}

export function useCreateManagementFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fee: Omit<ManagementFee, 'id' | 'created_at'>) => {
      if (!supabase) throw new Error('Backend nicht konfiguriert');
      const { data, error } = await (supabase.from('management_fees' as any) as any)
        .insert(fee)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-fees'] });
      toast.success('Honorar berechnet');
    },
    onError: () => toast.error('Fehler bei der Honorarberechnung'),
  });
}

export function useUpdateManagementFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ManagementFee> & { id: string }) => {
      if (!supabase) throw new Error('Backend nicht konfiguriert');
      const { error } = await (supabase.from('management_fees' as any) as any)
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-fees'] });
      toast.success('Honorar aktualisiert');
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });
}

export function useDeleteManagementFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Backend nicht konfiguriert');
      const { error } = await (supabase.from('management_fees' as any) as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-fees'] });
      toast.success('Honorar gelöscht');
    },
    onError: () => toast.error('Fehler beim Löschen'),
  });
}
