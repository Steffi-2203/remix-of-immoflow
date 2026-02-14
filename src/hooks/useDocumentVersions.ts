import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentVersion {
  id: string;
  document_type: string;
  document_id: string;
  version_number: number;
  file_url: string;
  file_size: number | null;
  uploaded_by: string | null;
  comment: string | null;
  created_at: string;
}

export function useDocumentVersions(documentType: string, documentId: string | null) {
  return useQuery({
    queryKey: ['document-versions', documentType, documentId],
    queryFn: async () => {
      if (!supabase || !documentId) return [];
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_type', documentType)
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data as DocumentVersion[];
    },
    enabled: !!documentId && !!supabase,
  });
}

export function useCreateDocumentVersion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      document_type: string;
      document_id: string;
      file_url: string;
      file_size?: number;
      comment?: string;
    }) => {
      if (!supabase) throw new Error('Not configured');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get next version number
      const { data: existing } = await supabase
        .from('document_versions')
        .select('version_number')
        .eq('document_type', params.document_type)
        .eq('document_id', params.document_id)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = (existing?.[0]?.version_number || 0) + 1;

      const { data, error } = await supabase
        .from('document_versions')
        .insert({
          document_type: params.document_type,
          document_id: params.document_id,
          version_number: nextVersion,
          file_url: params.file_url,
          file_size: params.file_size || null,
          uploaded_by: user.id,
          comment: params.comment || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['document-versions', vars.document_type, vars.document_id] });
      toast({ title: 'Version gespeichert' });
    },
    onError: () => {
      toast({ title: 'Fehler', description: 'Version konnte nicht gespeichert werden', variant: 'destructive' });
    },
  });
}
