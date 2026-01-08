import { useState, useCallback } from 'react';
import { Upload, FileText, Image, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvoiceDropZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

export function InvoiceDropZone({ onFileSelect, disabled, className }: InvoiceDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);

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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
      setDragError(null);
    }
  }, [disabled]);

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

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0]; // Only process first file
    const error = validateFile(file);
    
    if (error) {
      setDragError(error);
      setTimeout(() => setDragError(null), 3000);
      return;
    }

    onFileSelect(file);
  }, [disabled, validateFile, onFileSelect]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const error = validateFile(file);
        if (error) {
          setDragError(error);
          setTimeout(() => setDragError(null), 3000);
          return;
        }
        onFileSelect(file);
      }
    };
    input.click();
  }, [disabled, validateFile, onFileSelect]);

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
