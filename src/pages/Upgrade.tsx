import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Building2, Home, Zap } from 'lucide-react';
import { useSubscriptionLimits, TIER_LIMITS, TIER_LABELS } from '@/hooks/useOrganization';
import { cn } from '@/lib/utils';

const plans = [
  {
    tier: 'starter' as const,
    price: 'Kostenlos',
    priceNote: '14 Tage Testphase',
    features: [
      `Max. ${TIER_LIMITS.starter.properties} Liegenschaft`,
      `Max. ${TIER_LIMITS.starter.unitsPerProperty} Einheiten pro Liegenschaft`,
      'Mieter- & Mietvertragsverwaltung',
      'Grundlegende Berichte',
      'E-Mail Support',
    ],
  },
  {
    tier: 'professional' as const,
    price: '€29',
    priceNote: 'pro Monat',
    features: [
      `Max. ${TIER_LIMITS.professional.properties} Liegenschaften`,
      `Max. ${TIER_LIMITS.professional.unitsPerProperty} Einheiten pro Liegenschaft`,
      'Mieter- & Mietvertragsverwaltung',
      'Betriebskostenabrechnung',
      'Erweiterte Berichte',
      'Dokumentenverwaltung',
      'Prioritäts-Support',
    ],
    popular: true,
  },
  {
    tier: 'enterprise' as const,
    price: '€49',
    priceNote: 'pro Monat',
    features: [
      `Max. ${TIER_LIMITS.enterprise.properties} Liegenschaft`,
      `Max. ${TIER_LIMITS.enterprise.unitsPerProperty} Einheiten pro Liegenschaft`,
      'Alle Professional-Features',
      'Automatische Rechnungserstellung',
      'SEPA-Lastschrift Integration',
      'Multi-User Zugang',
      'API-Zugang',
      'Dedizierter Account Manager',
    ],
  },
];

export default function Upgrade() {
  const { subscriptionTier: currentTier, status } = useSubscriptionLimits();

  return (
    <MainLayout title="Plan Upgraden" subtitle="Wählen Sie den passenden Plan für Ihre Bedürfnisse">
      <div className="max-w-5xl mx-auto">
        {/* Current Plan Info */}
        <Card className="mb-8 bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-primary" />
                <span className="text-sm">
                  Aktueller Plan: <strong>{TIER_LABELS[currentTier]}</strong>
                  {status === 'trial' && (
                    <Badge variant="secondary" className="ml-2">Testphase</Badge>
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = plan.tier === currentTier;
            const isPlanUpgrade = 
              (currentTier === 'starter' && (plan.tier === 'professional' || plan.tier === 'enterprise')) ||
              (currentTier === 'professional' && plan.tier === 'enterprise');

            return (
              <Card 
                key={plan.tier}
                className={cn(
                  'relative transition-all',
                  plan.popular && 'border-primary shadow-lg scale-105',
                  isCurrentPlan && 'border-primary/50 bg-primary/5'
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Zap className="h-3 w-3 mr-1" />
                      Beliebteste Wahl
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-lg">{TIER_LABELS[plan.tier]}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <p className="text-sm text-muted-foreground mt-1">{plan.priceNote}</p>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {isCurrentPlan ? (
                    <Button className="w-full" variant="secondary" disabled>
                      Aktueller Plan
                    </Button>
                  ) : isPlanUpgrade ? (
                    <Button className="w-full">
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade auf {TIER_LABELS[plan.tier]}
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      {TIER_LABELS[plan.tier]}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ or Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Häufige Fragen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">Kann ich jederzeit upgraden?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Ja, Sie können Ihren Plan jederzeit upgraden. Die Differenz wird anteilig berechnet.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Was passiert nach der Testphase?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Nach Ablauf der 14-tägigen Testphase werden Sie automatisch auf den Starter-Plan gesetzt. 
                Ihre Daten bleiben erhalten, aber Sie können keine neuen Liegenschaften oder Einheiten hinzufügen, 
                wenn Sie das Limit überschreiten.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Gibt es eine Kündigungsfrist?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Nein, Sie können jederzeit zum Monatsende kündigen. Es gibt keine langfristigen Verträge.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
