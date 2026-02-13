import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Paperclip, FileText, Check, Loader2 } from 'lucide-react';
import { InvoiceDropZone } from '@/components/ocr/InvoiceDropZone';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PaymentDocumentButtonProps {
  paymentId: string;
  existingDocUrl?: string | null;
}

export function PaymentDocumentButton({ paymentId, existingDocUrl }: PaymentDocumentButtonProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const path = `payments/${paymentId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(path);

      // Update payment with document URL
      const { error: updateError } = await (supabase as any)
        .from('payments')
        .update({ beleg_url: urlData.publicUrl })
        .eq('id', paymentId);

      if (updateError) throw updateError;

      toast.success('Beleg erfolgreich verknüpft');
      setOpen(false);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Fehler beim Hochladen: ' + (err.message || 'Unbekannt'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title={existingDocUrl ? 'Beleg anzeigen' : 'Beleg verknüpfen'}
      >
        {existingDocUrl ? (
          <FileText className="h-4 w-4 text-primary" />
        ) : (
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Beleg verknüpfen</DialogTitle>
            <DialogDescription>
              Laden Sie ein PDF oder Bild hoch, um es mit dieser Zahlung zu verknüpfen.
            </DialogDescription>
          </DialogHeader>

          {existingDocUrl && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-sm">Beleg bereits verknüpft</span>
              <a
                href={existingDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline ml-auto"
              >
                Anzeigen
              </a>
            </div>
          )}

          {uploading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Beleg wird hochgeladen...</p>
            </div>
          ) : (
            <InvoiceDropZone
              onFileSelect={handleFileSelect}
              disabled={uploading}
              className="min-h-[180px]"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
