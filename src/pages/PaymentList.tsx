import { useState, useRef, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Loader2, 
  Euro, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Receipt,
  Upload,
  FileSpreadsheet,
  X,
  AlertTriangle,
  Clock,
  Users,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { usePayments, useCreatePayment, useDeletePayment } from '@/hooks/usePayments';
import * as XLSX from 'xlsx';
import { useTenants } from '@/hooks/useTenants';
import { useUnits } from '@/hooks/useUnits';
import { useInvoices, useUpdateInvoiceStatus } from '@/hooks/useInvoices';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';

const paymentTypeLabels: Record<string, string> = {
  sepa: 'SEPA-Lastschrift',
  ueberweisung: 'Überweisung',
  bar: 'Barzahlung',
  sonstiges: 'Sonstiges',
};

interface ImportRow {
  datum: string;
  betrag: number;
  referenz: string;
  matchedTenant: any;
  matchedInvoice: any;
  selected: boolean;
}

export default function PaymentList() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newPayment, setNewPayment] = useState({
    betrag: '',
    referenz: '',
    zahlungsart: 'ueberweisung' as 'sepa' | 'ueberweisung' | 'bar' | 'sonstiges',
    eingangs_datum: format(new Date(), 'yyyy-MM-dd'),
    buchungs_datum: format(new Date(), 'yyyy-MM-dd'),
  });
  const [matchedTenant, setMatchedTenant] = useState<any>(null);
  const [matchedInvoice, setMatchedInvoice] = useState<any>(null);

  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const { data: tenants } = useTenants();
  const { data: units } = useUnits();
  const { data: invoices } = useInvoices();
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();
  const updateInvoiceStatus = useUpdateInvoiceStatus();

  // Handle payment deletion (storno)
  const handleDeletePayment = async (payment: any) => {
    if (!confirm('Möchten Sie diese Zahlung wirklich stornieren/löschen?')) return;
    
    try {
      // If payment was linked to an invoice, reopen that invoice
      if (payment.invoice_id) {
        await updateInvoiceStatus.mutateAsync({
          id: payment.invoice_id,
          status: 'offen',
          bezahltAm: null,
        });
      }
      
      await deletePayment.mutateAsync(payment.id);
    } catch (error) {
      console.error('Delete payment error:', error);
    }
  };

  // Match a referenz to tenant and invoice
  const matchReferenz = (referenz: string) => {
    if (!referenz) return { tenant: null, invoice: null };
    
    const normalizedRef = referenz.toLowerCase().trim();
    const matchedUnit = units?.find(u => 
      u.top_nummer.toLowerCase().includes(normalizedRef) ||
      normalizedRef.includes(u.top_nummer.toLowerCase())
    );

    if (matchedUnit) {
      const tenant = tenants?.find(t => t.unit_id === matchedUnit.id && t.status === 'aktiv');
      if (tenant) {
        const openInvoices = invoices
          ?.filter(i => i.tenant_id === tenant.id && i.status === 'offen')
          .sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
          });

        return { 
          tenant, 
          invoice: openInvoices && openInvoices.length > 0 ? openInvoices[0] : null 
        };
      }
    }
    return { tenant: null, invoice: null };
  };

  // Handle Excel file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // Parse rows (skip header row)
        const rows: ImportRow[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 2) continue;

          // Try to parse date (first column)
          let datum = '';
          const rawDate = row[0];
          if (rawDate) {
            if (typeof rawDate === 'number') {
              // Excel serial date
              const excelDate = XLSX.SSF.parse_date_code(rawDate);
              datum = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
            } else if (typeof rawDate === 'string') {
              // Try DD.MM.YYYY or YYYY-MM-DD
              const parts = rawDate.split(/[./-]/);
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  datum = rawDate;
                } else {
                  datum = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              }
            }
          }

          // Parse amount (second column)
          let betrag = 0;
          const rawBetrag = row[1];
          if (typeof rawBetrag === 'number') {
            betrag = rawBetrag;
          } else if (typeof rawBetrag === 'string') {
            betrag = parseFloat(rawBetrag.replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
          }

          // Skip negative amounts (outgoing payments)
          if (betrag <= 0) continue;

          // Referenz (third column)
          const referenz = String(row[2] || '');

          // Match to tenant
          const { tenant, invoice } = matchReferenz(referenz);

          rows.push({
            datum: datum || format(new Date(), 'yyyy-MM-dd'),
            betrag,
            referenz,
            matchedTenant: tenant,
            matchedInvoice: invoice,
            selected: !!tenant, // Auto-select if matched
          });
        }

        setImportData(rows);
        setImportDialogOpen(true);
      } catch (error) {
        console.error('Excel parse error:', error);
        toast({
          title: 'Fehler beim Lesen der Datei',
          description: 'Die Datei konnte nicht gelesen werden. Bitte überprüfen Sie das Format.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Toggle row selection
  const toggleRowSelection = (index: number) => {
    setImportData(prev => prev.map((row, i) => 
      i === index ? { ...row, selected: !row.selected } : row
    ));
  };

  // Select all matched
  const selectAllMatched = () => {
    setImportData(prev => prev.map(row => ({ ...row, selected: !!row.matchedTenant })));
  };

  // Import selected payments
  const handleImportPayments = async () => {
    const selectedRows = importData.filter(row => row.selected && row.matchedTenant);
    if (selectedRows.length === 0) {
      toast({
        title: 'Keine Zahlungen ausgewählt',
        description: 'Bitte wählen Sie mindestens eine Zahlung zum Import aus.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    let imported = 0;

    for (const row of selectedRows) {
      try {
        await createPayment.mutateAsync({
          tenant_id: row.matchedTenant.id,
          invoice_id: row.matchedInvoice?.id || null,
          betrag: row.betrag,
          zahlungsart: 'ueberweisung',
          referenz: row.referenz,
          eingangs_datum: row.datum,
          buchungs_datum: row.datum,
        });

        // Update invoice status if matched
        if (row.matchedInvoice) {
          const invoiceAmount = Number(row.matchedInvoice.gesamtbetrag);
          if (row.betrag >= invoiceAmount) {
            await updateInvoiceStatus.mutateAsync({
              id: row.matchedInvoice.id,
              status: 'bezahlt',
              bezahltAm: row.datum,
            });
          } else {
            await updateInvoiceStatus.mutateAsync({
              id: row.matchedInvoice.id,
              status: 'teilbezahlt',
            });
          }
        }
        imported++;
      } catch (error) {
        console.error('Import error for row:', row, error);
      }
    }

    setIsImporting(false);
    setImportDialogOpen(false);
    setImportData([]);

    toast({
      title: 'Import abgeschlossen',
      description: `${imported} von ${selectedRows.length} Zahlungen erfolgreich importiert.`,
    });
  };

  // Auto-match based on reference (Top number)
  const handleReferenzChange = (referenz: string) => {
    setNewPayment(prev => ({ ...prev, referenz }));
    setMatchedTenant(null);
    setMatchedInvoice(null);

    if (!referenz) return;

    // Find unit by top number
    const normalizedRef = referenz.toLowerCase().trim();
    const matchedUnit = units?.find(u => 
      u.top_nummer.toLowerCase().includes(normalizedRef) ||
      normalizedRef.includes(u.top_nummer.toLowerCase())
    );

    if (matchedUnit) {
      // Find active tenant for this unit
      const tenant = tenants?.find(t => t.unit_id === matchedUnit.id && t.status === 'aktiv');
      if (tenant) {
        setMatchedTenant(tenant);

        // Find oldest open invoice for this tenant
        const openInvoices = invoices
          ?.filter(i => i.tenant_id === tenant.id && i.status === 'offen')
          .sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
          });

        if (openInvoices && openInvoices.length > 0) {
          setMatchedInvoice(openInvoices[0]);
        }
      }
    }
  };

  const handleCreatePayment = async () => {
    if (!matchedTenant) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie eine gültige Top-Nummer als Referenz ein.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create the payment
      await createPayment.mutateAsync({
        tenant_id: matchedTenant.id,
        invoice_id: matchedInvoice?.id || null,
        betrag: parseFloat(newPayment.betrag),
        zahlungsart: newPayment.zahlungsart,
        referenz: newPayment.referenz,
        eingangs_datum: newPayment.eingangs_datum,
        buchungs_datum: newPayment.buchungs_datum,
      });

      // If matched to an invoice, check if we should mark it as paid
      if (matchedInvoice) {
        const paymentAmount = parseFloat(newPayment.betrag);
        const invoiceAmount = Number(matchedInvoice.gesamtbetrag);

        if (paymentAmount >= invoiceAmount) {
          await updateInvoiceStatus.mutateAsync({
            id: matchedInvoice.id,
            status: 'bezahlt',
            bezahltAm: newPayment.eingangs_datum,
          });
          toast({
            title: 'Zahlung erfasst & Vorschreibung bezahlt',
            description: `Vorschreibung für ${format(new Date(matchedInvoice.year, matchedInvoice.month - 1), 'MMMM yyyy', { locale: de })} wurde als bezahlt markiert.`,
          });
        } else {
          await updateInvoiceStatus.mutateAsync({
            id: matchedInvoice.id,
            status: 'teilbezahlt',
          });
          toast({
            title: 'Zahlung erfasst',
            description: 'Teilzahlung wurde erfasst.',
          });
        }
      }

      // Reset form
      setDialogOpen(false);
      setNewPayment({
        betrag: '',
        referenz: '',
        zahlungsart: 'ueberweisung',
        eingangs_datum: format(new Date(), 'yyyy-MM-dd'),
        buchungs_datum: format(new Date(), 'yyyy-MM-dd'),
      });
      setMatchedTenant(null);
      setMatchedInvoice(null);
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  // Filter payments
  const filteredPayments = payments?.filter(payment => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const tenant = (payment as any).tenants;
    return (
      payment.referenz?.toLowerCase().includes(searchLower) ||
      (tenant && `${tenant.first_name} ${tenant.last_name}`.toLowerCase().includes(searchLower))
    );
  });

  // Calculate stats
  const stats = {
    total: payments?.length || 0,
    totalAmount: payments?.reduce((sum, p) => sum + Number(p.betrag), 0) || 0,
    thisMonth: payments?.filter(p => {
      const date = new Date(p.eingangs_datum);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length || 0,
    thisMonthAmount: payments?.filter(p => {
      const date = new Date(p.eingangs_datum);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).reduce((sum, p) => sum + Number(p.betrag), 0) || 0,
  };

  // Calculate open items (offene Posten) per tenant
  const openItemsPerTenant = useMemo(() => {
    if (!tenants || !invoices || !payments) return [];

    const activeTenants = tenants.filter(t => t.status === 'aktiv');
    
    return activeTenants.map(tenant => {
      // Get all invoices for this tenant
      const tenantInvoices = invoices.filter(i => i.tenant_id === tenant.id);
      const openInvoices = tenantInvoices.filter(i => i.status === 'offen' || i.status === 'teilbezahlt' || i.status === 'ueberfaellig');
      
      // Calculate total Soll (what should be paid)
      const totalSoll = tenantInvoices.reduce((sum, i) => sum + Number(i.gesamtbetrag), 0);
      
      // Calculate total Ist (what was paid)
      const tenantPayments = payments.filter(p => p.tenant_id === tenant.id);
      const totalIst = tenantPayments.reduce((sum, p) => sum + Number(p.betrag), 0);
      
      // Saldo (negative = owes money)
      const saldo = totalIst - totalSoll;
      
      // Find oldest overdue invoice for Mahnstatus
      const today = new Date();
      let oldestOverdueDays = 0;
      let oldestOverdueInvoice: any = null;
      
      openInvoices.forEach(inv => {
        const dueDate = new Date(inv.faellig_am);
        if (dueDate < today) {
          const daysDue = differenceInDays(today, dueDate);
          if (daysDue > oldestOverdueDays) {
            oldestOverdueDays = daysDue;
            oldestOverdueInvoice = inv;
          }
        }
      });

      // Determine Mahnstatus
      let mahnstatus = 'aktuell';
      if (oldestOverdueDays > 30) {
        mahnstatus = '2. Mahnung';
      } else if (oldestOverdueDays > 14) {
        mahnstatus = '1. Mahnung';
      } else if (oldestOverdueDays > 0) {
        mahnstatus = 'Zahlungserinnerung';
      }

      // Get unit info
      const unit = units?.find(u => u.id === tenant.unit_id);

      return {
        tenant,
        unit,
        openInvoices,
        totalSoll,
        totalIst,
        saldo,
        oldestOverdueDays,
        oldestOverdueInvoice,
        mahnstatus,
      };
    }).filter(item => item.saldo < 0 || item.openInvoices.length > 0)
      .sort((a, b) => a.saldo - b.saldo); // Sort by saldo ascending (most debt first)
  }, [tenants, invoices, payments, units]);

  // Get invoice details for payment breakdown
  const getPaymentBreakdown = (payment: any) => {
    if (!payment.invoice_id) return null;
    const invoice = invoices?.find(i => i.id === payment.invoice_id);
    if (!invoice) return null;
    
    return {
      miete: Number(invoice.grundmiete),
      bk: Number(invoice.betriebskosten),
      hk: Number(invoice.heizungskosten),
      ust: Number(invoice.ust),
    };
  };

  const openItemsStats = {
    totalTenants: openItemsPerTenant.length,
    totalOpenAmount: openItemsPerTenant.reduce((sum, item) => sum + Math.abs(Math.min(0, item.saldo)), 0),
    overdueCount: openItemsPerTenant.filter(item => item.oldestOverdueDays > 0).length,
  };

  return (
    <MainLayout
      title="Zahlungseingänge"
      subtitle="Zahlungen erfassen und zuordnen"
    >
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Referenz oder Mieter suchen..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex-1" />

        {/* Hidden file input for Excel import */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload}
          className="hidden"
        />

        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Excel-Import
        </Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Zahlung erfassen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Neue Zahlung erfassen</DialogTitle>
              <DialogDescription>
                Geben Sie die Zahlungsdetails ein. Die Zuordnung erfolgt automatisch anhand der Top-Nummer.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Eingangsdatum</Label>
                  <Input
                    type="date"
                    value={newPayment.eingangs_datum}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, eingangs_datum: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Buchungsdatum</Label>
                  <Input
                    type="date"
                    value={newPayment.buchungs_datum}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, buchungs_datum: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Betrag (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newPayment.betrag}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, betrag: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Referenz / Verwendungszweck (Top-Nummer)</Label>
                <Input
                  placeholder="z.B. Top 1, Top 2"
                  value={newPayment.referenz}
                  onChange={(e) => handleReferenzChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Zahlungsart</Label>
                <Select
                  value={newPayment.zahlungsart}
                  onValueChange={(value: any) => setNewPayment(prev => ({ ...prev, zahlungsart: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ueberweisung">Überweisung</SelectItem>
                    <SelectItem value="sepa">SEPA-Lastschrift</SelectItem>
                    <SelectItem value="bar">Barzahlung</SelectItem>
                    <SelectItem value="sonstiges">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Auto-Match Result */}
              {newPayment.referenz && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ArrowRight className="h-4 w-4" />
                    Automatische Zuordnung
                  </div>

                  {matchedTenant ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          Mieter: <strong>{matchedTenant.first_name} {matchedTenant.last_name}</strong>
                        </span>
                      </div>
                      
                      {matchedInvoice ? (
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">
                            Offene Vorschreibung: <strong>
                              {format(new Date(matchedInvoice.year, matchedInvoice.month - 1), 'MMMM yyyy', { locale: de })}
                            </strong>
                            {' – '}€ {Number(matchedInvoice.gesamtbetrag).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">Keine offenen Vorschreibungen</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-yellow-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Keine Zuordnung gefunden. Überprüfen Sie die Referenz.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleCreatePayment} 
                disabled={createPayment.isPending || !matchedTenant || !newPayment.betrag}
              >
                {createPayment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Zahlung erfassen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Zahlungen gesamt</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Euro className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gesamtbetrag</p>
                <p className="text-2xl font-bold">€ {stats.totalAmount.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Diesen Monat</p>
                <p className="text-2xl font-bold">{stats.thisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Euro className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Betrag diesen Monat</p>
                <p className="text-2xl font-bold">€ {stats.thisMonthAmount.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Payments and Open Items */}
      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Zahlungseingänge
          </TabsTrigger>
          <TabsTrigger value="openitems" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Offene Posten
            {openItemsStats.totalTenants > 0 && (
              <Badge variant="destructive" className="ml-1">{openItemsStats.totalTenants}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          {/* Payments Table */}
          <Card>
        <CardContent className="p-0">
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredPayments || filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine Zahlungen gefunden</p>
              <p className="text-sm text-muted-foreground mt-1">
                Klicken Sie auf "Zahlung erfassen" um eine neue Zahlung hinzuzufügen.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Eingangsdatum</TableHead>
                  <TableHead>Mieter</TableHead>
                  <TableHead>Top</TableHead>
                  <TableHead className="text-right">Miete brutto</TableHead>
                  <TableHead className="text-right">BK brutto</TableHead>
                  <TableHead className="text-right">HK brutto</TableHead>
                  <TableHead className="text-right">Gesamt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => {
                  const tenant = (payment as any).tenants;
                  const unit = tenant?.units;
                  const breakdown = getPaymentBreakdown(payment);

                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.eingangs_datum), 'dd.MM.yyyy', { locale: de })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {tenant ? `${tenant.first_name} ${tenant.last_name}` : '-'}
                      </TableCell>
                      <TableCell>
                        {unit ? unit.top_nummer : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {breakdown ? `€ ${breakdown.miete.toLocaleString('de-AT', { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {breakdown ? `€ ${breakdown.bk.toLocaleString('de-AT', { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {breakdown ? `€ ${breakdown.hk.toLocaleString('de-AT', { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        € {Number(payment.betrag).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {payment.invoice_id ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Zugeordnet
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Offen</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePayment(payment)}
                          title="Zahlung stornieren"
                          disabled={deletePayment.isPending}
                        >
                          <RotateCcw className="h-4 w-4 text-destructive" />
                        </Button>
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

        {/* Open Items Tab */}
        <TabsContent value="openitems">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <Users className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mieter mit Rückstand</p>
                    <p className="text-2xl font-bold">{openItemsStats.totalTenants}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <Euro className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Offener Gesamtbetrag</p>
                    <p className="text-2xl font-bold text-red-600">€ {openItemsStats.totalOpenAmount.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Überfällig</p>
                    <p className="text-2xl font-bold text-orange-600">{openItemsStats.overdueCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              {openItemsPerTenant.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <p className="text-muted-foreground">Keine offenen Posten</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Alle Mieter sind auf dem aktuellen Stand.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mieter</TableHead>
                      <TableHead>Top</TableHead>
                      <TableHead className="text-right">Soll</TableHead>
                      <TableHead className="text-right">Gezahlt</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Tage überfällig</TableHead>
                      <TableHead>Mahnstatus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openItemsPerTenant.map((item) => (
                      <TableRow key={item.tenant.id}>
                        <TableCell className="font-medium">
                          {item.tenant.first_name} {item.tenant.last_name}
                        </TableCell>
                        <TableCell>{item.unit?.top_nummer || '-'}</TableCell>
                        <TableCell className="text-right">
                          € {item.totalSoll.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          € {item.totalIst.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          € {item.saldo.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {item.oldestOverdueDays > 0 ? (
                            <span className="text-orange-600 font-medium">{item.oldestOverdueDays} Tage</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.mahnstatus === 'aktuell' ? (
                            <Badge variant="secondary">Aktuell</Badge>
                          ) : item.mahnstatus === 'Zahlungserinnerung' ? (
                            <Badge className="bg-yellow-100 text-yellow-800">Zahlungserinnerung</Badge>
                          ) : item.mahnstatus === '1. Mahnung' ? (
                            <Badge className="bg-orange-100 text-orange-800">1. Mahnung</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">2. Mahnung</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Excel-Import - Vorschau
            </DialogTitle>
            <DialogDescription>
              Überprüfen Sie die erkannten Zahlungen. Zeilen mit automatischer Zuordnung sind vorausgewählt.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {importData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Keine Zahlungen in der Datei gefunden</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={importData.every(r => r.selected)}
                        onCheckedChange={(checked) => {
                          setImportData(prev => prev.map(row => ({ ...row, selected: !!checked })));
                        }}
                      />
                    </TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead>Referenz</TableHead>
                    <TableHead>Zuordnung</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.map((row, index) => (
                    <TableRow key={index} className={row.matchedTenant ? '' : 'opacity-60'}>
                      <TableCell>
                        <Checkbox
                          checked={row.selected}
                          onCheckedChange={() => toggleRowSelection(index)}
                          disabled={!row.matchedTenant}
                        />
                      </TableCell>
                      <TableCell>{format(new Date(row.datum), 'dd.MM.yyyy', { locale: de })}</TableCell>
                      <TableCell className="text-right font-medium">
                        € {row.betrag.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{row.referenz || '-'}</TableCell>
                      <TableCell>
                        {row.matchedTenant ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-sm font-medium">
                                {row.matchedTenant.first_name} {row.matchedTenant.last_name}
                              </span>
                            </div>
                            {row.matchedInvoice && (
                              <span className="text-xs text-muted-foreground">
                                → {format(new Date(row.matchedInvoice.year, row.matchedInvoice.month - 1), 'MMM yyyy', { locale: de })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <X className="h-3.5 w-3.5" />
                            Nicht zuordenbar
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {importData.filter(r => r.selected).length} von {importData.length} ausgewählt
              {' • '}
              {importData.filter(r => r.matchedTenant).length} zugeordnet
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button variant="outline" onClick={selectAllMatched}>
                Nur Zugeordnete wählen
              </Button>
              <Button 
                onClick={handleImportPayments} 
                disabled={isImporting || importData.filter(r => r.selected && r.matchedTenant).length === 0}
              >
                {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {importData.filter(r => r.selected && r.matchedTenant).length} Zahlungen importieren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
