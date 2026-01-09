import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UnitDistributionValue {
  id: string;
  unit_id: string;
  distribution_key_id: string;
  value: number;
  created_at: string;
  updated_at: string;
}

interface DistributionKeyWithValue {
  id: string;
  key_code: string;
  name: string;
  input_type: string;
  unit: string;
  is_active: boolean;
  value: number;
}

// Fetch distribution values for a specific unit
export function useUnitDistributionValues(unitId: string | undefined) {
  return useQuery({
    queryKey: ['unit-distribution-values', unitId],
    queryFn: async () => {
      if (!unitId) return [];
      
      const { data, error } = await supabase
        .from('unit_distribution_values')
        .select('*')
        .eq('unit_id', unitId);
      
      if (error) throw error;
      return data as UnitDistributionValue[];
    },
    enabled: !!unitId,
  });
}

// Fetch all active distribution keys with their values for a unit
export function useDistributionKeysWithValues(unitId: string | undefined) {
  return useQuery({
    queryKey: ['distribution-keys-with-values', unitId],
    queryFn: async () => {
      // Get all active distribution keys
      const { data: keys, error: keysError } = await supabase
        .from('distribution_keys')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (keysError) throw keysError;
      
      // If we have a unitId, get the values
      let values: UnitDistributionValue[] = [];
      if (unitId) {
        const { data: valuesData, error: valuesError } = await supabase
          .from('unit_distribution_values')
          .select('*')
          .eq('unit_id', unitId);
        
        if (valuesError) throw valuesError;
        values = valuesData || [];
      }
      
      // Merge keys with their values
      const keysWithValues: DistributionKeyWithValue[] = (keys || []).map(key => {
        const valueRecord = values.find(v => v.distribution_key_id === key.id);
        return {
          id: key.id,
          key_code: key.key_code,
          name: key.name,
          input_type: key.input_type,
          unit: key.unit,
          is_active: key.is_active,
          value: valueRecord?.value ?? 0,
        };
      });
      
      return keysWithValues;
    },
    enabled: true,
  });
}

// Save distribution values for a unit (upsert)
export function useSaveUnitDistributionValues() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      unitId, 
      values 
    }: { 
      unitId: string; 
      values: { distribution_key_id: string; value: number }[] 
    }) => {
      // Filter out zero values to avoid storing unnecessary data
      const nonZeroValues = values.filter(v => v.value !== 0);
      
      // Delete existing values for this unit
      const { error: deleteError } = await supabase
        .from('unit_distribution_values')
        .delete()
        .eq('unit_id', unitId);
      
      if (deleteError) throw deleteError;
      
      // Insert new values
      if (nonZeroValues.length > 0) {
        const { error: insertError } = await supabase
          .from('unit_distribution_values')
          .insert(
            nonZeroValues.map(v => ({
              unit_id: unitId,
              distribution_key_id: v.distribution_key_id,
              value: v.value,
            }))
          );
        
        if (insertError) throw insertError;
      }
      
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['unit-distribution-values', variables.unitId] });
      queryClient.invalidateQueries({ queryKey: ['distribution-keys-with-values', variables.unitId] });
    },
  });
}

// Mapping from old vs_* column names to key_codes
export const VS_COLUMN_TO_KEY_CODE: Record<string, string> = {
  vs_qm: 'qm',
  vs_mea: 'mea',
  vs_personen: 'personen',
  vs_heizung_verbrauch: 'heizung_verbrauch',
  vs_wasser_verbrauch: 'wasser_verbrauch',
  vs_lift_wohnung: 'lift_wohnung',
  vs_lift_geschaeft: 'lift_geschaeft',
  vs_muell: 'muell',
  vs_kanal: 'kanal',
  vs_strom_allgemein: 'strom_allgemein',
  vs_hausbetreuung: 'hausbetreuung',
  vs_garten: 'garten',
  vs_schneeraeumung: 'schneeraeumung',
  vs_versicherung: 'versicherung',
  vs_grundsteuer: 'grundsteuer',
  vs_verwaltung: 'verwaltung',
  vs_ruecklage: 'ruecklage',
  vs_sonstiges_1: 'sonstiges_1',
  vs_sonstiges_2: 'sonstiges_2',
  vs_sonstiges_3: 'sonstiges_3',
};
