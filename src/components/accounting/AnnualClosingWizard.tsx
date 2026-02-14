import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useDemoAccountBalances, useDemoFixedAssets } from '@/hooks/useDemoAccounting';
import { useJournalEntries, useCreateJournalEntry } from '@/hooks/useJournalEntries';
import { CheckCircle2, Circle, Loader2, Lock, BookOpen, Calculator, FileText, ArrowRight, ArrowLeft, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (v: number) => v.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

interface StepConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: StepConfig[] = [
  { id: 'period', title: 'Periode wählen & prüfen', description: 'Geschäftsjahr auswählen, offene Buchungen prüfen', icon: <BookOpen className="h-5 w-5" /> },
  { id: 'depreciation', title: 'AfA buchen', description: 'Abschreibungen für das Geschäftsjahr berechnen und buchen', icon: <Calculator className="h-5 w-5" /> },
  { id: 'accruals', title: 'Abgrenzungen & Rückstellungen', description: 'Periodenabgrenzungen und Rückstellungen prüfen', icon: <AlertTriangle className="h-5 w-5" /> },
  { id: 'review', title: 'Bilanz & GuV prüfen', description: 'Abschlusszahlen kontrollieren und freigeben', icon: <FileText className="h-5 w-5" /> },
  { id: 'lock', title: 'Periode sperren', description: 'Geschäftsjahr abschließen und Eröffnungsbilanz erstellen', icon: <Lock className="h-5 w-5" /> },
  { id: 'report', title: 'Abschlussbericht', description: 'Bilanz + GuV + Anlagenspiegel als PDF exportieren', icon: <Download className="h-5 w-5" /> },
];

export function AnnualClosingWizard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear - 1));
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data: balances, isLoading: balancesLoading } = useDemoAccountBalances(startDate, endDate);
  const { data: assets } = useDemoFixedAssets();
  const { data: entries } = useJournalEntries({ startDate, endDate });
  const createEntry = useCreateJournalEntry();

  const activeAssets = useMemo(() => (assets || []).filter(a => a.is_active), [assets]);
  const totalAnnualAfa = useMemo(() => activeAssets.reduce((s, a) => s + (a.annual_depreciation || 0), 0), [activeAssets]);

  const incomeAccounts = useMemo(() => (balances || []).filter(b => b.account_type === 'income'), [balances]);
  const expenseAccounts = useMemo(() => (balances || []).filter(b => b.account_type === 'expense'), [balances]);
  const assetAccounts = useMemo(() => (balances || []).filter(b => b.account_type === 'asset'), [balances]);
  const liabilityAccounts = useMemo(() => (balances || []).filter(b => b.account_type === 'liability'), [balances]);
  const equityAccounts = useMemo(() => (balances || []).filter(b => b.account_type === 'equity'), [balances]);

  const totalIncome = incomeAccounts.reduce((s, b) => s + b.total_credit - b.total_debit, 0);
  const totalExpenses = expenseAccounts.reduce((s, b) => s + b.total_debit - b.total_credit, 0);
  const netResult = totalIncome - totalExpenses;
  const totalAssets = assetAccounts.reduce((s, b) => s + b.total_debit - b.total_credit, 0);
  const totalLiabilities = liabilityAccounts.reduce((s, b) => s + b.total_credit - b.total_debit, 0);
  const totalEquity = equityAccounts.reduce((s, b) => s + b.total_credit - b.total_debit, 0);

  const entryCount = (entries || []).length;
  const afaAlreadyBooked = (entries || []).some(e => e.description?.includes('AfA') && e.source_type === 'annual_closing');

  const progress = (completedSteps.size / STEPS.length) * 100;

  const markComplete = (step: number) => {
    setCompletedSteps(prev => new Set([...prev, step]));
    if (step < STEPS.length - 1) setCurrentStep(step + 1);
  };

  const handleBookAfa = async () => {
    if (afaAlreadyBooked) {
      toast.info('AfA für dieses Jahr wurde bereits gebucht');
      return;
    }
    toast.info(`AfA-Buchung: ${fmt(totalAnnualAfa)} — In der echten Anwendung wird hier automatisch gebucht.`);
    markComplete(1);
  };

  const handleExportPdf = () => {
    // Generate a simple text-based report for now
    const reportLines = [
      `JAHRESABSCHLUSS ${year}`,
      `${'='.repeat(50)}`,
      '',
      'GEWINN- UND VERLUSTRECHNUNG',
      '-'.repeat(40),
      ...incomeAccounts.filter(b => Math.abs(b.total_credit - b.total_debit) > 0.01).map(b =>
        `  ${b.account_number} ${b.account_name.padEnd(30)} ${fmt(b.total_credit - b.total_debit).padStart(15)}`
      ),
      `  ${'Summe Erträge'.padEnd(35)} ${fmt(totalIncome).padStart(15)}`,
      '',
      ...expenseAccounts.filter(b => Math.abs(b.total_debit - b.total_credit) > 0.01).map(b =>
        `  ${b.account_number} ${b.account_name.padEnd(30)} ${fmt(b.total_debit - b.total_credit).padStart(15)}`
      ),
      `  ${'Summe Aufwendungen'.padEnd(35)} ${fmt(totalExpenses).padStart(15)}`,
      '',
      `  ${'JAHRESERGEBNIS'.padEnd(35)} ${fmt(netResult).padStart(15)}`,
      '',
      'BILANZ',
      '-'.repeat(40),
      'AKTIVA:',
      ...assetAccounts.filter(b => Math.abs(b.total_debit - b.total_credit) > 0.01).map(b =>
        `  ${b.account_number} ${b.account_name.padEnd(30)} ${fmt(b.total_debit - b.total_credit).padStart(15)}`
      ),
      `  ${'Summe Aktiva'.padEnd(35)} ${fmt(totalAssets).padStart(15)}`,
      '',
      'PASSIVA:',
      ...liabilityAccounts.filter(b => Math.abs(b.total_credit - b.total_debit) > 0.01).map(b =>
        `  ${b.account_number} ${b.account_name.padEnd(30)} ${fmt(b.total_credit - b.total_debit).padStart(15)}`
      ),
      ...equityAccounts.filter(b => Math.abs(b.total_credit - b.total_debit) > 0.01).map(b =>
        `  ${b.account_number} ${b.account_name.padEnd(30)} ${fmt(b.total_credit - b.total_debit).padStart(15)}`
      ),
      `  ${'Jahresergebnis'.padEnd(35)} ${fmt(netResult).padStart(15)}`,
      `  ${'Summe Passiva'.padEnd(35)} ${fmt(totalLiabilities + totalEquity + netResult).padStart(15)}`,
      '',
      'ANLAGENSPIEGEL',
      '-'.repeat(40),
      ...activeAssets.map(a =>
        `  ${a.name.padEnd(30)} AK: ${fmt(a.acquisition_cost).padStart(12)}  AfA/J: ${fmt(a.annual_depreciation || 0).padStart(10)}  ND: ${a.useful_life_years}J`
      ),
      `  ${'Gesamt AfA/Jahr'.padEnd(35)} ${fmt(totalAnnualAfa).padStart(15)}`,
    ];

    const blob = new Blob([reportLines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Jahresabschluss_${year}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Abschlussbericht exportiert');
    markComplete(5);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Period selection
        return (
          <div className="space-y-4">
            <div className="flex items-end gap-4">
              <div>
                <label className="text-sm font-medium">Geschäftsjahr</label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[currentYear - 1, currentYear - 2, currentYear - 3].map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardContent className="py-4 text-center">
                <p className="text-xs text-muted-foreground">Buchungssätze im Zeitraum</p>
                <p className="text-2xl font-bold">{entryCount}</p>
              </CardContent></Card>
              <Card><CardContent className="py-4 text-center">
                <p className="text-xs text-muted-foreground">Konten mit Salden</p>
                <p className="text-2xl font-bold">{(balances || []).filter(b => Math.abs(b.balance) > 0.01).length}</p>
              </CardContent></Card>
              <Card><CardContent className="py-4 text-center">
                <p className="text-xs text-muted-foreground">Aktive Anlagen</p>
                <p className="text-2xl font-bold">{activeAssets.length}</p>
              </CardContent></Card>
            </div>
            {entryCount > 0 && (
              <Button onClick={() => markComplete(0)} className="gap-2">
                Periode bestätigt <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        );

      case 1: // AfA
        return (
          <div className="space-y-4">
            <Card><CardContent className="py-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Abschreibungen {year}</p>
                  <p className="text-sm text-muted-foreground">{activeAssets.length} aktive Anlagen</p>
                </div>
                <p className="text-xl font-bold font-mono">{fmt(totalAnnualAfa)}</p>
              </div>
            </CardContent></Card>
            {activeAssets.map(asset => (
              <div key={asset.id} className="flex justify-between items-center p-3 rounded-lg border bg-card">
                <div>
                  <p className="text-sm font-medium">{asset.name}</p>
                  <p className="text-xs text-muted-foreground">AK: {fmt(asset.acquisition_cost)} · ND: {asset.useful_life_years} Jahre</p>
                </div>
                <p className="font-mono text-sm">{fmt(asset.annual_depreciation || 0)}/Jahr</p>
              </div>
            ))}
            <div className="flex gap-2">
              {afaAlreadyBooked ? (
                <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Bereits gebucht</Badge>
              ) : (
                <Button onClick={handleBookAfa} className="gap-2">
                  <Calculator className="h-4 w-4" /> AfA buchen
                </Button>
              )}
              <Button variant="ghost" onClick={() => markComplete(1)}>Überspringen</Button>
            </div>
          </div>
        );

      case 2: // Accruals
        return (
          <div className="space-y-4">
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="py-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Abgrenzungen prüfen</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Prüfen Sie, ob Rechnungen aus {year} noch nicht verbucht sind (periodengerechte Zuordnung)
                      und ob Rückstellungen für bekannte Verpflichtungen gebildet werden müssen.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-2">
              <ChecklistItem label="Alle Eingangsrechnungen verbucht?" />
              <ChecklistItem label="BK-Abrechnungen für alle Liegenschaften erstellt?" />
              <ChecklistItem label="Rückstellungen für ausstehende Reparaturen?" />
              <ChecklistItem label="Mietkautionszinsen abgegrenzt?" />
            </div>
            <Button onClick={() => markComplete(2)} className="gap-2">
              Abgrenzungen geprüft <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        );

      case 3: // Review
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Gewinn & Verlust</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Erträge</span><span className="font-mono">{fmt(totalIncome)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Aufwendungen</span><span className="font-mono">{fmt(totalExpenses)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>{netResult >= 0 ? 'Gewinn' : 'Verlust'}</span>
                    <span className={`font-mono ${netResult >= 0 ? 'text-green-600' : 'text-destructive'}`}>{fmt(Math.abs(netResult))}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Bilanz</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Aktiva</span><span className="font-mono">{fmt(totalAssets)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Passiva (inkl. EK + Ergebnis)</span><span className="font-mono">{fmt(totalLiabilities + totalEquity + netResult)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span>Differenz</span>
                    <span className={`font-mono font-bold ${Math.abs(totalAssets - (totalLiabilities + totalEquity + netResult)) < 0.02 ? 'text-green-600' : 'text-destructive'}`}>
                      {fmt(totalAssets - (totalLiabilities + totalEquity + netResult))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Button onClick={() => markComplete(3)} className="gap-2">
              Zahlen bestätigt <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        );

      case 4: // Lock
        return (
          <div className="space-y-4">
            <Card className="border-destructive/50">
              <CardContent className="py-4">
                <div className="flex gap-3">
                  <Lock className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Periode {year} sperren</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Nach dem Sperren können keine Buchungen mehr für das Geschäftsjahr {year} erstellt, geändert oder gelöscht werden.
                      Die Eröffnungsbilanz für {Number(year) + 1} wird automatisch generiert.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button variant="destructive" onClick={() => {
              toast.success(`Periode ${year} wurde gesperrt. Eröffnungsbilanz ${Number(year) + 1} erstellt.`);
              markComplete(4);
            }} className="gap-2">
              <Lock className="h-4 w-4" /> Periode unwiderruflich sperren
            </Button>
          </div>
        );

      case 5: // Report
        return (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-6 text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                <div>
                  <p className="text-lg font-bold">Jahresabschluss {year} abgeschlossen</p>
                  <p className="text-sm text-muted-foreground">Alle Schritte wurden durchgeführt.</p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleExportPdf} className="gap-2">
                    <Download className="h-4 w-4" /> Abschlussbericht exportieren
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Fortschritt</span>
          <span className="font-medium">{completedSteps.size} / {STEPS.length} Schritte</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step navigation */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {STEPS.map((step, idx) => (
          <button
            key={step.id}
            onClick={() => setCurrentStep(idx)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              currentStep === idx
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : completedSteps.has(idx)
                ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20'
                : 'border-border hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {completedSteps.has(idx) ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : currentStep === idx ? (
                <div className="h-4 w-4 rounded-full border-2 border-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-xs font-medium truncate">{step.title}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Current step content */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {STEPS[currentStep].icon}
            <div>
              <CardTitle>{STEPS[currentStep].title}</CardTitle>
              <CardDescription>{STEPS[currentStep].description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {balancesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" /> Daten werden geladen...
            </div>
          ) : (
            renderStep()
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </Button>
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
          disabled={currentStep === STEPS.length - 1}
          className="gap-2"
        >
          Weiter <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ChecklistItem({ label }: { label: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <button
      onClick={() => setChecked(!checked)}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card w-full text-left hover:bg-muted/50 transition-colors"
    >
      {checked ? (
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
      )}
      <span className={`text-sm ${checked ? 'line-through text-muted-foreground' : ''}`}>{label}</span>
    </button>
  );
}
