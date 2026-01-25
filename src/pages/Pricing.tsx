import { Link, useNavigate } from 'react-router-dom';
import { Check, X, Crown, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscriptionLimits, UserSubscriptionTier } from '@/hooks/useSubscriptionLimits';
import { useAuth } from '@/hooks/useAuth';

interface PlanFeature {
  name: string;
  trial: boolean | string;
  starter: boolean | string;
  pro: boolean | string;
}

const features: PlanFeature[] = [
  { name: 'Immobilien', trial: '1', starter: '50', pro: 'Unbegrenzt' },
  { name: 'Mieter', trial: '3', starter: 'Unbegrenzt', pro: 'Unbegrenzt' },
  { name: 'Betriebskostenabrechnung ansehen', trial: true, starter: true, pro: true },
  { name: 'Betriebskostenabrechnung bearbeiten', trial: false, starter: true, pro: true },
  { name: 'SEPA-Export', trial: false, starter: true, pro: true },
  { name: 'Dokumente hochladen', trial: false, starter: true, pro: true },
  { name: 'Berichte exportieren', trial: false, starter: true, pro: true },
  { name: 'Automatische Mahnungen', trial: false, starter: false, pro: true },
  { name: 'Automatische Vorschreibungen', trial: false, starter: false, pro: true },
  { name: 'API-Zugang', trial: false, starter: false, pro: true },
  { name: 'Prioritäts-Support', trial: false, starter: false, pro: true },
];

interface PricingPlan {
  id: 'trial' | 'starter' | 'pro';
  name: string;
  price: string;
  priceDetail: string;
  description: string;
  icon: typeof Crown;
  popular?: boolean;
}

const plans: PricingPlan[] = [
  {
    id: 'trial',
    name: 'Testversion',
    price: 'Kostenlos',
    priceDetail: '14 Tage',
    description: 'Testen Sie ImmoflowMe mit eingeschränktem Zugang.',
    icon: Zap,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '€149',
    priceDetail: 'pro Monat',
    description: 'Für kleine bis mittlere Hausverwaltungen.',
    icon: Sparkles,
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€299',
    priceDetail: 'pro Monat',
    description: 'Für professionelle Hausverwaltungen mit Automatisierung.',
    icon: Crown,
  },
];

function FeatureValue({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm font-medium">{value}</span>;
  }
  return value ? (
    <Check className="h-5 w-5 text-green-600" />
  ) : (
    <X className="h-5 w-5 text-muted-foreground/50" />
  );
}

export default function Pricing() {
  const { user } = useAuth();
  const { effectiveTier, isPaid } = useSubscriptionLimits();
  const navigate = useNavigate();

  const handleSelectPlan = (planId: 'trial' | 'starter' | 'pro') => {
    if (planId === 'trial') {
      if (!user) {
        navigate('/register');
      }
      return;
    }
    navigate(`/checkout?plan=${planId}`);
  };

  const isCurrentPlan = (planId: 'trial' | 'starter' | 'pro') => {
    if (planId === 'trial') {
      return effectiveTier === 'trial';
    }
    return effectiveTier === planId;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-pricing-title">
            Wählen Sie Ihren Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Österreichische Hausverwaltung mit MRG-konformer Abrechnung.
            Starten Sie mit einer kostenlosen Testversion.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const current = isCurrentPlan(plan.id);
            
            return (
              <Card 
                key={plan.id} 
                className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}
                data-testid={`card-plan-${plan.id}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Beliebtester Plan
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${plan.popular ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`h-6 w-6 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">{plan.priceDetail}</span>
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <ul className="space-y-2 text-sm">
                    {features.slice(0, 5).map((feature) => (
                      <li key={feature.name} className="flex items-center gap-2">
                        <FeatureValue value={feature[plan.id]} />
                        <span>{feature.name}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    disabled={current}
                    onClick={() => handleSelectPlan(plan.id)}
                    data-testid={`button-select-${plan.id}`}
                  >
                    {current ? 'Aktueller Plan' : plan.id === 'trial' ? 'Kostenlos starten' : 'Plan auswählen'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">Feature-Vergleich</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 font-medium">Feature</th>
                  <th className="text-center py-4 px-4 font-medium">Testversion</th>
                  <th className="text-center py-4 px-4 font-medium">Starter</th>
                  <th className="text-center py-4 px-4 font-medium">Pro</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => (
                  <tr key={feature.name} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                    <td className="py-3 px-4">{feature.name}</td>
                    <td className="text-center py-3 px-4">
                      <div className="flex justify-center">
                        <FeatureValue value={feature.trial} />
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="flex justify-center">
                        <FeatureValue value={feature.starter} />
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="flex justify-center">
                        <FeatureValue value={feature.pro} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Fragen zu unseren Plänen?
          </p>
          <Link to="mailto:support@immoflow.me">
            <Button variant="outline">Kontaktieren Sie uns</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
