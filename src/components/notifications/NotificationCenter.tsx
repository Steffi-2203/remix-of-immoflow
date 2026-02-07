import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, AlertTriangle, FileWarning, Clock, ArrowRight } from 'lucide-react';
import { useDeadlines } from '@/hooks/useDeadlines';
import { useMaintenanceTasks } from '@/hooks/useMaintenanceTasks';
import { useTenants } from '@/hooks/useTenants';
import { useInvoices } from '@/hooks/useInvoices';
import { differenceInDays, format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'deadline' | 'overdue' | 'contract' | 'task';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  href: string;
  date?: string;
}

export function NotificationCenter() {
  const navigate = useNavigate();
  const { data: deadlines = [] } = useDeadlines();
  const { data: tasks = [] } = useMaintenanceTasks();
  const { data: tenants = [] } = useTenants();
  const currentYear = new Date().getFullYear();
  const { data: invoices = [] } = useInvoices(currentYear);

  const notifications = useMemo<Notification[]>(() => {
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 86400000);
    const out: Notification[] = [];

    // Upcoming deadlines
    for (const d of deadlines as any[]) {
      const dd = new Date(d.deadline_date);
      if (dd >= today && dd <= in30Days && d.status !== 'erledigt') {
        const days = differenceInDays(dd, today);
        out.push({
          id: `deadline-${d.id}`,
          type: 'deadline',
          title: d.title,
          description: `Fällig in ${days} Tagen (${format(dd, 'dd.MM.yyyy', { locale: de })})`,
          severity: days <= 7 ? 'critical' : days <= 14 ? 'warning' : 'info',
          href: '/fristen',
          date: d.deadline_date,
        });
      }
    }

    // Overdue invoices
    const overdueInvoices = (invoices as any[]).filter(i => {
      if (i.status === 'bezahlt' || i.status === 'storniert') return false;
      return i.faellig_am && new Date(i.faellig_am) < today;
    });
    if (overdueInvoices.length > 0) {
      const totalAmount = overdueInvoices.reduce((s: number, i: any) => s + Number(i.gesamtbetrag || 0), 0);
      out.push({
        id: 'overdue-invoices',
        type: 'overdue',
        title: `${overdueInvoices.length} überfällige Vorschreibungen`,
        description: `Gesamt: € ${totalAmount.toLocaleString('de-AT', { minimumFractionDigits: 2 })}`,
        severity: 'critical',
        href: '/mieteinnahmen?tab=invoices',
      });
    }

    // Expiring contracts
    const expiringContracts = (tenants as any[]).filter(t => {
      const end = t.mietvertrag_ende || t.mietende;
      if (!end) return false;
      const d = new Date(end);
      return d >= today && d <= in30Days;
    });
    for (const t of expiringContracts) {
      const end = new Date(t.mietvertrag_ende || t.mietende);
      out.push({
        id: `contract-${t.id}`,
        type: 'contract',
        title: `Vertrag ${t.first_name} ${t.last_name} läuft aus`,
        description: `Ende: ${format(end, 'dd.MM.yyyy', { locale: de })}`,
        severity: differenceInDays(end, today) <= 14 ? 'critical' : 'warning',
        href: `/mieter/${t.id}`,
        date: t.mietvertrag_ende || t.mietende,
      });
    }

    // Urgent maintenance tasks
    const urgentTasks = (tasks as any[]).filter(
      t => (t.priority === 'hoch' || t.priority === 'dringend') && t.status !== 'erledigt' && t.status !== 'abgebrochen'
    );
    for (const t of urgentTasks.slice(0, 5)) {
      out.push({
        id: `task-${t.id}`,
        type: 'task',
        title: t.title,
        description: `Priorität: ${t.priority}`,
        severity: t.priority === 'dringend' ? 'critical' : 'warning',
        href: '/wartung',
      });
    }

    // Sort by severity
    const order = { critical: 0, warning: 1, info: 2 };
    return out.sort((a, b) => order[a.severity] - order[b.severity]);
  }, [deadlines, invoices, tenants, tasks]);

  const criticalCount = notifications.filter(n => n.severity === 'critical').length;
  const totalCount = notifications.length;

  const iconForType = (type: string) => {
    switch (type) {
      case 'deadline': return <Calendar className="h-4 w-4" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4" />;
      case 'contract': return <FileWarning className="h-4 w-4" />;
      case 'task': return <Clock className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'text-destructive';
      case 'warning': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span className={`absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full text-[10px] font-medium flex items-center justify-center ${
              criticalCount > 0 ? 'bg-destructive text-destructive-foreground' : 'bg-amber-500 text-white'
            }`}>
              {totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Benachrichtigungen</h3>
          <p className="text-xs text-muted-foreground">
            {totalCount === 0 ? 'Keine offenen Hinweise' : `${totalCount} Hinweise, davon ${criticalCount} dringend`}
          </p>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Alles in Ordnung – keine offenen Hinweise 🎉
            </div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                onClick={() => navigate(n.href)}
              >
                <div className={`mt-0.5 shrink-0 ${severityColor(n.severity)}`}>
                  {iconForType(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.description}</p>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground mt-1 shrink-0" />
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
