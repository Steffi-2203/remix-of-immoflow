import { useState } from 'react';
import { useDemoAccountBalances } from '@/hooks/useDemoAccounting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const fmt = (v: number) => v.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export function ProfitLossView() {
  const now = new Date();
  const [startDate, setStartDate] = useState(now.getFullYear() + '-01-01');
  const [endDate, setEndDate] = useState(now.toISOString().slice(0, 10));

  const { data: balances, isLoading } = useDemoAccountBalances(startDate, endDate);

  const incomeAccounts = (balances || []).filter(b => b.account_type === 'income');
  const expenseAccounts = (balances || []).filter(b => b.account_type === 'expense');

  const totalIncome = incomeAccounts.reduce((s, b) => s + b.total_credit - b.total_debit, 0);
  const totalExpenses = expenseAccounts.reduce((s, b) => s + b.total_debit - b.total_credit, 0);
  const netResult = totalIncome - totalExpenses;

  const renderAccountTable = (title: string, accounts: typeof incomeAccounts, isExpense: boolean) => (
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
            {accounts.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Keine Buchungen</TableCell></TableRow>
            ) : accounts.map(b => {
              const val = isExpense ? b.total_debit - b.total_credit : b.total_credit - b.total_debit;
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
          <Label>Von</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[180px]" />
        </div>
        <div>
          <Label>Bis</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[180px]" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <>
          {renderAccountTable('Erträge (Klasse 4)', incomeAccounts, false)}
          <Card className="bg-muted/30">
            <CardContent className="py-3">
              <div className="flex justify-between font-semibold">
                <span>Summe Erträge</span>
                <span className="font-mono">{fmt(totalIncome)}</span>
              </div>
            </CardContent>
          </Card>

          {renderAccountTable('Aufwendungen (Klasse 5–7)', expenseAccounts, true)}
          <Card className="bg-muted/30">
            <CardContent className="py-3">
              <div className="flex justify-between font-semibold">
                <span>Summe Aufwendungen</span>
                <span className="font-mono">{fmt(totalExpenses)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className={netResult >= 0 ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'}>
            <CardContent className="py-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">
                  {netResult >= 0 ? '✅ Gewinn' : '❌ Verlust'}
                </span>
                <span className={`text-xl font-mono font-bold ${netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(Math.abs(netResult))}
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
