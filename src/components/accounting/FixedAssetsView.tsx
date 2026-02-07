import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useDemoFixedAssets } from '@/hooks/useDemoAccounting';

const fmt = (v: number) => v.toLocaleString('de-AT', { minimumFractionDigits: 2 }) + ' €';

interface FixedAsset {
  id: string;
  name: string;
  description: string | null;
  asset_type: string;
  acquisition_date: string;
  acquisition_cost: number;
  residual_value: number;
  useful_life_years: number;
  depreciation_method: string;
  annual_depreciation: number | null;
  monthly_depreciation: number | null;
  is_active: boolean;
  sold_at: string | null;
  sold_amount: number | null;
  organization_id: string;
  property_id: string | null;
  notes: string | null;
  created_at: string;
}

const assetTypes: Record<string, string> = {
  building: 'Gebäude',
  equipment: 'Betriebsausstattung',
  vehicle: 'Fahrzeug',
  furniture: 'Möbel',
  it: 'IT-Ausstattung',
  other: 'Sonstiges',
};

// useFixedAssets is now replaced by useDemoFixedAssets

function calcDepreciation(cost: number, residual: number, years: number) {
  const annual = years > 0 ? (cost - residual) / years : 0;
  return { annual: Math.round(annual * 100) / 100, monthly: Math.round((annual / 12) * 100) / 100 };
}

function calcBookValue(asset: FixedAsset): number {
  const start = new Date(asset.acquisition_date);
  const now = new Date();
  const monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const totalDepreciation = (asset.monthly_depreciation || 0) * Math.max(0, monthsElapsed);
  return Math.max(asset.residual_value, asset.acquisition_cost - totalDepreciation);
}

export function FixedAssetsView() {
  const { data: assets, isLoading } = useDemoFixedAssets();
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (input: any) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single();
      if (!profile?.organization_id) throw new Error('Keine Organisation');

      const dep = calcDepreciation(input.acquisition_cost, input.residual_value, input.useful_life_years);

      const { error } = await supabase.from('fixed_assets').insert({
        ...input,
        organization_id: profile.organization_id,
        annual_depreciation: dep.annual,
        monthly_depreciation: dep.monthly,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed_assets'] });
      toast.success('Anlage erfolgreich erstellt');
      setShowCreate(false);
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  const totalCost = (assets || []).filter(a => a.is_active).reduce((s, a) => s + a.acquisition_cost, 0);
  const totalBookValue = (assets || []).filter(a => a.is_active).reduce((s, a) => s + calcBookValue(a), 0);
  const totalAnnualDep = (assets || []).filter(a => a.is_active).reduce((s, a) => s + (a.annual_depreciation || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">Anschaffungskosten</p>
            <p className="text-lg font-bold font-mono">{fmt(totalCost)}</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">Buchwert aktuell</p>
            <p className="text-lg font-bold font-mono">{fmt(totalBookValue)}</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">Jährliche AfA</p>
            <p className="text-lg font-bold font-mono">{fmt(totalAnnualDep)}</p>
          </CardContent></Card>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Neue Anlage
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><Package className="h-5 w-5" /> Anlagevermögen</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (assets || []).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Keine Anlagen erfasst.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bezeichnung</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Anschaffung</TableHead>
                    <TableHead className="text-right">Kosten</TableHead>
                    <TableHead className="text-right">Buchwert</TableHead>
                    <TableHead className="text-right">AfA/Jahr</TableHead>
                    <TableHead>ND</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(assets || []).map(asset => (
                    <TableRow key={asset.id} className={!asset.is_active ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="font-medium text-sm">{asset.name}</div>
                        {asset.description && <div className="text-xs text-muted-foreground">{asset.description}</div>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{assetTypes[asset.asset_type] || asset.asset_type}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(asset.acquisition_date).toLocaleDateString('de-AT')}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(asset.acquisition_cost)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(calcBookValue(asset))}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(asset.annual_depreciation || 0)}</TableCell>
                      <TableCell className="text-sm">{asset.useful_life_years} J.</TableCell>
                      <TableCell>
                        <Badge variant={asset.is_active ? 'default' : 'secondary'}>
                          {asset.is_active ? 'Aktiv' : 'Ausgeschieden'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateAssetDialog open={showCreate} onOpenChange={setShowCreate} onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
    </div>
  );
}

function CreateAssetDialog({ open, onOpenChange, onSubmit, isLoading }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onSubmit: (data: any) => void; isLoading: boolean;
}) {
  const [form, setForm] = useState({
    name: '', description: '', asset_type: 'building',
    acquisition_date: new Date().toISOString().slice(0, 10),
    acquisition_cost: 0, residual_value: 0, useful_life_years: 10,
    depreciation_method: 'linear', notes: '',
  });

  const dep = calcDepreciation(form.acquisition_cost, form.residual_value, form.useful_life_years);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Neue Anlage erfassen</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Bezeichnung *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div><Label>Beschreibung</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Typ</Label>
              <Select value={form.asset_type} onValueChange={v => setForm(p => ({ ...p, asset_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(assetTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Anschaffungsdatum</Label><Input type="date" value={form.acquisition_date} onChange={e => setForm(p => ({ ...p, acquisition_date: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Anschaffungskosten *</Label><Input type="number" step="0.01" value={form.acquisition_cost} onChange={e => setForm(p => ({ ...p, acquisition_cost: Number(e.target.value) }))} /></div>
            <div><Label>Restwert</Label><Input type="number" step="0.01" value={form.residual_value} onChange={e => setForm(p => ({ ...p, residual_value: Number(e.target.value) }))} /></div>
            <div><Label>Nutzungsdauer (J.)</Label><Input type="number" value={form.useful_life_years} onChange={e => setForm(p => ({ ...p, useful_life_years: Number(e.target.value) }))} /></div>
          </div>
          <Card className="bg-muted/30">
            <CardContent className="py-2 text-sm">
              <div className="flex justify-between"><span>AfA jährlich:</span><span className="font-mono">{fmt(dep.annual)}</span></div>
              <div className="flex justify-between"><span>AfA monatlich:</span><span className="font-mono">{fmt(dep.monthly)}</span></div>
            </CardContent>
          </Card>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={() => onSubmit(form)} disabled={!form.name || form.acquisition_cost <= 0 || isLoading}>
            {isLoading ? 'Speichern...' : 'Anlage erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
