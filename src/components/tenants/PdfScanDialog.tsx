import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { FileImage, Upload, Loader2, AlertCircle, CheckCircle, Sparkles, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

async function convertPdfToImage(file: File): Promise<Blob> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    
    const scale = 2;
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context konnte nicht erstellt werden');
    }
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('PDF-Seite konnte nicht in Bild konvertiert werden'));
        }
      }, 'image/png', 0.95);
    });
  } catch (error: any) {
    console.error('PDF conversion error:', error);
    throw new Error(`PDF-Konvertierung fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`);
  }
}

interface PdfScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  units: Array<{ id: string; top_nummer: string }>;
  onSuccess: () => void;
}

interface ExtractedTenantData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mietbeginn: string;
  grundmiete: number;
  betriebskostenVorschuss: number;
  heizkostenVorschuss: number;
  kaution: number;
  topNummer: string;
  address: string;
  notes: string;
}

const defaultExtractedData: ExtractedTenantData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  mietbeginn: '',
  grundmiete: 0,
  betriebskostenVorschuss: 0,
  heizkostenVorschuss: 0,
  kaution: 0,
  topNummer: '',
  address: '',
  notes: '',
};

export function PdfScanDialog({ open, onOpenChange, propertyId, units, onSuccess }: PdfScanDialogProps) {
  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'saving' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedTenantData>(defaultExtractedData);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const reset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setPreviewUrl(null);
    setExtractedData(defaultExtractedData);
    setSelectedUnitId('');
    setError(null);
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    const isImage = selectedFile.type.startsWith('image/');
    const isPdf = selectedFile.type === 'application/pdf';

    if (!isImage && !isPdf) {
      toast({ 
        title: 'Ungültiges Format', 
        description: 'Bitte laden Sie ein Bild (JPG, PNG) oder PDF hoch.', 
        variant: 'destructive' 
      });
      return;
    }

    setFile(selectedFile);
    setStep('processing');
    setError(null);

    try {
      let fileToUpload: Blob = selectedFile;
      let previewBlob: Blob = selectedFile;

      if (isPdf) {
        toast({ 
          title: 'PDF wird konvertiert...', 
          description: 'Die erste Seite wird in ein Bild umgewandelt.' 
        });
        try {
          const imageBlob = await convertPdfToImage(selectedFile);
          fileToUpload = imageBlob;
          previewBlob = imageBlob;
        } catch (pdfError: any) {
          setError(`PDF-Konvertierung fehlgeschlagen: ${pdfError.message}. Bitte laden Sie stattdessen einen Screenshot hoch.`);
          setStep('upload');
          return;
        }
      }

      const previewUrl = URL.createObjectURL(previewBlob);
      setPreviewUrl(previewUrl);

      const formData = new FormData();
      formData.append('file', fileToUpload, isPdf ? 'converted.png' : selectedFile.name);
      formData.append('propertyId', propertyId);

      const response = await fetch('/api/ocr/tenant', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'OCR-Verarbeitung fehlgeschlagen');
      }

      const data = await response.json();
      setExtractedData(data);

      const matchedUnit = units.find(u => 
        u.top_nummer.toLowerCase() === data.topNummer?.toLowerCase()
      );
      if (matchedUnit) {
        setSelectedUnitId(matchedUnit.id);
      }

      setStep('review');
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten');
      setStep('upload');
    }
  }, [propertyId, units, toast]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const updateField = useCallback((field: keyof ExtractedTenantData, value: string | number) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    const validationErrors: string[] = [];

    if (!extractedData.firstName?.trim()) {
      validationErrors.push('Vorname ist erforderlich');
    }
    if (!extractedData.lastName?.trim()) {
      validationErrors.push('Nachname ist erforderlich');
    }
    if (!selectedUnitId) {
      validationErrors.push('Einheit ist erforderlich');
    }
    if (extractedData.grundmiete < 0) {
      validationErrors.push('Grundmiete kann nicht negativ sein');
    }
    if (extractedData.betriebskostenVorschuss < 0) {
      validationErrors.push('Betriebskosten können nicht negativ sein');
    }
    if (extractedData.heizkostenVorschuss < 0) {
      validationErrors.push('Heizkosten können nicht negativ sein');
    }

    if (validationErrors.length > 0) {
      toast({ 
        title: 'Fehlende Daten', 
        description: validationErrors.join('. '), 
        variant: 'destructive' 
      });
      return;
    }

    setStep('saving');

    try {
      await apiRequest('POST', '/api/tenants', {
        unit_id: selectedUnitId,
        first_name: extractedData.firstName,
        last_name: extractedData.lastName,
        email: extractedData.email || null,
        phone: extractedData.phone || null,
        mietbeginn: extractedData.mietbeginn || new Date().toISOString().split('T')[0],
        grundmiete: extractedData.grundmiete,
        betriebskosten_vorschuss: extractedData.betriebskostenVorschuss,
        heizungskosten_vorschuss: extractedData.heizkostenVorschuss,
        kaution: extractedData.kaution || null,
        notes: extractedData.notes || null,
        status: 'aktiv',
      });

      setStep('done');
      toast({ 
        title: 'Mieter erstellt', 
        description: `${extractedData.firstName} ${extractedData.lastName} wurde erfolgreich angelegt.` 
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Mieter konnte nicht erstellt werden');
      setStep('review');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) reset(); onOpenChange(isOpen); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Dokument scannen (KI-Erkennung)
          </DialogTitle>
          <DialogDescription>
            Laden Sie einen Mietvertrag oder eine Vorschreibung hoch - die KI extrahiert automatisch die Mieterdaten.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="py-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div 
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              data-testid="dropzone-pdf-scan"
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Dokument hochladen</p>
              <p className="text-sm text-muted-foreground mb-4">
                Ziehen Sie eine Datei hierher oder klicken Sie zum Auswählen
              </p>
              <p className="text-xs text-muted-foreground">
                Unterstützt: Bilder (JPG, PNG) und PDF-Dokumente
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
              data-testid="input-pdf-scan"
            />
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-lg font-medium mb-2">KI analysiert Dokument...</p>
            <p className="text-sm text-muted-foreground">
              Extrahiere Mieterdaten mit GPT-Vision
            </p>
            {previewUrl && (
              <div className="mt-6 max-w-xs mx-auto">
                <img 
                  src={previewUrl} 
                  alt="Vorschau" 
                  className="rounded-lg border border-border shadow-sm"
                />
              </div>
            )}
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              {previewUrl && (
                <div className="w-32 flex-shrink-0">
                  <img 
                    src={previewUrl} 
                    alt="Dokument" 
                    className="rounded-lg border border-border shadow-sm w-full"
                  />
                </div>
              )}
              <div className="flex-1">
                <Alert className="bg-success/10 border-success/30">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertDescription className="text-success">
                    Daten erfolgreich extrahiert! Bitte überprüfen und korrigieren Sie die Werte.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Vorname *</Label>
                    <Input
                      value={extractedData.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      data-testid="input-ocr-firstname"
                    />
                  </div>
                  <div>
                    <Label>Nachname *</Label>
                    <Input
                      value={extractedData.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      data-testid="input-ocr-lastname"
                    />
                  </div>
                  <div>
                    <Label>Einheit *</Label>
                    <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                      <SelectTrigger data-testid="select-ocr-unit">
                        <SelectValue placeholder="Einheit wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.top_nummer}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {extractedData.topNummer && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Erkannt: {extractedData.topNummer}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Mietbeginn</Label>
                    <Input
                      type="date"
                      value={extractedData.mietbeginn}
                      onChange={(e) => updateField('mietbeginn', e.target.value)}
                      data-testid="input-ocr-mietbeginn"
                    />
                  </div>
                  <div>
                    <Label>Grundmiete (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={extractedData.grundmiete}
                      onChange={(e) => updateField('grundmiete', parseFloat(e.target.value) || 0)}
                      data-testid="input-ocr-grundmiete"
                    />
                  </div>
                  <div>
                    <Label>Betriebskosten (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={extractedData.betriebskostenVorschuss}
                      onChange={(e) => updateField('betriebskostenVorschuss', parseFloat(e.target.value) || 0)}
                      data-testid="input-ocr-bk"
                    />
                  </div>
                  <div>
                    <Label>Heizkosten (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={extractedData.heizkostenVorschuss}
                      onChange={(e) => updateField('heizkostenVorschuss', parseFloat(e.target.value) || 0)}
                      data-testid="input-ocr-hk"
                    />
                  </div>
                  <div>
                    <Label>Kaution (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={extractedData.kaution}
                      onChange={(e) => updateField('kaution', parseFloat(e.target.value) || 0)}
                      data-testid="input-ocr-kaution"
                    />
                  </div>
                  <div>
                    <Label>E-Mail</Label>
                    <Input
                      type="email"
                      value={extractedData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      data-testid="input-ocr-email"
                    />
                  </div>
                  <div>
                    <Label>Telefon</Label>
                    <Input
                      value={extractedData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      data-testid="input-ocr-phone"
                    />
                  </div>
                </div>

                {extractedData.notes && (
                  <div className="mt-4">
                    <Label>Zusätzliche erkannte Informationen</Label>
                    <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/50 rounded-lg">
                      {extractedData.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!extractedData.firstName || !extractedData.lastName || !selectedUnitId}
                data-testid="button-ocr-save"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mieter anlegen
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'saving' && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-lg">Mieter wird angelegt...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="py-8 text-center">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <p className="text-xl font-semibold mb-2">Mieter erfolgreich angelegt!</p>
            <p className="text-muted-foreground mb-6">
              {extractedData.firstName} {extractedData.lastName}
            </p>
            <DialogFooter className="justify-center">
              <Button variant="outline" onClick={reset}>
                Weiteres Dokument scannen
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Schließen
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
