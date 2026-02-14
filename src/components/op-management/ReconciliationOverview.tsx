import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, TrendingDown, Banknote } from 'lucide-react';

const fmt = (v: number) => v.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export function ReconciliationOverview() {
  const { data: invoices, isLoading: invLoading } = useQuery({
    queryKey: ['open_invoices_summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_invoices')
        .select('id, tenant_id, gesamtbetrag, paid_amount, status, faellig_am, month, year, tenants!inner(first_name, last_name)')
        .in('status', ['offen', 'teilbezahlt', 'ueberfaellig'])
        .order('faellig_am', { ascending: true })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: recentPayments, isLoading: payLoading } = useQuery({
    queryKey: ['recent_payments_7d'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await supabase
        .from('payments')
        .select('id, betrag, eingangs_datum, zahlungsart, tenant_id, tenants!inner(first_name, last_name)')
        .gte('eingangs_datum', sevenDaysAgo.toISOString().slice(0, 10))
        .order('eingangs_datum', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: unmatchedTxns, isLoading: txnLoading } = useQuery({
    queryKey: ['unmatched_transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, transaction_date, counterpart_name, description')
        .is('tenant_id', null)
        .is('category_id', null)
        .gt('amount', 0)
        .order('transaction_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = invLoading || payLoading || txnLoading;

  const stats = useMemo(() => {
    if (!invoices) return null;
    const now = new Date();
    const totalOpen = invoices.reduce((s, inv) => s + Number(inv.gesamtbetrag) - Number(inv.paid_amount || 0), 0);
    const overdue = invoices.filter(inv => new Date(inv.faellig_am) < now);
    const overdueAmount = overdue.reduce((s, inv) => s + Number(inv.gesamtbetrag) - Number(inv.paid_amount || 0), 0);
    
    // Aging buckets
    const aging = { current: 0, days30: 0, days60: 0, days90plus: 0 };
    invoices.forEach(inv => {
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.faellig_am).getTime()) / (1000 * 60 * 60 * 24));
      const remainder = Number(inv.gesamtbetrag) - Number(inv.paid_amount || 0);
      if (daysOverdue <= 0) aging.current += remainder;
      else if (daysOverdue <= 30) aging.days30 += remainder;
      else if (daysOverdue <= 60) aging.days60 += remainder;
      else aging.days90plus += remainder;
    });

    const recentPayTotal = (recentPayments || []).reduce((s, p) => s + Number(p.betrag), 0);
    const unmatchedTotal = (unmatchedTxns || []).reduce((s, t) => s + Number(t.amount), 0);

    return { totalOpen, overdueAmount, overdueCount: overdue.length, aging, recentPayTotal, recentPayCount: (recentPayments || []).length, unmatchedTotal, unmatchedCount: (unmatchedTxns || []).length };
  }, [invoices, recentPayments, unmatchedTxns]);

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
    </div>;
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Offene Forderungen</p>
                <p className="text-2xl font-bold font-mono">{fmt(stats.totalOpen)}</p>
                <p className="text-xs text-muted-foreground mt-1">{invoices?.length} Rechnungen</p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={stats.overdueCount > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Überfällig</p>
                <p className="text-2xl font-bold font-mono text-destructive">{fmt(stats.overdueAmount)}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.overdueCount} Rechnungen</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Zahlungen (7 Tage)</p>
                <p className="text-2xl font-bold font-mono text-green-600">{fmt(stats.recentPayTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.recentPayCount} Eingänge</p>
              </div>
              <TrendingDown className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={stats.unmatchedCount > 0 ? 'border-amber-300' : ''}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Unzugeordnet (Bank)</p>
                <p className="text-2xl font-bold font-mono">{fmt(stats.unmatchedTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.unmatchedCount} Buchungen</p>
              </div>
              <Banknote className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5" /> Altersstruktur offener Posten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Nicht fällig', value: stats.aging.current, color: 'bg-green-500' },
              { label: '1–30 Tage', value: stats.aging.days30, color: 'bg-amber-400' },
              { label: '31–60 Tage', value: stats.aging.days60, color: 'bg-orange-500' },
              { label: '60+ Tage', value: stats.aging.days90plus, color: 'bg-destructive' },
            ].map(bucket => {
              const pct = stats.totalOpen > 0 ? (bucket.value / stats.totalOpen) * 100 : 0;
              return (
                <div key={bucket.label} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{bucket.label}</span>
                    <span className="font-mono">{fmt(bucket.value)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${bucket.color} transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">{pct.toFixed(0)}%</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Letzte Zahlungseingänge</CardTitle>
          </CardHeader>
          <CardContent>
            {(recentPayments || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Keine Zahlungen in den letzten 7 Tagen</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {(recentPayments || []).slice(0, 10).map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center p-2 rounded border bg-card">
                    <div>
                      <p className="text-sm font-medium">{p.tenants?.first_name} {p.tenants?.last_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(p.eingangs_datum).toLocaleDateString('de-AT')} · {p.zahlungsart}</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-green-600">{fmt(Number(p.betrag))}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unmatched Bank Transactions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Unzugeordnete Bankbewegungen</CardTitle>
          </CardHeader>
          <CardContent>
            {(unmatchedTxns || []).length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-green-600 justify-center py-4">
                <CheckCircle2 className="h-4 w-4" /> Alle Buchungen zugeordnet
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {(unmatchedTxns || []).slice(0, 10).map((t: any) => (
                  <div key={t.id} className="flex justify-between items-center p-2 rounded border bg-card">
                    <div>
                      <p className="text-sm font-medium">{t.counterpart_name || 'Unbekannt'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.transaction_date).toLocaleDateString('de-AT')}</p>
                    </div>
                    <Badge variant="outline" className="font-mono">{fmt(Number(t.amount))}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
