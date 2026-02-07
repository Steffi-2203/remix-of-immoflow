import { useState } from 'react';
import { useDemoAccountBalances } from '@/hooks/useDemoAccounting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const typeLabels: Record<string, string> = {
  asset: 'Aktiva',
  liability: 'Passiva',
  equity: 'Eigenkapital',
  income: 'Ertrag',
  expense: 'Aufwand',
};

const fmt = (n: number) => n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export function TrialBalanceView() {
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  const { data: balances, isLoading } = useDemoAccountBalances(startDate, endDate);

  const totalDebit = (balances || []).reduce((s, b) => s + b.total_debit, 0);
  const totalCredit = (balances || []).reduce((s, b) => s + b.total_credit, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div className="space-y-1">
          <Label>Von</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[180px]" />
        </div>
        <div className="space-y-1">
          <Label>Bis</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[180px]" />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Saldenliste</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !balances?.length ? (
            <p className="text-muted-foreground text-center py-8">
              Noch keine Buchungen im gewählten Zeitraum vorhanden.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Konto</TableHead>
                  <TableHead>Bezeichnung</TableHead>
                  <TableHead className="w-[80px]">Typ</TableHead>
                  <TableHead className="text-right w-[120px]">Soll</TableHead>
                  <TableHead className="text-right w-[120px]">Haben</TableHead>
                  <TableHead className="text-right w-[120px]">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((b) => (
                  <TableRow key={b.account_id}>
                    <TableCell className="font-mono font-bold">{b.account_number}</TableCell>
                    <TableCell>{b.account_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {typeLabels[b.account_type] || b.account_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{fmt(b.total_debit)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(b.total_credit)}</TableCell>
                    <TableCell className={`text-right font-mono font-bold ${b.balance < 0 ? 'text-destructive' : ''}`}>
                      {fmt(b.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-bold">Summe</TableCell>
                  <TableCell className="text-right font-mono font-bold">{fmt(totalDebit)}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{fmt(totalCredit)}</TableCell>
                  <TableCell className={`text-right font-mono font-bold ${(totalDebit - totalCredit) !== 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {fmt(totalDebit - totalCredit)}
                    {totalDebit === totalCredit && ' ✓'}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
