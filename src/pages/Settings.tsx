import { Building2, CreditCard, User, Mail, Calendar, ArrowRight, Loader2, ExternalLink, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MainLayout } from '@/components/layout/MainLayout';
import { useOrganization, useSubscriptionLimits, calculateTrialDaysRemaining } from '@/hooks/useOrganization';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SUBSCRIPTION_TIERS } from '@/config/stripe';

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: organization, isLoading: isLoadingOrg, refetch: refetchOrg } = useOrganization();
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
    organization: orgData,
    isSubscribed, 
    openCustomerPortal, 
    isPortalLoading,
    refetch: refetchSubscription 
  } = useSubscription();

  const [isCancelling, setIsCancelling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  // Handle success from Stripe checkout
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Zahlung erfolgreich! Ihr Abo ist jetzt aktiv.');
      refetchSubscription();
      refetchOrg();
    }
  }, [searchParams, refetchSubscription, refetchOrg]);

  const getStatusVariant = () => {
    switch (status) {
      case 'active': return 'default';
      case 'trial': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'expired': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription');
      
      if (error) throw error;
      
      toast.success('Ihr Abo wurde gekündigt. Sie können den Service bis zum Ende der Abrechnungsperiode weiter nutzen.');
      refetchSubscription();
      refetchOrg();
    } catch (error) {
      console.error('Cancel subscription error:', error);
      toast.error('Fehler beim Kündigen des Abos. Bitte versuchen Sie es erneut.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setIsReactivating(true);
    try {
      const { data, error } = await supabase.functions.invoke('reactivate-subscription');
      
      if (error) throw error;
      
      toast.success('Ihr Abo wurde reaktiviert!');
      refetchSubscription();
      refetchOrg();
    } catch (error) {
      console.error('Reactivate subscription error:', error);
      toast.error('Fehler beim Reaktivieren des Abos. Bitte versuchen Sie es erneut.');
    } finally {
      setIsReactivating(false);
    }
  };

  // Get current plan price
  const currentTierConfig = SUBSCRIPTION_TIERS[subscriptionTier as keyof typeof SUBSCRIPTION_TIERS];
  const monthlyPrice = currentTierConfig?.price || 0;

  // Calculate next billing date (approximation based on trial end or subscription)
  const getNextBillingDate = () => {
    if (status === 'trial' && trialEndsAt) {
      return trialEndsAt;
    }
    // For active subscriptions, we'd need to store this from Stripe
    // For now, show the trial end date or a placeholder
    return null;
  };

  const nextBillingDate = getNextBillingDate();

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
            {/* Cancelled Warning */}
            {status === 'cancelled' && trialEndsAt && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Abo gekündigt</AlertTitle>
                <AlertDescription>
                  Ihr Abo läuft am {format(trialEndsAt, 'dd. MMMM yyyy', { locale: de })} aus. 
                  Sie können den Service bis dahin weiter nutzen.
                </AlertDescription>
              </Alert>
            )}

            {/* Current Plan Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Aktueller Plan</p>
                <p className="text-2xl font-bold">{tierLabel}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={getStatusVariant()} className="text-sm">
                  {statusLabel}
                </Badge>
              </div>
              {status !== 'trial' && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Betrag pro Monat</p>
                  <p className="text-xl font-semibold">€{monthlyPrice}</p>
                </div>
              )}
              {nextBillingDate && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {status === 'trial' ? 'Testphase endet am' : status === 'cancelled' ? 'Abo endet am' : 'Nächste Abrechnung'}
                  </p>
                  <p className="text-xl font-semibold">
                    {format(nextBillingDate, 'dd.MM.yyyy', { locale: de })}
                  </p>
                </div>
              )}
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
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => navigate('/pricing')} 
                  className="flex-1"
                  variant="outline"
                >
                  Plan ändern
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                {isSubscribed && status !== 'cancelled' && (
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
                        Zahlungsmethode verwalten
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Cancel / Reactivate Buttons */}
              {isSubscribed && (
                <div className="pt-2">
                  {status === 'cancelled' ? (
                    <Button 
                      onClick={handleReactivateSubscription}
                      variant="default"
                      className="w-full sm:w-auto"
                      disabled={isReactivating}
                    >
                      {isReactivating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Wird reaktiviert...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Abo reaktivieren
                        </>
                      )}
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Abo kündigen
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Abo wirklich kündigen?</AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>
                              Wenn Sie Ihr Abo kündigen, können Sie den Service bis zum Ende 
                              der aktuellen Abrechnungsperiode weiter nutzen.
                            </p>
                            <p>
                              Danach verlieren Sie den Zugriff auf alle Premium-Funktionen.
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelSubscription}
                            disabled={isCancelling}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isCancelling ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Wird gekündigt...
                              </>
                            ) : (
                              'Ja, Abo kündigen'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
