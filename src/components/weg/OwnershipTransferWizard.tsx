import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertTriangle, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateOwnershipTransfer,
  useUpdateOwnershipTransfer,
  calculateProration,
  calculateSolidarhaftung,
  legalReasonLabels,
} from '@/hooks/useOwnershipTransfer';
import { usePropertyOwners, useCreatePropertyOwner, useUpdatePropertyOwner } from '@/hooks/usePropertyOwners';
import { useWegOwnerInvoices } from '@/hooks/useWegBusinessPlan';
import { useWegBusinessPlans } from '@/hooks/useWegBusinessPlan';
import { generateOwnerTransferClosingPdf } from '@/utils/ownerTransferPdfExport';

interface OwnershipTransferWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  organizationId: string | null;
  preselectedOwnerId?: string;
}

export function OwnershipTransferWizard({ open, onOpenChange, propertyId, organizationId, preselectedOwnerId }: OwnershipTransferWizardProps) {
  const [step, setStep] = useState(0);

  // Form state
  const [oldOwnerId, setOldOwnerId] = useState(preselectedOwnerId || '');
  const [newOwnerMode, setNewOwnerMode] = useState<'existing' | 'new'>('new');
  const [existingNewOwnerId, setExistingNewOwnerId] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [landRegistryDate, setLandRegistryDate] = useState('');
  const [landRegistryRef, setLandRegistryRef] = useState('');
  const [legalReason, setLegalReason] = useState('kauf');
  const [notes, setNotes] = useState('');

  const { data: owners = [] } = usePropertyOwners(propertyId);
  const { data: plans = [] } = useWegBusinessPlans(propertyId);
  const activePlan = plans.find((p) => p.status === 'aktiv') || plans[0];
  const { data: invoices = [] } = useWegOwnerInvoices(activePlan?.id);

  const createTransfer = useCreateOwnershipTransfer();
  const createOwner = useCreatePropertyOwner();
  const updateOwner = useUpdatePropertyOwner();

  const oldOwner = owners.find((o) => o.id === oldOwnerId);
  const openInvoices = invoices.filter((inv) => inv.owner_id === oldOwnerId && (inv.status === 'offen' || inv.status === 'ueberfaellig'));
  const outstandingAmount = openInvoices.reduce((s, inv) => s + inv.amount_gross, 0);

  const proration = transferDate ? calculateProration(transferDate) : null;
  const solidarhaftung = calculateSolidarhaftung(openInvoices.map((inv) => ({ amount_gross: inv.amount_gross, due_date: inv.due_date })));

  const steps = ['Einheit & Eigentümer', 'Neuer Eigentümer', 'Übergabedaten', 'Vorschau', 'Warnungen', 'Bestätigung'];

  const canProceed = () => {
    switch (step) {
      case 0: return !!oldOwnerId;
      case 1: return newOwnerMode === 'existing' ? !!existingNewOwnerId : !!newOwnerName;
      case 2: return !!transferDate && !!legalReason;
      default: return true;
    }
  };

  const handleComplete = async () => {
    try {
      let newOwnerId = existingNewOwnerId;

      // Create new owner if needed
      if (newOwnerMode === 'new') {
        const newOwner = await createOwner.mutateAsync({
          property_id: propertyId,
          name: newOwnerName,
          email: newOwnerEmail || null,
          phone: newOwnerPhone || null,
          address: null,
          city: null,
          postal_code: null,
          iban: null,
          bic: null,
          ownership_share: oldOwner?.ownership_share || 0,
          is_primary: false,
        });
        newOwnerId = newOwner.id;
      }

      // Set old owner share to 0
      if (oldOwner) {
        await updateOwner.mutateAsync({ id: oldOwner.id, ownership_share: 0 });
      }

      // Create transfer record
      await createTransfer.mutateAsync({
        organization_id: organizationId,
        property_id: propertyId,
        unit_id: null,
        old_owner_id: oldOwnerId,
        new_owner_id: newOwnerId || null,
        transfer_date: transferDate,
        land_registry_date: landRegistryDate || null,
        land_registry_ref: landRegistryRef || null,
        legal_reason: legalReason as any,
        status: landRegistryDate ? 'grundbuch_eingetragen' : 'entwurf',
        outstanding_amount: outstandingAmount,
        reserve_balance_transferred: 0, // Would need reserve fund calculation
        notes: notes || null,
        created_by: null,
      });

      toast.success('Eigentümerwechsel durchgeführt');
      onOpenChange(false);
    } catch {
      // Error already toasted
    }
  };

  const handleExportClosingPdf = () => {
    const blob = generateOwnerTransferClosingPdf({
      propertyName: 'Liegenschaft',
      propertyAddress: '',
      unitNumber: '',
      oldOwnerName: oldOwner?.name || '',
      newOwnerName: newOwnerMode === 'new' ? newOwnerName : owners.find((o) => o.id === existingNewOwnerId)?.name || '',
      transferDate,
      landRegistryRef: landRegistryRef || null,
      legalReason: legalReasonLabels[legalReason] || legalReason,
      outstandingAmount,
      reserveBalanceTransferred: 0,
      openInvoices: openInvoices.map((inv) => ({ month: inv.month, year: inv.year, amountGross: inv.amount_gross, status: inv.status })),
      solidarhaftungWarning: solidarhaftung.totalLiable > 0,
      solidarhaftungAmount: solidarhaftung.totalLiable,
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Abschlussrechnung_${oldOwner?.name || 'Eigentuemer'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Eigentümerwechsel</DialogTitle>
          <DialogDescription>Schritt {step + 1} von {steps.length}: {steps[step]}</DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1 mb-4">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <div className="space-y-4 py-2 min-h-[200px]">
          {/* Step 0: Select old owner */}
          {step === 0 && (
            <div className="space-y-4">
              <Label>Bisheriger Eigentümer auswählen</Label>
              <Select value={oldOwnerId} onValueChange={setOldOwnerId}>
                <SelectTrigger><SelectValue placeholder="Eigentümer wählen..." /></SelectTrigger>
                <SelectContent>
                  {owners.filter((o) => o.ownership_share > 0).map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name} ({o.ownership_share}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {oldOwner && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Anteil: <Badge variant="outline">{oldOwner.ownership_share}%</Badge></p>
                  {oldOwner.email && <p>E-Mail: {oldOwner.email}</p>}
                </div>
              )}
            </div>
          )}

          {/* Step 1: New owner */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button variant={newOwnerMode === 'new' ? 'default' : 'outline'} size="sm" onClick={() => setNewOwnerMode('new')}>Neuer Eigentümer</Button>
                <Button variant={newOwnerMode === 'existing' ? 'default' : 'outline'} size="sm" onClick={() => setNewOwnerMode('existing')}>Bestehender</Button>
              </div>

              {newOwnerMode === 'existing' ? (
                <Select value={existingNewOwnerId} onValueChange={setExistingNewOwnerId}>
                  <SelectTrigger><SelectValue placeholder="Eigentümer wählen..." /></SelectTrigger>
                  <SelectContent>
                    {owners.filter((o) => o.id !== oldOwnerId).map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>E-Mail</Label>
                    <Input type="email" value={newOwnerEmail} onChange={(e) => setNewOwnerEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input value={newOwnerPhone} onChange={(e) => setNewOwnerPhone(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Transfer data */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Übergabedatum *</Label>
                <Input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Grundbucheintragung</Label>
                <Input type="date" value={landRegistryDate} onChange={(e) => setLandRegistryDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>TZ-Nummer</Label>
                <Input value={landRegistryRef} onChange={(e) => setLandRegistryRef(e.target.value)} placeholder="z.B. TZ 1234/2026" />
              </div>
              <div className="space-y-2">
                <Label>Rechtsgrund</Label>
                <Select value={legalReason} onValueChange={setLegalReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(legalReasonLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="space-y-4">
              {proration && (
                <div className="p-4 border rounded-lg space-y-2">
                  <h4 className="font-semibold">Aliquotierung im Übergangsmonat</h4>
                  <p className="text-sm">Alter Eigentümer: <Badge>{proration.oldOwnerDays}/{proration.totalDays} Tage</Badge> ({(proration.oldOwnerFactor * 100).toFixed(1)}%)</p>
                  <p className="text-sm">Neuer Eigentümer: <Badge>{proration.newOwnerDays}/{proration.totalDays} Tage</Badge> ({(proration.newOwnerFactor * 100).toFixed(1)}%)</p>
                </div>
              )}

              <div className="p-4 border rounded-lg space-y-2">
                <h4 className="font-semibold">Offene Forderungen</h4>
                <p className="text-sm">{openInvoices.length} offene Vorschreibungen</p>
                <p className="text-lg font-bold">€ {outstandingAmount.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}

          {/* Step 4: Warnings */}
          {step === 4 && (
            <div className="space-y-4">
              {solidarhaftung.totalLiable > 0 ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Solidarhaftung gem. § 38 WEG:</strong> Der neue Eigentümer haftet für offene Forderungen der letzten {solidarhaftung.warningYears} Jahre
                    in Höhe von € {solidarhaftung.totalLiable.toLocaleString('de-AT', { minimumFractionDigits: 2 })}.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>Keine offenen Forderungen – keine Solidarhaftung.</AlertDescription>
                </Alert>
              )}

              <Alert>
                <AlertDescription>
                  <strong>§ 39 WEG – Rücklage:</strong> Der Rücklage-Anteil wird automatisch übertragen. Keine Auszahlung an den alten Eigentümer.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 5: Confirmation */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg space-y-2">
                <h4 className="font-semibold">Zusammenfassung</h4>
                <Separator />
                <p className="text-sm"><strong>Von:</strong> {oldOwner?.name}</p>
                <p className="text-sm"><strong>An:</strong> {newOwnerMode === 'new' ? newOwnerName : owners.find((o) => o.id === existingNewOwnerId)?.name}</p>
                <p className="text-sm"><strong>Datum:</strong> {transferDate ? new Date(transferDate).toLocaleDateString('de-AT') : '—'}</p>
                <p className="text-sm"><strong>Rechtsgrund:</strong> {legalReasonLabels[legalReason]}</p>
                <p className="text-sm"><strong>Offene Forderungen:</strong> € {outstandingAmount.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="space-y-2">
                <Label>Notizen</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>

              <Button variant="outline" onClick={handleExportClosingPdf} className="w-full">
                Abschlussrechnung PDF exportieren
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Zurück
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Weiter <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={createTransfer.isPending}>
                {createTransfer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Wechsel durchführen
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
