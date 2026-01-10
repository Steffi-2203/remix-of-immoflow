import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { extractFilePath } from '@/utils/storageUtils';

export type UnitDocument = {
  id: string;
  unit_id: string;
  name: string;
  type: string;
  file_url: string;
  uploaded_at: string;
};

export const UNIT_DOCUMENT_TYPES = [
  { value: 'mietvertrag', label: 'Mietvertrag' },
  { value: 'wohnungsplan', label: 'Wohnungsplan' },
  { value: 'uebergabeprotokoll', label: 'Übergabeprotokoll' },
  { value: 'ruecknahmeprotokoll', label: 'Rücknahmeprotokoll' },
  { value: 'mietanbot', label: 'Mietanbot' },
  { value: 'kaution', label: 'Kautionsbeleg' },
  { value: 'bonitaet', label: 'Bonitätsauskunft' },
  { value: 'ausweis', label: 'Ausweiskopie' },
  { value: 'emailverkehr', label: 'Emailverkehr' },
  { value: 'fotos', label: 'Fotos' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

export function useUnitDocuments(unitId: string | undefined) {
  return useQuery({
    queryKey: ['unit-documents', unitId],
    queryFn: async () => {
      if (!unitId) return [];
      
      const { data, error } = await supabase
        .from('unit_documents')
        .select('*')
        .eq('unit_id', unitId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as UnitDocument[];
    },
    enabled: !!unitId,
  });
}

export function useUploadUnitDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      unitId,
      file,
      documentType,
      documentName,
    }: {
      unitId: string;
      file: File;
      documentType: string;
      documentName: string;
    }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${unitId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(`unit-docs/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Get signed URL (more secure than public URL)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('expense-receipts')
        .createSignedUrl(`unit-docs/${fileName}`, 31536000); // 1 year expiry for storage reference

      if (signedError) throw signedError;

      // Store the file path reference, not the full URL
      const filePathReference = `unit-docs/${fileName}`;

      // Insert document record with file path
      const { data, error } = await supabase
        .from('unit_documents')
        .insert({
          unit_id: unitId,
          name: documentName,
          type: documentType,
          file_url: filePathReference,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { unitId }) => {
      queryClient.invalidateQueries({ queryKey: ['unit-documents', unitId] });
      toast({
        title: 'Dokument hochgeladen',
        description: 'Das Dokument wurde erfolgreich gespeichert.',
      });
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: 'Fehler beim Hochladen',
        description: 'Das Dokument konnte nicht hochgeladen werden.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteUnitDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, unitId, fileUrl }: { id: string; unitId: string; fileUrl: string }) => {
      // Extract the file path - handle both old URL format and new path format
      let filePath = fileUrl;
      if (fileUrl.includes('/unit-docs/')) {
        filePath = extractFilePath(fileUrl, 'unit-docs/') || fileUrl;
      }
      if (filePath.startsWith('unit-docs/')) {
        await supabase.storage.from('expense-receipts').remove([filePath]);
      }

      const { error } = await supabase
        .from('unit_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { unitId }) => {
      queryClient.invalidateQueries({ queryKey: ['unit-documents', unitId] });
      toast({
        title: 'Dokument gelöscht',
        description: 'Das Dokument wurde erfolgreich gelöscht.',
      });
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Das Dokument konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
    },
  });
}
