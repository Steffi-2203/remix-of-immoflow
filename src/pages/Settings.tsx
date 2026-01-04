import { Building2, CreditCard, User, Mail, Calendar, ArrowRight, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MainLayout } from '@/components/layout/MainLayout';
import { useOrganization, useSubscriptionLimits, TIER_LABELS, STATUS_LABELS, calculateTrialDaysRemaining } from '@/hooks/useOrganization';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: organization, isLoading: isLoadingOrg } = useOrganization();
  const { 
    subscriptionTier, 
    tierLabel, 
    status, 
    statusLabel, 
    maxLimits, 
    currentUsage,
    trialEndsAt,
    trialDaysRemaining,
    isLoading 
  } = useSubscriptionLimits();
  
  const { 
    isSubscribed, 
    openCustomerPortal, 
    isPortalLoading,
    refetch: refetchSubscription 
  } = useSubscription();

  // Handle success from Stripe checkout
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Zahlung erfolgreich! Ihr Abo ist jetzt aktiv.');
      refetchSubscription();
    }
  }, [searchParams, refetchSubscription]);

  const getStatusVariant = () => {
    switch (status) {
      case 'active': return 'default';
      case 'trial': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'expired': return 'destructive';
      default: return 'secondary';
    }
  };

  if (isLoading || isLoadingOrg) {
    return (
      <MainLayout title="Einstellungen" subtitle="Verwalten Sie Ihr Konto und Abonnement">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Einstellungen" subtitle="Verwalten Sie Ihr Konto und Abonnement">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Account Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Konto
            </CardTitle>
            <CardDescription>Ihre Kontoinformationen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">E-Mail</p>
                <p className="font-medium">{user?.email || 'Nicht verfügbar'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organisation
            </CardTitle>
            <CardDescription>Ihre Organisationsdetails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Organisationsname</p>
              <p className="font-medium text-lg">{organization?.name || 'Nicht verfügbar'}</p>
            </div>
            {organization?.created_at && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Mitglied seit</p>
                  <p className="font-medium">
                    {format(new Date(organization.created_at), 'dd. MMMM yyyy', { locale: de })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Abonnement
            </CardTitle>
            <CardDescription>Ihr aktueller Plan und Nutzung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Plan */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktueller Plan</p>
                <p className="text-2xl font-bold">{tierLabel}</p>
              </div>
              <Badge variant={getStatusVariant()} className="text-sm">
                {statusLabel}
              </Badge>
            </div>

            {/* Trial Info */}
            {status === 'trial' && trialEndsAt && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  {trialDaysRemaining > 0 ? (
                    <>
                      Ihre Testphase endet in <span className="font-bold">{trialDaysRemaining} Tagen</span>
                      {' '}am {format(trialEndsAt, 'dd. MMMM yyyy', { locale: de })}.
                    </>
                  ) : (
                    <span className="text-destructive font-medium">
                      Ihre Testphase ist abgelaufen. Bitte wählen Sie einen Plan.
                    </span>
                  )}
                </p>
              </div>
            )}

            <Separator />

            {/* Usage */}
            <div>
              <p className="text-sm text-muted-foreground mb-4">Aktuelle Nutzung</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">
                    {currentUsage.properties} / {maxLimits.properties}
                  </p>
                  <p className="text-sm text-muted-foreground">Liegenschaften</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">
                    {currentUsage.totalUnits} / {maxLimits.properties * maxLimits.unitsPerProperty}
                  </p>
                  <p className="text-sm text-muted-foreground">Einheiten (gesamt)</p>
                </div>
              </div>
            </div>

            {/* Plan Limits */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Plan-Limits</p>
              <ul className="text-sm space-y-1">
                <li>• Max. {maxLimits.properties} Liegenschaft{maxLimits.properties > 1 ? 'en' : ''}</li>
                <li>• Max. {maxLimits.unitsPerProperty} Einheiten pro Liegenschaft</li>
              </ul>
            </div>

            <Separator />

            {/* Subscription Management Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => navigate('/pricing')} 
                className="flex-1"
                variant="outline"
              >
                Plan ändern
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              {isSubscribed && (
                <Button 
                  onClick={openCustomerPortal} 
                  className="flex-1"
                  variant="secondary"
                  disabled={isPortalLoading}
                >
                  {isPortalLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird geladen...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abo verwalten
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
