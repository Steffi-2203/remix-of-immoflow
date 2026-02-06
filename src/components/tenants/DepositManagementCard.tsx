import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Landmark, Plus, Undo2, Loader2 } from 'lucide-react';
import { useTenantDeposit, useCreateTenantDeposit, useUpdateTenantDeposit, useReturnTenantDeposit } from '@/hooks/useTenantDeposits';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface DepositManagementCardProps {
  tenantId: string;
  tenantName: string;
  existingKaution?: number;
  existingKautionBezahlt?: boolean;
}

const depositTypeLabels: Record<string, string> = {
  bar: 'Barkaution',
  bankgarantie: 'Bankgarantie',
  sparbuch: 'Sparbuch',
  versicherung: 'Kautionsversicherung',
};

function formatCurrency(amount: number): string {
  return `€ ${amount.toLocaleString('de-AT', { minimumFractionDigits: 2 })}`;
}

export function DepositManagementCard({ tenantId, tenantName, existingKaution, existingKautionBezahlt }: DepositManagementCardProps) {
  const { data: deposit, isLoading } = useTenantDeposit(tenantId);
  const createDeposit = useCreateTenantDeposit();
  const updateDeposit = useUpdateTenantDeposit();
  const returnDeposit = useReturnTenantDeposit();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [form, setForm] = useState({
    deposit_amount: existingKaution?.toString() || '',
    deposit_type: 'bar' as 'bar' | 'bankgarantie' | 'sparbuch' | 'versicherung',
    deposit_paid_date: new Date().toISOString().split('T')[0],
    interest_rate: '0',
    bank_account: '',
    notes: '',
  });
  const [returnForm, setReturnForm] = useState({
    deductions: '0',
    deduction_notes: '',
  });

  const handleCreate = async () => {
    await createDeposit.mutateAsync({
      tenant_id: tenantId,
      deposit_amount: parseFloat(form.deposit_amount),
      deposit_type: form.deposit_type,
      deposit_paid_date: form.deposit_paid_date,
      interest_rate: parseFloat(form.interest_rate) || 0,
      bank_account: form.bank_account || null,
      notes: form.notes || null,
    });
    setCreateDialogOpen(false);
  };

  const handleReturn = async () => {
    if (!deposit) return;
    const deductions = parseFloat(returnForm.deductions) || 0;
    const returnedAmount = deposit.deposit_amount + (deposit.interest_accrued || 0) - deductions;

    await returnDeposit.mutateAsync({
      id: deposit.id,
      tenantId,
      returnedAmount: Math.max(0, returnedAmount),
      deductions,
      deductionNotes: returnForm.deduction_notes || undefined,
    });
    setReturnDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Kautionsmanagement
          </div>
          {!deposit && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Kaution erfassen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Kaution erfassen</DialogTitle>
                  <DialogDescription>
                    Erfassen Sie die Kaution für {tenantName}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kautionsbetrag (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.deposit_amount}
                        onChange={(e) => setForm(f => ({ ...f, deposit_amount: e.target.value }))}
                        placeholder="z.B. 1500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kautionsart</Label>
                      <Select value={form.deposit_type} onValueChange={(v) => setForm(f => ({ ...f, deposit_type: v as any }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">Barkaution</SelectItem>
                          <SelectItem value="bankgarantie">Bankgarantie</SelectItem>
                          <SelectItem value="sparbuch">Sparbuch</SelectItem>
                          <SelectItem value="versicherung">Kautionsversicherung</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Eingangsdatum</Label>
                      <Input
                        type="date"
                        value={form.deposit_paid_date}
                        onChange={(e) => setForm(f => ({ ...f, deposit_paid_date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Zinssatz (%/Jahr)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={form.interest_rate}
                        onChange={(e) => setForm(f => ({ ...f, interest_rate: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Bankverbindung / Sparbuchnr. (optional)</Label>
                    <Input
                      value={form.bank_account}
                      onChange={(e) => setForm(f => ({ ...f, bank_account: e.target.value }))}
                      placeholder="z.B. Sparbuch Nr. 12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Anmerkung (optional)</Label>
                    <Input
                      value={form.notes}
                      onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Abbrechen</Button>
                  <Button onClick={handleCreate} disabled={!form.deposit_amount || createDeposit.isPending}>
                    Kaution speichern
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {deposit ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-xs text-muted-foreground">Betrag</p>
                <p className="font-bold text-lg">{formatCurrency(deposit.deposit_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Art</p>
                <Badge variant="secondary">{depositTypeLabels[deposit.deposit_type]}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Eingang</p>
                <p className="font-medium">
                  {deposit.deposit_paid_date
                    ? format(parseISO(deposit.deposit_paid_date), 'dd.MM.yyyy', { locale: de })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={deposit.deposit_returned_date ? 'destructive' : 'default'}>
                  {deposit.deposit_returned_date ? 'Rückerstattet' : 'Aktiv'}
                </Badge>
              </div>
            </div>

            {deposit.interest_rate > 0 && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Zinssatz</p>
                  <p className="font-medium">{deposit.interest_rate}% p.a.</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Aufgelaufene Zinsen</p>
                  <p className="font-medium">{formatCurrency(deposit.interest_accrued || 0)}</p>
                </div>
              </div>
            )}

            {deposit.deposit_returned_date && (
              <div className="p-3 rounded-lg border space-y-2">
                <p className="text-sm font-medium">Rückerstattung</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Datum</p>
                    <p>{format(parseISO(deposit.deposit_returned_date), 'dd.MM.yyyy', { locale: de })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rückerstattet</p>
                    <p className="font-medium">{formatCurrency(deposit.deposit_returned_amount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Abzüge</p>
                    <p className="font-medium text-destructive">{formatCurrency(deposit.deductions || 0)}</p>
                  </div>
                </div>
                {deposit.deduction_notes && (
                  <p className="text-xs text-muted-foreground">Grund: {deposit.deduction_notes}</p>
                )}
              </div>
            )}

            {!deposit.deposit_returned_date && (
              <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Undo2 className="h-4 w-4 mr-2" />
                    Kaution rückerstatten
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Kaution rückerstatten</DialogTitle>
                    <DialogDescription>
                      Kaution: {formatCurrency(deposit.deposit_amount)} + Zinsen: {formatCurrency(deposit.interest_accrued || 0)}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Abzüge (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={returnForm.deductions}
                        onChange={(e) => setReturnForm(f => ({ ...f, deductions: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Grund der Abzüge</Label>
                      <Textarea
                        value={returnForm.deduction_notes}
                        onChange={(e) => setReturnForm(f => ({ ...f, deduction_notes: e.target.value }))}
                        placeholder="z.B. Reparaturkosten Badezimmer..."
                      />
                    </div>
                    {returnForm.deductions && (
                      <div className="p-3 rounded-lg bg-muted/50 text-sm">
                        <p className="font-medium">
                          Rückerstattungsbetrag: {formatCurrency(
                            Math.max(0, deposit.deposit_amount + (deposit.interest_accrued || 0) - (parseFloat(returnForm.deductions) || 0))
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>Abbrechen</Button>
                    <Button onClick={handleReturn} disabled={returnDeposit.isPending}>
                      Rückerstattung durchführen
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            {existingKaution && existingKaution > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Kaution lt. Mietvertrag: <strong>{formatCurrency(existingKaution)}</strong>
                  {existingKautionBezahlt ? (
                    <Badge variant="default" className="ml-2">Bezahlt</Badge>
                  ) : (
                    <Badge variant="destructive" className="ml-2">Offen</Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Erfassen Sie die Kaution detailliert für Zinsverwaltung und Rückerstattung.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Keine Kaution erfasst.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
