import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  Home,
  Euro,
  FileText,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const reports = [
  {
    id: 'rendite',
    title: 'Renditereport',
    description: 'Übersicht der Rendite pro Liegenschaft und gesamt',
    icon: TrendingUp,
    color: 'bg-success/10 text-success',
  },
  {
    id: 'leerstand',
    title: 'Leerstandsreport',
    description: 'Analyse der Leerstandsquote und Dauer',
    icon: Home,
    color: 'bg-warning/10 text-warning',
  },
  {
    id: 'umsatz',
    title: 'Umsatzreport',
    description: 'Monatliche und jährliche Umsatzübersicht',
    icon: Euro,
    color: 'bg-primary/10 text-primary',
  },
  {
    id: 'ust',
    title: 'USt-Voranmeldung',
    description: 'Umsatzsteuer vs. Vorsteuer für das Finanzamt',
    icon: FileText,
    color: 'bg-accent/10 text-accent',
  },
];

export default function Reports() {
  return (
    <MainLayout title="Reports & Auswertungen" subtitle="Analysen und Berichte für Ihre Immobilien">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jahresrendite</p>
                <p className="text-2xl font-bold text-foreground mt-1">4.8%</p>
              </div>
              <div className="flex items-center gap-1 text-success text-sm">
                <ArrowUpRight className="h-4 w-4" />
                +0.3%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leerstandsquote</p>
                <p className="text-2xl font-bold text-foreground mt-1">10.5%</p>
              </div>
              <div className="flex items-center gap-1 text-destructive text-sm">
                <ArrowDownRight className="h-4 w-4" />
                +2.1%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jahresumsatz</p>
                <p className="text-2xl font-bold text-foreground mt-1">€548.160</p>
              </div>
              <div className="flex items-center gap-1 text-success text-sm">
                <ArrowUpRight className="h-4 w-4" />
                +5.2%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">USt-Zahllast</p>
                <p className="text-2xl font-bold text-foreground mt-1">€8.420</p>
              </div>
              <div className="text-xs text-muted-foreground">Dezember 2024</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Cards */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Verfügbare Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-card-hover transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-start gap-4">
                <div className={`rounded-lg p-2.5 ${report.color}`}>
                  <report.icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <CardDescription className="mt-1">{report.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mt-2">
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Zeitraum wählen
                </Button>
                <Button size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Generieren
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* USt Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>USt-Voranmeldung Dezember 2024</CardTitle>
              <CardDescription>Vorschau für das Finanzamt</CardDescription>
            </div>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              PDF Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Umsatzsteuer (10%/20%)</p>
              <p className="text-2xl font-bold text-foreground mt-2">€12.840,00</p>
              <div className="mt-2 text-xs text-muted-foreground">
                <p>Wohnungen (10%): €4.560,00</p>
                <p>Geschäfte (20%): €8.280,00</p>
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Vorsteuer (Ausgaben)</p>
              <p className="text-2xl font-bold text-foreground mt-2">€4.420,00</p>
              <div className="mt-2 text-xs text-muted-foreground">
                <p>Betriebskosten: €2.850,00</p>
                <p>Instandhaltung: €1.570,00</p>
              </div>
            </div>
            <div className="rounded-lg border border-success/30 bg-success/5 p-4">
              <p className="text-sm text-muted-foreground">Zahllast</p>
              <p className="text-2xl font-bold text-success mt-2">€8.420,00</p>
              <div className="mt-2 text-xs text-muted-foreground">
                <p>Fällig bis: 15.02.2025</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
