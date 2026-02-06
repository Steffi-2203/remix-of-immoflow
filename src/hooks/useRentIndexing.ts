import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDemoData } from '@/contexts/DemoDataContext';

export interface RentIndexClause {
  id: string;
  tenant_id: string;
  index_type: 'vpi' | 'richtwert';
  base_index_value: number;
  base_index_date: string;
  current_index_value: number | null;
  threshold_percent: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RentAdjustment {
  id: string;
  tenant_id: string;
  clause_id: string;
  adjustment_date: string;
  old_grundmiete: number;
  new_grundmiete: number;
  old_index_value: number;
  new_index_value: number;
  change_percent: number;
  applied_by: string | null;
  notes: string | null;
  created_at: string;
}

export function useRentIndexClauses(tenantId?: string) {
  const { isDemoMode } = useDemoData();

  return useQuery({
    queryKey: ['rent-index-clauses', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('rent_index_clauses')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as RentIndexClause[];
    },
    enabled: !!tenantId && !isDemoMode,
  });
}

export function useRentAdjustments(tenantId?: string) {
  const { isDemoMode } = useDemoData();

  return useQuery({
    queryKey: ['rent-adjustments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('rent_adjustments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('adjustment_date', { ascending: false });
      if (error) throw error;
      return data as unknown as RentAdjustment[];
    },
    enabled: !!tenantId && !isDemoMode,
  });
}

export function useCreateRentIndexClause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clause: Omit<RentIndexClause, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('rent_index_clauses')
        .insert(clause as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rent-index-clauses', variables.tenant_id] });
      toast.success('Wertsicherungsklausel erstellt');
    },
    onError: () => {
      toast.error('Fehler beim Erstellen der Klausel');
    },
  });
}

export function useUpdateRentIndexClause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tenantId, ...updates }: { id: string; tenantId: string } & Partial<RentIndexClause>) => {
      const { data, error } = await supabase
        .from('rent_index_clauses')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rent-index-clauses', variables.tenantId] });
      toast.success('Klausel aktualisiert');
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren');
    },
  });
}

export function useApplyRentAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (adjustment: Omit<RentAdjustment, 'id' | 'created_at'>) => {
      // Insert adjustment record
      const { error: adjError } = await supabase
        .from('rent_adjustments')
        .insert(adjustment as any);
      if (adjError) throw adjError;

      // Update tenant's grundmiete
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({ grundmiete: adjustment.new_grundmiete })
        .eq('id', adjustment.tenant_id);
      if (tenantError) throw tenantError;

      // Update clause's current_index_value
      const { error: clauseError } = await supabase
        .from('rent_index_clauses')
        .update({ 
          current_index_value: adjustment.new_index_value,
          base_index_value: adjustment.new_index_value,
          base_index_date: adjustment.adjustment_date,
        } as any)
        .eq('id', adjustment.clause_id);
      if (clauseError) throw clauseError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rent-adjustments', variables.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['rent-index-clauses', variables.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', variables.tenant_id] });
      toast.success('Indexanpassung durchgeführt');
    },
    onError: () => {
      toast.error('Fehler bei der Indexanpassung');
    },
  });
}
