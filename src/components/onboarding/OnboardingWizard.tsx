import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Home, CheckCircle2, ArrowRight, ArrowLeft, X,
  Users, Upload, FileSpreadsheet, Euro, Shield, BarChart3,
  ClipboardList, Sparkles,
} from 'lucide-react';
import { useCreateProperty } from '@/hooks/useProperties';

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const steps = [
  { id: 'welcome', title: 'Willkommen bei ImmoflowMe', description: 'Ihre professionelle Hausverwaltungs-Software' },
  { id: 'property', title: 'Liegenschaft anlegen', description: 'Starten Sie mit Ihrer ersten Immobilie' },
  { id: 'units', title: 'Einheiten anlegen', description: 'Fügen Sie Wohnungen, Geschäfte oder Garagen hinzu' },
  { id: 'checklist', title: 'Nächste Schritte', description: 'Was Sie als Nächstes einrichten sollten' },
  { id: 'done', title: 'Los geht\'s!', description: 'Sie sind bereit' },
];

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const [propertyData, setPropertyData] = useState({
    name: '',
    address: '',
    city: '',
    postal_code: '',
  });
  const [propertyCreated, setPropertyCreated] = useState(false);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);

  const createProperty = useCreateProperty();
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleCreateProperty = async () => {
    if (!propertyData.name || !propertyData.address || !propertyData.city || !propertyData.postal_code) return;
    try {
      const result = await createProperty.mutateAsync(propertyData);
      setPropertyCreated(true);
      setCreatedPropertyId((result as any)?.id || null);
      handleNext();
    } catch (error) {
      console.error('Error creating property:', error);
    }
  };

  const handleFinish = () => onComplete();

  const handleSkipAll = () => {
    if (onSkip) onSkip();
    else onComplete();
  };

  const handleNavigateToUnits = () => {
    onComplete();
    if (createdPropertyId) {
      navigate(`/liegenschaften/${createdPropertyId}`);
    } else {
      navigate('/einheiten');
    }
  };

  const handleNavigateToImport = () => {
    onComplete();
    navigate('/liegenschaften');
  };

  const checklistItems = [
    { icon: Home, label: 'Einheiten anlegen', desc: 'Wohnungen, Geschäfte, Garagen erfassen', path: '/einheiten' },
    { icon: Users, label: 'Mieter erfassen', desc: 'Mietverträge und Kontaktdaten hinterlegen', path: '/mieter' },
    { icon: Euro, label: 'Bankkonten einrichten', desc: 'Für automatisches Zahlungs-Matching', path: '/einstellungen' },
    { icon: Shield, label: 'Verteilerschlüssel prüfen', desc: 'BK-Schlüssel für die Abrechnung', path: '/einstellungen' },
    { icon: BarChart3, label: 'Budgets planen', desc: 'Jahresbudgets pro Liegenschaft', path: '/budgets' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="relative">
          <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={handleSkipAll}>
            <X className="h-4 w-4" />
          </Button>
          <div className="mb-4">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Schritt {currentStep + 1} von {steps.length}
            </p>
          </div>
          <CardTitle className="text-xl">{steps[currentStep].title}</CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>

        <CardContent>
          {/* Step 1: Welcome */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Building2, label: 'Liegenschaften', desc: 'Immobilien verwalten' },
                  { icon: Users, label: 'Mieter', desc: 'Verträge & Kontakte' },
                  { icon: Euro, label: 'Finanzen', desc: 'Zahlungen & BK' },
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted flex flex-col items-center text-center">
                    <item.icon className="h-7 w-7 text-primary mb-1.5" />
                    <p className="text-xs font-medium">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="text-sm text-muted-foreground space-y-1.5">
                <p className="font-medium text-foreground">ImmoflowMe bietet Ihnen:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>MRG-konforme Betriebskostenabrechnungen</li>
                  <li>Automatisches Zahlungs-Matching via OCR</li>
                  <li>Indexanpassung (VPI/Richtwert)</li>
                  <li>Kautionsverwaltung mit Verzinsung</li>
                  <li>SEPA-Lastschrift & Mahnwesen</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleNext}>
                  Einrichtung starten
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              <div className="flex items-center gap-2 justify-center">
                <Badge variant="outline" className="text-xs">
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                  CSV-Import verfügbar
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  KI-Rechnungserkennung
                </Badge>
              </div>
            </div>
          )}

          {/* Step 2: Create Property */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Bezeichnung</Label>
                  <Input
                    placeholder="z.B. Bahnhofstraße 12"
                    value={propertyData.name}
                    onChange={(e) => setPropertyData({ ...propertyData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Adresse</Label>
                  <Input
                    placeholder="Straße und Hausnummer"
                    value={propertyData.address}
                    onChange={(e) => setPropertyData({ ...propertyData, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>PLZ</Label>
                    <Input
                      placeholder="z.B. 1010"
                      value={propertyData.postal_code}
                      onChange={(e) => setPropertyData({ ...propertyData, postal_code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Stadt</Label>
                    <Input
                      placeholder="z.B. Wien"
                      value={propertyData.city}
                      onChange={(e) => setPropertyData({ ...propertyData, city: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateProperty}
                  disabled={createProperty.isPending || !propertyData.name}
                >
                  {createProperty.isPending ? 'Wird erstellt...' : 'Anlegen & weiter'}
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <Button variant="ghost" className="text-muted-foreground text-xs" onClick={handleNext}>
                  Überspringen – später anlegen
                </Button>
                <Button
                  variant="link"
                  className="text-xs"
                  onClick={handleNavigateToImport}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Oder: Bestehende Daten per CSV importieren
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Units Info */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {propertyCreated ? (
                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <p className="font-medium">Liegenschaft „{propertyData.name}" erstellt!</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Als nächstes sollten Sie Einheiten (Wohnungen, Geschäfte, Garagen) zur Liegenschaft hinzufügen.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sie haben noch keine Liegenschaft angelegt. Sie können dies jederzeit nachholen.
                </p>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Typische Einheitstypen:</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Wohnung', desc: '10% USt auf Miete/BK' },
                    { label: 'Geschäft', desc: '20% USt auf alle Positionen' },
                    { label: 'Garage/Stellplatz', desc: '20% USt auf alle Positionen' },
                    { label: 'Lager', desc: '20% USt auf alle Positionen' },
                  ].map((type, i) => (
                    <div key={i} className="p-2.5 rounded border text-sm">
                      <p className="font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Button>
                {propertyCreated ? (
                  <Button className="flex-1" onClick={handleNavigateToUnits}>
                    Einheiten jetzt anlegen
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button className="flex-1" onClick={handleNext}>
                    Weiter
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
              <Button variant="ghost" className="w-full text-muted-foreground text-xs" onClick={handleNext}>
                Überspringen
              </Button>
            </div>
          )}

          {/* Step 4: Checklist */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Hier sind die wichtigsten Schritte, um ImmoflowMe vollständig einzurichten:
              </p>

              <div className="space-y-2">
                {checklistItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="p-1.5 rounded bg-primary/10">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <ClipboardList className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Button>
                <Button className="flex-1" onClick={handleNext}>
                  Fertigstellen
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Done */}
          {currentStep === 4 && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-primary" />
              </div>

              <div>
                <p className="text-lg font-medium mb-2">
                  {propertyCreated ? 'Ihre Liegenschaft wurde angelegt!' : 'Bereit zum Starten!'}
                </p>
                <p className="text-muted-foreground text-sm">
                  Sie finden alle Funktionen in der Seitenleiste. Bei Fragen hilft Ihnen unser
                  Handbuch unter Einstellungen → Handbuch.
                </p>
              </div>

              <Button className="w-full" onClick={handleFinish}>
                Zum Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
