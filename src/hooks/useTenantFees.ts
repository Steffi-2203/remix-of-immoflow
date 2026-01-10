import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type FeeType = Database['public']['Enums']['fee_type'];

export interface TenantFee {
  id: string;
  tenant_id: string;
  fee_type: FeeType;
  amount: number;
  description: string | null;
  sepa_item_id: string | null;
  created_at: string;
  paid_at: string | null;
  payment_id: string | null;
  notes: string | null;
}

export interface CreateTenantFeeInput {
  tenant_id: string;
  fee_type?: FeeType;
  amount?: number;
  description?: string;
  sepa_item_id?: string;
  notes?: string;
}

// Default fee amount for return debits
export const DEFAULT_RETURN_FEE = 6.00;

// Fee type labels
export const FEE_TYPE_LABELS: Record<FeeType, string> = {
  ruecklastschrift: 'Rücklastschrift-Gebühr',
  mahnung: 'Mahngebühr',
  sonstiges: 'Sonstige Gebühr',
};

// Fetch all tenant fees
export function useTenantFees() {
  return useQuery({
    queryKey: ['tenant-fees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_fees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TenantFee[];
    },
  });
}

// Fetch fees for a specific tenant
export function useTenantFeesByTenantId(tenantId: string | null) {
  return useQuery({
    queryKey: ['tenant-fees', 'tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('tenant_fees')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TenantFee[];
    },
    enabled: !!tenantId,
  });
}

// Fetch unpaid fees
export function useUnpaidTenantFees() {
  return useQuery({
    queryKey: ['tenant-fees', 'unpaid'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_fees')
        .select('*')
        .is('paid_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TenantFee[];
    },
  });
}

// Create a new tenant fee
export function useCreateTenantFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTenantFeeInput) => {
      const { data, error } = await supabase
        .from('tenant_fees')
        .insert({
          tenant_id: input.tenant_id,
          fee_type: input.fee_type || 'ruecklastschrift',
          amount: input.amount ?? DEFAULT_RETURN_FEE,
          description: input.description,
          sepa_item_id: input.sepa_item_id,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TenantFee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-fees'] });
    },
    onError: (error) => {
      console.error('Error creating tenant fee:', error);
      toast.error('Fehler beim Erstellen der Gebühr');
    },
  });
}

// Mark a fee as paid
export function useMarkFeePaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ feeId, paymentId }: { feeId: string; paymentId?: string }) => {
      const { data, error } = await supabase
        .from('tenant_fees')
        .update({
          paid_at: new Date().toISOString(),
          payment_id: paymentId,
        })
        .eq('id', feeId)
        .select()
        .single();

      if (error) throw error;
      return data as TenantFee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-fees'] });
      toast.success('Gebühr als bezahlt markiert');
    },
    onError: (error) => {
      console.error('Error marking fee as paid:', error);
      toast.error('Fehler beim Aktualisieren der Gebühr');
    },
  });
}

// Delete a tenant fee
export function useDeleteTenantFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feeId: string) => {
      const { error } = await supabase
        .from('tenant_fees')
        .delete()
        .eq('id', feeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-fees'] });
      toast.success('Gebühr gelöscht');
    },
    onError: (error) => {
      console.error('Error deleting tenant fee:', error);
      toast.error('Fehler beim Löschen der Gebühr');
    },
  });
}
