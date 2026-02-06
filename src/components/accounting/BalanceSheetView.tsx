import { useState } from 'react';
import { useAccountBalances } from '@/hooks/useJournalEntries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const fmt = (v: number) => v.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export function BalanceSheetView() {
  const now = new Date();
  const [stichtag, setStichtag] = useState(now.toISOString().slice(0, 10));
  const yearStart = stichtag.slice(0, 4) + '-01-01';

  const { data: balances, isLoading } = useAccountBalances(yearStart, stichtag);

  const assets = (balances || []).filter(b => b.account_type === 'asset');
  const liabilities = (balances || []).filter(b => b.account_type === 'liability');
  const equity = (balances || []).filter(b => b.account_type === 'equity');

  // GuV-Ergebnis (Gewinn/Verlust) for balance sheet
  const income = (balances || []).filter(b => b.account_type === 'income');
  const expenses = (balances || []).filter(b => b.account_type === 'expense');
  const totalIncome = income.reduce((s, b) => s + b.total_credit - b.total_debit, 0);
  const totalExpenses = expenses.reduce((s, b) => s + b.total_debit - b.total_credit, 0);
  const netResult = totalIncome - totalExpenses;

  const totalAssets = assets.reduce((s, b) => s + b.total_debit - b.total_credit, 0);
  const totalLiabilities = liabilities.reduce((s, b) => s + b.total_credit - b.total_debit, 0);
  const totalEquity = equity.reduce((s, b) => s + b.total_credit - b.total_debit, 0);
  const totalPassiva = totalLiabilities + totalEquity + netResult;

  const renderSection = (title: string, items: typeof assets, isDebit: boolean) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Konto</TableHead>
              <TableHead>Bezeichnung</TableHead>
              <TableHead className="text-right w-[120px]">Betrag</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Keine Daten</TableCell></TableRow>
            ) : items.map(b => {
              const val = isDebit ? b.total_debit - b.total_credit : b.total_credit - b.total_debit;
              if (Math.abs(val) < 0.01) return null;
              return (
                <TableRow key={b.account_id}>
                  <TableCell className="font-mono text-xs">{b.account_number}</TableCell>
                  <TableCell className="text-sm">{b.account_name}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(val)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div>
          <Label>Stichtag</Label>
          <Input type="date" value={stichtag} onChange={e => setStichtag(e.target.value)} className="w-[180px]" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">AKTIVA</h3>
              {renderSection('Anlagevermögen & Umlaufvermögen', assets, true)}
              <Card className="bg-muted/30">
                <CardContent className="py-3">
                  <div className="flex justify-between font-bold">
                    <span>Summe Aktiva</span>
                    <span className="font-mono">{fmt(totalAssets)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">PASSIVA</h3>
              {renderSection('Eigenkapital', equity, false)}
              {renderSection('Verbindlichkeiten', liabilities, false)}
              <Card>
                <CardContent className="py-3">
                  <div className="flex justify-between text-sm">
                    <span>Jahresergebnis (GuV)</span>
                    <span className={`font-mono ${netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmt(netResult)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="py-3">
                  <div className="flex justify-between font-bold">
                    <span>Summe Passiva</span>
                    <span className="font-mono">{fmt(totalPassiva)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {Math.abs(totalAssets - totalPassiva) > 0.01 && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="py-3">
                <p className="text-sm text-destructive font-medium">
                  ⚠ Bilanz ist nicht ausgeglichen! Differenz: {fmt(totalAssets - totalPassiva)}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
