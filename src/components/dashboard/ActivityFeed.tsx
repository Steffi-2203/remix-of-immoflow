import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CreditCard, UserPlus, Wrench, FileText, Building2, AlertTriangle } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';
import { useMaintenanceTasks } from '@/hooks/useMaintenanceTasks';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface FeedItem {
  id: string;
  type: 'payment' | 'task' | 'alert';
  title: string;
  subtitle: string;
  time: Date;
  icon: React.ReactNode;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  badgeText?: string;
}

export function ActivityFeed() {
  const { data: payments = [] } = usePayments();
  const { data: tasks = [] } = useMaintenanceTasks();

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];

    // Recent payments (last 10)
    const recentPayments = [...(payments as any[])]
      .filter(p => p.eingangs_datum || p.eingangsDatum)
      .sort((a, b) => new Date(b.eingangs_datum || b.eingangsDatum).getTime() - new Date(a.eingangs_datum || a.eingangsDatum).getTime())
      .slice(0, 5);

    for (const p of recentPayments) {
      items.push({
        id: `pay-${p.id}`,
        type: 'payment',
        title: `Zahlung eingegangen: € ${Number(p.betrag || 0).toLocaleString('de-AT', { minimumFractionDigits: 2 })}`,
        subtitle: p.zahlungsart || 'Überweisung',
        time: new Date(p.eingangs_datum || p.eingangsDatum),
        icon: <CreditCard className="h-4 w-4 text-green-600" />,
        badgeVariant: 'default',
        badgeText: 'Zahlung',
      });
    }

    // Recent tasks
    const recentTasks = [...(tasks as any[])]
      .filter(t => t.created_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    for (const t of recentTasks) {
      items.push({
        id: `task-${t.id}`,
        type: 'task',
        title: t.title || 'Wartungsaufgabe',
        subtitle: `Status: ${t.status || 'offen'}`,
        time: new Date(t.created_at),
        icon: <Wrench className="h-4 w-4 text-primary" />,
        badgeVariant: t.priority === 'hoch' || t.priority === 'dringend' ? 'destructive' : 'secondary',
        badgeText: t.priority || 'normal',
      });
    }

    return items.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10);
  }, [payments, tasks]);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Live-Aktivitätsfeed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {feed.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Noch keine Aktivitäten</p>
        ) : (
          <div className="space-y-0">
            {feed.map((item, i) => (
              <div
                key={item.id}
                className="flex items-start gap-3 py-3 border-b border-border last:border-0"
              >
                <div className="mt-0.5 shrink-0 p-1.5 rounded-md bg-muted">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                </div>
                <div className="shrink-0 text-right">
                  {item.badgeText && (
                    <Badge variant={item.badgeVariant} className="text-[10px] mb-1">
                      {item.badgeText}
                    </Badge>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(item.time, { addSuffix: true, locale: de })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
