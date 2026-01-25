import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
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
      const response = await fetch('/api/sepa-collections', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch SEPA collections');
      return response.json() as Promise<SepaCollection[]>;
    },
  });
}

export function useSepaCollectionById(id: string | null) {
  return useQuery({
    queryKey: ['sepa-collection', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/sepa-collections/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch SEPA collection');
      return response.json() as Promise<{
        collection: SepaCollection;
        items: SepaCollectionItem[];
      }>;
    },
    enabled: !!id,
  });
}

export function useCreateSepaCollection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateSepaCollectionInput) => {
      const response = await apiRequest('POST', '/api/sepa-collections', input);
      return response.json() as Promise<SepaCollection>;
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
      const response = await apiRequest('PATCH', `/api/sepa-collection-items/${itemId}`, {
        status,
        return_reason: returnReason,
        return_date: returnDate,
        payment_id: paymentId,
      });
      return response.json() as Promise<SepaCollectionItem>;
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
      const response = await apiRequest('PATCH', `/api/sepa-collections/${collectionId}`, { status });
      return response.json() as Promise<SepaCollection>;
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
      const response = await apiRequest('POST', `/api/sepa-collections/${collectionId}/mark-all-successful`, {});
      return response.json() as Promise<SepaCollectionItem[]>;
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
      await apiRequest('DELETE', `/api/sepa-collections/${collectionId}`);
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
