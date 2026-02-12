import { useState, useEffect } from 'react';
import { Zap, Lock, Sparkles, Loader2, Play, Calendar, Mail, CreditCard, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useKiAutopilot } from '@/hooks/useKiAutopilot';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface AutoSettings {
  autoInvoicingEnabled: boolean;
  invoicingDayOfMonth: number;
  autoInvoicingEmail: boolean;
  autoSepaGeneration: boolean;
  autoDunningEnabled: boolean;
  dunningDays1: number;
  dunningDays2: number;
  dunningDays3: number;
  autoDunningEmail: boolean;
  dunningInterestRate: string;
  lastInvoicingRun: string | null;
  lastDunningRun: string | null;
}

interface LogEntry {
  id: string;
  type: string;
  status: string;
  details: string;
  itemsProcessed: number;
  createdAt: string;
}

function Toggle({ checked, onChange, label, description, testId }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; testId: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-medium text-sm">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        data-testid={testId}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

export default function AutomationSettings() {
  const { isActive, isLoading: kiLoading } = useKiAutopilot();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<AutoSettings>({
    autoInvoicingEnabled: false,
    invoicingDayOfMonth: 1,
    autoInvoicingEmail: true,
    autoSepaGeneration: false,
    autoDunningEnabled: false,
    dunningDays1: 14,
    dunningDays2: 28,
    dunningDays3: 42,
    autoDunningEmail: true,
    dunningInterestRate: '4.00',
    lastInvoicingRun: null,
    lastDunningRun: null,
  });

  const { data: serverSettings, isLoading } = useQuery<AutoSettings | null>({
    queryKey: ['/api/automation/settings'],
    enabled: isActive,
  });

  const { data: logs } = useQuery<LogEntry[]>({
    queryKey: ['/api/automation/log'],
    enabled: isActive,
  });

  useEffect(() => {
    if (serverSettings) {
      setSettings(serverSettings);
    }
  }, [serverSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('PUT', '/api/automation/settings', settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/settings'] });
      toast({ title: 'Gespeichert', description: 'Automatisierungseinstellungen wurden aktualisiert.' });
    },
    onError: () => {
      toast({ title: 'Fehler', description: 'Einstellungen konnten nicht gespeichert werden.', variant: 'destructive' });
    },
  });

  const runInvoicing = useMutation({
    mutationFn: () => apiRequest('POST', '/api/automation/run-invoicing'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/log'] });
      toast({ title: 'Gestartet', description: 'Vorschreibungslauf wurde gestartet.' });
    },
  });

  const runDunning = useMutation({
    mutationFn: () => apiRequest('POST', '/api/automation/run-dunning'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/log'] });
      toast({ title: 'Gestartet', description: 'Mahnlauf wurde gestartet.' });
    },
  });

  if (kiLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>KI-Autopilot erforderlich</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Die Automatisierung ist Teil des KI-Autopilot Add-ons.
            </p>
            <Link to="/checkout?plan=ki-autopilot">
              <Button data-testid="button-upgrade-ki">
                <Sparkles className="mr-2 h-4 w-4" />
                KI-Autopilot aktivieren
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Zap className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-automation-title">Automatisierung</h1>
        <Badge variant="secondary">KI-Autopilot</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Automatische Vorschreibung
            </CardTitle>
            <CardDescription>Monatliche Mietvorschreibungen automatisch erstellen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle
              checked={settings.autoInvoicingEnabled}
              onChange={v => setSettings(s => ({ ...s, autoInvoicingEnabled: v }))}
              label="Automatische monatliche Vorschreibung"
              testId="toggle-auto-invoicing"
            />
            {settings.autoInvoicingEnabled && (
              <div className="space-y-3 pl-2 border-l-2 border-primary/20 ml-2">
                <div>
                  <label className="text-sm font-medium">Tag des Monats</label>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={settings.invoicingDayOfMonth}
                    onChange={e => setSettings(s => ({ ...s, invoicingDayOfMonth: parseInt(e.target.value) || 1 }))}
                    data-testid="input-invoicing-day"
                  />
                </div>
                <Toggle
                  checked={settings.autoInvoicingEmail}
                  onChange={v => setSettings(s => ({ ...s, autoInvoicingEmail: v }))}
                  label="E-Mail-Benachrichtigung"
                  description="Mieter per E-Mail informieren"
                  testId="toggle-invoicing-email"
                />
                <Toggle
                  checked={settings.autoSepaGeneration}
                  onChange={v => setSettings(s => ({ ...s, autoSepaGeneration: v }))}
                  label="SEPA-Lastschrift automatisch generieren"
                  testId="toggle-sepa-auto"
                />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => runInvoicing.mutate()}
              disabled={runInvoicing.isPending}
              data-testid="button-run-invoicing"
            >
              <Play className="mr-2 h-4 w-4" />
              Manuell starten
            </Button>
            {settings.lastInvoicingRun && (
              <p className="text-xs text-muted-foreground">
                Letzter Lauf: {new Date(settings.lastInvoicingRun).toLocaleString('de-AT')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Automatischer Mahnlauf
            </CardTitle>
            <CardDescription>Zahlungserinnerungen und Mahnungen automatisch versenden</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle
              checked={settings.autoDunningEnabled}
              onChange={v => setSettings(s => ({ ...s, autoDunningEnabled: v }))}
              label="Automatischer Mahnlauf"
              testId="toggle-auto-dunning"
            />
            {settings.autoDunningEnabled && (
              <div className="space-y-3 pl-2 border-l-2 border-primary/20 ml-2">
                <div>
                  <label className="text-sm font-medium">Tage bis Mahnung 1</label>
                  <Input
                    type="number"
                    min={1}
                    value={settings.dunningDays1}
                    onChange={e => setSettings(s => ({ ...s, dunningDays1: parseInt(e.target.value) || 14 }))}
                    data-testid="input-dunning-days-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tage bis Mahnung 2</label>
                  <Input
                    type="number"
                    min={1}
                    value={settings.dunningDays2}
                    onChange={e => setSettings(s => ({ ...s, dunningDays2: parseInt(e.target.value) || 28 }))}
                    data-testid="input-dunning-days-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tage bis Mahnung 3</label>
                  <Input
                    type="number"
                    min={1}
                    value={settings.dunningDays3}
                    onChange={e => setSettings(s => ({ ...s, dunningDays3: parseInt(e.target.value) || 42 }))}
                    data-testid="input-dunning-days-3"
                  />
                </div>
                <Toggle
                  checked={settings.autoDunningEmail}
                  onChange={v => setSettings(s => ({ ...s, autoDunningEmail: v }))}
                  label="Automatisch per E-Mail senden"
                  testId="toggle-dunning-email"
                />
                <div>
                  <label className="text-sm font-medium">Verzugszinsen (% p.a. gem. ABGB §1333)</label>
                  <Input
                    type="text"
                    value={settings.dunningInterestRate}
                    onChange={e => setSettings(s => ({ ...s, dunningInterestRate: e.target.value }))}
                    data-testid="input-interest-rate"
                  />
                </div>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => runDunning.mutate()}
              disabled={runDunning.isPending}
              data-testid="button-run-dunning"
            >
              <Play className="mr-2 h-4 w-4" />
              Manuell starten
            </Button>
            {settings.lastDunningRun && (
              <p className="text-xs text-muted-foreground">
                Letzter Lauf: {new Date(settings.lastDunningRun).toLocaleString('de-AT')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-settings">
          {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Einstellungen speichern
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktivitätsprotokoll</CardTitle>
        </CardHeader>
        <CardContent>
          {!logs?.length ? (
            <p className="text-sm text-muted-foreground">Noch keine Aktivitäten aufgezeichnet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between gap-4 text-sm border-b pb-2 last:border-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={log.status === 'gestartet' ? 'default' : 'secondary'} className="text-xs">
                      {log.type}
                    </Badge>
                    <span className="text-muted-foreground">{log.details}</span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('de-AT')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
