import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type GdprExportStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'failed' | 'expired';

export interface GdprExportRequest {
  id: string;
  status: GdprExportStatus;
  scope: string;
  format_version: string;
  manifest_hash: string | null;
  file_size_bytes: number | null;
  requested_at: string;
  prepared_at: string | null;
  delivered_at: string | null;
  retention_until: string;
  error_message: string | null;
}

export interface GdprDownloadResult {
  downloadUrl: string;
  expiresAt: string;
  manifestHash: string;
  manifestSignature: string;
}

export interface GdprVerifyResult {
  exportId: string;
  status: string;
  hashValid: boolean | null;
  hashChainIntact: boolean;
  manifestHash: string;
  signaturePresent: boolean;
}

export function useGdprExport() {
  const [isRequesting, setIsRequesting] = useState(false);
  const [exports, setExports] = useState<GdprExportRequest[]>([]);
  const [isLoadingExports, setIsLoadingExports] = useState(false);

  const requestExport = useCallback(async (scope: string = 'full') => {
    setIsRequesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('gdpr-export', {
        body: { scope, deliveryMethod: 'download', legalBasis: 'Art. 15 DSGVO' },
      });
      if (error) throw error;
      toast.success('Datenexport wurde angefordert. Sie werden benachrichtigt, wenn er bereit ist.');
      return data as { exportId: string; status: string };
    } catch (err) {
      console.error('GDPR export request error:', err);
      toast.error('Fehler beim Anfordern des Exports.');
      return null;
    } finally {
      setIsRequesting(false);
    }
  }, []);

  const loadExports = useCallback(async () => {
    setIsLoadingExports(true);
    try {
      const { data, error } = await supabase
        .from('gdpr_export_requests')
        .select('id, status, scope, format_version, manifest_hash, file_size_bytes, requested_at, prepared_at, delivered_at, retention_until, error_message')
        .order('requested_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setExports((data as GdprExportRequest[]) || []);
    } catch (err) {
      console.error('Load exports error:', err);
    } finally {
      setIsLoadingExports(false);
    }
  }, []);

  const getDownloadUrl = useCallback(async (exportId: string): Promise<GdprDownloadResult | null> => {
    try {
      const { data, error } = await supabase.functions.invoke(`gdpr-export/${exportId}/download`, {
        method: 'GET',
      });
      if (error) throw error;
      return data as GdprDownloadResult;
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Fehler beim Erstellen des Download-Links.');
      return null;
    }
  }, []);

  const verifyExport = useCallback(async (exportId: string, manifestHash?: string): Promise<GdprVerifyResult | null> => {
    try {
      const { data, error } = await supabase.functions.invoke(`gdpr-export/${exportId}/verify`, {
        body: { manifestHash },
      });
      if (error) throw error;
      return data as GdprVerifyResult;
    } catch (err) {
      console.error('Verify error:', err);
      toast.error('Fehler bei der Verifizierung.');
      return null;
    }
  }, []);

  return {
    isRequesting,
    exports,
    isLoadingExports,
    requestExport,
    loadExports,
    getDownloadUrl,
    verifyExport,
  };
}
