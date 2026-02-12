import { useState, useRef } from 'react';
import { ScanLine, Upload, Lock, Sparkles, Loader2, Check, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useKiAutopilot } from '@/hooks/useKiAutopilot';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface ExtractedInvoice {
  lieferant: string;
  rechnungsnummer: string;
  rechnungsdatum: string;
  bruttobetrag: number;
  nettobetrag: number;
  ustBetrag: number;
  ustSatz: number;
  beschreibung: string;
  kategorie: string;
}

export default function InvoiceOcr() {
  const { isActive, isLoading: kiLoading } = useKiAutopilot();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedInvoice | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: properties } = useQuery<any[]>({
    queryKey: ['/api/properties'],
    enabled: isActive,
  });

  const [selectedProperty, setSelectedProperty] = useState('');

  if (kiLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>KI-Autopilot erforderlich</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Die KI-Rechnungserkennung ist Teil des KI-Autopilot Add-ons.
            </p>
            <Link to="/checkout?plan=ki-autopilot">
              <Button data-testid="button-upgrade-ki">
                <Sparkles className="mr-2 h-4 w-4" />
                KI-Autopilot aktivieren
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);
    setExtracted(null);

    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : null;

      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const response = await fetch('/api/ki/invoice-ocr', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) throw new Error('Erkennung fehlgeschlagen');

      const data = await response.json();
      setExtracted(data);
    } catch {
      toast({ title: 'Fehler', description: 'Rechnung konnte nicht analysiert werden.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!extracted) return;
    setConfirming(true);

    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : null;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const response = await fetch('/api/ki/invoice-ocr/confirm', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ ...extracted, propertyId: selectedProperty || undefined }),
      });

      if (!response.ok) throw new Error('Buchung fehlgeschlagen');

      toast({ title: 'Buchung erstellt', description: 'Die Rechnung wurde als Ausgabe erfasst.' });
      setExtracted(null);
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
    } catch {
      toast({ title: 'Fehler', description: 'Buchung konnte nicht erstellt werden.', variant: 'destructive' });
    } finally {
      setConfirming(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <ScanLine className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-invoice-ocr-title">KI-Rechnungserkennung</h1>
        <Badge variant="secondary">KI-Autopilot</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rechnung hochladen</CardTitle>
          <CardDescription>Laden Sie ein Bild oder PDF einer Rechnung hoch. Die KI extrahiert automatisch alle relevanten Daten.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
            }`}
            data-testid="dropzone-invoice"
          >
            {uploading ? (
              <div className="space-y-2">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Rechnung wird analysiert...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="font-medium">Rechnung hierher ziehen oder klicken</p>
                <p className="text-sm text-muted-foreground">PDF, JPG oder PNG (max. 15 MB)</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-file-upload"
          />
        </CardContent>
      </Card>

      {extracted && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Erkannte Rechnungsdaten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Lieferant</label>
                <Input
                  value={extracted.lieferant || ''}
                  onChange={e => setExtracted({ ...extracted, lieferant: e.target.value })}
                  data-testid="input-vendor"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Rechnungsnummer</label>
                <Input
                  value={extracted.rechnungsnummer || ''}
                  onChange={e => setExtracted({ ...extracted, rechnungsnummer: e.target.value })}
                  data-testid="input-invoice-number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Rechnungsdatum</label>
                <Input
                  type="date"
                  value={extracted.rechnungsdatum || ''}
                  onChange={e => setExtracted({ ...extracted, rechnungsdatum: e.target.value })}
                  data-testid="input-invoice-date"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Bruttobetrag (EUR)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={extracted.bruttobetrag || 0}
                  onChange={e => setExtracted({ ...extracted, bruttobetrag: parseFloat(e.target.value) || 0 })}
                  data-testid="input-gross-amount"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nettobetrag (EUR)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={extracted.nettobetrag || 0}
                  onChange={e => setExtracted({ ...extracted, nettobetrag: parseFloat(e.target.value) || 0 })}
                  data-testid="input-net-amount"
                />
              </div>
              <div>
                <label className="text-sm font-medium">USt-Betrag (EUR)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={extracted.ustBetrag || 0}
                  onChange={e => setExtracted({ ...extracted, ustBetrag: parseFloat(e.target.value) || 0 })}
                  data-testid="input-vat-amount"
                />
              </div>
              <div>
                <label className="text-sm font-medium">USt-Satz (%)</label>
                <Input
                  type="number"
                  value={extracted.ustSatz || 20}
                  onChange={e => setExtracted({ ...extracted, ustSatz: parseFloat(e.target.value) || 20 })}
                  data-testid="input-vat-rate"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kategorie</label>
                <Input
                  value={extracted.kategorie || ''}
                  onChange={e => setExtracted({ ...extracted, kategorie: e.target.value })}
                  data-testid="input-category"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Beschreibung</label>
                <Input
                  value={extracted.beschreibung || ''}
                  onChange={e => setExtracted({ ...extracted, beschreibung: e.target.value })}
                  data-testid="input-description"
                />
              </div>
              {properties && properties.length > 0 && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Liegenschaft zuordnen</label>
                  <select
                    value={selectedProperty}
                    onChange={e => setSelectedProperty(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    data-testid="select-property"
                  >
                    <option value="">Keine Zuordnung</option>
                    {properties.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.address}, {p.city}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleConfirm} disabled={confirming} data-testid="button-confirm-booking">
                {confirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Buchung erstellen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
