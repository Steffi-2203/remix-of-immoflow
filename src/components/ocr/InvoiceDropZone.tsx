import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Image, X, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface InvoiceDropZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

export function InvoiceDropZone({ onFileSelect, disabled, className }: InvoiceDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const validateFile = useCallback((file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    
    if (!validTypes.includes(file.type)) {
      return 'Nur Bilder (JPG, PNG) oder PDFs erlaubt';
    }
    
    if (file.size > 20 * 1024 * 1024) {
      return 'Datei zu groß (max. 20 MB)';
    }
    
    return null;
  }, []);

  // Generate preview when file is selected
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    // For PDFs, generate first page preview
    if (selectedFile.type === 'application/pdf') {
      setLoadingPreview(true);
      generatePdfPreview(selectedFile).then(url => {
        setPreviewUrl(url);
        setLoadingPreview(false);
      }).catch(() => {
        setPreviewUrl(null);
        setLoadingPreview(false);
      });
    }
  }, [selectedFile]);

  const generatePdfPreview = async (file: File): Promise<string | null> => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      
      const scale = 0.5;
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      const context = canvas.getContext('2d');
      if (!context) return null;
      
      await page.render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  };

  const handleFileSelection = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setDragError(error);
      setTimeout(() => setDragError(null), 3000);
      return;
    }
    setSelectedFile(file);
  }, [validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !selectedFile) {
      setIsDragOver(true);
      setDragError(null);
    }
  }, [disabled, selectedFile]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || selectedFile) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    handleFileSelection(files[0]);
  }, [disabled, selectedFile, handleFileSelection]);

  const handleClick = useCallback(() => {
    if (disabled || selectedFile) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileSelection(file);
      }
    };
    input.click();
  }, [disabled, selectedFile, handleFileSelection]);

  const handleConfirm = useCallback(() => {
    if (selectedFile) {
      onFileSelect(selectedFile);
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [selectedFile, onFileSelect]);

  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Preview mode
  if (selectedFile) {
    const isPdf = selectedFile.type === 'application/pdf';
    
    return (
      <div className={cn(
        'relative border-2 border-primary rounded-lg p-4 transition-all',
        'flex flex-col items-center gap-4',
        className
      )}>
        {/* Preview */}
        <div className="relative w-full max-w-xs aspect-[3/4] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          {loadingPreview ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : previewUrl ? (
            <img 
              src={previewUrl} 
              alt="Vorschau" 
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <FileText className="h-12 w-12" />
              <span className="text-xs">Keine Vorschau</span>
            </div>
          )}
          {isPdf && (
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
              PDF
            </div>
          )}
        </div>

        {/* File info */}
        <div className="text-center space-y-1">
          <p className="text-sm font-medium truncate max-w-[250px]">{selectedFile.name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={disabled}>
            <X className="h-4 w-4 mr-1" />
            Abbrechen
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={disabled}>
            <Check className="h-4 w-4 mr-1" />
            Analysieren
          </Button>
        </div>
      </div>
    );
  }

  // Drop zone mode
  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer',
        'flex flex-col items-center justify-center gap-3 text-center',
        isDragOver && !disabled && 'border-primary bg-primary/5 scale-[1.02]',
        !isDragOver && !disabled && 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
        disabled && 'opacity-50 cursor-not-allowed',
        dragError && 'border-destructive bg-destructive/5',
        className
      )}
    >
      {dragError ? (
        <>
          <div className="p-3 rounded-full bg-destructive/10">
            <X className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm font-medium text-destructive">{dragError}</p>
        </>
      ) : (
        <>
          <div className={cn(
            'p-3 rounded-full transition-colors',
            isDragOver ? 'bg-primary/10' : 'bg-muted'
          )}>
            <Upload className={cn(
              'h-6 w-6 transition-colors',
              isDragOver ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>
          
          <div className="space-y-1">
            <p className={cn(
              'text-sm font-medium transition-colors',
              isDragOver ? 'text-primary' : 'text-foreground'
            )}>
              {isDragOver ? 'Datei hier ablegen' : 'Rechnung hier ablegen'}
            </p>
            <p className="text-xs text-muted-foreground">
              oder klicken zum Auswählen
            </p>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Image className="h-3.5 w-3.5" />
              <span>JPG, PNG</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span>PDF</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
