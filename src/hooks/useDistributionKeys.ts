import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DistributionKey {
  id: string;
  organization_id: string | null;
  key_code: string;
  name: string;
  unit: string;
  input_type: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export type DistributionKeyInsert = Omit<DistributionKey, 'id' | 'created_at' | 'updated_at'>;
export type DistributionKeyUpdate = Partial<DistributionKeyInsert> & { id: string };

// Input type options
export const inputTypeOptions = [
  { value: 'anzahl', label: 'Anzahl', unit: 'Stk.' },
  { value: 'direkteingabe', label: 'Direkteingabe', unit: 'Anteil' },
  { value: 'promille', label: 'Promille (‰)', unit: '‰' },
  { value: 'qm', label: 'Quadratmeter', unit: 'm²' },
  { value: 'mea', label: 'MEA', unit: '‰' },
  { value: 'personen', label: 'Personenanzahl', unit: 'Pers.' },
  { value: 'kwh', label: 'Kilowattstunden', unit: 'kWh' },
  { value: 'm3', label: 'Kubikmeter', unit: 'm³' },
  { value: 'euro', label: 'Euro', unit: '€' },
];

// Default system keys
export const defaultDistributionKeys: Omit<DistributionKey, 'id' | 'organization_id' | 'created_at' | 'updated_at'>[] = [
  { key_code: 'vs_qm', name: 'Quadratmeter', unit: 'm²', input_type: 'qm', description: 'Nutzfläche', is_active: true, sort_order: 1, is_system: true },
  { key_code: 'vs_mea', name: 'MEA', unit: '‰', input_type: 'mea', description: 'Miteigentumsanteile', is_active: true, sort_order: 2, is_system: true },
  { key_code: 'vs_personen', name: 'Personenanzahl', unit: 'Pers.', input_type: 'personen', description: 'Bewohner', is_active: true, sort_order: 3, is_system: true },
  { key_code: 'vs_heizung_verbrauch', name: 'Heizungsverbrauch', unit: 'kWh', input_type: 'kwh', description: 'Heizverbrauch', is_active: true, sort_order: 4, is_system: true },
  { key_code: 'vs_wasser_verbrauch', name: 'Wasserverbrauch', unit: 'm³', input_type: 'm3', description: 'Wasserverbrauch', is_active: true, sort_order: 5, is_system: true },
  { key_code: 'vs_lift_wohnung', name: 'Lift Wohnung', unit: 'Anteil', input_type: 'direkteingabe', description: 'Liftkosten Wohnung', is_active: true, sort_order: 6, is_system: true },
  { key_code: 'vs_lift_geschaeft', name: 'Lift Geschäft', unit: 'Anteil', input_type: 'direkteingabe', description: 'Liftkosten Geschäft', is_active: true, sort_order: 7, is_system: true },
  { key_code: 'vs_muell', name: 'Müllentsorgung', unit: 'Anteil', input_type: 'direkteingabe', description: 'Müllgebühren', is_active: true, sort_order: 8, is_system: true },
  { key_code: 'vs_strom_allgemein', name: 'Allgemeinstrom', unit: 'Anteil', input_type: 'direkteingabe', description: 'Strom Allgemein', is_active: true, sort_order: 9, is_system: true },
  { key_code: 'vs_versicherung', name: 'Versicherung', unit: 'Anteil', input_type: 'direkteingabe', description: 'Gebäudeversicherung', is_active: true, sort_order: 10, is_system: true },
  { key_code: 'vs_hausbetreuung', name: 'Hausbetreuung', unit: 'Anteil', input_type: 'direkteingabe', description: 'Hausbetreuung', is_active: true, sort_order: 11, is_system: true },
  { key_code: 'vs_garten', name: 'Gartenpflege', unit: 'Anteil', input_type: 'direkteingabe', description: 'Gartenpflege', is_active: true, sort_order: 12, is_system: true },
  { key_code: 'vs_schneeraeumung', name: 'Schneeräumung', unit: 'Anteil', input_type: 'direkteingabe', description: 'Winterdienst', is_active: true, sort_order: 13, is_system: true },
  { key_code: 'vs_kanal', name: 'Kanalgebühren', unit: 'Anteil', input_type: 'direkteingabe', description: 'Kanal', is_active: true, sort_order: 14, is_system: true },
  { key_code: 'vs_grundsteuer', name: 'Grundsteuer', unit: 'Anteil', input_type: 'direkteingabe', description: 'Grundsteuer', is_active: true, sort_order: 15, is_system: true },
  { key_code: 'vs_verwaltung', name: 'Verwaltungskosten', unit: 'Anteil', input_type: 'direkteingabe', description: 'Verwaltung', is_active: true, sort_order: 16, is_system: true },
  { key_code: 'vs_ruecklage', name: 'Rücklage', unit: 'Anteil', input_type: 'direkteingabe', description: 'Instandhaltung', is_active: true, sort_order: 17, is_system: true },
  { key_code: 'vs_sonstiges_1', name: 'Sonstiges 1', unit: 'Anteil', input_type: 'direkteingabe', description: 'Frei definierbar', is_active: true, sort_order: 18, is_system: false },
  { key_code: 'vs_sonstiges_2', name: 'Sonstiges 2', unit: 'Anteil', input_type: 'direkteingabe', description: 'Frei definierbar', is_active: true, sort_order: 19, is_system: false },
  { key_code: 'vs_sonstiges_3', name: 'Sonstiges 3', unit: 'Anteil', input_type: 'direkteingabe', description: 'Frei definierbar', is_active: true, sort_order: 20, is_system: false },
];

export function useDistributionKeys() {
  return useQuery({
    queryKey: ['distribution-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('distribution_keys')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as DistributionKey[];
    },
  });
}

export function useInitializeDistributionKeys() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      // Check if keys already exist
      const { data: existing } = await supabase
        .from('distribution_keys')
        .select('id')
        .eq('organization_id', organizationId)
        .limit(1);

      if (existing && existing.length > 0) {
        return; // Already initialized
      }

      // Insert default keys
      const keysToInsert = defaultDistributionKeys.map(key => ({
        ...key,
        organization_id: organizationId,
      }));

      const { error } = await supabase
        .from('distribution_keys')
        .insert(keysToInsert);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-keys'] });
    },
  });
}

