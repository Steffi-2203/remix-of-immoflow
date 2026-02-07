import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import {
  Building2, Banknote, AlertTriangle, CheckCircle, TrendingUp, TrendingDown,
  Users, Calendar, Clock, AlertCircle, ArrowRight, Home, PiggyBank, FileWarning, Gauge
} from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { useInvoices } from '@/hooks/useInvoices';
import { usePayments } from '@/hooks/usePayments';
import { useProperties } from '@/hooks/useProperties';
import { useMaintenanceTasks } from '@/hooks/useMaintenanceTasks';
import { useDeadlines } from '@/hooks/useDeadlines';

function fmt(n: number) {
  return `€ ${n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

export function ManagementCockpit() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const { data: units = [], isLoading: ul } = useUnits();
  const { data: tenants = [], isLoading: tl } = useTenants();
  const { data: invoices = [], isLoading: il } = useInvoices(currentYear);
  const { data: payments = [], isLoading: pl } = usePayments();
  const { data: properties = [], isLoading: prl } = useProperties();
  const { data: tasks = [], isLoading: mkl } = useMaintenanceTasks();
  const { data: deadlines = [], isLoading: dl } = useDeadlines();

  const isLoading = ul || tl || il || pl || prl || mkl || dl;

  const kpis = useMemo(() => {
    const totalUnits = units.length;
    const vacantUnits = units.filter(u => u.status !== 'aktiv').length;
    const vacancyRate = totalUnits > 0 ? (vacantUnits / totalUnits) * 100 : 0;

    const totalQm = units.reduce((s, u) => s + (Number((u as any).qm || (u as any).flaeche) || 0), 0);
    const vacantQm = units.filter(u => u.status !== 'aktiv').reduce((s, u) => s + (Number((u as any).qm || (u as any).flaeche) || 0), 0);

    const openInvoices = invoices.filter((i: any) => i.status !== 'bezahlt' && i.status !== 'storniert');
    const overdueInvoices = openInvoices.filter((i: any) => {
      const dueDate = i.faellig_am;
      return dueDate && new Date(dueDate) < new Date();
    });
    const openAmount = openInvoices.reduce((s: number, i: any) => s + Number(i.gesamtbetrag || 0), 0);
    const overdueAmount = overdueInvoices.reduce((s: number, i: any) => s + Number(i.gesamtbetrag || 0), 0);

    const dunningInvoices = invoices.filter((i: any) => Number(i.mahnstufe || 0) > 0 && i.status !== 'bezahlt');
    const dunningRate = openInvoices.length > 0 ? (dunningInvoices.length / openInvoices.length) * 100 : 0;

    const thisMonthPayments = (payments || []).filter((p: any) => {
      const d = p.eingangs_datum || p.eingangsDatum;
      if (!d) return false;
      const date = new Date(d);
      return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
    });
    const monthlyIncome = thisMonthPayments.reduce((s: number, p: any) => s + Number(p.betrag || 0), 0);

    const expectedMonthly = tenants.reduce((s, t: any) => {
      const miete = Number(t.grundmiete || t.grundMiete || 0);
      const bk = Number(t.betriebskostenVorschuss || t.betriebskosten_vorschuss || 0);
      const hk = Number(t.heizungskostenVorschuss || t.heizungskosten_vorschuss || 0);
      return s + miete + bk + hk;
    }, 0);
    const collectionRate = expectedMonthly > 0 ? (monthlyIncome / expectedMonthly) * 100 : 0;

    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 86400000);
    const expiringContracts = tenants.filter((t: any) => {
      const end = t.mietvertragEnde || t.mietvertrag_ende;
      if (!end) return false;
      const d = new Date(end);
      return d >= today && d <= in30Days;
    });

    const upcomingDeadlines = deadlines.filter((d: any) => {
      const dd = new Date(d.deadline_date);
      return dd >= today && dd <= in30Days && d.status !== 'erledigt';
    });

    const openTasks = tasks.filter((t: any) => t.status !== 'erledigt' && t.status !== 'abgebrochen');
    const urgentTasks = openTasks.filter((t: any) => t.priority === 'hoch' || t.priority === 'dringend');

    return {
      totalUnits, vacantUnits, vacancyRate, totalQm, vacantQm,
      openAmount, overdueAmount, overdueCount: overdueInvoices.length,
      dunningCount: dunningInvoices.length, dunningRate,
      monthlyIncome, expectedMonthly, collectionRate,
      expiringContracts: expiringContracts.length,
      upcomingDeadlines: upcomingDeadlines.length,
      openTasks: openTasks.length, urgentTasks: urgentTasks.length,
      propertiesCount: properties.length,
      tenantsCount: tenants.length,
    };
  }, [units, tenants, invoices, payments, properties, tasks, deadlines, currentMonth, currentYear]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  const cards = [
    {
      title: 'Portfolio',
      icon: Building2,
      value: `${kpis.propertiesCount} Liegenschaften`,
      sub: `${kpis.totalUnits} Einheiten · ${kpis.tenantsCount} Mieter`,
      badge: null,
      color: 'text-primary',
      link: '/liegenschaften',
    },
    {
      title: 'Leerstandsquote',
      icon: Home,
      value: pct(kpis.vacancyRate),
      sub: `${kpis.vacantUnits} von ${kpis.totalUnits} leer`,
      badge: kpis.vacancyRate === 0
        ? { text: 'Vollvermietung', variant: 'default' as const }
        : kpis.vacancyRate > 5
        ? { text: 'Hoch', variant: 'destructive' as const }
        : { text: 'Gering', variant: 'secondary' as const },
      color: kpis.vacancyRate === 0 ? 'text-green-600' : kpis.vacancyRate > 5 ? 'text-destructive' : 'text-primary',
      link: '/einheiten',
    },
    {
      title: 'Offene Forderungen',
      icon: Banknote,
      value: fmt(kpis.openAmount),
      sub: `davon ${fmt(kpis.overdueAmount)} überfällig (${kpis.overdueCount})`,
      badge: kpis.overdueCount > 0
        ? { text: `${kpis.overdueCount} überfällig`, variant: 'destructive' as const }
        : { text: 'Aktuell', variant: 'default' as const },
      color: kpis.overdueCount > 0 ? 'text-destructive' : 'text-green-600',
      link: '/zahlungen',
    },
    {
      title: 'Einzugsquote',
      icon: TrendingUp,
      value: pct(kpis.collectionRate),
      sub: `${fmt(kpis.monthlyIncome)} von ${fmt(kpis.expectedMonthly)} erhalten`,
      badge: kpis.collectionRate >= 95
        ? { text: 'Exzellent', variant: 'default' as const }
        : kpis.collectionRate >= 80
        ? { text: 'OK', variant: 'secondary' as const }
        : { text: 'Niedrig', variant: 'destructive' as const },
      color: kpis.collectionRate >= 95 ? 'text-green-600' : kpis.collectionRate >= 80 ? 'text-primary' : 'text-destructive',
      link: '/zahlungen',
    },
    {
      title: 'Mahnquote',
      icon: AlertTriangle,
      value: `${kpis.dunningCount} Mahnungen`,
      sub: pct(kpis.dunningRate) + ' der offenen Posten',
      badge: kpis.dunningCount > 0
        ? { text: `${kpis.dunningCount} aktiv`, variant: 'destructive' as const }
        : { text: 'Keine', variant: 'default' as const },
      color: kpis.dunningCount > 0 ? 'text-destructive' : 'text-green-600',
      link: '/zahlungen?tab=dunning',
    },
    {
      title: 'Fällige Fristen',
      icon: Calendar,
      value: `${kpis.upcomingDeadlines}`,
      sub: 'in den nächsten 30 Tagen',
      badge: kpis.upcomingDeadlines > 3
        ? { text: 'Achtung', variant: 'destructive' as const }
        : kpis.upcomingDeadlines > 0
        ? { text: `${kpis.upcomingDeadlines} offen`, variant: 'secondary' as const }
        : { text: 'Keine', variant: 'default' as const },
      color: kpis.upcomingDeadlines > 3 ? 'text-destructive' : 'text-muted-foreground',
      link: '/fristen',
    },
    {
      title: 'Auslaufende Verträge',
      icon: FileWarning,
      value: `${kpis.expiringContracts}`,
      sub: 'in den nächsten 30 Tagen',
      badge: kpis.expiringContracts > 0
        ? { text: 'Handlung nötig', variant: 'destructive' as const }
        : { text: 'Keine', variant: 'default' as const },
      color: kpis.expiringContracts > 0 ? 'text-destructive' : 'text-green-600',
      link: '/mieter',
    },
    {
      title: 'Offene Aufgaben',
      icon: Clock,
      value: `${kpis.openTasks}`,
      sub: kpis.urgentTasks > 0 ? `davon ${kpis.urgentTasks} dringend` : 'Wartung & Instandhaltung',
      badge: kpis.urgentTasks > 0
        ? { text: `${kpis.urgentTasks} dringend`, variant: 'destructive' as const }
        : kpis.openTasks > 0
        ? { text: `${kpis.openTasks} offen`, variant: 'secondary' as const }
        : { text: 'Alles erledigt', variant: 'default' as const },
      color: kpis.urgentTasks > 0 ? 'text-destructive' : 'text-muted-foreground',
      link: '/wartung',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Hero KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.slice(0, 4).map(card => (
          <Link key={card.title} to={card.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-lg bg-muted">
                    <card.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {card.badge && <Badge variant={card.badge.variant}>{card.badge.text}</Badge>}
                </div>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.title}</p>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.slice(4).map(card => (
          <Link key={card.title} to={card.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-lg bg-muted">
                    <card.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {card.badge && <Badge variant={card.badge.variant}>{card.badge.text}</Badge>}
                </div>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.title}</p>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
