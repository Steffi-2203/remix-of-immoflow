import { CreditCard, UserPlus, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'payment' | 'tenant' | 'document' | 'alert';
  title: string;
  description: string;
  timestamp: string;
}

const activities: Activity[] = [
  {
    id: '1',
    type: 'payment',
    title: 'Zahlung eingegangen',
    description: 'Maria Huber - Top 2 - €1.020,00',
    timestamp: 'Vor 2 Stunden',
  },
  {
    id: '2',
    type: 'tenant',
    title: 'Neuer Mieter',
    description: 'Stefan Klein - Mozartstraße 15, Top 3',
    timestamp: 'Vor 5 Stunden',
  },
  {
    id: '3',
    type: 'document',
    title: 'Dokument hochgeladen',
    description: 'Mietvertrag - Hauptplatz 8, Top 5',
    timestamp: 'Gestern',
  },
  {
    id: '4',
    type: 'alert',
    title: 'Zahlung überfällig',
    description: 'Geschäft Amadeus - 14 Tage überfällig',
    timestamp: 'Vor 2 Tagen',
  },
  {
    id: '5',
    type: 'payment',
    title: 'SEPA-Einzug erfolgreich',
    description: 'Familie Müller - Top 4 - €1.230,00',
    timestamp: 'Vor 3 Tagen',
  },
];

const iconMap = {
  payment: CreditCard,
  tenant: UserPlus,
  document: FileText,
  alert: AlertCircle,
};

const colorMap = {
  payment: 'bg-success/10 text-success',
  tenant: 'bg-primary/10 text-primary',
  document: 'bg-accent/10 text-accent',
  alert: 'bg-destructive/10 text-destructive',
};

export function RecentActivity() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="p-5 border-b border-border">
        <h3 className="font-semibold text-foreground">Letzte Aktivitäten</h3>
      </div>
      <div className="divide-y divide-border">
        {activities.map((activity) => {
          const Icon = iconMap[activity.type];
          return (
            <div key={activity.id} className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors">
              <div className={cn('rounded-lg p-2', colorMap[activity.type])}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{activity.title}</p>
                <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.timestamp}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
