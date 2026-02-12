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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMeters, useMeterReadings, useCreateMeter, useCreateMeterReading, useDeleteMeter, type Meter } from '@/hooks/useMeters';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { format } from 'date-fns';
import { Gauge, Plus, Trash2, BarChart3 } from 'lucide-react';

const METER_TYPE_LABELS: Record<string, string> = {
  strom: 'Strom', wasser: 'Wasser', gas: 'Gas', heizung: 'Heizung', warmwasser: 'Warmwasser', sonstiges: 'Sonstige',
};
const METER_TYPE_UNITS: Record<string, string> = {
  strom: 'kWh', wasser: 'm³', gas: 'm³', heizung: 'kWh', warmwasser: 'm³', sonstiges: '',
};

function formatNumber(n: number) {
  return new Intl.NumberFormat('de-AT', { minimumFractionDigits: 1, maximumFractionDigits: 3 }).format(n);
}
export default function MeterManagement() {
  const { data: properties } = useProperties();
  const { data: allMeters, isLoading } = useMeters();
  const createMeter = useCreateMeter();
  const createReading = useCreateMeterReading();
  const deleteMeter = useDeleteMeter();

  const [showNewMeter, setShowNewMeter] = useState(false);
  const [showNewReading, setShowNewReading] = useState(false);
  const [selectedMeterId, setSelectedMeterId] = useState<string | null>(null);
  const [filterProperty, setFilterProperty] = useState<string>('all');

  const [meterForm, setMeterForm] = useState({
    property_id: '', unit_id: '', meter_type: 'strom' as string, meter_number: '', location_description: '',
  });

  const [readingForm, setReadingForm] = useState({ reading_date: format(new Date(), 'yyyy-MM-dd'), reading_value: '', read_by: '', notes: '' });

  const { data: readings } = useMeterReadings(selectedMeterId || undefined);
  const { data: units } = useUnits();

  const filteredMeters = allMeters?.filter((m: any) => filterProperty === 'all' || m.property_id === filterProperty) || [];
  const propertyUnits = units?.filter(u => u.property_id === meterForm.property_id) || [];

  const handleCreateMeter = async () => {
    if (!meterForm.property_id || !meterForm.unit_id || !meterForm.meter_number) return;
    await createMeter.mutateAsync({
      unit_id: meterForm.unit_id,
      property_id: meterForm.property_id,
      meter_number: meterForm.meter_number,
      meter_type: meterForm.meter_type as any,
      location: meterForm.location_description || null,
    });
    setShowNewMeter(false);
    setMeterForm({ property_id: '', unit_id: '', meter_type: 'strom', meter_number: '', location_description: '' });
  };

  const handleCreateReading = async () => {
    if (!selectedMeterId || !readingForm.reading_value) return;
    const value = parseFloat(readingForm.reading_value);

    await createReading.mutateAsync({
      meter_id: selectedMeterId,
      reading_date: readingForm.reading_date,
      reading_value: value,
      read_by: readingForm.read_by || null,
      notes: readingForm.notes || null,
    });
    setShowNewReading(false);
    setReadingForm({ reading_date: format(new Date(), 'yyyy-MM-dd'), reading_value: '', read_by: '', notes: '' });
  };

  const selectedMeter = allMeters?.find(m => m.id === selectedMeterId);

  return (
    <MainLayout title="Zählerverwaltung" subtitle="Zähler und Ablesungen verwalten">
      <Tabs defaultValue="meters" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="meters">Zähler</TabsTrigger>
            <TabsTrigger value="readings" disabled={!selectedMeterId}>Ablesungen</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Select value={filterProperty} onValueChange={setFilterProperty}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Alle Liegenschaften" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Liegenschaften</SelectItem>
                {properties?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => setShowNewMeter(true)}><Plus className="h-4 w-4 mr-2" />Zähler anlegen</Button>
          </div>
        </div>

        <TabsContent value="meters">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" />Zählerübersicht</CardTitle></CardHeader>
            <CardContent>
              {filteredMeters.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Gauge className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Keine Zähler angelegt.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Typ</TableHead>
                      <TableHead>Zählernummer</TableHead>
                      <TableHead>Einheit</TableHead>
                      <TableHead>Standort</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMeters.map(meter => {
                      const unit = units?.find(u => u.id === meter.unit_id);
                      const property = properties?.find(p => p.id === meter.property_id);
                      return (
                        <TableRow key={meter.id} className="cursor-pointer" onClick={() => { setSelectedMeterId(meter.id); }}>
                          <TableCell>
                            <Badge variant="outline">{METER_TYPE_LABELS[meter.meter_type]}</Badge>
                          </TableCell>
                          <TableCell className="font-mono">{meter.meter_number}</TableCell>
                          <TableCell>{property?.name} – Top {unit?.top_nummer}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{meter.location_description || '-'}</TableCell>
                          <TableCell>
                            <Badge className={meter.is_active ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}>
                              {meter.is_active ? 'Aktiv' : 'Inaktiv'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedMeterId(meter.id); setShowNewReading(true); }}>
                                <BarChart3 className="h-3 w-3 mr-1" />Ablesen
                              </Button>
                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteMeter.mutate(meter.id); }}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readings">
          {selectedMeter && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{METER_TYPE_LABELS[selectedMeter.meter_type]} – {selectedMeter.meter_number}</CardTitle>
                  <Button onClick={() => setShowNewReading(true)}><Plus className="h-4 w-4 mr-2" />Ablesung erfassen</Button>
                </div>
              </CardHeader>
              <CardContent>
                {!readings || readings.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Keine Ablesungen vorhanden.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead className="text-right">Zählerstand</TableHead>
                        <TableHead className="text-right">Verbrauch</TableHead>
                        <TableHead>Einheit</TableHead>
                        <TableHead>Abgelesen von</TableHead>
                        <TableHead>Notizen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readings.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>{format(new Date(r.reading_date), 'dd.MM.yyyy')}</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(r.reading_value)}</TableCell>
                          <TableCell className="text-right font-mono">{r.consumption != null ? formatNumber(r.consumption) : '-'}</TableCell>
                          <TableCell>{r.unit}</TableCell>
                          <TableCell>{r.read_by || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* New Meter Dialog */}
      <Dialog open={showNewMeter} onOpenChange={setShowNewMeter}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neuen Zähler anlegen</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Liegenschaft</Label>
              <Select value={meterForm.property_id} onValueChange={v => setMeterForm(f => ({ ...f, property_id: v, unit_id: '' }))}>
                <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                <SelectContent>{properties?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Einheit</Label>
              <Select value={meterForm.unit_id} onValueChange={v => setMeterForm(f => ({ ...f, unit_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                <SelectContent>{propertyUnits.map(u => <SelectItem key={u.id} value={u.id}>Top {u.top_nummer}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Zählertyp</Label>
              <Select value={meterForm.meter_type} onValueChange={v => setMeterForm(f => ({ ...f, meter_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(METER_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Zählernummer</Label>
              <Input value={meterForm.meter_number} onChange={e => setMeterForm(f => ({ ...f, meter_number: e.target.value }))} placeholder="z.B. 12345678" />
            </div>
            <div className="space-y-2">
              <Label>Standort (optional)</Label>
              <Input value={meterForm.location_description} onChange={e => setMeterForm(f => ({ ...f, location_description: e.target.value }))} placeholder="z.B. Keller Raum 3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewMeter(false)}>Abbrechen</Button>
            <Button onClick={handleCreateMeter} disabled={!meterForm.property_id || !meterForm.unit_id || !meterForm.meter_number}>Anlegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Reading Dialog */}
      <Dialog open={showNewReading} onOpenChange={setShowNewReading}>
        <DialogContent>
          <DialogHeader><DialogTitle>Zählerablesung erfassen</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {selectedMeter && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p><strong>{METER_TYPE_LABELS[selectedMeter.meter_type]}</strong> – {selectedMeter.meter_number}</p>
                {readings?.[0] && <p className="text-muted-foreground">Letzter Stand: {formatNumber(readings[0].reading_value)} {readings[0].unit} am {format(new Date(readings[0].reading_date), 'dd.MM.yyyy')}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label>Ablesedatum</Label>
              <Input type="date" value={readingForm.reading_date} onChange={e => setReadingForm(f => ({ ...f, reading_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Zählerstand</Label>
              <Input type="number" step="0.001" value={readingForm.reading_value} onChange={e => setReadingForm(f => ({ ...f, reading_value: e.target.value }))} placeholder="z.B. 12345.678" />
            </div>
            <div className="space-y-2">
              <Label>Abgelesen von (optional)</Label>
              <Input value={readingForm.read_by} onChange={e => setReadingForm(f => ({ ...f, read_by: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notizen (optional)</Label>
              <Input value={readingForm.notes} onChange={e => setReadingForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewReading(false)}>Abbrechen</Button>
            <Button onClick={handleCreateReading} disabled={!readingForm.reading_value}>Erfassen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
