import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SepaCollection {
  id: string;
  organization_id: string | null;
  collection_date: string;
  message_id: string;
  total_amount: number;
  item_count: number;
  status: 'pending' | 'exported' | 'partially_completed' | 'completed';
  xml_filename: string | null;
  creditor_name: string | null;
  creditor_iban: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SepaCollectionItem {
  id: string;
  collection_id: string;
  tenant_id: string | null;
  unit_id: string | null;
  amount: number;
  mandate_reference: string | null;
  tenant_name: string;
  tenant_iban: string | null;
  status: 'pending' | 'successful' | 'returned' | 'rejected';
  return_reason: string | null;
  return_date: string | null;
  payment_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSepaCollectionInput {
  organization_id: string | null;
  collection_date: string;
  message_id: string;
  total_amount: number;
  item_count: number;
  xml_filename?: string;
  creditor_name?: string;
  creditor_iban?: string;
  items: Array<{
    tenant_id: string | null;
    unit_id: string | null;
    amount: number;
    mandate_reference: string | null;
    tenant_name: string;
    tenant_iban: string | null;
  }>;
}

export function useSepaCollections() {
  return useQuery({
    queryKey: ['sepa-collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sepa_collections')
        .select('*')
        .order('collection_date', { ascending: false });
      
      if (error) throw error;
      return data as SepaCollection[];
    },
  });
}

export function useSepaCollectionById(id: string | null) {
  return useQuery({
    queryKey: ['sepa-collection', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data: collection, error: collectionError } = await supabase
        .from('sepa_collections')
        .select('*')
        .eq('id', id)
        .single();
      
      if (collectionError) throw collectionError;
      
      const { data: items, error: itemsError } = await supabase
        .from('sepa_collection_items')
        .select('*')
        .eq('collection_id', id)
        .order('tenant_name');
      
      if (itemsError) throw itemsError;
      
      return {
        collection: collection as SepaCollection,
        items: items as SepaCollectionItem[],
      };
    },
    enabled: !!id,
  });
}

export function useCreateSepaCollection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateSepaCollectionInput) => {
      // Create the collection
      const { data: collection, error: collectionError } = await supabase
        .from('sepa_collections')
        .insert({
          organization_id: input.organization_id,
          collection_date: input.collection_date,
          message_id: input.message_id,
          total_amount: input.total_amount,
          item_count: input.item_count,
          xml_filename: input.xml_filename || null,
          creditor_name: input.creditor_name || null,
          creditor_iban: input.creditor_iban || null,
          status: 'exported',
        })
        .select()
        .single();
      
      if (collectionError) throw collectionError;
      
      // Create all items
      const itemsToInsert = input.items.map(item => ({
        collection_id: collection.id,
        tenant_id: item.tenant_id,
        unit_id: item.unit_id,
        amount: item.amount,
        mandate_reference: item.mandate_reference,
        tenant_name: item.tenant_name,
        tenant_iban: item.tenant_iban,
        status: 'pending' as const,
      }));
      
      const { error: itemsError } = await supabase
        .from('sepa_collection_items')
        .insert(itemsToInsert);
      
      if (itemsError) throw itemsError;
      
      return collection as SepaCollection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sepa-collections'] });
    },
    onError: (error) => {
      console.error('Error creating SEPA collection:', error);
      toast.error('Fehler beim Speichern des SEPA-Einzugs');
    },
  });
}

export function useUpdateSepaCollectionItemStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      itemId,
      status,
      returnReason,
      returnDate,
      paymentId,
    }: {
      itemId: string;
      status: 'pending' | 'successful' | 'returned' | 'rejected';
      returnReason?: string;
      returnDate?: string;
      paymentId?: string;
    }) => {
      const { data, error } = await supabase
        .from('sepa_collection_items')
        .update({
          status,
          return_reason: returnReason || null,
          return_date: returnDate || null,
          payment_id: paymentId || null,
        })
        .eq('id', itemId)
        .select()
        .single();
      
      if (error) throw error;
      return data as SepaCollectionItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sepa-collections'] });
      queryClient.invalidateQueries({ queryKey: ['sepa-collection', data.collection_id] });
    },
    onError: (error) => {
      console.error('Error updating SEPA item status:', error);
      toast.error('Fehler beim Aktualisieren des Status');
    },
  });
}

export function useUpdateSepaCollectionStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      collectionId,
      status,
    }: {
      collectionId: string;
      status: 'pending' | 'exported' | 'partially_completed' | 'completed';
    }) => {
      const { data, error } = await supabase
        .from('sepa_collections')
        .update({ status })
        .eq('id', collectionId)
        .select()
        .single();
      
      if (error) throw error;
      return data as SepaCollection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sepa-collections'] });
    },
  });
}

export function useMarkAllItemsSuccessful() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (collectionId: string) => {
      // Get all items for this collection
      const { data: items, error: fetchError } = await supabase
        .from('sepa_collection_items')
        .select('*')
        .eq('collection_id', collectionId)
        .eq('status', 'pending');
      
      if (fetchError) throw fetchError;
      
      // Update all pending items to successful
      const { error: updateError } = await supabase
        .from('sepa_collection_items')
        .update({ status: 'successful' })
        .eq('collection_id', collectionId)
        .eq('status', 'pending');
      
      if (updateError) throw updateError;
      
      // Update collection status
      const { error: collectionError } = await supabase
        .from('sepa_collections')
        .update({ status: 'completed' })
        .eq('id', collectionId);
      
      if (collectionError) throw collectionError;
      
      return items as SepaCollectionItem[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sepa-collections'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useDeleteSepaCollection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (collectionId: string) => {
      const { error } = await supabase
        .from('sepa_collections')
        .delete()
        .eq('id', collectionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sepa-collections'] });
      toast.success('SEPA-Einzug gelöscht');
    },
    onError: (error) => {
      console.error('Error deleting SEPA collection:', error);
      toast.error('Fehler beim Löschen');
    },
  });
}
