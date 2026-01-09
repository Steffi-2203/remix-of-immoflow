import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PropertyOwner {
  id: string;
  property_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  iban: string | null;
  bic: string | null;
  ownership_share: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export type PropertyOwnerInsert = Omit<PropertyOwner, 'id' | 'created_at' | 'updated_at'>;
export type PropertyOwnerUpdate = Partial<PropertyOwnerInsert> & { id: string };

// Fetch all owners for a property
export function usePropertyOwners(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['property-owners', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      
      const { data, error } = await supabase
        .from('property_owners')
        .select('*')
        .eq('property_id', propertyId)
        .order('is_primary', { ascending: false })
        .order('ownership_share', { ascending: false });
      
      if (error) throw error;
      return data as PropertyOwner[];
    },
    enabled: !!propertyId,
  });
}

// Create a new owner
export function useCreatePropertyOwner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (owner: PropertyOwnerInsert) => {
      const { data, error } = await supabase
        .from('property_owners')
        .insert(owner)
        .select()
        .single();
      
      if (error) throw error;
      return data as PropertyOwner;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['property-owners', variables.property_id] });
    },
  });
}

// Update an owner
export function useUpdatePropertyOwner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: PropertyOwnerUpdate) => {
      const { data, error } = await supabase
        .from('property_owners')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as PropertyOwner;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-owners', data.property_id] });
    },
  });
}

// Delete an owner
export function useDeletePropertyOwner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, propertyId }: { id: string; propertyId: string }) => {
      const { error } = await supabase
        .from('property_owners')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, propertyId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['property-owners', variables.propertyId] });
    },
  });
}

// Get total ownership percentage for validation
export function useTotalOwnershipShare(propertyId: string | undefined) {
  const { data: owners } = usePropertyOwners(propertyId);
  
  if (!owners || owners.length === 0) return 0;
  
  return owners.reduce((sum, owner) => sum + owner.ownership_share, 0);
}

// Get primary owner for a property
export function usePrimaryOwner(propertyId: string | undefined) {
  const { data: owners } = usePropertyOwners(propertyId);
  
  if (!owners || owners.length === 0) return null;
  
  return owners.find(o => o.is_primary) || owners[0];
}
