import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OwnerPayout {
  id: string;
  organization_id: string | null;
  property_id: string;
  owner_id: string;
  period_from: string;
  period_to: string;
  total_income: number;
  total_expenses: number;
  management_fee: number;
  net_payout: number;
  status: 'entwurf' | 'freigegeben' | 'ausgezahlt';
  pdf_url: string | null;
  sepa_exported_at: string | null;
  email_sent_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useOwnerPayouts(propertyId?: string) {
  return useQuery({
    queryKey: ['owner-payouts', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('owner_payouts' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (propertyId) query = query.eq('property_id', propertyId);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as OwnerPayout[];
    },
  });
}

export function useCreateOwnerPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payout: Omit<OwnerPayout, 'id' | 'created_at' | 'updated_at' | 'pdf_url' | 'sepa_exported_at' | 'email_sent_at'>) => {
      const { data, error } = await supabase
        .from('owner_payouts' as any)
        .insert(payout as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as OwnerPayout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-payouts'] });
      toast.success('Eigentümer-Abrechnung erstellt');
    },
    onError: () => {
      toast.error('Fehler beim Erstellen der Abrechnung');
    },
  });
}

export function useUpdateOwnerPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<OwnerPayout>) => {
      const { data, error } = await supabase
        .from('owner_payouts' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as OwnerPayout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-payouts'] });
      toast.success('Abrechnung aktualisiert');
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren');
    },
  });
}

export function useDeleteOwnerPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('owner_payouts' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-payouts'] });
      toast.success('Abrechnung gelöscht');
    },
    onError: () => {
      toast.error('Fehler beim Löschen');
    },
  });
}
