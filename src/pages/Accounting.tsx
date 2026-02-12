import { useState, useMemo } from 'react';
import { MonthlyRevenueChart, CategoryPieChart } from '@/components/charts/FinanceChart';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  FileDown,
} from 'lucide-react';
import { useAccountCategories, AccountCategory } from '@/hooks/useAccountCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

function formatEur(value: number): string {
  return value.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' });
}

export default function Accounting() {
  const { toast } = useToast();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const { data: categories, isLoading: catLoading } = useAccountCategories();
  const { data: transactions, isLoading: txLoading } = useTransactions();
  const { data: bankAccounts, isLoading: bankLoading } = useBankAccounts();

  const isLoading = catLoading || txLoading || bankLoading;

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(t => {
      const d = new Date(t.transactionDate || t.transaction_date || '');
      if (d.getFullYear() !== selectedYear) return false;
      if (selectedMonth !== 'all' && d.getMonth() + 1 !== Number(selectedMonth)) return false;
      return true;
    });
  }, [transactions, selectedYear, selectedMonth]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, AccountCategory>();
    categories?.forEach(c => map.set(c.id, c));
    return map;
  }, [categories]);

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    const incomeByCategory = new Map<string, { name: string; total: number; count: number }>();
    const expenseByCategory = new Map<string, { name: string; total: number; count: number }>();

    for (const t of filteredTransactions) {
      const amount = Number(t.amount);
      const catId = t.categoryId || t.category_id || 'uncategorized';
      const catName = categoryMap.get(catId)?.name || 'Nicht kategorisiert';

      if (amount >= 0) {
        totalIncome += amount;
        const existing = incomeByCategory.get(catId);
        if (existing) {
          existing.total += amount;
          existing.count++;
        } else {
          incomeByCategory.set(catId, { name: catName, total: amount, count: 1 });
        }
      } else {
        totalExpenses += Math.abs(amount);
        const existing = expenseByCategory.get(catId);
        if (existing) {
          existing.total += Math.abs(amount);
          existing.count++;
        } else {
          expenseByCategory.set(catId, { name: catName, total: Math.abs(amount), count: 1 });
        }
      }
    }

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      transactionCount: filteredTransactions.length,
      incomeCategories: Array.from(incomeByCategory.values()).sort((a, b) => b.total - a.total),
      expenseCategories: Array.from(expenseByCategory.values()).sort((a, b) => b.total - a.total),
    };
  }, [filteredTransactions, categoryMap]);

  const totalBankBalance = useMemo(() => {
    if (!bankAccounts) return 0;
    return bankAccounts.reduce((sum: number, ba: any) => sum + Number(ba.balance || ba.current_balance || 0), 0);
  }, [bankAccounts]);

  const monthNames = ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  const monthlyData = useMemo(() => {
    const monthMap = new Map<number, { income: number; expenses: number }>();
    for (let m = 0; m < 12; m++) monthMap.set(m, { income: 0, expenses: 0 });
    for (const t of filteredTransactions) {
      const d = new Date(t.transactionDate || t.transaction_date || '');
      const m = d.getMonth();
      const entry = monthMap.get(m);
      if (!entry) continue;
      const amount = Number(t.amount);
      if (amount >= 0) entry.income += amount;
      else entry.expenses += Math.abs(amount);
    }
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([m, v]) => ({ month: monthNames[m], income: v.income, expenses: v.expenses }));
  }, [filteredTransactions]);

  const expensePieData = useMemo(() => {
    return summary.expenseCategories.map(c => ({ name: c.name, value: c.total }));
  }, [summary.expenseCategories]);

  const recentTransactions = useMemo(() => {
    return filteredTransactions
      .sort((a, b) => new Date(b.transactionDate || b.transaction_date || '').getTime() - new Date(a.transactionDate || a.transaction_date || '').getTime())
      .slice(0, 20);
  }, [filteredTransactions]);

  const handleExport = async (type: 'datev' | 'bmd') => {
    try {
      const url = `/api/export/${type}?year=${selectedYear}${selectedMonth !== 'all' ? `&month=${selectedMonth}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Export fehlgeschlagen');
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${type}-export-${selectedYear}${selectedMonth !== 'all' ? `-${selectedMonth}` : ''}.csv`;
      a.click();
      toast({ title: 'Export erfolgreich', description: `${type.toUpperCase()}-Export wurde heruntergeladen.` });
    } catch {
      toast({ title: 'Export fehlgeschlagen', variant: 'destructive' });
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const months = [
    { value: '1', label: 'Jänner' },
    { value: '2', label: 'Februar' },
    { value: '3', label: 'März' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mai' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Dezember' },
  ];

  return (
    <MainLayout title="Finanzbuchhaltung" subtitle="Buchhaltungsübersicht und Kontenverwaltung">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-accounting-title">Finanzbuchhaltung</h1>
            <p className="text-muted-foreground" data-testid="text-accounting-subtitle">Einnahmen, Ausgaben und Kontenübersicht</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]" data-testid="select-accounting-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()} data-testid={`select-year-${y}`}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]" data-testid="select-accounting-month">
                <SelectValue placeholder="Alle Monate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-month-all">Alle Monate</SelectItem>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value} data-testid={`select-month-${m.value}`}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => handleExport('datev')} data-testid="button-export-datev">
              <FileDown className="h-4 w-4 mr-2" />
              DATEV
            </Button>
            <Button variant="outline" onClick={() => handleExport('bmd')} data-testid="button-export-bmd">
              <FileDown className="h-4 w-4 mr-2" />
              BMD
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-testid="accounting-loading">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card data-testid="card-income">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Einnahmen</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-income">{formatEur(summary.totalIncome)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="card-expenses">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-red-100 dark:bg-red-900/30">
                      <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ausgaben</p>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400" data-testid="text-total-expenses">{formatEur(summary.totalExpenses)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="card-balance">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Calculator className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo</p>
                      <p className={`text-xl font-bold ${summary.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} data-testid="text-balance">
                        {formatEur(summary.balance)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="card-bank-accounts">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                      <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bankkonten</p>
                      <p className="text-xl font-bold" data-testid="text-bank-balance">{formatEur(totalBankBalance)}</p>
                      <p className="text-xs text-muted-foreground" data-testid="text-bank-count">{bankAccounts?.length || 0} Konten</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Monatsverlauf</CardTitle></CardHeader>
                <CardContent><MonthlyRevenueChart data={monthlyData} /></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Ausgabenverteilung</CardTitle></CardHeader>
                <CardContent><CategoryPieChart data={expensePieData} type="expense" /></CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card data-testid="card-income-categories">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                    Einnahmen nach Kategorie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.incomeCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-income">Keine Einnahmen im Zeitraum</p>
                  ) : (
                    <div className="space-y-3">
                      {summary.incomeCategories.map((cat, i) => (
                        <div key={i} className="flex justify-between items-center gap-2" data-testid={`row-income-category-${i}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" data-testid={`text-income-cat-name-${i}`}>{cat.name}</span>
                            <Badge variant="secondary" className="text-xs">{cat.count}</Badge>
                          </div>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400" data-testid={`text-income-cat-total-${i}`}>{formatEur(cat.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card data-testid="card-expense-categories">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                    Ausgaben nach Kategorie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.expenseCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-expenses">Keine Ausgaben im Zeitraum</p>
                  ) : (
                    <div className="space-y-3">
                      {summary.expenseCategories.map((cat, i) => (
                        <div key={i} className="flex justify-between items-center gap-2" data-testid={`row-expense-category-${i}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" data-testid={`text-expense-cat-name-${i}`}>{cat.name}</span>
                            <Badge variant="secondary" className="text-xs">{cat.count}</Badge>
                          </div>
                          <span className="text-sm font-medium text-red-600 dark:text-red-400" data-testid={`text-expense-cat-total-${i}`}>{formatEur(cat.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card data-testid="card-recent-transactions">
              <CardHeader>
                <CardTitle className="text-base" data-testid="text-transactions-heading">Letzte Buchungen ({summary.transactionCount} gesamt)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12" data-testid="text-no-transactions">
                    <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Keine Buchungen im gewählten Zeitraum</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Buchungstext</TableHead>
                        <TableHead>Kategorie</TableHead>
                        <TableHead className="text-right">Betrag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTransactions.map((t) => {
                        const amount = Number(t.amount);
                        const catId = t.categoryId || t.category_id;
                        const cat = catId ? categoryMap.get(catId) : null;
                        const dateStr = t.transactionDate || t.transaction_date || '';
                        return (
                          <TableRow key={t.id} data-testid={`row-transaction-${t.id}`}>
                            <TableCell className="text-sm" data-testid={`text-tx-date-${t.id}`}>
                              {dateStr ? format(new Date(dateStr), 'dd.MM.yyyy', { locale: de }) : '-'}
                            </TableCell>
                            <TableCell className="text-sm max-w-[300px] truncate" data-testid={`text-tx-description-${t.id}`}>
                              {t.bookingText || t.partnerName || t.description || '-'}
                            </TableCell>
                            <TableCell data-testid={`text-tx-category-${t.id}`}>
                              {cat ? (
                                <Badge variant="outline" className="text-xs">{cat.name}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} data-testid={`text-tx-amount-${t.id}`}>
                              {formatEur(amount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
