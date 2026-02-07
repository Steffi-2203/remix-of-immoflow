import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, AlertTriangle } from 'lucide-react';
import { useTenants, useUpdateTenant } from '@/hooks/useTenants';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { toast } from 'sonner';

interface BatchRentAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AdjustmentType = 'prozent' | 'absolut';
type AdjustmentField = 'grundmiete' | 'betriebskosten_vorschuss' | 'heizungskosten_vorschuss';

export function BatchRentAdjustmentDialog({ open, onOpenChange }: BatchRentAdjustmentDialogProps) {
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('prozent');
  const [adjustmentField, setAdjustmentField] = useState<AdjustmentField>('grundmiete');
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [filterPropertyId, setFilterPropertyId] = useState('all');
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: tenants = [] } = useTenants();
  const { data: properties = [] } = useProperties();
  const { data: units = [] } = useUnits();
  const updateTenant = useUpdateTenant();

  const activeTenants = useMemo(() => {
    return tenants.filter((t: any) => {
      const isActive = t.status === 'aktiv';
      if (filterPropertyId === 'all') return isActive;
      const unit = units.find((u: any) => u.id === t.unit_id);
      return isActive && unit?.property_id === filterPropertyId;
    });
  }, [tenants, units, filterPropertyId]);

  const getUnit = (unitId: string) => units.find((u: any) => u.id === unitId);
  const getProperty = (unitId: string) => {
    const unit = getUnit(unitId);
    return unit ? properties.find((p: any) => p.id === unit.property_id) : null;
  };

  const fieldLabels: Record<AdjustmentField, string> = {
    grundmiete: 'Grundmiete',
    betriebskosten_vorschuss: 'BK-Vorschuss',
    heizungskosten_vorschuss: 'HK-Vorschuss',
  };

  const calcNewValue = (currentValue: number) => {
    const val = parseFloat(adjustmentValue.replace(',', '.')) || 0;
    if (adjustmentType === 'prozent') {
      return currentValue * (1 + val / 100);
    }
    return currentValue + val;
  };

  const toggleAll = () => {
    if (selectedTenants.size === activeTenants.length) {
      setSelectedTenants(new Set());
    } else {
      setSelectedTenants(new Set(activeTenants.map((t: any) => t.id)));
    }
  };

  const toggleTenant = (id: string) => {
    const next = new Set(selectedTenants);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTenants(next);
  };

  const handleApply = async () => {
    if (selectedTenants.size === 0 || !adjustmentValue) return;
    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const tenantId of selectedTenants) {
      const tenant = activeTenants.find((t: any) => t.id === tenantId);
      if (!tenant) continue;

      const currentValue = Number((tenant as any)[adjustmentField] || 0);
      const newValue = Math.round(calcNewValue(currentValue) * 100) / 100;

      try {
        await updateTenant.mutateAsync({
          id: tenantId,
          [adjustmentField]: newValue,
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsProcessing(false);
    toast.success(`${successCount} Mieten angepasst${errorCount > 0 ? `, ${errorCount} Fehler` : ''}`);
    onOpenChange(false);
    setSelectedTenants(new Set());
    setAdjustmentValue('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Massen-Mietanpassung
          </DialogTitle>
          <DialogDescription>
            Passen Sie Mieten für mehrere Mieter gleichzeitig an.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Feld</Label>
              <Select value={adjustmentField} onValueChange={(v) => setAdjustmentField(v as AdjustmentField)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="grundmiete">Grundmiete</SelectItem>
                  <SelectItem value="betriebskosten_vorschuss">BK-Vorschuss</SelectItem>
                  <SelectItem value="heizungskosten_vorschuss">HK-Vorschuss</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Art</Label>
              <Select value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as AdjustmentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prozent">Prozentual (%)</SelectItem>
                  <SelectItem value="absolut">Absolut (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{adjustmentType === 'prozent' ? 'Anpassung (%)' : 'Anpassung (€)'}</Label>
              <Input
                placeholder={adjustmentType === 'prozent' ? 'z.B. 3,5' : 'z.B. 25,00'}
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Liegenschaft</Label>
              <Select value={filterPropertyId} onValueChange={setFilterPropertyId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  {properties.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {adjustmentValue && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <span>
                {fieldLabels[adjustmentField]} wird um{' '}
                <strong>{adjustmentType === 'prozent' ? `${adjustmentValue}%` : `€ ${adjustmentValue}`}</strong>{' '}
                {parseFloat(adjustmentValue.replace(',', '.')) >= 0 ? 'erhöht' : 'gesenkt'} für{' '}
                <strong>{selectedTenants.size}</strong> Mieter.
              </span>
            </div>
          )}

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedTenants.size === activeTenants.length && activeTenants.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Mieter</TableHead>
                  <TableHead>Einheit</TableHead>
                  <TableHead className="text-right">Aktuell (€)</TableHead>
                  <TableHead className="text-right">Neu (€)</TableHead>
                  <TableHead className="text-right">Differenz</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTenants.map((tenant: any) => {
                  const current = Number(tenant[adjustmentField] || 0);
                  const newVal = adjustmentValue ? calcNewValue(current) : current;
                  const diff = newVal - current;
                  const unit = getUnit(tenant.unit_id);

                  return (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTenants.has(tenant.id)}
                          onCheckedChange={() => toggleTenant(tenant.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{tenant.first_name} {tenant.last_name}</TableCell>
                      <TableCell>{(unit as any)?.top_nummer || '—'}</TableCell>
                      <TableCell className="text-right">€ {current.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">€ {newVal.toFixed(2)}</TableCell>
                      <TableCell className={`text-right ${diff > 0 ? 'text-destructive' : diff < 0 ? 'text-green-600' : ''}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button
            onClick={handleApply}
            disabled={selectedTenants.size === 0 || !adjustmentValue || isProcessing}
          >
            {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {selectedTenants.size} Mieten anpassen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
