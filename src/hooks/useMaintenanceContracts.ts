import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MaintenanceContract {
  id: string;
  organization_id: string | null;
  property_id: string;
  title: string;
  contract_type: string;
  description: string | null;
  contractor_name: string | null;
  contractor_contact: string | null;
  contractor_email: string | null;
  interval_months: number;
  last_maintenance_date: string | null;
  next_due_date: string;
  reminder_days: number;
  reminder_sent_at: string | null;
  estimated_cost: number | null;
  contract_fee: number | null;
  is_active: boolean;
  document_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  properties?: {
    name: string;
    address: string;
  };
}

export interface CreateMaintenanceContract {
  property_id: string;
  title: string;
  contract_type: string;
  description?: string;
  contractor_name?: string;
  contractor_contact?: string;
  contractor_email?: string;
  interval_months: number;
  last_maintenance_date?: string;
  next_due_date: string;
  reminder_days?: number;
  estimated_cost?: number;
  contract_fee?: number;
  document_url?: string;
  notes?: string;
}

export const CONTRACT_TYPES = [
  { value: 'tuev', label: 'TÜV-Prüfung', defaultInterval: 24 },
  { value: 'elevator', label: 'Aufzugwartung', defaultInterval: 12 },
  { value: 'hvac', label: 'Klimaanlage', defaultInterval: 12 },
  { value: 'heating', label: 'Heizungsanlage', defaultInterval: 12 },
  { value: 'fire_safety', label: 'Brandschutz', defaultInterval: 12 },
  { value: 'electrical', label: 'Elektroprüfung', defaultInterval: 48 },
  { value: 'water', label: 'Wasseruntersuchung (Legionellen)', defaultInterval: 12 },
  { value: 'chimney', label: 'Kaminkehrer', defaultInterval: 12 },
  { value: 'gas', label: 'Gasanlage', defaultInterval: 12 },
  { value: 'other', label: 'Sonstige', defaultInterval: 12 },
] as const;

export function getContractTypeLabel(type: string): string {
  const found = CONTRACT_TYPES.find(t => t.value === type);
  return found?.label || type;
}

export function useMaintenanceContracts(propertyId?: string) {
  return useQuery({
    queryKey: ['maintenance_contracts', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('maintenance_contracts')
        .select(`
          *,
          properties:property_id (
            name,
            address
          )
        `)
        .eq('is_active', true)
        .order('next_due_date', { ascending: true });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MaintenanceContract[];
    },
  });
}

export function useUpcomingMaintenance(daysAhead: number = 30) {
  return useQuery({
    queryKey: ['upcoming_maintenance', daysAhead],
    queryFn: async () => {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + daysAhead);

      const { data, error } = await supabase
        .from('maintenance_contracts')
        .select(`
          *,
          properties:property_id (
            name,
            address
          )
        `)
        .eq('is_active', true)
        .lte('next_due_date', futureDate.toISOString().split('T')[0])
        .order('next_due_date', { ascending: true });

      if (error) throw error;

      // Categorize into overdue and upcoming
      const todayStr = today.toISOString().split('T')[0];
      const contracts = data as MaintenanceContract[];
      
      return {
        overdue: contracts.filter(c => c.next_due_date < todayStr),
        upcoming: contracts.filter(c => c.next_due_date >= todayStr),
        all: contracts,
      };
    },
  });
}

export function useCreateMaintenanceContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contract: CreateMaintenanceContract) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userData.user?.id)
        .single();

      const { data, error } = await supabase
        .from('maintenance_contracts')
        .insert({
          ...contract,
          organization_id: profile?.organization_id,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_contracts'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming_maintenance'] });
      toast.success('Wartungsvertrag erfolgreich erstellt');
    },
    onError: (error: Error) => {
      toast.error(`Fehler beim Erstellen: ${error.message}`);
    },
  });
}

export function useUpdateMaintenanceContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MaintenanceContract> & { id: string }) => {
      const { data, error } = await supabase
        .from('maintenance_contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_contracts'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming_maintenance'] });
      toast.success('Wartungsvertrag aktualisiert');
    },
    onError: (error: Error) => {
      toast.error(`Fehler beim Aktualisieren: ${error.message}`);
    },
  });
}

export function useMarkMaintenanceComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completedDate }: { id: string; completedDate: string }) => {
      // First get the contract to calculate new due date
      const { data: contract, error: fetchError } = await supabase
        .from('maintenance_contracts')
        .select('interval_months')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new due date
      const newDueDate = new Date(completedDate);
      newDueDate.setMonth(newDueDate.getMonth() + contract.interval_months);

      const { data, error } = await supabase
        .from('maintenance_contracts')
        .update({
          last_maintenance_date: completedDate,
          next_due_date: newDueDate.toISOString().split('T')[0],
          reminder_sent_at: null, // Reset reminder
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_contracts'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming_maintenance'] });
      toast.success('Wartung als erledigt markiert, nächster Termin berechnet');
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
}

export function useDeleteMaintenanceContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('maintenance_contracts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_contracts'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming_maintenance'] });
      toast.success('Wartungsvertrag gelöscht');
    },
    onError: (error: Error) => {
      toast.error(`Fehler beim Löschen: ${error.message}`);
    },
  });
}
