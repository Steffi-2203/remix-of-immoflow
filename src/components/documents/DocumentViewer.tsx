import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileText, ZoomIn, ZoomOut } from 'lucide-react';

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  fileName: string;
}

type ViewableType = 'pdf' | 'image' | 'unsupported';

function detectFileType(url: string, name: string): ViewableType {
  const ext = (name || url).split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return 'image';
  return 'unsupported';
}

export function DocumentViewer({ open, onOpenChange, fileUrl, fileName }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const fileType = detectFileType(fileUrl, fileName);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 50));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-base font-medium truncate mr-4">
            {fileName}
          </DialogTitle>
          <div className="flex items-center gap-1">
            {fileType === 'image' && (
              <>
                <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoom <= 50}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-12 text-center">{zoom}%</span>
                <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoom >= 200}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" asChild>
              <a href={fileUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href={fileUrl} download={fileName}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/30">
          {fileType === 'pdf' && (
            <iframe
              src={`${fileUrl}#toolbar=1`}
              className="w-full h-full border-0"
              title={fileName}
            />
          )}

          {fileType === 'image' && (
            <div className="flex items-center justify-center min-h-full p-4">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom / 100})` }}
              />
            </div>
          )}

          {fileType === 'unsupported' && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground">
                Vorschau für diesen Dateityp nicht verfügbar
              </p>
              <Button variant="outline" asChild>
                <a href={fileUrl} download={fileName}>
                  <Download className="h-4 w-4 mr-2" />
                  Herunterladen
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
