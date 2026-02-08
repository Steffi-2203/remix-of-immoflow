import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDemoData } from '@/contexts/DemoDataContext';
import { mockContractors } from '@/data/mockData';

export interface Contractor {
  id: string;
  organization_id: string | null;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  specializations: string[];
  rating: number | null;
  notes: string | null;
  is_active: boolean;
  iban: string | null;
  bic: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ContractorInsert = Omit<Contractor, 'id' | 'created_at' | 'updated_at'>;
export type ContractorUpdate = Partial<ContractorInsert>;

export const SPECIALIZATIONS = [
  { value: 'sanitaer', label: 'Sanitär / Installateur' },
  { value: 'elektro', label: 'Elektriker' },
  { value: 'heizung', label: 'Heizungstechniker' },
  { value: 'klima', label: 'Klimaanlagen' },
  { value: 'aufzug', label: 'Aufzugstechnik' },
  { value: 'maler', label: 'Maler / Anstreicher' },
  { value: 'tischler', label: 'Tischler / Schreiner' },
  { value: 'schlosser', label: 'Schlosser / Metallbau' },
  { value: 'dachdecker', label: 'Dachdecker' },
  { value: 'garten', label: 'Garten / Außenanlagen' },
  { value: 'reinigung', label: 'Gebäudereinigung' },
  { value: 'hausmeister', label: 'Hausmeister / Facility' },
  { value: 'brandschutz', label: 'Brandschutz' },
  { value: 'sicherheit', label: 'Sicherheitstechnik' },
  { value: 'sonstige', label: 'Sonstige' },
] as const;

export function useContractors(onlyActive = true) {
  const { isDemoMode } = useDemoData();

  return useQuery({
    queryKey: ['contractors', { onlyActive, isDemoMode }],
    queryFn: async () => {
      if (isDemoMode) {
        let contractors = mockContractors as unknown as Contractor[];
        if (onlyActive) {
          contractors = contractors.filter(c => c.is_active);
        }
        return contractors;
      }

      let query = supabase
        .from('contractors')
        .select('*')
        .order('company_name')
        .limit(500);
      
      if (onlyActive) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Contractor[];
    },
  });
}

export function useContractor(id: string | undefined) {
  return useQuery({
    queryKey: ['contractors', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Contractor;
    },
    enabled: !!id,
  });
}

export function useCreateContractor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contractor: ContractorInsert) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();
      
      const { data, error } = await supabase
        .from('contractors')
        .insert({
          ...contractor,
          organization_id: profile?.organization_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Contractor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Handwerker erfolgreich angelegt');
    },
    onError: (error) => {
      toast.error('Fehler beim Anlegen des Handwerkers');
      console.error('Create contractor error:', error);
    },
  });
}

export function useUpdateContractor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: ContractorUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('contractors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Contractor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Handwerker erfolgreich aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren des Handwerkers');
      console.error('Update contractor error:', error);
    },
  });
}

export function useDeleteContractor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contractors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Handwerker erfolgreich gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen des Handwerkers');
      console.error('Delete contractor error:', error);
    },
  });
}

export function getSpecializationLabel(value: string): string {
  const spec = SPECIALIZATIONS.find(s => s.value === value);
  return spec?.label || value;
}
