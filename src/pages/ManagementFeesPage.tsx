import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useManagementFees, useCreateManagementFee, useDeleteManagementFee, FEE_TYPE_LABELS, BASIS_TYPE_LABELS } from '@/hooks/useManagementFees';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useOrganization } from '@/hooks/useOrganization';
import { Calculator, Plus, Trash2, Euro } from 'lucide-react';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(amount);
}

export default function ManagementFeesPage() {
  const { data: organization } = useOrganization();
  const { data: properties } = useProperties();
  const { data: units } = useUnits();
  const { data: fees, isLoading } = useManagementFees();
  const createFee = useCreateManagementFee();
  const deleteFee = useDeleteManagementFee();

  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    property_id: '', year: new Date().getFullYear(),
    fee_type: 'verwaltung' as string, basis_type: 'pro_einheit' as string,
    basis_value: '', notes: '',
  });

  const calculateFee = () => {
    const basisValue = parseFloat(form.basis_value) || 0;
    const propertyUnits = units?.filter(u => u.property_id === form.property_id) || [];
    const unitCount = propertyUnits.length;
    const totalArea = propertyUnits.reduce((sum, u) => sum + (u.flaeche || 0), 0);

    let calculatedFee = 0;
    switch (form.basis_type) {
      case 'pro_einheit': calculatedFee = basisValue * unitCount * 12; break;
      case 'pro_qm': calculatedFee = basisValue * totalArea * 12; break;
      case 'pauschal': calculatedFee = basisValue * 12; break;
      case 'prozent_miete': calculatedFee = basisValue; break; // annual amount directly
    }

    const vatRate = 20;
    const vatAmount = Math.round(calculatedFee * vatRate) / 100;
    return { calculatedFee: Math.round(calculatedFee * 100) / 100, vatRate, vatAmount, totalWithVat: Math.round((calculatedFee + vatAmount) * 100) / 100, unitCount, totalArea };
  };

  const preview = form.property_id && form.basis_value ? calculateFee() : null;

  const handleCreate = async () => {
    if (!form.property_id || !form.basis_value || !organization || !preview) return;
    await createFee.mutateAsync({
      organization_id: organization.id,
      property_id: form.property_id,
      year: form.year,
      fee_type: form.fee_type as any,
      basis_type: form.basis_type as any,
      basis_value: parseFloat(form.basis_value),
      unit_count: preview.unitCount,
      total_area: preview.totalArea,
      calculated_fee: preview.calculatedFee,
      vat_rate: preview.vatRate,
      vat_amount: preview.vatAmount,
      total_with_vat: preview.totalWithVat,
      notes: form.notes || null,
    } as any);
    setShowNew(false);
    setForm({ property_id: '', year: new Date().getFullYear(), fee_type: 'verwaltung', basis_type: 'pro_einheit', basis_value: '', notes: '' });
  };

  return (
    <MainLayout title="Verwaltungshonorar" subtitle="EAVG-konforme Honorarberechnung">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Honorarübersicht</h2>
          </div>
          <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" />Honorar berechnen</Button>
        </div>

        {!fees || fees.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Euro className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium">Keine Honorare berechnet</p>
              <p className="text-muted-foreground text-sm">Berechnen Sie Verwaltungshonorare für Ihre Liegenschaften.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Liegenschaft</TableHead>
                    <TableHead>Jahr</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Berechnungsbasis</TableHead>
                    <TableHead className="text-right">Netto</TableHead>
                    <TableHead className="text-right">USt</TableHead>
                    <TableHead className="text-right">Brutto</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map(fee => {
                    const property = properties?.find(p => p.id === fee.property_id);
                    return (
                      <TableRow key={fee.id}>
                        <TableCell className="font-medium">{property?.name || '?'}</TableCell>
                        <TableCell>{fee.year}</TableCell>
                        <TableCell><Badge variant="outline">{FEE_TYPE_LABELS[fee.fee_type]}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatCurrency(fee.basis_value)} {BASIS_TYPE_LABELS[fee.basis_type]}
                          {fee.unit_count ? ` (${fee.unit_count} Einh.)` : ''}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(fee.calculated_fee)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(fee.vat_amount)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(fee.total_with_vat)}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => deleteFee.mutate(fee.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Verwaltungshonorar berechnen</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Liegenschaft</Label>
                <Select value={form.property_id} onValueChange={v => setForm(f => ({ ...f, property_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                  <SelectContent>{properties?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jahr</Label>
                <Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) || new Date().getFullYear() }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Honorartyp</Label>
                <Select value={form.fee_type} onValueChange={v => setForm(f => ({ ...f, fee_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FEE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Berechnungsbasis</Label>
                <Select value={form.basis_type} onValueChange={v => setForm(f => ({ ...f, basis_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BASIS_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                {form.basis_type === 'pro_einheit' ? 'Betrag pro Einheit/Monat' :
                 form.basis_type === 'pro_qm' ? 'Betrag pro m²/Monat' :
                 form.basis_type === 'pauschal' ? 'Monatspauschale' : 'Jahresbetrag'}
              </Label>
              <Input type="number" step="0.01" value={form.basis_value} onChange={e => setForm(f => ({ ...f, basis_value: e.target.value }))} placeholder="0.00" />
            </div>

            {preview && (
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="font-semibold text-sm">Vorschau (Jahreshonorar)</p>
                <div className="flex justify-between text-sm">
                  <span>Netto</span><span>{formatCurrency(preview.calculatedFee)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>USt ({preview.vatRate}%)</span><span>{formatCurrency(preview.vatAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Brutto</span><span>{formatCurrency(preview.totalWithVat)}</span>
                </div>
                {preview.unitCount > 0 && (
                  <p className="text-xs text-muted-foreground">{preview.unitCount} Einheiten, {preview.totalArea.toFixed(1)} m² Gesamtfläche</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Notizen (optional)</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={!form.property_id || !form.basis_value}>Berechnen & Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
