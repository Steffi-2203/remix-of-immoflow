import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSubscriptionLimits, TIER_LABELS } from '@/hooks/useOrganization';
import { useSubscription, STRIPE_PLANS, PlanKey } from '@/hooks/useSubscription';
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { toast } from 'sonner';

const plans = [
  {
    tier: 'starter' as const,
    name: 'Starter',
    price: 29,
    description: 'Perfekt für kleine Vermieter',
    features: [
      '1 Liegenschaft',
      'Max. 5 Einheiten',
      'Mieterverwaltung',
      'Zahlungsübersicht',
      'Basis-Reports',
      '14 Tage kostenlos testen',
    ],
  },
  {
    tier: 'professional' as const,
    name: 'Professional',
    price: 59,
    description: 'Für wachsende Portfolios',
    features: [
      '2 Liegenschaften',
      'Max. 10 Einheiten pro Liegenschaft',
      'Mieterverwaltung',
      'Zahlungsübersicht',
      'Erweiterte Reports',
      'BK-Abrechnung',
      '14 Tage kostenlos testen',
    ],
    popular: true,
  },
  {
    tier: 'premium' as const,
    name: 'Premium',
    price: 49,
    description: 'Für anspruchsvolle Vermieter',
    features: [
      '1 Liegenschaft',
      'Max. 15 Einheiten',
      'Mieterverwaltung',
      'Zahlungsübersicht',
      'Alle Reports',
      'BK-Abrechnung',
      'Prioritäts-Support',
      '14 Tage kostenlos testen',
    ],
  },
];

export default function Pricing() {
  const [searchParams] = useSearchParams();
  const { subscriptionTier, status, isLoading: orgLoading } = useSubscriptionLimits();
  const { startCheckout, isCheckoutLoading, refetch } = useSubscription();

  // Handle success/cancel from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Zahlung erfolgreich! Ihr Abo ist jetzt aktiv.');
      refetch();
    }
    if (searchParams.get('canceled') === 'true') {
      toast.info('Zahlung abgebrochen.');
    }
  }, [searchParams, refetch]);

  const handleSelectPlan = (tier: PlanKey) => {
    startCheckout(tier);
  };

  return (
    <MainLayout title="Preise" subtitle="Wählen Sie den passenden Plan für Ihre Bedürfnisse">
      <div className="max-w-5xl mx-auto">
        {/* Current Plan Info */}
        {!orgLoading && status !== 'trial' && (
          <div className="mb-8 p-4 bg-muted rounded-lg text-center">
            <p className="text-muted-foreground">
              Ihr aktueller Plan: <span className="font-semibold text-foreground">{TIER_LABELS[subscriptionTier]}</span>
            </p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = subscriptionTier === plan.tier && status === 'active';
            
            return (
              <Card 
                key={plan.tier} 
                className={`relative flex flex-col ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Beliebt
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1">
                  <div className="text-center mb-6">
                    <span className="text-4xl font-bold">{plan.price}€</span>
                    <span className="text-muted-foreground">/Monat</span>
                  </div>
                  
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button className="w-full" variant="outline" disabled>
                      Aktueller Plan
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() => handleSelectPlan(plan.tier)}
                      disabled={isCheckoutLoading}
                    >
                      {isCheckoutLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Wird geladen...
                        </>
                      ) : (
                        status === 'trial' || !subscriptionTier ? 'Jetzt starten' : 'Upgraden'
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Häufig gestellte Fragen</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kann ich jederzeit wechseln?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Ja, Sie können Ihren Plan jederzeit upgraden oder downgraden. Bei einem Upgrade wird der 
                  Preisunterschied anteilig berechnet.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Was passiert nach der Testphase?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Nach 14 Tagen wird Ihr gewählter Plan automatisch aktiviert. Sie können vorher 
                  jederzeit kündigen.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Welche Zahlungsmethoden akzeptieren Sie?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Wir akzeptieren alle gängigen Kreditkarten sowie SEPA-Lastschrift für monatliche 
                  Zahlungen.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gibt es einen Jahresrabatt?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Ja! Bei jährlicher Zahlung sparen Sie 2 Monate. Kontaktieren Sie uns für weitere 
                  Informationen.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
