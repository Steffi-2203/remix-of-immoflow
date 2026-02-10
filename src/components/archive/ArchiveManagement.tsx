import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Archive, Clock, Shield, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner';

const RETENTION_YEARS = 7;

interface ArchiveStats {
  totalDocuments: number;
  withinRetention: number;
  expiredRetention: number;
  oldestDocument: string | null;
}

export function ArchiveManagement() {
  const [stats] = useState<ArchiveStats>({
    totalDocuments: 0,
    withinRetention: 0,
    expiredRetention: 0,
    oldestDocument: null,
  });

  const cutoffYear = new Date().getFullYear() - RETENTION_YEARS;
  const retentionProgress = stats.totalDocuments > 0
    ? Math.round((stats.withinRetention / stats.totalDocuments) * 100)
    : 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            Archivierung & Aufbewahrung
          </h2>
          <p className="text-sm text-muted-foreground">
            BAO §132: {RETENTION_YEARS} Jahre Aufbewahrungspflicht für Buchhaltungsunterlagen
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Gemäß §132 BAO müssen Bücher und Aufzeichnungen sowie die dazugehörigen Belege
          sieben Jahre aufbewahrt werden. Die Frist beginnt mit dem Schluss des Kalenderjahres.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalDocuments}</p>
                <p className="text-sm text-muted-foreground">Dokumente gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withinRetention}</p>
                <p className="text-sm text-muted-foreground">Innerhalb Aufbewahrungsfrist</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <Archive className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expiredRetention}</p>
                <p className="text-sm text-muted-foreground">Frist abgelaufen</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aufbewahrungsstatus</CardTitle>
          <CardDescription>
            Dokumente vor {cutoffYear} können nach Prüfung archiviert werden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Innerhalb Aufbewahrungsfrist</span>
              <span>{retentionProgress}%</span>
            </div>
            <Progress value={retentionProgress} />
          </div>

          {stats.oldestDocument && (
            <p className="text-sm text-muted-foreground">
              Ältestes Dokument: {new Date(stats.oldestDocument).toLocaleDateString('de-AT')}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('Archivierungsbericht wird generiert...')}
            >
              <Archive className="h-4 w-4 mr-2" />
              Bericht erstellen
            </Button>

            {stats.expiredRetention > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => toast.info('Nur stornierte Dokumente jenseits der Aufbewahrungsfrist werden entfernt.')}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Abgelaufene prüfen ({stats.expiredRetention})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aufbewahrungsrichtlinien</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: 'Vorschreibungen & Rechnungen', years: 7, status: 'aktiv' },
              { label: 'Mietverträge', years: 30, status: 'aktiv' },
              { label: 'Audit-Protokolle', years: 10, status: 'aktiv' },
              { label: 'Zahlungsbelege', years: 7, status: 'aktiv' },
              { label: 'BK-Abrechnungen', years: 7, status: 'aktiv' },
              { label: 'SEPA-Exporte', years: 7, status: 'aktiv' },
            ].map((policy) => (
              <div key={policy.label} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm">{policy.label}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{policy.years} Jahre</Badge>
                  <Badge className="bg-primary/10 text-primary">{policy.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
