import { Calendar, Euro } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface UpcomingPayment {
  id: string;
  tenant: string;
  unit: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'overdue' | 'sepa';
}

const payments: UpcomingPayment[] = [
  { id: '1', tenant: 'Café Amadeus GmbH', unit: 'Top 1', amount: 3550, dueDate: '05.01.2025', status: 'sepa' },
  { id: '2', tenant: 'Maria Huber', unit: 'Top 2', amount: 1020, dueDate: '05.01.2025', status: 'sepa' },
  { id: '3', tenant: 'Familie Müller', unit: 'Top 4', amount: 1230, dueDate: '05.01.2025', status: 'pending' },
  { id: '4', tenant: 'Thomas Wagner', unit: 'Garage 1', amount: 175, dueDate: '05.01.2025', status: 'sepa' },
  { id: '5', tenant: 'Geschäft Modehaus', unit: 'Top 1 (HP)', amount: 4200, dueDate: '28.12.2024', status: 'overdue' },
];

const statusLabels = {
  pending: 'Ausstehend',
  overdue: 'Überfällig',
  sepa: 'SEPA',
};

const statusStyles = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  overdue: 'bg-destructive/10 text-destructive border-destructive/30',
  sepa: 'bg-success/10 text-success border-success/30',
};

export function UpcomingPayments() {
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Anstehende Zahlungen</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Nächste 7 Tage</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">
            €{totalAmount.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground">Gesamt</p>
        </div>
      </div>
      <div className="divide-y divide-border">
        {payments.map((payment) => (
          <div key={payment.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{payment.tenant}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{payment.unit}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {payment.dueDate}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={cn('text-xs', statusStyles[payment.status])}>
                {statusLabels[payment.status]}
              </Badge>
              <span className="font-semibold text-foreground whitespace-nowrap">
                €{payment.amount.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
