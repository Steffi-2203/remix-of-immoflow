import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Receipt, Plus, Loader2, Euro, CheckCircle2, Clock, MoreHorizontal, Mail, AlertTriangle } from 'lucide-react';
import { useInvoices, useGenerateInvoices, useUpdateInvoiceStatus } from '@/hooks/useInvoices';
import { useTenants } from '@/hooks/useTenants';
import { useUnits } from '@/hooks/useUnits';
import { useProperties } from '@/hooks/useProperties';
import { useSendDunning, getDunningStatusLabel, getNextDunningAction } from '@/hooks/useDunning';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const statusLabels: Record<string, string> = {
  offen: 'Offen',
  bezahlt: 'Bezahlt',
  teilbezahlt: 'Teilbezahlt',
  ueberfaellig: 'Überfällig',
};

const statusStyles: Record<string, string> = {
  offen: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  bezahlt: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  teilbezahlt: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ueberfaellig: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const months = [
  { value: '1', label: 'Jänner' },
  { value: '2', label: 'Februar' },
  { value: '3', label: 'März' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mai' },
  { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Dezember' },
];

export default function InvoiceList() {
  const { toast } = useToast();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);

  const { data: invoices, isLoading: invoicesLoading } = useInvoices(selectedYear, selectedMonth);
  const { data: tenants } = useTenants();
  const { data: units } = useUnits();
  const { data: properties } = useProperties();
  const generateInvoices = useGenerateInvoices();
  const updateStatus = useUpdateInvoiceStatus();
  const sendDunning = useSendDunning();

  const getTenant = (tenantId: string) => tenants?.find(t => t.id === tenantId);
  const getUnit = (unitId: string) => units?.find(u => u.id === unitId);
  const getProperty = (propertyId: string) => properties?.find(p => p.id === propertyId);

  const handleGenerateInvoices = async () => {
    try {
      const result = await generateInvoices.mutateAsync({
        year: selectedYear,
        month: selectedMonth || now.getMonth() + 1,
      });
      
      toast({
        title: 'Vorschreibungen erstellt',
        description: result.message || `${result.created} Vorschreibungen wurden erstellt.`,
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Vorschreibungen konnten nicht erstellt werden.',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      await updateStatus.mutateAsync({
        id: invoiceId,
        status: 'bezahlt',
        bezahltAm: new Date().toISOString().split('T')[0],
      });
      toast({
        title: 'Status aktualisiert',
        description: 'Vorschreibung wurde als bezahlt markiert.',
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Status konnte nicht aktualisiert werden.',
        variant: 'destructive',
      });
    }
  };

  const handleSendDunning = async (invoice: any, level: 1 | 2) => {
    const tenant = getTenant(invoice.tenant_id);
    const unit = getUnit(invoice.unit_id);
    const property = unit ? getProperty(unit.property_id) : null;

    if (!tenant?.email) {
      toast({
        title: 'Keine E-Mail',
        description: 'Für diesen Mieter ist keine E-Mail-Adresse hinterlegt.',
        variant: 'destructive',
      });
      return;
    }

    await sendDunning.mutateAsync({
      invoiceId: invoice.id,
      dunningLevel: level,
      tenantEmail: tenant.email,
      tenantName: `${tenant.first_name} ${tenant.last_name}`,
      propertyName: property?.name || '',
      unitNumber: unit?.top_nummer || '',
      amount: Number(invoice.gesamtbetrag),
      dueDate: invoice.faellig_am,
      invoiceMonth: invoice.month,
      invoiceYear: invoice.year,
    });
  };

  // Calculate statistics
  const stats = {
    total: invoices?.length || 0,
    open: invoices?.filter(i => i.status === 'offen').length || 0,
    paid: invoices?.filter(i => i.status === 'bezahlt').length || 0,
    overdue: invoices?.filter(i => i.status === 'ueberfaellig').length || 0,
    totalAmount: invoices?.reduce((sum, i) => sum + Number(i.gesamtbetrag), 0) || 0,
    openAmount: invoices?.filter(i => i.status !== 'bezahlt').reduce((sum, i) => sum + Number(i.gesamtbetrag), 0) || 0,
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <MainLayout
      title="Vorschreibungen"
      subtitle="Monatliche Mietvorschreibungen verwalten"
    >
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Jahr" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedMonth?.toString() || 'all'}
            onValueChange={(value) => setSelectedMonth(value === 'all' ? undefined : parseInt(value))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Monat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Monate</SelectItem>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <Button onClick={handleGenerateInvoices} disabled={generateInvoices.isPending}>
          {generateInvoices.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Vorschreibungen generieren
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gesamt</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Offen</p>
                <p className="text-2xl font-bold">{stats.open}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bezahlt</p>
                <p className="text-2xl font-bold">{stats.paid}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Euro className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Offener Betrag</p>
                <p className="text-2xl font-bold">€ {stats.openAmount.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {invoicesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !invoices || invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine Vorschreibungen gefunden</p>
              <p className="text-sm text-muted-foreground mt-1">
                Klicken Sie auf "Vorschreibungen generieren" um neue zu erstellen.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Monat</TableHead>
                  <TableHead>Mieter</TableHead>
                  <TableHead>Top / Liegenschaft</TableHead>
                  <TableHead className="text-right">Grundmiete</TableHead>
                  <TableHead className="text-right">BK</TableHead>
                  <TableHead className="text-right">Heizung</TableHead>
                  <TableHead className="text-right">Gesamt</TableHead>
                  <TableHead>Fällig am</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mahnung</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const tenant = getTenant(invoice.tenant_id);
                  const unit = getUnit(invoice.unit_id);
                  const property = unit ? getProperty(unit.property_id) : null;
                  const mahnstufe = (invoice as any).mahnstufe || 0;
                  const nextAction = getNextDunningAction(mahnstufe);
                  const isOpenOrOverdue = invoice.status === 'offen' || invoice.status === 'ueberfaellig';

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {months[invoice.month - 1]?.label} {invoice.year}
                      </TableCell>
                      <TableCell>
                        {tenant ? `${tenant.first_name} ${tenant.last_name}` : '-'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{unit?.top_nummer || '-'}</span>
                          <span className="text-muted-foreground text-sm ml-2">
                            {property?.name || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        € {Number(invoice.grundmiete).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        € {Number(invoice.betriebskosten).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        € {Number(invoice.heizungskosten).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        € {Number(invoice.gesamtbetrag).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.faellig_am), 'dd.MM.yyyy', { locale: de })}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusStyles[invoice.status]}>
                          {statusLabels[invoice.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {mahnstufe === 0 ? (
                                <span className="text-muted-foreground text-sm">-</span>
                              ) : mahnstufe === 1 ? (
                                <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                                  <Mail className="h-3 w-3 mr-1" />
                                  Erinnerung
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Mahnung
                                </Badge>
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{getDunningStatusLabel(mahnstufe)}</p>
                              {(invoice as any).zahlungserinnerung_am && (
                                <p className="text-xs text-muted-foreground">
                                  Erinnerung: {format(new Date((invoice as any).zahlungserinnerung_am), 'dd.MM.yyyy')}
                                </p>
                              )}
                              {(invoice as any).mahnung_am && (
                                <p className="text-xs text-muted-foreground">
                                  Mahnung: {format(new Date((invoice as any).mahnung_am), 'dd.MM.yyyy')}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {invoice.status !== 'bezahlt' && (
                              <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice.id)}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Als bezahlt markieren
                              </DropdownMenuItem>
                            )}
                            {isOpenOrOverdue && nextAction && tenant?.email && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleSendDunning(invoice, nextAction.level)}
                                  disabled={sendDunning.isPending}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  {nextAction.label}
                                </DropdownMenuItem>
                              </>
                            )}
                            {isOpenOrOverdue && !tenant?.email && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled>
                                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <span className="text-muted-foreground">Keine E-Mail hinterlegt</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
