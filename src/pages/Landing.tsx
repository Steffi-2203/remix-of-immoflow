import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, BarChart3, Users, FileText, Euro, ArrowRight, CheckCircle, Building2 } from 'lucide-react';
import immoflowLogo from '@/assets/immoflowme-logo.png';
import { DemoRegistrationDialog } from '@/components/landing/DemoRegistrationDialog';

const features = [
  {
    icon: Building2,
    title: 'Liegenschaftsverwaltung',
    description: 'Verwalten Sie alle Ihre Immobilien, Einheiten und Mietverträge an einem Ort.'
  },
  {
    icon: Users,
    title: 'Mietermanagement',
    description: 'Behalten Sie den Überblick über alle Mieter, Verträge und Kommunikation.'
  },
  {
    icon: Euro,
    title: 'Zahlungsübersicht',
    description: 'Automatische Rechnungserstellung und Zahlungsverfolgung in Echtzeit.'
  },
  {
    icon: FileText,
    title: 'Betriebskostenabrechnung',
    description: 'Erstellen Sie professionelle Abrechnungen mit wenigen Klicks.'
  },
  {
    icon: BarChart3,
    title: 'Berichte & Analysen',
    description: 'Detaillierte Auswertungen und Exportfunktionen für Ihre Buchhaltung.'
  },
  {
    icon: Shield,
    title: 'Sicher & Zuverlässig',
    description: 'Ihre Daten sind verschlüsselt und sicher in der Cloud gespeichert.'
  }
];

const benefits = [
  'Keine Installation erforderlich',
  'DSGVO-konform',
  'Automatische Backups',
  'Mehrbenutzer-fähig',
  'PDF-Export',
  '24/7 verfügbar'
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={immoflowLogo} alt="ImmoflowMe Logo" className="h-12 w-auto" />
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight">ImmoflowMe</span>
              <span className="text-xs text-muted-foreground">by ImmoPepper</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild>
              <Link to="/login">Anmelden</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-2">
            ImmoflowMe
          </h1>
          <p className="text-lg text-muted-foreground mb-4">by ImmoPepper</p>
          <p className="text-primary text-2xl md:text-3xl font-semibold mb-6">Hausverwaltung im Flow</p>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Die einfache Software für kleine Hausverwaltungen und Privatvermieter.
            Verwalten Sie alles an einem Ort – übersichtlich, effizient und sicher.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <DemoRegistrationDialog />
            <Button size="lg" asChild className="text-lg px-8">
              <Link to="/login">
                Anmelden
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Alles was Sie brauchen
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Eine vollständige Lösung für die professionelle Immobilienverwaltung
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Warum ImmoflowMe?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Wir haben ImmoflowMe entwickelt, um Hausverwaltern den Alltag zu erleichtern.
                Konzentrieren Sie sich auf das Wesentliche – wir kümmern uns um den Rest.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 text-center">
              <div className="text-4xl font-bold text-primary mb-4">Professionell</div>
              <div className="text-lg text-muted-foreground mb-4">Hausverwaltung leicht gemacht</div>
              <p className="text-sm text-muted-foreground mb-6">
                Zugang nur per Einladung.
              </p>
              <Button asChild className="w-full">
                <Link to="/login">Anmelden</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Zugang nur für autorisierte Benutzer
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            ImmoflowMe ist eine geschlossene Plattform. Der Zugang erfolgt ausschließlich per Einladung durch einen Administrator.
          </p>
          <Button size="lg" variant="secondary" asChild className="text-lg px-8">
            <Link to="/login">
              Anmelden
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <img src={immoflowLogo} alt="ImmoflowMe Logo" className="h-8 w-auto" />
              <div className="flex flex-col">
                <span className="font-semibold text-sm">ImmoflowMe</span>
                <span className="text-xs text-muted-foreground">by ImmoPepper</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ImmoflowMe by ImmoPepper. Alle Rechte vorbehalten.
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</Link>
              <Link to="/impressum" className="hover:text-foreground transition-colors">Impressum</Link>
              <Link to="/agb" className="hover:text-foreground transition-colors">AGB</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
