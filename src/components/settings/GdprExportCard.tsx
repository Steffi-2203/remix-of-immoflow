import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, CheckCircle, Clock, AlertCircle, Loader2, ShieldCheck, FileText } from 'lucide-react';
import { useGdprExport, GdprExportRequest } from '@/hooks/useGdprExport';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pending: { label: 'Ausstehend', variant: 'outline', icon: Clock },
  preparing: { label: 'Wird vorbereitet', variant: 'secondary', icon: Loader2 },
  ready: { label: 'Bereit', variant: 'default', icon: CheckCircle },
  delivered: { label: 'Zugestellt', variant: 'default', icon: CheckCircle },
  failed: { label: 'Fehlgeschlagen', variant: 'destructive', icon: AlertCircle },
  expired: { label: 'Abgelaufen', variant: 'outline', icon: Clock },
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '–';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function GdprExportCard() {
  const { isRequesting, exports, isLoadingExports, requestExport, loadExports, getDownloadUrl, verifyExport } = useGdprExport();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    loadExports();
  }, [loadExports]);

  // Auto-refresh if any exports are pending/preparing
  useEffect(() => {
    const hasPending = exports.some(e => e.status === 'pending' || e.status === 'preparing');
    if (!hasPending) return;
    const interval = setInterval(loadExports, 5000);
    return () => clearInterval(interval);
  }, [exports, loadExports]);

  const handleRequest = async () => {
    const result = await requestExport('full');
    if (result) loadExports();
  };

  const handleDownload = async (exp: GdprExportRequest) => {
    setDownloadingId(exp.id);
    try {
      const result = await getDownloadUrl(exp.id);
      if (result?.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
        toast.success('Download gestartet.');
        loadExports();
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleVerify = async (exp: GdprExportRequest) => {
    setVerifyingId(exp.id);
    try {
      const result = await verifyExport(exp.id, exp.manifest_hash || undefined);
      if (result) {
        if (result.hashChainIntact && result.hashValid !== false) {
          toast.success('Verifizierung erfolgreich: Hash-Kette und Signatur sind intakt.');
        } else {
          toast.error('Verifizierung fehlgeschlagen: Datenintegrität konnte nicht bestätigt werden.');
        }
      }
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Datenexport (DSGVO Art. 15 / 20)
        </CardTitle>
        <CardDescription>
          Fordern Sie eine vollständige Kopie Ihrer Daten an – signiert und verifizierbar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Gemäß DSGVO Artikel 15 und 20 haben Sie das Recht auf Auskunft und Datenportabilität.
          Ihr Export enthält ein signiertes Manifest zur Integritätsprüfung.
        </p>

        <div className="flex gap-2">
          <Button onClick={handleRequest} disabled={isRequesting}>
            {isRequesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wird angefordert...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Neuen Export anfordern
              </>
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={loadExports} disabled={isLoadingExports}>
            <RefreshCw className={`h-4 w-4 ${isLoadingExports ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {exports.length > 0 && (
          <div className="space-y-3 mt-4">
            <h4 className="text-sm font-medium">Bisherige Exports</h4>
            {exports.map((exp) => {
              const config = statusConfig[exp.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIcon className={`h-4 w-4 shrink-0 ${exp.status === 'preparing' ? 'animate-spin' : ''}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={config.variant} className="text-xs">
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(exp.requested_at), { addSuffix: true, locale: de })}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatBytes(exp.file_size_bytes)}
                        {exp.manifest_hash && (
                          <span className="ml-2 font-mono truncate">
                            Hash: {exp.manifest_hash.slice(0, 16)}…
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {(exp.status === 'ready' || exp.status === 'delivered') && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(exp)}
                          disabled={downloadingId === exp.id}
                        >
                          {downloadingId === exp.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleVerify(exp)}
                          disabled={verifyingId === exp.id}
                          title="Integrität verifizieren"
                        >
                          {verifyingId === exp.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-3 w-3" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
