import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentTag {
  id: string;
  document_type: string;
  document_id: string;
  tag: string;
  created_at: string;
}

export function useDocumentTags(documentType: string, documentId: string | null) {
  return useQuery({
    queryKey: ['document-tags', documentType, documentId],
    queryFn: async () => {
      if (!supabase || !documentId) return [];
      const { data, error } = await supabase
        .from('document_tags')
        .select('*')
        .eq('document_type', documentType)
        .eq('document_id', documentId)
        .order('tag');
      if (error) throw error;
      return data as DocumentTag[];
    },
    enabled: !!documentId && !!supabase,
  });
}

export function useAllDocumentTags(documentType: string, documentIds: string[]) {
  return useQuery({
    queryKey: ['document-tags-bulk', documentType, documentIds],
    queryFn: async () => {
      if (!supabase || documentIds.length === 0) return [];
      const { data, error } = await supabase
        .from('document_tags')
        .select('*')
        .eq('document_type', documentType)
        .in('document_id', documentIds);
      if (error) throw error;
      return data as DocumentTag[];
    },
    enabled: documentIds.length > 0 && !!supabase,
  });
}

export function useAddDocumentTag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { document_type: string; document_id: string; tag: string }) => {
      if (!supabase) throw new Error('Not configured');
      const { data, error } = await supabase
        .from('document_tags')
        .insert({
          document_type: params.document_type,
          document_id: params.document_id,
          tag: params.tag.trim().toLowerCase(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['document-tags'] });
      queryClient.invalidateQueries({ queryKey: ['document-tags-bulk'] });
    },
    onError: () => {
      toast({ title: 'Fehler', description: 'Tag konnte nicht hinzugefügt werden', variant: 'destructive' });
    },
  });
}

export function useRemoveDocumentTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagId: string) => {
      if (!supabase) throw new Error('Not configured');
      const { error } = await supabase.from('document_tags').delete().eq('id', tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-tags'] });
      queryClient.invalidateQueries({ queryKey: ['document-tags-bulk'] });
    },
  });
}
