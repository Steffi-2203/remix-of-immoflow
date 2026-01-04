import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Home, Star, Clock, AlertTriangle } from 'lucide-react';
import { useSubscriptionLimits, calculateTrialDaysRemaining } from '@/hooks/useOrganization';
import { Link } from 'react-router-dom';

interface SubscriptionInfoBoxProps {
  propertiesCount: number;
  unitsCount: number;
}

export function SubscriptionInfoBox({ propertiesCount, unitsCount }: SubscriptionInfoBoxProps) {
  const { subscriptionTier: tier, maxLimits, tierLabel, status, statusLabel, trialEndsAt } = useSubscriptionLimits();
  
  const trialDaysRemaining = calculateTrialDaysRemaining(trialEndsAt);
  const isTrialExpiringSoon = status === 'trial' && trialDaysRemaining <= 3;
  const isTrialExpired = status === 'trial' && trialDaysRemaining === 0;

  const getStatusVariant = () => {
    switch (status) {
      case 'active':
        return 'default';
      case 'trial':
        return isTrialExpiringSoon ? 'destructive' : 'secondary';
      case 'cancelled':
      case 'expired':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Plan Info */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Star className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{tierLabel} Plan</h3>
                <Badge variant={getStatusVariant()}>{statusLabel}</Badge>
              </div>
              {status === 'trial' && !isTrialExpired && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {trialDaysRemaining} {trialDaysRemaining === 1 ? 'Tag' : 'Tage'} verbleibend
                  </span>
                </div>
              )}
              {isTrialExpired && (
                <div className="flex items-center gap-1 text-sm text-destructive mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Testphase abgelaufen</span>
                </div>
              )}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="font-medium">{propertiesCount}</span>
                <span className="text-muted-foreground"> von {maxLimits.properties} Liegenschaften</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="font-medium">{unitsCount}</span>
                <span className="text-muted-foreground"> Einheiten gesamt</span>
              </span>
            </div>
          </div>

          {/* Upgrade Button */}
          {(tier !== 'enterprise' || status === 'trial' || status === 'expired') && (
            <Link to="/upgrade">
              <Button variant="default" size="sm">
                <Star className="h-4 w-4 mr-2" />
                Plan upgraden
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
