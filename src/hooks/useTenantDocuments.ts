import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TenantDocument = {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  file_url: string;
  uploaded_at: string;
};

export const TENANT_DOCUMENT_TYPES = [
  { value: 'vorschreibung', label: 'Monatliche Vorschreibung' },
  { value: 'vorschuss_aenderung', label: 'Vorschuss-Änderungsschreiben' },
  { value: 'bk_abrechnung', label: 'Betriebskostenabrechnung' },
  { value: 'mietvertrag', label: 'Mietvertrag' },
  { value: 'mahnung', label: 'Mahnung' },
  { value: 'korrespondenz', label: 'Korrespondenz' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

export function useTenantDocuments(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['tenant-documents', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('tenant_documents')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as TenantDocument[];
    },
    enabled: !!tenantId,
  });
}

export function useUploadTenantDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantId,
      file,
      name,
      type,
    }: {
      tenantId: string;
      file: File | Blob;
      name: string;
      type: string;
    }) => {
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = file instanceof File ? file.name : `${name}.pdf`;
      const fileExt = fileName.split('.').pop() || 'pdf';
      const filePath = `${tenantId}/${timestamp}_${name.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('tenant-documents')
        .upload(filePath, file, {
          contentType: file instanceof File ? file.type : 'application/pdf',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('tenant-documents')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10); // 10 years

      if (!urlData?.signedUrl) {
        throw new Error('Could not create signed URL');
      }

      // Create database record
      const { data, error: dbError } = await supabase
        .from('tenant_documents')
        .insert({
          tenant_id: tenantId,
          name,
          type,
          file_url: urlData.signedUrl,
        })
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file on DB error
        await supabase.storage.from('tenant-documents').remove([filePath]);
        throw dbError;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-documents', variables.tenantId] });
      toast.success('Dokument hochgeladen');
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error('Fehler beim Hochladen des Dokuments');
    },
  });
}

export function useDeleteTenantDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tenantId, fileUrl }: { id: string; tenantId: string; fileUrl: string }) => {
      // Extract file path from URL
      const urlParts = fileUrl.split('/tenant-documents/');
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
        await supabase.storage.from('tenant-documents').remove([filePath]);
      }

      // Delete database record
      const { error } = await supabase
        .from('tenant_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { id, tenantId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-documents', data.tenantId] });
      toast.success('Dokument gelöscht');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Fehler beim Löschen des Dokuments');
    },
  });
}
