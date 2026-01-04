import { Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

interface TrialBannerProps {
  daysRemaining: number;
  isExpiringSoon?: boolean;
}

export function TrialBanner({ daysRemaining, isExpiringSoon }: TrialBannerProps) {
  const navigate = useNavigate();

  if (daysRemaining <= 0) {
    return null;
  }

  return (
    <Alert 
      variant={isExpiringSoon ? "destructive" : "default"} 
      className={isExpiringSoon ? "" : "border-primary/20 bg-primary/5"}
    >
      <Clock className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {isExpiringSoon ? (
          <>Testphase endet bald!</>
        ) : (
          <>Testphase aktiv</>
        )}
      </AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
        <span>
          {isExpiringSoon ? (
            <>Noch <strong>{daysRemaining} {daysRemaining === 1 ? 'Tag' : 'Tage'}</strong> bis zum Ende Ihrer Testphase.</>
          ) : (
            <>Noch <strong>{daysRemaining} Tage</strong> in Ihrer kostenlosen Testphase.</>
          )}
        </span>
        <Button 
          size="sm" 
          variant={isExpiringSoon ? "destructive" : "default"}
          onClick={() => navigate('/pricing')}
          className="whitespace-nowrap"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Jetzt upgraden
        </Button>
      </AlertDescription>
    </Alert>
  );
}
