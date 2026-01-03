import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  { value: 'uebergabeprotokoll', label: 'Übergabeprotokoll' },
  { value: 'ruecknahmeprotokoll', label: 'Rücknahmeprotokoll' },
  { value: 'emailverkehr', label: 'Emailverkehr' },
  { value: 'mietanbot', label: 'Mietanbot' },
  { value: 'plan', label: 'Plan' },
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

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('expense-receipts')
        .getPublicUrl(`unit-docs/${fileName}`);

      // Insert document record
      const { data, error } = await supabase
        .from('unit_documents')
        .insert({
          unit_id: unitId,
          name: documentName,
          type: documentType,
          file_url: urlData.publicUrl,
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
      // Extract the file path from the URL
      const urlParts = fileUrl.split('/unit-docs/');
      if (urlParts.length > 1) {
        const filePath = `unit-docs/${urlParts[1]}`;
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