export function useCreateDistributionKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<DistributionKeyInsert, 'is_system'>) => {
      const { data: result, error } = await supabase
        .from('distribution_keys')
        .insert({ ...data, is_system: false })
        .select()
        .single();

      if (error) throw error;
      return result as DistributionKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-keys'] });
      toast.success('Verteilerschlüssel erstellt');
    },
    onError: (error: Error) => {
      toast.error('Fehler beim Erstellen', { description: error.message });
    },
  });
}

export function useUpdateDistributionKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: DistributionKeyUpdate) => {
      const { data: result, error } = await supabase
        .from('distribution_keys')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as DistributionKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-keys'] });
      toast.success('Verteilerschlüssel aktualisiert');
    },
    onError: (error: Error) => {
      toast.error('Fehler beim Aktualisieren', { description: error.message });
    },
  });
}

export function useDeleteDistributionKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('distribution_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-keys'] });
      toast.success('Verteilerschlüssel gelöscht');
    },
    onError: (error: Error) => {
      toast.error('Fehler beim Löschen', { description: error.message });
    },
  });
}

export function useDistributionKeysByProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['distribution-keys', 'property', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const { data, error } = await supabase
        .from('distribution_keys')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as DistributionKey[];
    },
    enabled: !!propertyId,
  });
}

export function useCreatePropertyDistributionKey(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      keyCode: string;
      name: string;
      description?: string;
      inputType: string;
      unit: string;
      includedUnitTypes?: string[];
    }) => {
      const { data: result, error } = await supabase
        .from('distribution_keys')
        .insert({
          key_code: data.keyCode,
          name: data.name,
          description: data.description || null,
          input_type: data.inputType,
          unit: data.unit,
          is_system: false,
          is_active: true,
          sort_order: 100,
        })
        .select()
        .single();

      if (error) throw error;
      return result as DistributionKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-keys'] });
      toast.success('Verteilerschlüssel erstellt');
    },
    onError: (error: Error) => {
      toast.error('Fehler beim Erstellen', { description: error.message });
    },
  });
}

export function useDeletePropertyDistributionKey(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('distribution_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-keys'] });
      toast.success('Verteilerschlüssel gelöscht');
    },
    onError: (error: Error) => {
      toast.error('Fehler beim Löschen', { description: error.message });
    },
  });
}
