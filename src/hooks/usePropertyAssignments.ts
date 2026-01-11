import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PropertyAssignment {
  property_id: string;
  property_name: string;
  property_address: string;
}

export function useUserPropertyAssignments(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-property-assignments', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('property_managers')
        .select(`
          property_id,
          properties:property_id (
            id,
            name,
            address
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching property assignments:', error);
        throw error;
      }

      return (data || []).map(item => ({
        property_id: item.property_id,
        property_name: (item.properties as any)?.name || 'Unbekannt',
        property_address: (item.properties as any)?.address || '',
      })) as PropertyAssignment[];
    },
    enabled: !!userId,
  });
}

export function useUpdatePropertyAssignments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      propertyIds 
    }: { 
      userId: string; 
      propertyIds: string[];
    }) => {
      // First, get current assignments
      const { data: currentAssignments, error: fetchError } = await supabase
        .from('property_managers')
        .select('property_id')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      const currentPropertyIds = currentAssignments?.map(a => a.property_id) || [];
      
      // Properties to add
      const toAdd = propertyIds.filter(id => !currentPropertyIds.includes(id));
      
      // Properties to remove
      const toRemove = currentPropertyIds.filter(id => !propertyIds.includes(id));

      // Remove unselected properties
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('property_managers')
          .delete()
          .eq('user_id', userId)
          .in('property_id', toRemove);

        if (removeError) throw removeError;
      }

      // Add new properties
      if (toAdd.length > 0) {
        const insertData = toAdd.map(propertyId => ({
          user_id: userId,
          property_id: propertyId,
        }));

        const { error: insertError } = await supabase
          .from('property_managers')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      return { added: toAdd.length, removed: toRemove.length };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-property-assignments', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['property_managers'] });
      
      if (result.added > 0 || result.removed > 0) {
        toast.success(`Zuweisungen aktualisiert: ${result.added} hinzugefügt, ${result.removed} entfernt`);
      } else {
        toast.success('Keine Änderungen vorgenommen');
      }
    },
    onError: (error) => {
      console.error('Error updating property assignments:', error);
      toast.error('Fehler beim Aktualisieren der Zuweisungen');
    },
  });
}
