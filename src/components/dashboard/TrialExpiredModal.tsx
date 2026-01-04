import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

interface TrialExpiredModalProps {
  open: boolean;
}

export function TrialExpiredModal({ open }: TrialExpiredModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-xl">Testphase abgelaufen</DialogTitle>
          </div>
          <DialogDescription className="pt-4 text-base">
            Ihre 14-tägige Testphase ist abgelaufen. Um weiterhin Liegenschaften und 
            Einheiten verwalten zu können, wählen Sie bitte einen passenden Plan.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Ihre bestehenden Daten bleiben erhalten. Nach dem Upgrade können Sie 
            sofort wieder auf alle Funktionen zugreifen.
          </p>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="default"
            onClick={() => navigate('/pricing')}
            className="w-full sm:w-auto"
          >
            Jetzt upgraden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
