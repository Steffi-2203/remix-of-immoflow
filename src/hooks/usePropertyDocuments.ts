import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  return useQuery({
    queryKey: ['property-documents', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      
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

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('expense-receipts')
        .getPublicUrl(`property-docs/${fileName}`);

      // Insert document record
      const { data, error } = await supabase
        .from('property_documents')
        .insert({
          property_id: propertyId,
          name: documentName,
          type: documentType,
          file_url: urlData.publicUrl,
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
      // Extract the file path from the URL
      const urlParts = fileUrl.split('/property-docs/');
      if (urlParts.length > 1) {
        const filePath = `property-docs/${urlParts[1]}`;
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
