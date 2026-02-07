import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, FileText, Loader2, CheckCircle2, AlertCircle, 
  TrendingUp, TrendingDown, Building, X, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { parseCamtXml, readFileAsText, type CamtStatement, type CamtTransaction } from '@/utils/camtParser';
import { autoMatchTransaction, type Unit, type Tenant, type LearnedPattern } from '@/utils/bankImportUtils';

interface CamtImportProps {
  units: Unit[];
  tenants: Tenant[];
  learnedPatterns: LearnedPattern[];
  bankAccountId: string | null;
  onImport: (transactions: CamtImportLine[]) => Promise<void>;
}

export interface CamtImportLine extends CamtTransaction {
  id: string;
  matchedUnitId: string | null;
  matchedTenantId: string | null;
  matchedPropertyId: string | null;
  confidence: number;
  matchReason: string;
  selected: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(n);
}

export function CamtImport({ units, tenants, learnedPatterns, bankAccountId, onImport }: CamtImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statement, setStatement] = useState<CamtStatement | null>(null);
  const [lines, setLines] = useState<CamtImportLine[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const matchTransaction = useCallback((tx: CamtTransaction, idx: number): CamtImportLine => {
    const result = autoMatchTransaction(
      {
        date: tx.date,
        amount: tx.amount,
        description: tx.description,
        reference: tx.reference,
        counterpartName: tx.counterpartName,
        counterpartIban: tx.counterpartIban,
      },
      units,
      tenants,
      learnedPatterns,
    );

    const unit = result.unitId ? units.find(u => u.id === result.unitId) : null;

    return {
      ...tx,
      id: `camt-${idx}`,
      matchedUnitId: result.unitId,
      matchedTenantId: result.tenantId,
      matchedPropertyId: unit?.property_id || null,
      confidence: result.confidence,
      matchReason: result.matchReason,
      selected: tx.amount > 0 && result.confidence > 0.3,
    };
  }, [units, tenants, learnedPatterns]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xml')) {
      toast.error('Bitte eine XML-Datei auswählen (CAMT.053 oder CAMT.054)');
      return;
    }

    setIsParsing(true);
    setErrors([]);

    try {
      const content = await readFileAsText(file);
      const result = parseCamtXml(content);

      if (!result.success || result.statements.length === 0) {
        setErrors(result.errors.length > 0 ? result.errors : ['Konnte keine Kontoauszüge parsen']);
        return;
      }

      const stmt = result.statements[0]; // Use first statement
      setStatement(stmt);

      const matched = stmt.transactions.map((tx, idx) => matchTransaction(tx, idx));
      setLines(matched);

      toast.success(`${stmt.transactions.length} Buchungen aus ${result.format?.toUpperCase()} importiert`, {
        description: stmt.iban ? `Konto: ${stmt.iban}` : undefined,
      });
    } catch (err) {
      toast.error('Fehler beim Parsen der CAMT-Datei');
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  }, [matchTransaction]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = useCallback(async () => {
    const selected = lines.filter(l => l.selected);
    if (selected.length === 0) {
      toast.error('Keine Buchungen ausgewählt');
      return;
    }
    if (!bankAccountId) {
      toast.error('Bitte zuerst ein Bankkonto auswählen');
      return;
    }
    setIsImporting(true);
    try {
      await onImport(selected);
      toast.success(`${selected.length} Buchungen importiert`);
      setStatement(null);
      setLines([]);
    } catch {
      toast.error('Fehler beim Import');
    } finally {
      setIsImporting(false);
    }
  }, [lines, bankAccountId, onImport]);

  const handleReset = () => { setStatement(null); setLines([]); setErrors([]); };
  const toggleSelect = (id: string) => setLines(prev => prev.map(l => l.id === id ? { ...l, selected: !l.selected } : l));
  const selectAllIncome = () => setLines(prev => prev.map(l => ({ ...l, selected: l.amount > 0 })));

  const stats = useMemo(() => {
    const income = lines.filter(l => l.amount > 0);
    const expense = lines.filter(l => l.amount < 0);
    const matched = lines.filter(l => l.matchedUnitId);
    const selected = lines.filter(l => l.selected);
    return {
      total: lines.length,
      incomeSum: income.reduce((s, l) => s + l.amount, 0),
      expenseSum: expense.reduce((s, l) => s + l.amount, 0),
      matchedCount: matched.length,
      selectedCount: selected.length,
    };
  }, [lines]);

  // Upload state
  if (!statement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            CAMT-Import (ISO 20022)
          </CardTitle>
          <CardDescription>
            CAMT.053 oder CAMT.054 XML-Datei hochladen. Buchungen werden automatisch Mietern/Einheiten zugeordnet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errors.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.join('; ')}</AlertDescription>
            </Alert>
          )}
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {isParsing ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="font-medium">CAMT-Datei wird verarbeitet...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <FileText className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-lg">CAMT-XML hierher ziehen</p>
                  <p className="text-muted-foreground mt-1">oder klicken zum Auswählen (.xml)</p>
                </div>
                <input type="file" accept=".xml" className="hidden" id="camt-upload" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                <Button asChild variant="outline">
                  <label htmlFor="camt-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" /> XML-Datei auswählen
                  </label>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Results
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              {stats.total} Buchungen geladen
            </CardTitle>
            <CardDescription>
              {statement.iban && `IBAN: ${statement.iban}`}
              {statement.fromDate && statement.toDate && ` · ${statement.fromDate} – ${statement.toDate}`}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleReset}><X className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border">
            <div className="flex items-center gap-2 text-green-600"><TrendingUp className="h-4 w-4" /><span className="text-sm">Eingänge</span></div>
            <p className="text-lg font-bold text-green-600">{fmt(stats.incomeSum)}</p>
          </div>
          <div className="p-3 rounded-lg border">
            <div className="flex items-center gap-2 text-destructive"><TrendingDown className="h-4 w-4" /><span className="text-sm">Ausgänge</span></div>
            <p className="text-lg font-bold text-destructive">{fmt(stats.expenseSum)}</p>
          </div>
          <div className="p-3 rounded-lg border">
            <div className="flex items-center gap-2 text-primary"><Building className="h-4 w-4" /><span className="text-sm">Zugeordnet</span></div>
            <p className="text-lg font-bold">{stats.matchedCount}/{stats.total}</p>
          </div>
          <div className="p-3 rounded-lg border">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /><span className="text-sm">Ausgewählt</span></div>
            <p className="text-lg font-bold">{stats.selectedCount}</p>
          </div>
        </div>

        {/* Saldo info */}
        {(statement.openingBalance !== 0 || statement.closingBalance !== 0) && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Anfangssaldo: {fmt(statement.openingBalance)}</span>
            <span>Endsaldo: {fmt(statement.closingBalance)}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAllIncome}>
            <TrendingUp className="h-4 w-4 mr-1" /> Alle Eingänge wählen
          </Button>
        </div>

        {/* Transactions table */}
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Datum</TableHead>
                <TableHead>Auftraggeber/Empfänger</TableHead>
                <TableHead>Verwendungszweck</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
                <TableHead>Zuordnung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map(line => (
                <TableRow key={line.id} className={line.selected ? 'bg-primary/5' : ''}>
                  <TableCell>
                    <Checkbox checked={line.selected} onCheckedChange={() => toggleSelect(line.id)} />
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{line.date}</TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate" title={line.counterpartName}>
                    {line.counterpartName || '—'}
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate" title={line.description}>
                    {line.description || line.bookingText || '—'}
                  </TableCell>
                  <TableCell className={`text-right font-medium whitespace-nowrap ${line.amount >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {fmt(line.amount)}
                  </TableCell>
                  <TableCell>
                    {line.matchedUnitId ? (
                      <Badge variant="outline" className="text-xs">{line.matchReason}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleReset}>Abbrechen</Button>
          <Button onClick={handleImport} disabled={isImporting || stats.selectedCount === 0}>
            {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {stats.selectedCount} Buchungen importieren
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
