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

async function convertPdfToImages(file: File): Promise<Blob[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const blobs: Blob[] = [];
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
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
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) {
            resolve(b);
          } else {
            reject(new Error(`PDF-Seite ${pageNum} konnte nicht konvertiert werden`));
          }
        }, 'image/png', 0.95);
      });
      blobs.push(blob);
    }
    
    return blobs;
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

interface TenantWithUnit extends ExtractedTenantData {
  selectedUnitId: string;
  saved: boolean;
}

export function PdfScanDialog({ open, onOpenChange, propertyId, units, onSuccess }: PdfScanDialogProps) {
  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'saving' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedTenants, setExtractedTenants] = useState<TenantWithUnit[]>([]);
  const [currentTenantIndex, setCurrentTenantIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const currentTenant = extractedTenants[currentTenantIndex];

  const reset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setPreviewUrl(null);
    setExtractedTenants([]);
    setCurrentTenantIndex(0);
    setSavedCount(0);
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
      let imagesToProcess: Blob[] = [];
      let previewBlob: Blob = selectedFile;

      if (isPdf) {
        toast({ 
          title: 'PDF wird konvertiert...', 
          description: 'Alle Seiten werden verarbeitet.' 
        });
        try {
          imagesToProcess = await convertPdfToImages(selectedFile);
          previewBlob = imagesToProcess[0];
        } catch (pdfError: any) {
          setError(`PDF-Konvertierung fehlgeschlagen: ${pdfError.message}. Bitte laden Sie stattdessen einen Screenshot hoch.`);
          setStep('upload');
          return;
        }
      } else {
        imagesToProcess = [selectedFile];
      }

      const previewUrl = URL.createObjectURL(previewBlob);
      setPreviewUrl(previewUrl);

      const allTenants: TenantWithUnit[] = [];

      for (let i = 0; i < imagesToProcess.length; i++) {
        const imageBlob = imagesToProcess[i];
        
        if (isPdf && imagesToProcess.length > 1) {
          toast({ 
            title: `Verarbeite Seite ${i + 1} von ${imagesToProcess.length}...`
          });
        }

        const formData = new FormData();
        formData.append('file', imageBlob, 'page.png');
        formData.append('propertyId', propertyId);

        const response = await fetch('/api/ocr/tenant', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`Seite ${i + 1} Fehler:`, errorData.message);
          continue;
        }

        const data = await response.json();
        
        if (data.tenants && Array.isArray(data.tenants)) {
          for (const t of data.tenants) {
            const matchedUnit = units.find(u => 
              u.top_nummer.toLowerCase() === t.topNummer?.toLowerCase()
            );
            allTenants.push({
              ...t,
              selectedUnitId: matchedUnit?.id || '',
              saved: false,
            });
          }
        }
      }

      if (allTenants.length === 0) {
        setError('Keine Mieter im Dokument gefunden.');
        setStep('upload');
        return;
      }

      setExtractedTenants(allTenants);
      setCurrentTenantIndex(0);
      toast({ 
        title: `${allTenants.length} Mieter gefunden`, 
        description: 'Überprüfen Sie die Daten vor dem Speichern.' 
      });
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

  const updateField = useCallback((field: keyof TenantWithUnit, value: string | number) => {
    setExtractedTenants(prev => prev.map((t, idx) => 
      idx === currentTenantIndex ? { ...t, [field]: value } : t
    ));
  }, [currentTenantIndex]);

  const setSelectedUnitId = useCallback((unitId: string) => {
    setExtractedTenants(prev => prev.map((t, idx) => 
      idx === currentTenantIndex ? { ...t, selectedUnitId: unitId } : t
    ));
  }, [currentTenantIndex]);

  const handleSaveCurrent = async () => {
    if (!currentTenant) return;

    const validationErrors: string[] = [];

    if (!currentTenant.firstName?.trim()) {
      validationErrors.push('Vorname ist erforderlich');
    }
    if (!currentTenant.lastName?.trim()) {
      validationErrors.push('Nachname ist erforderlich');
    }
    if (!currentTenant.selectedUnitId && !currentTenant.topNummer?.trim()) {
      validationErrors.push('Einheit ist erforderlich');
    }
    if (currentTenant.grundmiete < 0) {
      validationErrors.push('Grundmiete kann nicht negativ sein');
    }
    if (currentTenant.betriebskostenVorschuss < 0) {
      validationErrors.push('Betriebskosten können nicht negativ sein');
    }
    if (currentTenant.heizkostenVorschuss < 0) {
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
      let unitId = currentTenant.selectedUnitId;
      
      if (!unitId && currentTenant.topNummer?.trim()) {
        toast({ title: 'Erstelle Einheit...', description: `${currentTenant.topNummer} wird angelegt.` });
        try {
          const unitResponse = await apiRequest('POST', '/api/units', {
            property_id: propertyId,
            top_nummer: currentTenant.topNummer.trim(),
            type: 'wohnung',
            status: 'vermietet',
            flaeche: '0',
          });
          const unitData = await unitResponse.json();
          
          if (!unitData?.id) {
            throw new Error('Einheit konnte nicht erstellt werden - keine ID erhalten');
          }
          
          unitId = unitData.id;
          toast({ title: 'Einheit erstellt', description: `${currentTenant.topNummer} wurde angelegt.` });
        } catch (unitError: any) {
          setError(unitError.message || 'Einheit konnte nicht erstellt werden');
          setStep('review');
          return;
        }
      }
      
      if (!unitId) {
        setError('Keine Einheit ausgewählt oder erkannt');
        setStep('review');
        return;
      }
      
      await apiRequest('POST', '/api/tenants', {
        unit_id: unitId,
        first_name: currentTenant.firstName,
        last_name: currentTenant.lastName,
        email: currentTenant.email || null,
        phone: currentTenant.phone || null,
        mietbeginn: currentTenant.mietbeginn || new Date().toISOString().split('T')[0],
        grundmiete: currentTenant.grundmiete,
        betriebskosten_vorschuss: currentTenant.betriebskostenVorschuss,
        heizungskosten_vorschuss: currentTenant.heizkostenVorschuss,
        kaution: currentTenant.kaution || null,
        notes: currentTenant.notes || null,
        status: 'aktiv',
      });

      setExtractedTenants(prev => prev.map((t, idx) => 
        idx === currentTenantIndex ? { ...t, saved: true } : t
      ));
      setSavedCount(prev => prev + 1);

      toast({ 
        title: 'Mieter erstellt', 
        description: `${currentTenant.firstName} ${currentTenant.lastName} wurde erfolgreich angelegt.` 
      });

      const nextUnsaved = extractedTenants.findIndex((t, idx) => idx > currentTenantIndex && !t.saved);
      if (nextUnsaved !== -1) {
        setCurrentTenantIndex(nextUnsaved);
        setStep('review');
      } else {
        setStep('done');
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Mieter konnte nicht erstellt werden');
      setStep('review');
    }
  };

  const handleSkipCurrent = () => {
    const nextUnsaved = extractedTenants.findIndex((t, idx) => idx > currentTenantIndex && !t.saved);
    if (nextUnsaved !== -1) {
      setCurrentTenantIndex(nextUnsaved);
    } else {
      if (savedCount > 0) {
        setStep('done');
        onSuccess();
      } else {
        toast({ 
          title: 'Keine Mieter gespeichert', 
          description: 'Sie haben alle Mieter übersprungen.', 
          variant: 'destructive' 
        });
        reset();
        onOpenChange(false);
      }
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

        {step === 'review' && currentTenant && (
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
                    {extractedTenants.length > 1 
                      ? `${extractedTenants.length} Mieter gefunden! Mieter ${currentTenantIndex + 1} von ${extractedTenants.length}` 
                      : 'Daten erfolgreich extrahiert! Bitte überprüfen und korrigieren Sie die Werte.'}
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
                      value={currentTenant.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      data-testid="input-ocr-firstname"
                    />
                  </div>
                  <div>
                    <Label>Nachname *</Label>
                    <Input
                      value={currentTenant.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      data-testid="input-ocr-lastname"
                    />
                  </div>
                  <div>
                    <Label>Einheit *</Label>
                    <Select value={currentTenant.selectedUnitId} onValueChange={setSelectedUnitId}>
                      <SelectTrigger data-testid="select-ocr-unit">
                        <SelectValue placeholder={currentTenant.topNummer ? `Neu: ${currentTenant.topNummer}` : "Einheit wählen"} />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.top_nummer}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {currentTenant.topNummer && !currentTenant.selectedUnitId && (
                      <p className="text-xs text-primary mt-1">
                        Einheit "{currentTenant.topNummer}" wird automatisch erstellt
                      </p>
                    )}
                    {currentTenant.topNummer && currentTenant.selectedUnitId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Erkannt: {currentTenant.topNummer}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Mietbeginn</Label>
                    <Input
                      type="date"
                      value={currentTenant.mietbeginn}
                      onChange={(e) => updateField('mietbeginn', e.target.value)}
                      data-testid="input-ocr-mietbeginn"
                    />
                  </div>
                  <div>
                    <Label>Grundmiete (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentTenant.grundmiete}
                      onChange={(e) => updateField('grundmiete', parseFloat(e.target.value) || 0)}
                      data-testid="input-ocr-grundmiete"
                    />
                  </div>
                  <div>
                    <Label>Betriebskosten (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentTenant.betriebskostenVorschuss}
                      onChange={(e) => updateField('betriebskostenVorschuss', parseFloat(e.target.value) || 0)}
                      data-testid="input-ocr-bk"
                    />
                  </div>
                  <div>
                    <Label>Heizkosten (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentTenant.heizkostenVorschuss}
                      onChange={(e) => updateField('heizkostenVorschuss', parseFloat(e.target.value) || 0)}
                      data-testid="input-ocr-hk"
                    />
                  </div>
                  <div>
                    <Label>Kaution (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentTenant.kaution}
                      onChange={(e) => updateField('kaution', parseFloat(e.target.value) || 0)}
                      data-testid="input-ocr-kaution"
                    />
                  </div>
                  <div>
                    <Label>E-Mail</Label>
                    <Input
                      type="email"
                      value={currentTenant.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      data-testid="input-ocr-email"
                    />
                  </div>
                  <div>
                    <Label>Telefon</Label>
                    <Input
                      value={currentTenant.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      data-testid="input-ocr-phone"
                    />
                  </div>
                </div>

                {currentTenant.notes && (
                  <div className="mt-4">
                    <Label>Zusätzliche erkannte Informationen</Label>
                    <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/50 rounded-lg">
                      {currentTenant.notes}
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

            <DialogFooter className="flex-wrap gap-2">
              <Button variant="outline" onClick={reset}>
                Abbrechen
              </Button>
              {extractedTenants.length > 1 && (
                <Button variant="ghost" onClick={handleSkipCurrent}>
                  Überspringen
                </Button>
              )}
              <Button 
                onClick={handleSaveCurrent}
                disabled={!currentTenant.firstName || !currentTenant.lastName || (!currentTenant.selectedUnitId && !currentTenant.topNummer?.trim())}
                data-testid="button-ocr-save"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {extractedTenants.length > 1 
                  ? `Mieter ${currentTenantIndex + 1}/${extractedTenants.length} speichern` 
                  : 'Mieter anlegen'}
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
            <p className="text-xl font-semibold mb-2">
              {savedCount > 1 ? `${savedCount} Mieter erfolgreich angelegt!` : 'Mieter erfolgreich angelegt!'}
            </p>
            <p className="text-muted-foreground mb-6">
              Die Mieterdaten wurden gespeichert.
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
