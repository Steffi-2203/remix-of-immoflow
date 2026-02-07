import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileCheck, Ban } from 'lucide-react';
import { useInvoices, useUpdateInvoiceStatus } from '@/hooks/useInvoices';
import { useTenants } from '@/hooks/useTenants';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { toast } from 'sonner';

interface BatchInvoiceActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type BatchAction = 'bezahlt' | 'storniert';

const statusLabels: Record<string, string> = {
  offen: 'Offen',
  bezahlt: 'Bezahlt',
  teilbezahlt: 'Teilbezahlt',
  ueberfaellig: 'Überfällig',
  storniert: 'Storniert',
};

const statusStyles: Record<string, string> = {
  offen: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  bezahlt: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  teilbezahlt: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ueberfaellig: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function BatchInvoiceActionsDialog({ open, onOpenChange }: BatchInvoiceActionsDialogProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const [filterPropertyId, setFilterPropertyId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('offen');
  const [batchAction, setBatchAction] = useState<BatchAction>('bezahlt');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: invoices = [] } = useInvoices(selectedYear, selectedMonth);
  const { data: tenants = [] } = useTenants();
  const { data: properties = [] } = useProperties();
  const { data: units = [] } = useUnits();
  const updateStatus = useUpdateInvoiceStatus();

  const getTenant = (id: string) => tenants.find((t: any) => t.id === id);
  const getUnit = (id: string) => units.find((u: any) => u.id === id);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv: any) => {
      if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
      if (filterPropertyId !== 'all') {
        const tenant = getTenant(inv.tenant_id);
        const unit = tenant ? getUnit((tenant as any).unit_id) : null;
        if (unit?.property_id !== filterPropertyId) return false;
      }
      return true;
    });
  }, [invoices, filterStatus, filterPropertyId, tenants, units]);

  const toggleAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map((i: any) => i.id)));
    }
  };

  const toggleId = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleApply = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    let ok = 0, fail = 0;

    for (const id of selectedIds) {
      try {
        await updateStatus.mutateAsync({
          id,
          status: batchAction as any,
          bezahltAm: batchAction === 'bezahlt' ? new Date().toISOString().split('T')[0] : undefined,
        });
        ok++;
      } catch {
        fail++;
      }
    }

    setIsProcessing(false);
    toast.success(`${ok} Vorschreibungen ${batchAction === 'bezahlt' ? 'als bezahlt markiert' : 'storniert'}${fail > 0 ? `, ${fail} Fehler` : ''}`);
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  const months = [
    { value: '1', label: 'Jänner' }, { value: '2', label: 'Februar' }, { value: '3', label: 'März' },
    { value: '4', label: 'April' }, { value: '5', label: 'Mai' }, { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' }, { value: '8', label: 'August' }, { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' }, { value: '11', label: 'November' }, { value: '12', label: 'Dezember' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Sammel-Aktionen Vorschreibungen
          </DialogTitle>
          <DialogDescription>
            Markieren Sie mehrere Vorschreibungen gleichzeitig als bezahlt oder stornieren Sie diese.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth?.toString() || 'all'} onValueChange={(v) => setSelectedMonth(v === 'all' ? undefined : parseInt(v))}>
              <SelectTrigger><SelectValue placeholder="Alle Monate" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Monate</SelectItem>
                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPropertyId} onValueChange={setFilterPropertyId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Liegenschaften</SelectItem>
                {properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="offen">Offen</SelectItem>
                <SelectItem value="ueberfaellig">Überfällig</SelectItem>
                <SelectItem value="teilbezahlt">Teilbezahlt</SelectItem>
              </SelectContent>
            </Select>
            <Select value={batchAction} onValueChange={(v) => setBatchAction(v as BatchAction)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bezahlt">Als bezahlt markieren</SelectItem>
                <SelectItem value="storniert">Stornieren</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Monat</TableHead>
                  <TableHead>Mieter</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fällig</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Keine Vorschreibungen mit den gewählten Filtern gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.slice(0, 100).map((inv: any) => {
                    const tenant = getTenant(inv.tenant_id);
                    return (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <Checkbox checked={selectedIds.has(inv.id)} onCheckedChange={() => toggleId(inv.id)} />
                        </TableCell>
                        <TableCell>{inv.month}/{inv.year}</TableCell>
                        <TableCell className="font-medium">
                          {tenant ? `${(tenant as any).first_name} ${(tenant as any).last_name}` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          € {Number(inv.gesamtbetrag).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusStyles[inv.status] || ''}>
                            {statusLabels[inv.status] || inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{inv.faellig_am}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {filteredInvoices.length > 100 && (
              <div className="p-3 bg-muted text-sm text-muted-foreground text-center">
                Zeige 100 von {filteredInvoices.length} — bitte filtern Sie genauer
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center gap-2 mr-auto text-sm text-muted-foreground">
            {selectedIds.size} ausgewählt
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button
            onClick={handleApply}
            disabled={selectedIds.size === 0 || isProcessing}
            variant={batchAction === 'storniert' ? 'destructive' : 'default'}
          >
            {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {batchAction === 'bezahlt' ? <FileCheck className="h-4 w-4 mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
            {selectedIds.size} {batchAction === 'bezahlt' ? 'als bezahlt' : 'stornieren'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
