import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateWegBusinessPlan,
  useCreateWegBusinessPlanItem,
  useDeleteWegBusinessPlanItem,
  useWegBusinessPlanItems,
  useGenerateOwnerInvoices,
  calculateMonthlyDistribution,
  checkMinReserve,
  categoryLabels,
  type WegBusinessPlanItem,
  type WegBusinessPlan,
} from '@/hooks/useWegBusinessPlan';
import { usePropertyOwners } from '@/hooks/usePropertyOwners';
import { useUnits } from '@/hooks/useUnits';
import { generateWirtschaftsplanPdf } from '@/utils/wegVorschreibungPdfExport';

interface BusinessPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  organizationId: string | null;
  existingPlan?: WegBusinessPlan;
}

const emptyItem = { category: 'betriebskosten' as const, description: '', annual_amount: '', tax_rate: '10', distribution_key: 'mea' as const };

function fmt(n: number) {
  return `€ ${n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BusinessPlanDialog({ open, onOpenChange, propertyId, organizationId, existingPlan }: BusinessPlanDialogProps) {
  const isEdit = !!existingPlan;
  const [year, setYear] = useState(existingPlan?.year?.toString() || String(new Date().getFullYear() + 1));
  const [title, setTitle] = useState(existingPlan?.title || `Wirtschaftsplan ${new Date().getFullYear() + 1}`);
  const [effectiveDate, setEffectiveDate] = useState(existingPlan?.effective_date || `${new Date().getFullYear() + 1}-01-01`);
  const [notes, setNotes] = useState(existingPlan?.notes || '');

  // Local items for new plan creation
  const [localItems, setLocalItems] = useState<typeof emptyItem[]>([{ ...emptyItem }]);

  const { data: existingItems = [] } = useWegBusinessPlanItems(existingPlan?.id);
  const { data: owners = [] } = usePropertyOwners(propertyId);
  const { data: units = [] } = useUnits(propertyId);

  const createPlan = useCreateWegBusinessPlan();
  const createItem = useCreateWegBusinessPlanItem();
  const deleteItem = useDeleteWegBusinessPlanItem();
  const generateInvoices = useGenerateOwnerInvoices();

  // Map owners to units with MEA
  const ownerUnits = owners.map((o) => {
    const unit = units.find((u: any) => {
      // Try to match owner to unit - simplified: use all units proportionally
      return true;
    });
    return {
      ownerId: o.id,
      ownerName: o.name,
      unitId: unit?.id || null,
      mea: o.ownership_share, // Use ownership_share as MEA proxy
      qm: (unit as any)?.size || 0,
    };
  });

  const itemsForCalc: WegBusinessPlanItem[] = isEdit
    ? existingItems
    : localItems.map((li, i) => ({
        id: `temp-${i}`,
        business_plan_id: '',
        category: li.category as any,
        description: li.description,
        annual_amount: parseFloat(li.annual_amount.replace(',', '.')) || 0,
        tax_rate: parseInt(li.tax_rate) || 0,
        distribution_key: li.distribution_key as any,
        created_at: '',
      }));

  const preview = calculateMonthlyDistribution(itemsForCalc, ownerUnits);
  const totalAnnual = itemsForCalc.reduce((s, i) => s + i.annual_amount, 0);
  const reserveAnnual = itemsForCalc.filter((i) => i.category === 'ruecklage').reduce((s, i) => s + i.annual_amount, 0);
  const totalQm = ownerUnits.reduce((s, o) => s + o.qm, 0);
  const reserveCheck = checkMinReserve(reserveAnnual, totalQm);

  const addItem = () => setLocalItems([...localItems, { ...emptyItem }]);
  const removeItem = (idx: number) => setLocalItems(localItems.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: string) => {
    const updated = [...localItems];
    (updated[idx] as any)[field] = value;
    setLocalItems(updated);
  };

  const handleCreate = async () => {
    if (!title || !year || localItems.length === 0) {
      toast.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    try {
      const plan = await createPlan.mutateAsync({
        organization_id: organizationId,
        property_id: propertyId,
        year: parseInt(year),
        title,
        status: 'entwurf',
        effective_date: effectiveDate,
        total_amount: totalAnnual,
        notes: notes || null,
        approved_at: null,
        approved_in_assembly_id: null,
      });

      // Create items
      for (const li of localItems) {
        await createItem.mutateAsync({
          business_plan_id: plan.id,
          category: li.category as any,
          description: li.description,
          annual_amount: parseFloat(li.annual_amount.replace(',', '.')) || 0,
          tax_rate: parseInt(li.tax_rate) || 0,
          distribution_key: li.distribution_key as any,
        });
      }

      onOpenChange(false);
    } catch {
      // Error already toasted
    }
  };

  const handleGenerateInvoices = async () => {
    if (!existingPlan) return;

    const invoices = [];
    for (const line of preview) {
      for (let m = 1; m <= 12; m++) {
        const dueDate = new Date(parseInt(year), m - 1, 5);
        invoices.push({
          business_plan_id: existingPlan.id,
          owner_id: line.ownerId,
          unit_id: line.unitId,
          year: parseInt(year),
          month: m,
          amount_net: line.monthlyNet,
          amount_tax: line.monthlyTax,
          amount_gross: line.monthlyGross,
          reserve_contribution: line.reserveContribution,
          status: 'offen' as const,
          due_date: dueDate.toISOString().split('T')[0],
          is_prorated: false,
          prorated_days: null,
          total_days: null,
          pdf_url: null,
        });
      }
    }

    await generateInvoices.mutateAsync(invoices);
  };

  const handleExportPdf = () => {
    const blob = generateWirtschaftsplanPdf({
      propertyName: 'Liegenschaft',
      propertyAddress: '',
      year: parseInt(year),
      title,
      effectiveDate,
      items: itemsForCalc.map((i) => ({
        description: i.description,
        category: categoryLabels[i.category] || i.category,
        annualAmount: i.annual_amount,
        taxRate: i.tax_rate,
        distributionKey: i.distribution_key,
      })),
      totalAnnual,
      ownerBreakdown: preview.map((p) => ({
        ownerName: p.ownerName,
        unitNumber: '',
        mea: ownerUnits.find((o) => o.ownerId === p.ownerId)?.mea || 0,
        monthlyGross: p.monthlyGross,
        monthlyReserve: p.reserveContribution,
      })),
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Wirtschaftsplan_${year}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? title : 'Neuer Wirtschaftsplan'}</DialogTitle>
          <DialogDescription>Budget-Positionen und automatische Vorschreibungsgenerierung</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Titel</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isEdit} />
            </div>
            <div className="space-y-2">
              <Label>Jahr</Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} disabled={isEdit} />
            </div>
            <div className="space-y-2">
              <Label>Stichtag</Label>
              <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} disabled={isEdit} />
            </div>
          </div>

          {/* Reserve check warning */}
          {totalQm > 0 && !reserveCheck.ok && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Rücklagendotierung {fmt(reserveCheck.perQmMonth)}/m²/Monat unterschreitet die gesetzliche Mindestdotierung von € {reserveCheck.minimum.toFixed(2)}/m²/Monat (WEG-Novelle 2022).
              </AlertDescription>
            </Alert>
          )}

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Positionen</Label>
              {!isEdit && (
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" /> Position
                </Button>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Jahresbetrag</TableHead>
                  <TableHead>USt %</TableHead>
                  <TableHead>Verteilung</TableHead>
                  {!isEdit && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isEdit
                  ? existingItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell><Badge variant="outline">{categoryLabels[item.category]}</Badge></TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{fmt(item.annual_amount)}</TableCell>
                        <TableCell>{item.tax_rate}%</TableCell>
                        <TableCell>{item.distribution_key.toUpperCase()}</TableCell>
                      </TableRow>
                    ))
                  : localItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select value={item.category} onValueChange={(v) => updateItem(idx, 'category', v)}>
                            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(categoryLabels).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="z.B. Liftkosten" />
                        </TableCell>
                        <TableCell>
                          <Input value={item.annual_amount} onChange={(e) => updateItem(idx, 'annual_amount', e.target.value)} placeholder="0,00" className="w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <Select value={item.tax_rate} onValueChange={(v) => updateItem(idx, 'tax_rate', v)}>
                            <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="10">10%</SelectItem>
                              <SelectItem value="20">20%</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={item.distribution_key} onValueChange={(v) => updateItem(idx, 'distribution_key', v)}>
                            <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mea">MEA</SelectItem>
                              <SelectItem value="qm">m²</SelectItem>
                              <SelectItem value="gleich">Gleich</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {localItems.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
            <p className="text-sm text-muted-foreground mt-1">Gesamt: {fmt(totalAnnual)} / Jahr</p>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <Label className="text-base font-semibold">Monatliche Vorschüsse je Eigentümer</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Eigentümer</TableHead>
                    <TableHead className="text-right">Netto</TableHead>
                    <TableHead className="text-right">USt</TableHead>
                    <TableHead className="text-right">Rücklage</TableHead>
                    <TableHead className="text-right">Brutto/Monat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((p) => (
                    <TableRow key={p.ownerId}>
                      <TableCell className="font-medium">{p.ownerName}</TableCell>
                      <TableCell className="text-right">{fmt(p.monthlyNet)}</TableCell>
                      <TableCell className="text-right">{fmt(p.monthlyTax)}</TableCell>
                      <TableCell className="text-right">{fmt(p.reserveContribution)}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(p.monthlyGross)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {notes !== undefined && !isEdit && (
            <div className="space-y-2">
              <Label>Notizen</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {isEdit && (
            <>
              <Button variant="outline" onClick={handleExportPdf}>PDF Export</Button>
              <Button
                onClick={handleGenerateInvoices}
                disabled={generateInvoices.isPending}
              >
                {generateInvoices.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Vorschreibungen generieren
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isEdit ? 'Schließen' : 'Abbrechen'}
          </Button>
          {!isEdit && (
            <Button onClick={handleCreate} disabled={createPlan.isPending || !title}>
              {createPlan.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Erstellen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
