import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const usePropertyManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Assign a property to the current user
  const assignProperty = useMutation({
    mutationFn: async (propertyId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('property_managers')
        .insert({
          user_id: user.id,
          property_id: propertyId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property_managers'] });
    },
  });

  // Unassign a property from the current user
  const unassignProperty = useMutation({
    mutationFn: async (propertyId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('property_managers')
        .delete()
        .eq('user_id', user.id)
        .eq('property_id', propertyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property_managers'] });
    },
  });

  // Helper to create property and auto-assign to current user
  const createPropertyWithOwnership = useCallback(async (propertyData: {
    name: string;
    address: string;
    city: string;
    postal_code: string;
    country?: string;
    building_year?: number | null;
  }) => {
    if (!user) throw new Error('Not authenticated');

    // First create the property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert(propertyData)
      .select()
      .single();

    if (propertyError) throw propertyError;

    // Then assign the current user as manager
    const { error: assignError } = await supabase
      .from('property_managers')
      .insert({
        user_id: user.id,
        property_id: property.id,
      });

    if (assignError) {
      // Cleanup: delete the property if we can't assign ownership
      await supabase.from('properties').delete().eq('id', property.id);
      throw assignError;
    }

    return property;
  }, [user]);

  return {
    assignProperty,
    unassignProperty,
    createPropertyWithOwnership,
  };
};
