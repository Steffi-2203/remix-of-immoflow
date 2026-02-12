import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';
import { useInvoices } from '@/hooks/useInvoices';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { useMaintenanceTasks } from '@/hooks/useMaintenanceTasks';

function fmt(n: number) {
  return `€ ${n.toLocaleString('de-AT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface Prediction {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
  confidence: number;
  detail: string;
  risk?: 'low' | 'medium' | 'high';
}

export function PredictiveAnalytics() {
  const currentYear = new Date().getFullYear();
  const { data: payments = [] } = usePayments();
  const { data: invoices = [] } = useInvoices(currentYear);
  const { data: units = [] } = useUnits();
  const { data: tenants = [] } = useTenants();
  const { data: tasks = [] } = useMaintenanceTasks();

  const predictions = useMemo<Prediction[]>(() => {
    const now = new Date();
    const currentMonth = now.getMonth();

    // --- Cashflow Forecast ---
    const monthlyIncome: number[] = [];
    for (let m = 0; m < currentMonth; m++) {
      const monthPayments = (payments as any[]).filter(p => {
        const d = new Date(p.eingangs_datum || p.eingangsDatum || '');
        return d.getMonth() === m && d.getFullYear() === currentYear;
      });
      monthlyIncome.push(monthPayments.reduce((s, p) => s + Number(p.betrag || 0), 0));
    }
    const avgIncome = monthlyIncome.length > 0 ? monthlyIncome.reduce((a, b) => a + b, 0) / monthlyIncome.length : 0;
    const lastMonth = monthlyIncome[monthlyIncome.length - 1] || 0;
    const incomeGrowth = avgIncome > 0 ? ((lastMonth - avgIncome) / avgIncome) * 100 : 0;
    const forecastedYearly = avgIncome * 12;

    // --- Vacancy Risk ---
    const totalUnits = units.length;
    const vacantUnits = units.filter(u => u.status !== 'aktiv').length;
    const expiringIn90Days = (tenants as any[]).filter(t => {
      const end = t.mietvertrag_ende || t.mietende;
      if (!end) return false;
      const d = new Date(end);
      return d >= now && d <= new Date(now.getTime() + 90 * 86400000);
    }).length;
    const vacancyRisk = totalUnits > 0 ? ((vacantUnits + expiringIn90Days * 0.3) / totalUnits) * 100 : 0;

    // --- Maintenance Cost Forecast ---
    const completedTasks = (tasks as any[]).filter(t => t.status === 'erledigt' && t.actual_cost);
    const avgCost = completedTasks.length > 0
      ? completedTasks.reduce((s, t) => s + Number(t.actual_cost || 0), 0) / completedTasks.length
      : 0;
    const openTasks = (tasks as any[]).filter(t => t.status !== 'erledigt' && t.status !== 'abgebrochen').length;
    const estimatedMaintCost = openTasks * (avgCost || 500);

    // --- Collection Risk ---
    const openInvoices = (invoices as any[]).filter(i => i.status !== 'bezahlt' && i.status !== 'storniert');
    const overdueInvoices = openInvoices.filter(i => i.faellig_am && new Date(i.faellig_am) < now);
    const overdueRate = openInvoices.length > 0 ? (overdueInvoices.length / openInvoices.length) * 100 : 0;

    return [
      {
        label: 'Cashflow-Prognose (Jahresende)',
        value: fmt(forecastedYearly),
        trend: incomeGrowth >= 0 ? 'up' : 'down',
        confidence: Math.min(95, 60 + currentMonth * 3),
        detail: `Basierend auf ${currentMonth} Monaten Durchschnitt. Trend: ${incomeGrowth >= 0 ? '+' : ''}${incomeGrowth.toFixed(1)}%`,
        risk: 'low',
      },
      {
        label: 'Leerstandsrisiko (90 Tage)',
        value: `${vacancyRisk.toFixed(1)}%`,
        trend: vacancyRisk > 5 ? 'down' : 'up',
        confidence: 78,
        detail: `${vacantUnits} aktuell leer, ${expiringIn90Days} Verträge laufen aus`,
        risk: vacancyRisk > 10 ? 'high' : vacancyRisk > 5 ? 'medium' : 'low',
      },
      {
        label: 'Erwartete Instandhaltungskosten',
        value: fmt(estimatedMaintCost),
        trend: estimatedMaintCost > avgCost * 5 ? 'down' : 'neutral',
        confidence: 65,
        detail: `${openTasks} offene Aufgaben, Ø ${fmt(avgCost || 500)} pro Auftrag`,
        risk: estimatedMaintCost > 10000 ? 'high' : estimatedMaintCost > 5000 ? 'medium' : 'low',
      },
      {
        label: 'Zahlungsausfallrisiko',
        value: `${overdueRate.toFixed(1)}%`,
        trend: overdueRate > 20 ? 'down' : 'up',
        confidence: 82,
        detail: `${overdueInvoices.length} von ${openInvoices.length} Forderungen überfällig`,
        risk: overdueRate > 30 ? 'high' : overdueRate > 15 ? 'medium' : 'low',
      },
    ];
  }, [payments, invoices, units, tenants, tasks, currentYear]);

  const riskColor = (risk?: string) => {
    switch (risk) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      default: return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    }
  };

  const riskLabel = (risk?: string) => {
    switch (risk) {
      case 'high': return 'Hohes Risiko';
      case 'medium': return 'Mittleres Risiko';
      default: return 'Geringes Risiko';
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          Predictive Analytics
          <Badge variant="outline" className="text-[10px] ml-2">AI-Powered</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {predictions.map((p, i) => (
            <div key={i} className={`rounded-lg border p-4 ${riskColor(p.risk)}`}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wider opacity-70">{p.label}</p>
                {p.trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                ) : p.trend === 'down' ? (
                  <ArrowDownRight className="h-4 w-4 text-destructive" />
                ) : null}
              </div>
              <p className="text-2xl font-bold mb-1">{p.value}</p>
              <p className="text-xs opacity-70 mb-2">{p.detail}</p>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px]">
                  {riskLabel(p.risk)}
                </Badge>
                <div className="flex items-center gap-1">
                  <div className="w-16 h-1.5 bg-background/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-current rounded-full transition-all"
                      style={{ width: `${p.confidence}%` }}
                    />
                  </div>
                  <span className="text-[10px] opacity-60">{p.confidence}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
