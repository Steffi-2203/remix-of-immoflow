import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Receipt, Link2Off, CheckCircle2, ExternalLink, X } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useLinkExpenseTransaction } from '@/hooks/useExpenseTransactionMatch';

interface LinkedExpense {
  id: string;
  bezeichnung: string;
  betrag: number;
  datum: string;
  beleg_url: string | null;
  beleg_nummer: string | null;
}

interface ExpenseLinkBadgeProps {
  transactionId: string;
  linkedExpense?: LinkedExpense | null;
}

export function ExpenseLinkBadge({
  transactionId,
  linkedExpense,
}: ExpenseLinkBadgeProps) {
  const [open, setOpen] = useState(false);
  const linkMutation = useLinkExpenseTransaction();

  const handleUnlink = () => {
    if (linkedExpense) {
      linkMutation.mutate({ expenseId: linkedExpense.id, transactionId: null });
    }
    setOpen(false);
  };

  if (!linkedExpense) {
    return (
      <span className="text-muted-foreground text-sm">-</span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className="cursor-pointer border-green-500 bg-green-500/10 text-green-700 dark:text-green-300 hover:bg-green-500/20"
        >
          <Receipt className="h-3 w-3 mr-1" />
          Beleg
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium">Mit Kostenbeleg verknüpft</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <div className="font-medium truncate">{linkedExpense.bezeichnung}</div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Betrag:</span>
              <span className="font-medium">
                € {Number(linkedExpense.betrag).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Datum:</span>
              <span>{format(new Date(linkedExpense.datum), 'dd.MM.yyyy', { locale: de })}</span>
            </div>
            {linkedExpense.beleg_nummer && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Beleg-Nr.:</span>
                <span>{linkedExpense.beleg_nummer}</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            {linkedExpense.beleg_url && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => window.open(linkedExpense.beleg_url!, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Beleg anzeigen
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-destructive hover:text-destructive"
              onClick={handleUnlink}
              disabled={linkMutation.isPending}
            >
              <Link2Off className="h-4 w-4 mr-2" />
              Trennen
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
