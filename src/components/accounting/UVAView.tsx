import { useState, useMemo } from 'react';
import { useDemoAccountBalances } from '@/hooks/useDemoAccounting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Download, Info } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (v: number) => v.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const fmtRaw = (v: number) => v.toFixed(2);

const months = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const quarters = ['Q1 (Jän–Mär)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Okt–Dez)'];

/**
 * UVA – Umsatzsteuervoranmeldung nach österreichischem Recht (Formular U30)
 * 
 * Logik für Hausverwaltung:
 * - Wohnungsmiete + BK → 10% USt (KZ 029)
 * - Geschäftsmiete + HK + Garagen → 20% USt (KZ 022)
 * - Vorsteuer aus Eingangsrechnungen (KZ 060)
 * - Zahllast/Gutschrift (KZ 095)
 * 
 * Die USt-Beträge werden NICHT geschätzt, sondern aus den tatsächlichen
 * Buchungen auf Konto 3540 (USt-Zahllast) und 2500 (Vorsteuer) ermittelt.
 * 
 * Die Netto-Bemessungsgrundlage wird aus den Erlöskonten berechnet:
 * - Konto 4000 (Mieterlöse) + 4100 (BK-Erlöse) → 10% Satz
 * - Konto 4200 (HK-Erlöse) + 4300 (Sonstige) + 4400 (BK-Nachzahlungen) → 20% Satz
 */
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

  const { data: balances, isLoading } = useDemoAccountBalances(startDate, endDate);

  // Konten nach österreichischem HV-Kontenplan zuordnen
  const getAccountBalance = (accountNumber: string) => {
    const acc = (balances || []).find(b => b.account_number === accountNumber);
    if (!acc) return 0;
    // Erlöskonten (Klasse 4): Credit-Saldo
    if (acc.account_type === 'income') return acc.total_credit - acc.total_debit;
    // Aufwands-/Aktivkonten: Debit-Saldo
    return acc.total_debit - acc.total_credit;
  };

  // 10% USt: Wohnungsmiete (4000) + Betriebskosten (4100)
  const netto10 = getAccountBalance('4000') + getAccountBalance('4100');
  const ust10 = netto10 * 0.10;

  // 20% USt: Heizkosten (4200) + Sonstige (4300) + BK-Nachzahlungen (4400)
  const netto20 = getAccountBalance('4200') + getAccountBalance('4300') + getAccountBalance('4400');
  const ust20 = netto20 * 0.20;

  // USt gesamt aus Buchungen (Konto 3540)
  const ustFromBooks = getAccountBalance('3540') * -1; // Passivkonto, Credit-Saldo
  const ustAccounts = (balances || []).filter(b => b.account_number === '3540');
  const totalUStBooked = ustAccounts.reduce((s, b) => s + b.total_credit - b.total_debit, 0);

  // Berechnet vs. gebucht (zur Kontrolle)
  const ustCalculated = ust10 + ust20;

  // Vorsteuer (Konto 2500)
  const totalVSt = getAccountBalance('2500');

  // Zahllast = USt - VSt
  const zahllast = totalUStBooked - totalVSt;

  // Gesamtumsatz netto
  const totalNettoUmsatz = netto10 + netto20;

  const periodLabel = period === 'month'
    ? months[parseInt(selectedPeriod)] + ' ' + year
    : quarters[parseInt(selectedPeriod)] + ' ' + year;

  const generateFinanzOnlineXML = () => {
    // FinanzOnline U30 XML-Format (vereinfacht)
    const monat = period === 'month' ? parseInt(selectedPeriod) + 1 : null;
    const quartal = period === 'quarter' ? parseInt(selectedPeriod) + 1 : null;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- FinanzOnline Umsatzsteuervoranmeldung U30 -->
<!-- Erstellt von ImmoflowMe - ${new Date().toLocaleDateString('de-AT')} -->
<!-- Zeitraum: ${periodLabel} -->
<SteuerDaten xmlns="http://www.bmf.gv.at/steuerdaten">
  <Umsatzsteuervoranmeldung>
    <Allgemein>
      <Zeitraum>
        <Jahr>${year}</Jahr>
        ${monat ? `<Monat>${String(monat).padStart(2, '0')}</Monat>` : ''}
        ${quartal ? `<Quartal>${quartal}</Quartal>` : ''}
      </Zeitraum>
    </Allgemein>

    <!-- Lieferungen und sonstige Leistungen -->
    <!-- KZ 000: Gesamtbetrag der Bemessungsgrundlagen -->
    <KZ000>${fmtRaw(totalNettoUmsatz)}</KZ000>

    <!-- KZ 022: Normalsteuersatz 20% (Geschäft, HK, Garage) -->
    <KZ022>${fmtRaw(netto20)}</KZ022>

    <!-- KZ 029: Ermäßigter Steuersatz 10% (Wohnungsmiete, BK) -->
    <KZ029>${fmtRaw(netto10)}</KZ029>

    <!-- Vorsteuer -->
    <!-- KZ 060: Gesamtbetrag der Vorsteuer -->
    <KZ060>${fmtRaw(totalVSt)}</KZ060>

    <!-- Zahllast -->
    <!-- KZ 095: ${zahllast >= 0 ? 'Vorauszahlung' : 'Gutschrift'} -->
    <KZ095>${fmtRaw(Math.abs(zahllast))}</KZ095>
  </Umsatzsteuervoranmeldung>
</SteuerDaten>`;

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const periodCode = period === 'month'
      ? String(parseInt(selectedPeriod) + 1).padStart(2, '0')
      : 'Q' + (parseInt(selectedPeriod) + 1);
    a.download = `UVA_U30_${year}_${periodCode}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('FinanzOnline U30 XML exportiert');
  };

  const generateCSVExport = () => {
    const rows = [
      ['Kennzahl', 'Bezeichnung', 'Bemessungsgrundlage', 'Steuer'],
      ['000', 'Gesamtbetrag Bemessungsgrundlagen', fmtRaw(totalNettoUmsatz), ''],
      ['029', 'Ermäßigter Steuersatz 10% (Wohnung/BK)', fmtRaw(netto10), fmtRaw(ust10)],
      ['022', 'Normalsteuersatz 20% (Geschäft/HK)', fmtRaw(netto20), fmtRaw(ust20)],
      ['', 'USt gesamt (gebucht)', '', fmtRaw(totalUStBooked)],
      ['060', 'Vorsteuer gesamt', '', fmtRaw(totalVSt)],
      ['095', zahllast >= 0 ? 'Vorauszahlung (Zahllast)' : 'Gutschrift', '', fmtRaw(Math.abs(zahllast))],
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const periodCode = period === 'month'
      ? String(parseInt(selectedPeriod) + 1).padStart(2, '0')
      : 'Q' + (parseInt(selectedPeriod) + 1);
    a.download = `UVA_${year}_${periodCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('UVA als CSV exportiert');
  };

  return (
    <div className="space-y-4">
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-3 flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Die UVA basiert auf dem <strong>österreichischen Formular U30</strong> (FinanzOnline).
            Wohnungsmieten und BK werden mit 10% USt, Geschäftsräume/Garagen/HK mit 20% USt berechnet.
            Die Werte stammen aus den tatsächlichen Buchungen im Journal.
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
        <Badge variant="outline" className="mb-1">{periodLabel}</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Umsatzsteuervoranmeldung U30 – {periodLabel}
              </CardTitle>
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
                    <TableCell className="font-mono text-xs">000</TableCell>
                    <TableCell>Gesamtbetrag der Bemessungsgrundlagen</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totalNettoUmsatz)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">029</TableCell>
                    <TableCell>
                      <div>Ermäßigter Steuersatz (10%)</div>
                      <div className="text-xs text-muted-foreground">Wohnungsmiete (4000) + Betriebskosten (4100)</div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{fmt(netto10)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(ust10)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">022</TableCell>
                    <TableCell>
                      <div>Normalsteuersatz (20%)</div>
                      <div className="text-xs text-muted-foreground">Heizkosten (4200) + Sonstige (4300/4400)</div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{fmt(netto20)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(ust20)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/30">
                    <TableCell></TableCell>
                    <TableCell className="font-semibold">Umsatzsteuer gesamt (gebucht)</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-mono font-semibold">{fmt(totalUStBooked)}</TableCell>
                  </TableRow>

                  {Math.abs(ustCalculated - totalUStBooked) > 0.01 && (
                    <TableRow className="bg-amber-50 dark:bg-amber-950/20">
                      <TableCell></TableCell>
                      <TableCell className="text-xs text-amber-700 dark:text-amber-400">
                        ℹ Differenz berechnet vs. gebucht: {fmt(ustCalculated - totalUStBooked)}
                        {' '}(kann durch gemischte Nutzung entstehen)
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-700 dark:text-amber-400">
                        berechnet: {fmt(ustCalculated)}
                      </TableCell>
                    </TableRow>
                  )}

                  <TableRow>
                    <TableCell className="font-mono text-xs">060</TableCell>
                    <TableCell>
                      <div>Vorsteuer (Gesamtbetrag)</div>
                      <div className="text-xs text-muted-foreground">Konto 2500 – aus Eingangsrechnungen</div>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">- {fmt(totalVSt)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-mono text-xs font-bold">095</TableCell>
                    <TableCell className="font-bold">
                      {zahllast >= 0 ? 'Vorauszahlung (Zahllast)' : 'Gutschrift (Überschuss)'}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className={`text-right font-mono font-bold ${zahllast >= 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                      {fmt(Math.abs(zahllast))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex gap-3 flex-wrap">
            <Button onClick={generateFinanzOnlineXML} className="gap-2">
              <Download className="h-4 w-4" /> FinanzOnline XML (U30)
            </Button>
            <Button onClick={generateCSVExport} variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> CSV für Steuerberater
            </Button>
          </div>

          <Card className="bg-muted/30 border-dashed">
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">
                <strong>Hinweis:</strong> Die XML-Datei kann direkt in FinanzOnline hochgeladen werden
                (Eingaben → Umsatzsteuer → Umsatzsteuervoranmeldung U30).
                Bitte prüfen Sie die Werte vor der Übermittlung mit Ihrem Steuerberater.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
