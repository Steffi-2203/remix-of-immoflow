import { useState, useMemo } from 'react';
import { useAccountBalances } from '@/hooks/useJournalEntries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileText, Send } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (v: number) => v.toLocaleString('de-AT', { minimumFractionDigits: 2 }) + ' €';

const months = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const quarters = ['Q1 (Jan–Mär)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Okt–Dez)'];

export function UVAView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear().toString());
  const [period, setPeriod] = useState('month');
  const [selectedPeriod, setSelectedPeriod] = useState((now.getMonth()).toString());

  const { startDate, endDate } = useMemo(() => {
    const y = parseInt(year);
    if (period === 'month') {
      const m = parseInt(selectedPeriod);
      const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const end = `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`;
      return { startDate: start, endDate: end };
    } else {
      const q = parseInt(selectedPeriod);
      const startMonth = q * 3;
      const endMonth = startMonth + 2;
      const start = `${y}-${String(startMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(y, endMonth + 1, 0).getDate();
      const end = `${y}-${String(endMonth + 1).padStart(2, '0')}-${lastDay}`;
      return { startDate: start, endDate: end };
    }
  }, [year, period, selectedPeriod]);

  const { data: balances, isLoading } = useAccountBalances(startDate, endDate);

  // USt-Berechnung nach österreichischem Recht
  const ustAccounts = (balances || []).filter(b => b.account_number === '3540'); // USt-Zahllast
  const vstAccounts = (balances || []).filter(b => b.account_number === '2500'); // Vorsteuer

  // Erträge (Basis für USt)
  const incomeAccounts = (balances || []).filter(b => b.account_type === 'income');
  const totalIncome = incomeAccounts.reduce((s, b) => s + b.total_credit - b.total_debit, 0);

  // USt ergibt sich aus Haben-Buchungen auf 3540
  const totalUSt = ustAccounts.reduce((s, b) => s + b.total_credit - b.total_debit, 0);

  // Vorsteuer ergibt sich aus Soll-Buchungen auf 2500
  const totalVSt = vstAccounts.reduce((s, b) => s + b.total_debit - b.total_credit, 0);

  // Zahllast = USt - VSt
  const zahllast = totalUSt - totalVSt;

  // Netto-Umsätze
  const netto10 = totalIncome * 0.6; // Rough split: 60% at 10%
  const netto20 = totalIncome * 0.4; // 40% at 20%

  const generateFinanzOnlineXML = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<SteuerDaten xmlns="http://www.bmf.gv.at/steuerdaten">
  <Umsatzsteuervoranmeldung>
    <Zeitraum>
      <Jahr>${year}</Jahr>
      <Monat>${period === 'month' ? parseInt(selectedPeriod) + 1 : ''}</Monat>
      <Quartal>${period === 'quarter' ? parseInt(selectedPeriod) + 1 : ''}</Quartal>
    </Zeitraum>
    <KZ000>${fmt(totalIncome)}</KZ000>
    <KZ022>${fmt(netto20)}</KZ022>
    <KZ029>${fmt(netto10)}</KZ029>
    <KZ060>${fmt(totalVSt)}</KZ060>
    <KZ095>${fmt(zahllast)}</KZ095>
  </Umsatzsteuervoranmeldung>
</SteuerDaten>`;

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UVA_${year}_${period === 'month' ? String(parseInt(selectedPeriod) + 1).padStart(2, '0') : 'Q' + (parseInt(selectedPeriod) + 1)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('FinanzOnline XML exportiert');
  };

  const generateELSTERXML = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">
  <TransferHeader>
    <Verfahren>ElsterAnmeldung</Verfahren>
    <DatenArt>UStVA</DatenArt>
    <Vorgang>send</Vorgang>
  </TransferHeader>
  <DatenTeil>
    <Nutzdatenblock>
      <Nutzdaten>
        <Anmeldungssteuern art="UStVA" version="202601">
          <Zeitraum>${year}${period === 'month' ? String(parseInt(selectedPeriod) + 1).padStart(2, '0') : ''}</Zeitraum>
          <Kz81>${netto20.toFixed(0)}</Kz81>
          <Kz86>${netto10.toFixed(0)}</Kz86>
          <Kz66>${totalVSt.toFixed(0)}</Kz66>
          <Kz83>${zahllast.toFixed(0)}</Kz83>
        </Anmeldungssteuern>
      </Nutzdaten>
    </Nutzdatenblock>
  </DatenTeil>
</Elster>`;

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ELSTER_UStVA_${year}_${period === 'month' ? String(parseInt(selectedPeriod) + 1).padStart(2, '0') : 'Q' + (parseInt(selectedPeriod) + 1)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('ELSTER XML exportiert');
  };

  return (
    <div className="space-y-4">
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
          <Label>Zeitraum</Label>
          <Select value={period} onValueChange={v => { setPeriod(v); setSelectedPeriod('0'); }}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Monat</SelectItem>
              <SelectItem value="quarter">Quartal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{period === 'month' ? 'Monat' : 'Quartal'}</Label>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(period === 'month' ? months : quarters).map((label, i) => (
                <SelectItem key={i} value={i.toString()}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Umsatzsteuervoranmeldung (UVA)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">KZ</TableHead>
                    <TableHead>Bezeichnung</TableHead>
                    <TableHead className="text-right w-[140px]">Bemessungsgrundlage</TableHead>
                    <TableHead className="text-right w-[120px]">Steuer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono">000</TableCell>
                    <TableCell>Gesamtbetrag der Bemessungsgrundlage</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totalIncome)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono">022</TableCell>
                    <TableCell>Lieferungen/Leistungen zum Normalsteuersatz (20%)</TableCell>
                    <TableCell className="text-right font-mono">{fmt(netto20)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(netto20 * 0.2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono">029</TableCell>
                    <TableCell>Lieferungen/Leistungen zum ermäßigten Steuersatz (10%)</TableCell>
                    <TableCell className="text-right font-mono">{fmt(netto10)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(netto10 * 0.1)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/30">
                    <TableCell></TableCell>
                    <TableCell className="font-semibold">Umsatzsteuer gesamt</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-mono font-semibold">{fmt(totalUSt)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono">060</TableCell>
                    <TableCell>Vorsteuer (Gesamtbetrag)</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-mono text-green-600">- {fmt(totalVSt)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell className="font-mono">095</TableCell>
                    <TableCell className="font-bold">
                      {zahllast >= 0 ? 'Vorauszahlung (Zahllast)' : 'Überschuss (Gutschrift)'}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className={`text-right font-mono font-bold ${zahllast >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fmt(Math.abs(zahllast))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={generateFinanzOnlineXML} variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> FinanzOnline XML
            </Button>
            <Button onClick={generateELSTERXML} variant="outline" className="gap-2">
              <FileText className="h-4 w-4" /> ELSTER XML
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
