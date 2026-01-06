import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TenantImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  units: Array<{ id: string; top_nummer: string }>;
  onSuccess: () => void;
}

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  name: string;
  topNummer: string;
  grundmiete: string;
  betriebskosten: string;
  heizungskosten: string;
  mietbeginn: string;
  email: string;
  phone: string;
}

const defaultMapping: ColumnMapping = {
  name: '',
  topNummer: '',
  grundmiete: '',
  betriebskosten: '',
  heizungskosten: '',
  mietbeginn: '',
  email: '',
  phone: '',
};

export function TenantImportDialog({ open, onOpenChange, propertyId, units, onSuccess }: TenantImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'done'>('upload');
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(defaultMapping);
  const [errors, setErrors] = useState<string[]>([]);
  const [importResults, setImportResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const reset = () => {
    setStep('upload');
    setCsvData([]);
    setHeaders([]);
    setMapping(defaultMapping);
    setErrors([]);
    setImportResults({ success: 0, failed: 0 });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      delimiter: '', // Auto-detect delimiter (comma, semicolon, tab)
      complete: (results) => {
        const data = results.data as ParsedRow[];
        if (data.length === 0) {
          toast({ title: 'Fehler', description: 'Die CSV-Datei ist leer.', variant: 'destructive' });
          return;
        }
        
        const csvHeaders = Object.keys(data[0]);
        setHeaders(csvHeaders);
        setCsvData(data);
        
        // Auto-detect column mapping
        const autoMapping: ColumnMapping = { ...defaultMapping };
        csvHeaders.forEach(header => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('name') || lowerHeader.includes('mieter')) {
            autoMapping.name = header;
          } else if (lowerHeader.includes('top') || lowerHeader.includes('einheit') || lowerHeader.includes('wohnung')) {
            autoMapping.topNummer = header;
          } else if (lowerHeader.includes('grundmiete') || lowerHeader.includes('miete')) {
            autoMapping.grundmiete = header;
          } else if (lowerHeader.includes('betriebskosten') || lowerHeader.includes('bk')) {
            autoMapping.betriebskosten = header;
          } else if (lowerHeader.includes('heizung') || lowerHeader.includes('hk')) {
            autoMapping.heizungskosten = header;
          } else if (lowerHeader.includes('beginn') || lowerHeader.includes('einzug') || lowerHeader.includes('datum')) {
            autoMapping.mietbeginn = header;
          } else if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
            autoMapping.email = header;
          } else if (lowerHeader.includes('telefon') || lowerHeader.includes('phone') || lowerHeader.includes('handy')) {
            autoMapping.phone = header;
          }
        });
        setMapping(autoMapping);
        setStep('mapping');
      },
      error: (error) => {
        toast({ title: 'Fehler', description: `CSV-Parsing fehlgeschlagen: ${error.message}`, variant: 'destructive' });
      }
    });
  };

  const validateMapping = (): boolean => {
    const validationErrors: string[] = [];
    if (!mapping.name) validationErrors.push('Name ist erforderlich');
    if (!mapping.topNummer) validationErrors.push('Top/Einheit ist erforderlich');
    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleProceedToPreview = () => {
    if (validateMapping()) {
      setStep('preview');
    }
  };

  const parseNumber = (value: string | undefined): number => {
    if (!value) return 0;
    // Handle German number format (comma as decimal separator)
    const cleanValue = value.replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleanValue);
    return isNaN(num) ? 0 : num;
  };

  const parseDate = (value: string | undefined): string => {
    if (!value) {
      return new Date().toISOString().split('T')[0];
    }
    // Try German date format (DD.MM.YYYY)
    const germanMatch = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (germanMatch) {
      const [, day, month, year] = germanMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    // Try ISO format
    const isoMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return value;
    }
    return new Date().toISOString().split('T')[0];
  };

  const parseName = (value: string): { firstName: string; lastName: string } => {
    const parts = value.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    const lastName = parts.pop() || '';
    const firstName = parts.join(' ');
    return { firstName, lastName };
  };

  const findUnitByTopNummer = (topNummer: string): string | null => {
    const cleanTop = topNummer.toString().trim().toLowerCase();
    const unit = units.find(u => u.top_nummer.toLowerCase() === cleanTop);
    return unit?.id || null;
  };

  const handleImport = async () => {
    setStep('importing');
    let successCount = 0;
    let failedCount = 0;
    const importErrors: string[] = [];

    for (const row of csvData) {
      const topNummer = row[mapping.topNummer];
      const unitId = findUnitByTopNummer(topNummer);

      if (!unitId) {
        importErrors.push(`Einheit "${topNummer}" nicht gefunden`);
        failedCount++;
        continue;
      }

      const { firstName, lastName } = parseName(row[mapping.name]);

      const tenantData = {
        unit_id: unitId,
        first_name: firstName,
        last_name: lastName,
        grundmiete: parseNumber(row[mapping.grundmiete]),
        betriebskosten_vorschuss: parseNumber(row[mapping.betriebskosten]),
        heizungskosten_vorschuss: parseNumber(row[mapping.heizungskosten]),
        mietbeginn: parseDate(row[mapping.mietbeginn]),
        email: mapping.email ? row[mapping.email] || null : null,
        phone: mapping.phone ? row[mapping.phone] || null : null,
        status: 'aktiv' as const,
      };

      const { error } = await supabase.from('tenants').insert(tenantData);

      if (error) {
        importErrors.push(`${row[mapping.name]}: ${error.message}`);
        failedCount++;
      } else {
        successCount++;
      }
    }

    setImportResults({ success: successCount, failed: failedCount });
    setErrors(importErrors);
    setStep('done');

    if (successCount > 0) {
      onSuccess();
    }
  };

  const getMappedPreviewData = () => {
    return csvData.slice(0, 5).map(row => ({
      name: row[mapping.name] || '-',
      topNummer: row[mapping.topNummer] || '-',
      grundmiete: parseNumber(row[mapping.grundmiete]),
      betriebskosten: parseNumber(row[mapping.betriebskosten]),
      heizungskosten: parseNumber(row[mapping.heizungskosten]),
      mietbeginn: parseDate(row[mapping.mietbeginn]),
      unitExists: !!findUnitByTopNummer(row[mapping.topNummer] || ''),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) reset(); onOpenChange(open); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Mieter aus CSV importieren
          </DialogTitle>
          <DialogDescription>
            Importieren Sie Mieterstammdaten aus einer CSV-Datei
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="py-8">
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">CSV-Datei hochladen</p>
              <p className="text-sm text-muted-foreground mb-4">
                Klicken Sie hier oder ziehen Sie eine Datei hierher
              </p>
              <p className="text-xs text-muted-foreground">
                Unterstützte Spalten: Name, Top Nr., Miete, BK, Heizung, Mietbeginn, Email, Telefon
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              {csvData.length} Zeilen gefunden. Ordnen Sie die CSV-Spalten den Feldern zu:
            </p>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errors.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Select value={mapping.name} onValueChange={(v) => setMapping({ ...mapping, name: v })}>
                  <SelectTrigger><SelectValue placeholder="Spalte wählen" /></SelectTrigger>
                  <SelectContent>
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Top/Einheit *</Label>
                <Select value={mapping.topNummer} onValueChange={(v) => setMapping({ ...mapping, topNummer: v })}>
                  <SelectTrigger><SelectValue placeholder="Spalte wählen" /></SelectTrigger>
                  <SelectContent>
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grundmiete</Label>
                <Select
                  value={mapping.grundmiete || 'none'}
                  onValueChange={(v) =>
                    setMapping({ ...mapping, grundmiete: v === 'none' ? '' : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Spalte wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Keine —</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Betriebskosten</Label>
                <Select
                  value={mapping.betriebskosten || 'none'}
                  onValueChange={(v) =>
                    setMapping({ ...mapping, betriebskosten: v === 'none' ? '' : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Spalte wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Keine —</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Heizungskosten</Label>
                <Select
                  value={mapping.heizungskosten || 'none'}
                  onValueChange={(v) =>
                    setMapping({ ...mapping, heizungskosten: v === 'none' ? '' : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Spalte wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Keine —</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mietbeginn</Label>
                <Select
                  value={mapping.mietbeginn || 'none'}
                  onValueChange={(v) =>
                    setMapping({ ...mapping, mietbeginn: v === 'none' ? '' : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Spalte wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Keine —</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Email</Label>
                <Select
                  value={mapping.email || 'none'}
                  onValueChange={(v) => setMapping({ ...mapping, email: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Spalte wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Keine —</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Telefon</Label>
                <Select
                  value={mapping.phone || 'none'}
                  onValueChange={(v) => setMapping({ ...mapping, phone: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Spalte wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Keine —</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('upload')}>Zurück</Button>
              <Button onClick={handleProceedToPreview}>Weiter zur Vorschau</Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vorschau der ersten 5 Einträge von {csvData.length} gesamt:
            </p>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Top</TableHead>
                  <TableHead>Grundmiete</TableHead>
                  <TableHead>BK</TableHead>
                  <TableHead>Heizung</TableHead>
                  <TableHead>Mietbeginn</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getMappedPreviewData().map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.topNummer}</TableCell>
                    <TableCell>€{row.grundmiete.toFixed(2)}</TableCell>
                    <TableCell>€{row.betriebskosten.toFixed(2)}</TableCell>
                    <TableCell>€{row.heizungskosten.toFixed(2)}</TableCell>
                    <TableCell>{row.mietbeginn}</TableCell>
                    <TableCell>
                      {row.unitExists ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Einheiten ohne grünes Häkchen werden übersprungen (Top Nr. nicht gefunden).
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mapping')}>Zurück</Button>
              <Button onClick={handleImport}>
                {csvData.length} Mieter importieren
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-12 text-center">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-lg">Importiere Mieter...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="py-8 space-y-4">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
              <p className="text-xl font-semibold mb-2">Import abgeschlossen</p>
              <p className="text-muted-foreground">
                {importResults.success} erfolgreich, {importResults.failed} fehlgeschlagen
              </p>
            </div>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    {errors.length > 10 && <li>...und {errors.length - 10} weitere</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Schließen</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
