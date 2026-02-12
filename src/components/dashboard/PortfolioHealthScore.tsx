import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gauge, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { useInvoices } from '@/hooks/useInvoices';
import { usePayments } from '@/hooks/usePayments';
import { useMaintenanceTasks } from '@/hooks/useMaintenanceTasks';

export function PortfolioHealthScore() {
  const currentYear = new Date().getFullYear();
  const { data: units = [] } = useUnits();
  const { data: tenants = [] } = useTenants();
  const { data: invoices = [] } = useInvoices(currentYear);
  const { data: payments = [] } = usePayments();
  const { data: tasks = [] } = useMaintenanceTasks();

  const { score, factors } = useMemo(() => {
    const f: { label: string; score: number; max: number; status: 'good' | 'warn' | 'bad' }[] = [];

    // Occupancy (25 pts)
    const totalUnits = units.length || 1;
    const occupiedUnits = units.filter(u => u.status === 'aktiv').length;
    const occupancyRate = occupiedUnits / totalUnits;
    const occupancyScore = Math.round(occupancyRate * 25);
    f.push({ label: 'Vermietungsquote', score: occupancyScore, max: 25, status: occupancyRate >= 0.95 ? 'good' : occupancyRate >= 0.8 ? 'warn' : 'bad' });

    // Collection rate (25 pts)
    const expectedMonthly = (tenants as any[]).reduce((s, t) => {
      return s + Number(t.grundmiete || t.grundMiete || 0) + Number(t.betriebskostenVorschuss || t.betriebskosten_vorschuss || 0);
    }, 0);
    const currentMonth = new Date().getMonth() + 1;
    const thisMonthPayments = (payments as any[]).filter(p => {
      const d = new Date(p.eingangs_datum || p.eingangsDatum || '');
      return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    });
    const monthlyIncome = thisMonthPayments.reduce((s: number, p: any) => s + Number(p.betrag || 0), 0);
    const collectionRate = expectedMonthly > 0 ? Math.min(1, monthlyIncome / expectedMonthly) : 1;
    const collectionScore = Math.round(collectionRate * 25);
    f.push({ label: 'Einzugsquote', score: collectionScore, max: 25, status: collectionRate >= 0.95 ? 'good' : collectionRate >= 0.8 ? 'warn' : 'bad' });

    // No overdue invoices (25 pts)
    const openInvoices = (invoices as any[]).filter(i => i.status !== 'bezahlt' && i.status !== 'storniert');
    const overdueInvoices = openInvoices.filter(i => i.faellig_am && new Date(i.faellig_am) < new Date());
    const overdueRate = openInvoices.length > 0 ? overdueInvoices.length / openInvoices.length : 0;
    const overdueScore = Math.round((1 - overdueRate) * 25);
    f.push({ label: 'Forderungsqualität', score: overdueScore, max: 25, status: overdueRate <= 0.05 ? 'good' : overdueRate <= 0.2 ? 'warn' : 'bad' });

    // Maintenance health (25 pts)
    const openTasks = (tasks as any[]).filter(t => t.status !== 'erledigt' && t.status !== 'abgebrochen');
    const urgentOpen = openTasks.filter(t => t.priority === 'hoch' || t.priority === 'dringend').length;
    const maintScore = Math.max(0, 25 - urgentOpen * 5);
    f.push({ label: 'Instandhaltung', score: maintScore, max: 25, status: urgentOpen === 0 ? 'good' : urgentOpen <= 2 ? 'warn' : 'bad' });

    const totalScore = f.reduce((s, x) => s + x.score, 0);
    return { score: totalScore, factors: f };
  }, [units, tenants, invoices, payments, tasks, currentYear]);

  const gradeColor = score >= 85 ? 'text-green-600' : score >= 60 ? 'text-amber-500' : 'text-destructive';
  const gradeLabel = score >= 85 ? 'Exzellent' : score >= 70 ? 'Gut' : score >= 50 ? 'Verbesserungswürdig' : 'Kritisch';
  const gradeBg = score >= 85 ? 'bg-green-500/10' : score >= 60 ? 'bg-amber-500/10' : 'bg-destructive/10';

  const statusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
      case 'warn': return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      default: return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-5 w-5 text-primary" />
          Portfolio Health Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6 mb-4">
          <div className={`flex items-center justify-center w-20 h-20 rounded-full ${gradeBg}`}>
            <span className={`text-3xl font-bold ${gradeColor}`}>{score}</span>
          </div>
          <div>
            <p className={`text-lg font-semibold ${gradeColor}`}>{gradeLabel}</p>
            <p className="text-xs text-muted-foreground">von 100 möglichen Punkten</p>
          </div>
        </div>
        <div className="space-y-2">
          {factors.map(f => (
            <div key={f.label} className="flex items-center gap-2">
              {statusIcon(f.status)}
              <span className="text-sm flex-1">{f.label}</span>
              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    f.status === 'good' ? 'bg-green-500' : f.status === 'warn' ? 'bg-amber-500' : 'bg-destructive'
                  }`}
                  style={{ width: `${(f.score / f.max) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right">{f.score}/{f.max}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
