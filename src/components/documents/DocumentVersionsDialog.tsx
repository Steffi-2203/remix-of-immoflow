import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Clock } from 'lucide-react';
import { useDocumentVersions } from '@/hooks/useDocumentVersions';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface DocumentVersionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: string;
  documentId: string;
  documentName: string;
}

export function DocumentVersionsDialog({
  open,
  onOpenChange,
  documentType,
  documentId,
  documentName,
}: DocumentVersionsDialogProps) {
  const { data: versions = [], isLoading } = useDocumentVersions(documentType, documentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Versionen – {documentName}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Laden...</p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Keine früheren Versionen vorhanden.</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">v{v.version_number}</Badge>
                  <div>
                    <p className="text-sm font-medium">{v.comment || 'Keine Beschreibung'}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(v.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                      {v.file_size && ` • ${(v.file_size / 1024).toFixed(0)} KB`}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <a href={v.file_url} download>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
