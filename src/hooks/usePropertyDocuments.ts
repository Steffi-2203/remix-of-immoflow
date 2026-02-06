import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { extractFilePath } from '@/utils/storageUtils';
import { useDemoData } from '@/contexts/DemoDataContext';
import { mockDocuments } from '@/data/mockData';

export type PropertyDocument = {
  id: string;
  property_id: string;
  name: string;
  type: string;
  file_url: string;
  uploaded_at: string;
};

export const PROPERTY_DOCUMENT_TYPES = [
  { value: 'energieausweis', label: 'Energieausweis' },
  { value: 'wohnungsplaene', label: 'Wohnungspläne' },
  { value: 'gebaeudeplan', label: 'Gebäudeplan' },
  { value: 'grundbuchauszug', label: 'Grundbuchauszug' },
  { value: 'lageplan', label: 'Lageplan' },
  { value: 'versicherungspolizze', label: 'Versicherungspolizze' },
  { value: 'nutzungsvertrag', label: 'Nutzungsvertrag' },
  { value: 'hausverwaltung', label: 'Hausverwaltung' },
  { value: 'protokolle', label: 'Protokolle' },
  { value: 'benutzerdefiniert', label: 'Benutzerdefiniert' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

export function usePropertyDocuments(propertyId: string | undefined) {
  const { isDemoMode } = useDemoData();

  return useQuery({
    queryKey: ['property-documents', propertyId, isDemoMode],
    queryFn: async () => {
      if (!propertyId) return [];

      if (isDemoMode) {
        return mockDocuments
          .filter(d => d.property_id === propertyId) as unknown as PropertyDocument[];
      }
      
      const { data, error } = await supabase
        .from('property_documents')
        .select('*')
        .eq('property_id', propertyId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as PropertyDocument[];
    },
    enabled: !!propertyId,
  });
}

export function useUploadPropertyDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      propertyId,
      file,
      documentType,
      documentName,
    }: {
      propertyId: string;
      file: File;
      documentType: string;
      documentName: string;
    }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${propertyId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(`property-docs/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Get signed URL (more secure than public URL)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('expense-receipts')
        .createSignedUrl(`property-docs/${fileName}`, 31536000); // 1 year expiry for storage reference

      if (signedError) throw signedError;

      // Store the file path reference, not the full URL
      const filePathReference = `property-docs/${fileName}`;

      // Insert document record with file path
      const { data, error } = await supabase
        .from('property_documents')
        .insert({
          property_id: propertyId,
          name: documentName,
          type: documentType,
          file_url: filePathReference,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { propertyId }) => {
      queryClient.invalidateQueries({ queryKey: ['property-documents', propertyId] });
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

export function useDeletePropertyDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, propertyId, fileUrl }: { id: string; propertyId: string; fileUrl: string }) => {
      // Extract the file path - handle both old URL format and new path format
      let filePath = fileUrl;
      if (fileUrl.includes('/property-docs/')) {
        filePath = extractFilePath(fileUrl, 'property-docs/') || fileUrl;
      }
      if (filePath.startsWith('property-docs/')) {
        await supabase.storage.from('expense-receipts').remove([filePath]);
      }

      const { error } = await supabase
        .from('property_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { propertyId }) => {
      queryClient.invalidateQueries({ queryKey: ['property-documents', propertyId] });
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
