import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus, Receipt, Calculator, Wrench, FileUp, Users, Building2, Zap
} from 'lucide-react';

const actions = [
  { label: 'Liegenschaft', icon: Building2, href: '/liegenschaften/neu', color: 'text-primary' },
  { label: 'Mieter', icon: Users, href: '/mieter/neu', color: 'text-accent' },
  { label: 'Vorschreibung', icon: Receipt, href: '/zahlungen?tab=invoices', color: 'text-primary' },
  { label: 'Abrechnung', icon: Calculator, href: '/abrechnung', color: 'text-accent' },
  { label: 'Wartung', icon: Wrench, href: '/wartungen', color: 'text-primary' },
  { label: 'Dokument', icon: FileUp, href: '/dokumente', color: 'text-accent' },
];

export function QuickActionsBar() {
  const navigate = useNavigate();

  return (
    <Card className="mb-6">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0 mr-2">
            <Zap className="h-3.5 w-3.5" />
            Schnellzugriff
          </div>
          {actions.map(action => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 text-xs h-8"
              onClick={() => navigate(action.href)}
            >
              <Plus className="h-3 w-3" />
              <action.icon className={`h-3.5 w-3.5 ${action.color}`} />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
