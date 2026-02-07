import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Download, Info, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { useDemoAccountBalances } from '@/hooks/useDemoAccounting';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { generateBmdCsv, generateDatevCsv, downloadCsv, type JournalEntryExport } from '@/utils/bmdExport';

const months = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export function BmdExportView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('all');

  const startDate = useMemo(() => {
    const y = parseInt(year);
    if (selectedMonth === 'all') return `${y}-01-01`;
    const m = parseInt(selectedMonth);
    return `${y}-${String(m + 1).padStart(2, '0')}-01`;
  }, [year, selectedMonth]);

  const endDate = useMemo(() => {
    const y = parseInt(year);
    if (selectedMonth === 'all') return `${y}-12-31`;
    const m = parseInt(selectedMonth);
    const lastDay = new Date(y, m + 1, 0).getDate();
    return `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`;
  }, [year, selectedMonth]);

  const { data: journalEntries = [], isLoading } = useJournalEntries({ startDate, endDate });

  // Transform journal entries to export format
  const exportEntries = useMemo<JournalEntryExport[]>(() => {
    const out: JournalEntryExport[] = [];
    for (const entry of journalEntries as any[]) {
      const lines = entry.journal_entry_lines || [];
      for (const line of lines) {
        out.push({
          booking_number: entry.booking_number,
          entry_date: entry.entry_date,
          description: entry.description,
          account_number: line.chart_of_accounts?.account_number || '',
          account_name: line.chart_of_accounts?.name || '',
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          beleg_nummer: entry.beleg_nummer,
          property_name: entry.properties?.name || '',
          tenant_name: entry.tenants ? `${entry.tenants.first_name} ${entry.tenants.last_name}` : '',
        });
      }
    }
    return out;
  }, [journalEntries]);

  const totalDebit = exportEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = exportEntries.reduce((s, e) => s + e.credit, 0);

  const periodLabel = selectedMonth === 'all'
    ? `Gesamtjahr ${year}`
    : `${months[parseInt(selectedMonth)]} ${year}`;

  const handleBmdExport = () => {
    if (exportEntries.length === 0) {
      toast.error('Keine Buchungen im gewählten Zeitraum');
      return;
    }
    const csv = generateBmdCsv(exportEntries);
    const periodCode = selectedMonth === 'all' ? 'gesamt' : String(parseInt(selectedMonth) + 1).padStart(2, '0');
    downloadCsv(csv, `BMD_Export_${year}_${periodCode}.csv`);
    toast.success(`BMD-Export: ${exportEntries.length} Buchungszeilen exportiert`);
  };

  const handleDatevExport = () => {
    if (exportEntries.length === 0) {
      toast.error('Keine Buchungen im gewählten Zeitraum');
      return;
    }
    const csv = generateDatevCsv(exportEntries);
    const periodCode = selectedMonth === 'all' ? 'gesamt' : String(parseInt(selectedMonth) + 1).padStart(2, '0');
    downloadCsv(csv, `DATEV_Export_${year}_${periodCode}.csv`);
    toast.success(`DATEV-Export: ${exportEntries.length} Buchungszeilen exportiert`);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-3 flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Exportieren Sie Ihre Buchungen im <strong>BMD NTCS</strong>-Format oder im 
            <strong> DATEV-Buchungsstapel</strong>-Format für Ihren Steuerberater.
            Die Daten stammen direkt aus dem Journal der doppelten Buchführung.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label>Jahr</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Monat</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Monate</SelectItem>
              {months.map((label, i) => (
                <SelectItem key={i} value={i.toString()}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline" className="mb-1">{periodLabel}</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{journalEntries.length}</p>
                <p className="text-sm text-muted-foreground">Buchungssätze</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{exportEntries.length}</p>
                <p className="text-sm text-muted-foreground">Buchungszeilen</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">
                  € {totalDebit.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">Gesamtvolumen (Soll)</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button onClick={handleBmdExport} className="gap-2" disabled={exportEntries.length === 0}>
              <Download className="h-4 w-4" /> BMD NTCS Export
            </Button>
            <Button onClick={handleDatevExport} variant="outline" className="gap-2" disabled={exportEntries.length === 0}>
              <FileSpreadsheet className="h-4 w-4" /> DATEV Buchungsstapel
            </Button>
          </div>

          <Card className="bg-muted/30 border-dashed">
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">
                <strong>BMD NTCS:</strong> Import über Stamm → Finanzbuchhaltung → Import → CSV-Buchungsimport.
                <br />
                <strong>DATEV:</strong> Import über Buchungsstapel → Datenimport → ASCII-Import.
                <br />
                Bitte stimmen Sie die Kontennummern mit Ihrem Steuerberater ab.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
