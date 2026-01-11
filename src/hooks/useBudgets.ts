import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PropertyBudget {
  id: string;
  property_id: string;
  organization_id: string | null;
  year: number;
  position_1_name: string | null;
  position_1_amount: number;
  position_2_name: string | null;
  position_2_amount: number;
  position_3_name: string | null;
  position_3_amount: number;
  position_4_name: string | null;
  position_4_amount: number;
  position_5_name: string | null;
  position_5_amount: number;
  status: 'entwurf' | 'eingereicht' | 'genehmigt' | 'abgelehnt';
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  properties?: {
    name: string;
    address: string;
  };
}

export interface BudgetFormData {
  property_id: string;
  year: number;
  position_1_name?: string;
  position_1_amount?: number;
  position_2_name?: string;
  position_2_amount?: number;
  position_3_name?: string;
  position_3_amount?: number;
  position_4_name?: string;
  position_4_amount?: number;
  position_5_name?: string;
  position_5_amount?: number;
  notes?: string;
}

export function useBudgets(propertyId?: string, year?: number) {
  return useQuery({
    queryKey: ['budgets', propertyId, year],
    queryFn: async () => {
      let query = supabase
        .from('property_budgets')
        .select(`
          *,
          properties (
            name,
            address
          )
        `)
        .order('year', { ascending: false });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      if (year) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching budgets:', error);
        throw error;
      }

      return data as PropertyBudget[];
    },
  });
}

export function useBudget(budgetId: string) {
  return useQuery({
    queryKey: ['budget', budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_budgets')
        .select(`
          *,
          properties (
            name,
            address
          )
        `)
        .eq('id', budgetId)
        .single();

      if (error) {
        console.error('Error fetching budget:', error);
        throw error;
      }

      return data as PropertyBudget;
    },
    enabled: !!budgetId,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BudgetFormData) => {
      const { data: result, error } = await supabase
        .from('property_budgets')
        .insert({
          property_id: data.property_id,
          year: data.year,
          position_1_name: data.position_1_name || null,
          position_1_amount: data.position_1_amount || 0,
          position_2_name: data.position_2_name || null,
          position_2_amount: data.position_2_amount || 0,
          position_3_name: data.position_3_name || null,
          position_3_amount: data.position_3_amount || 0,
          position_4_name: data.position_4_name || null,
          position_4_amount: data.position_4_amount || 0,
          position_5_name: data.position_5_name || null,
          position_5_amount: data.position_5_amount || 0,
          notes: data.notes || null,
          status: 'entwurf',
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budgetplan erstellt');
    },
    onError: (error: Error) => {
      console.error('Error creating budget:', error);
      if (error.message.includes('unique')) {
        toast.error('Für diese Liegenschaft existiert bereits ein Budgetplan für dieses Jahr');
      } else {
        toast.error('Fehler beim Erstellen des Budgetplans');
      }
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BudgetFormData> }) => {
      const { data: result, error } = await supabase
        .from('property_budgets')
        .update({
          position_1_name: data.position_1_name,
          position_1_amount: data.position_1_amount,
          position_2_name: data.position_2_name,
          position_2_amount: data.position_2_amount,
          position_3_name: data.position_3_name,
          position_3_amount: data.position_3_amount,
          position_4_name: data.position_4_name,
          position_4_amount: data.position_4_amount,
          position_5_name: data.position_5_name,
          position_5_amount: data.position_5_amount,
          notes: data.notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      toast.success('Budgetplan aktualisiert');
    },
    onError: (error: Error) => {
      console.error('Error updating budget:', error);
      toast.error('Fehler beim Aktualisieren des Budgetplans');
    },
  });
}

export function useUpdateBudgetStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      approved_by 
    }: { 
      id: string; 
      status: 'entwurf' | 'eingereicht' | 'genehmigt' | 'abgelehnt';
      approved_by?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      
      if (status === 'genehmigt' && approved_by) {
        updateData.approved_by = approved_by;
        updateData.approved_at = new Date().toISOString();
      }

      const { data: result, error } = await supabase
        .from('property_budgets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      
      const messages: Record<string, string> = {
        eingereicht: 'Budgetplan zur Genehmigung eingereicht',
        genehmigt: 'Budgetplan genehmigt',
        abgelehnt: 'Budgetplan abgelehnt',
        entwurf: 'Budgetplan auf Entwurf zurückgesetzt',
      };
      toast.success(messages[variables.status]);
    },
    onError: (error: Error) => {
      console.error('Error updating budget status:', error);
      toast.error('Fehler beim Aktualisieren des Status');
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('property_budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budgetplan gelöscht');
    },
    onError: (error: Error) => {
      console.error('Error deleting budget:', error);
      toast.error('Fehler beim Löschen des Budgetplans');
    },
  });
}

// Hook to get budget expenses (actual costs per position)
export function useBudgetExpenses(propertyId: string, year: number) {
  return useQuery({
    queryKey: ['budget-expenses', propertyId, year],
    queryFn: async () => {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const { data, error } = await supabase
        .from('expenses')
        .select('budget_position, betrag')
        .eq('property_id', propertyId)
        .gte('datum', startDate)
        .lte('datum', endDate)
        .not('budget_position', 'is', null);

      if (error) {
        console.error('Error fetching budget expenses:', error);
        throw error;
      }

      // Aggregate by position
      const totals: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      data?.forEach((expense) => {
        if (expense.budget_position) {
          totals[expense.budget_position] += expense.betrag;
        }
      });

      return totals;
    },
    enabled: !!propertyId && !!year,
  });
}
