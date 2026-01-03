import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  ArrowLeft,
  Edit,
  Plus,
  Loader2,
  Home,
  Euro,
  Users,
  Receipt,
  CheckCircle2,
  CreditCard,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnit, useDeleteUnit } from '@/hooks/useUnits';
import { useProperty } from '@/hooks/useProperties';
import { useTenantsByUnit, Tenant } from '@/hooks/useTenants';
import { useInvoices, useUpdateInvoiceStatus, useCreateInvoice, useUpdateInvoice, useDeleteInvoice, Invoice } from '@/hooks/useInvoices';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const unitTypeLabels: Record<string, string> = {
  wohnung: 'Wohnung',
  geschaeft: 'Geschäft',
  garage: 'Garage',
  stellplatz: 'Stellplatz',
  lager: 'Lager',
  sonstiges: 'Sonstiges',
};

const statusLabels: Record<string, string> = {
  aktiv: 'Vermietet',
  leerstand: 'Leerstand',
  beendet: 'Beendet',
};

const statusStyles: Record<string, string> = {
  aktiv: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  leerstand: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  beendet: 'bg-muted text-muted-foreground',
};

const invoiceStatusLabels: Record<string, string> = {
  offen: 'Offen',
  bezahlt: 'Bezahlt',
  teilbezahlt: 'Teilbezahlt',
  ueberfaellig: 'Überfällig',
};

const invoiceStatusStyles: Record<string, string> = {
  offen: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  bezahlt: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  teilbezahlt: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ueberfaellig: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function UnitDetail() {
  const { propertyId, unitId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    month: (new Date().getMonth() + 1).toString(),
    year: new Date().getFullYear().toString(),
    grundmiete: '',
    ust_satz_miete: '0',
    betriebskosten: '',
    ust_satz_bk: '10',
    heizungskosten: '',
    ust_satz_heizung: '20',
    faellig_am: format(new Date(new Date().getFullYear(), new Date().getMonth(), 5), 'yyyy-MM-dd'),
  });
  
  const { data: unit, isLoading: isLoadingUnit } = useUnit(unitId);
  const { data: property, isLoading: isLoadingProperty } = useProperty(propertyId);
  const { data: tenants, isLoading: isLoadingTenants } = useTenantsByUnit(unitId);
  const { data: allInvoices } = useInvoices();
  const deleteUnit = useDeleteUnit();
  const updateInvoiceStatus = useUpdateInvoiceStatus();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  // Filter invoices for this unit
  const unitInvoices = allInvoices?.filter(inv => inv.unit_id === unitId) || [];

  const activeTenant = tenants?.find(t => t.status === 'aktiv');
  const totalRent = activeTenant
    ? Number(activeTenant.grundmiete) + Number(activeTenant.betriebskosten_vorschuss) + Number(activeTenant.heizungskosten_vorschuss)
    : 0;

  const handleDelete = async () => {
    if (unitId && propertyId) {
      await deleteUnit.mutateAsync(unitId);
      navigate(`/liegenschaften/${propertyId}`);
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      await updateInvoiceStatus.mutateAsync({
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

  const openInvoiceDialog = (invoice?: Invoice) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setInvoiceForm({
        month: invoice.month.toString(),
        year: invoice.year.toString(),
        grundmiete: invoice.grundmiete.toString(),
        ust_satz_miete: ((invoice as any).ust_satz_miete ?? 0).toString(),
        betriebskosten: invoice.betriebskosten.toString(),
        ust_satz_bk: ((invoice as any).ust_satz_bk ?? 10).toString(),
        heizungskosten: invoice.heizungskosten.toString(),
        ust_satz_heizung: ((invoice as any).ust_satz_heizung ?? 20).toString(),
        faellig_am: invoice.faellig_am,
      });
    } else {
      setEditingInvoice(null);
      // Pre-fill from active tenant if available
      setInvoiceForm({
        month: (new Date().getMonth() + 1).toString(),
        year: new Date().getFullYear().toString(),
        grundmiete: activeTenant?.grundmiete?.toString() || '',
        ust_satz_miete: '0',
        betriebskosten: activeTenant?.betriebskosten_vorschuss?.toString() || '',
        ust_satz_bk: '10',
        heizungskosten: activeTenant?.heizungskosten_vorschuss?.toString() || '',
        ust_satz_heizung: '20',
        faellig_am: format(new Date(new Date().getFullYear(), new Date().getMonth(), 5), 'yyyy-MM-dd'),
      });
    }
    setInvoiceDialogOpen(true);
  };

  // Helper to calculate VAT from gross amount
  const calculateVatFromGross = (grossAmount: number, vatRate: number): number => {
    if (vatRate === 0) return 0;
    return grossAmount - (grossAmount / (1 + vatRate / 100));
  };

  const handleSaveInvoice = async () => {
    if (!activeTenant || !unitId) {
      toast({
        title: 'Fehler',
        description: 'Kein aktiver Mieter vorhanden.',
        variant: 'destructive',
      });
      return;
    }

    const grundmiete = parseFloat(invoiceForm.grundmiete) || 0;
    const ust_satz_miete = parseFloat(invoiceForm.ust_satz_miete) || 0;
    const betriebskosten = parseFloat(invoiceForm.betriebskosten) || 0;
    const ust_satz_bk = parseFloat(invoiceForm.ust_satz_bk) || 0;
    const heizungskosten = parseFloat(invoiceForm.heizungskosten) || 0;
    const ust_satz_heizung = parseFloat(invoiceForm.ust_satz_heizung) || 0;
    
    // Calculate total VAT from all gross amounts
    const ust = calculateVatFromGross(grundmiete, ust_satz_miete) +
                calculateVatFromGross(betriebskosten, ust_satz_bk) +
                calculateVatFromGross(heizungskosten, ust_satz_heizung);
    
    const gesamtbetrag = grundmiete + betriebskosten + heizungskosten;

    try {
      if (editingInvoice) {
        await updateInvoice.mutateAsync({
          id: editingInvoice.id,
          month: parseInt(invoiceForm.month),
          year: parseInt(invoiceForm.year),
          grundmiete,
          betriebskosten,
          heizungskosten,
          ust: Math.round(ust * 100) / 100,
          gesamtbetrag,
          faellig_am: invoiceForm.faellig_am,
          ust_satz_miete,
          ust_satz_bk,
          ust_satz_heizung,
        } as any);
      } else {
        await createInvoice.mutateAsync({
          tenant_id: activeTenant.id,
          unit_id: unitId,
          month: parseInt(invoiceForm.month),
          year: parseInt(invoiceForm.year),
          grundmiete,
          betriebskosten,
          heizungskosten,
          ust: Math.round(ust * 100) / 100,
          gesamtbetrag,
          faellig_am: invoiceForm.faellig_am,
          ust_satz_miete,
          ust_satz_bk,
          ust_satz_heizung,
        } as any);
      }
      setInvoiceDialogOpen(false);
    } catch (error) {
      console.error('Invoice save error:', error);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    await deleteInvoice.mutateAsync(invoiceId);
  };

  if (isLoadingUnit || isLoadingProperty || isLoadingTenants) {
    return (
      <MainLayout title="Laden..." subtitle="">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!unit || !property) {
    return (
      <MainLayout title="Nicht gefunden" subtitle="">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Einheit nicht gefunden</p>
          <Link to="/einheiten">
            <Button>Zurück zur Übersicht</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={`${unit.top_nummer} - ${unitTypeLabels[unit.type] || unit.type}`}
      subtitle={`${property.name}, ${property.address}`}
    >
      {/* Back Button & Actions */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/einheiten"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
        <div className="flex items-center gap-2">
          <Link to={`/liegenschaften/${propertyId}/einheiten/${unitId}/bearbeiten`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Bearbeiten
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Einheit löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion kann nicht rückgängig gemacht werden. Alle zugehörigen Mieter und
                  Vorschreibungen werden ebenfalls gelöscht.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Löschen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Unit Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fläche</p>
                <p className="text-xl font-bold">{Number(unit.qm).toLocaleString('de-AT')} m²</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <span className="text-primary font-bold">‰</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MEA</p>
                <p className="text-xl font-bold">{Number(unit.mea)}‰</p>
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
                <p className="text-sm text-muted-foreground">Monatliche Miete</p>
                <p className="text-xl font-bold">€ {totalRent.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={statusStyles[unit.status]}>
                  {statusLabels[unit.status] || unit.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Tenants and Invoices */}
      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants">
            <Users className="h-4 w-4 mr-2" />
            Mieter ({tenants?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <Receipt className="h-4 w-4 mr-2" />
            Vorschreibungen ({unitInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="distribution">Verteilerschlüssel</TabsTrigger>
        </TabsList>

        {/* Tenants Tab */}
        <TabsContent value="tenants" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Mieter</h3>
            <Link to={`/einheiten/${propertyId}/${unitId}/mieter/neu`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Mieter hinzufügen
              </Button>
            </Link>
          </div>

          {tenants && tenants.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Kontakt</TableHead>
                      <TableHead>Mietbeginn</TableHead>
                      <TableHead className="text-right">Grundmiete</TableHead>
                      <TableHead className="text-right">BK</TableHead>
                      <TableHead className="text-right">Heizung</TableHead>
                      <TableHead className="text-right">Gesamt</TableHead>
                      <TableHead>SEPA</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant: Tenant) => {
                      const total = Number(tenant.grundmiete) + Number(tenant.betriebskosten_vorschuss) + Number(tenant.heizungskosten_vorschuss);
                      
                      return (
                        <TableRow key={tenant.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            {tenant.first_name} {tenant.last_name}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {tenant.email && <p className="text-muted-foreground">{tenant.email}</p>}
                              {tenant.phone && <p className="text-muted-foreground">{tenant.phone}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(tenant.mietbeginn), 'dd.MM.yyyy', { locale: de })}
                          </TableCell>
                          <TableCell className="text-right">
                            € {Number(tenant.grundmiete).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            € {Number(tenant.betriebskosten_vorschuss).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            € {Number(tenant.heizungskosten_vorschuss).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            € {total.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            {tenant.sepa_mandat ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <CreditCard className="h-3 w-3 mr-1" />
                                Aktiv
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusStyles[tenant.status]}>
                              {statusLabels[tenant.status] || tenant.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link to={`/einheiten/${propertyId}/${unitId}/mieter/${tenant.id}/bearbeiten`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Noch kein Mieter vorhanden</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Fügen Sie einen Mieter für diese Einheit hinzu
                </p>
                <Link to={`/einheiten/${propertyId}/${unitId}/mieter/neu`}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Mieter hinzufügen
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Vorschreibungen</h3>
            {activeTenant && (
              <Button onClick={() => openInvoiceDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Vorschreibung erstellen
              </Button>
            )}
          </div>

          {unitInvoices.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Monat</TableHead>
                      <TableHead className="text-right">Grundmiete</TableHead>
                      <TableHead className="text-right">BK</TableHead>
                      <TableHead className="text-right">Heizung</TableHead>
                      <TableHead className="text-right">USt</TableHead>
                      <TableHead className="text-right">Gesamt</TableHead>
                      <TableHead>Fällig am</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unitInvoices.map((invoice: Invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {format(new Date(invoice.year, invoice.month - 1), 'MMMM yyyy', { locale: de })}
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
                        <TableCell className="text-right">
                          € {Number(invoice.ust).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          € {Number(invoice.gesamtbetrag).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.faellig_am), 'dd.MM.yyyy', { locale: de })}
                        </TableCell>
                        <TableCell>
                          <Badge className={invoiceStatusStyles[invoice.status]}>
                            {invoiceStatusLabels[invoice.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openInvoiceDialog(invoice)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {invoice.status === 'offen' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsPaid(invoice.id)}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Vorschreibung löschen?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Diese Aktion kann nicht rückgängig gemacht werden.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.id)}>
                                    Löschen
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Noch keine Vorschreibungen vorhanden</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  {activeTenant ? 'Erstellen Sie manuell eine Vorschreibung' : 'Fügen Sie zuerst einen Mieter hinzu'}
                </p>
                {activeTenant && (
                  <Button onClick={() => openInvoiceDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Vorschreibung erstellen
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Distribution Keys Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verteilerschlüssel für diese Einheit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Quadratmeter</p>
                  <p className="font-medium">{Number(unit.vs_qm || unit.qm).toLocaleString('de-AT')} m²</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-sm text-muted-foreground">MEA</p>
                  <p className="font-medium">{Number(unit.vs_mea || unit.mea)}‰</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Personen</p>
                  <p className="font-medium">{unit.vs_personen || 0}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Heizungsverbrauch</p>
                  <p className="font-medium">{Number(unit.vs_heizung_verbrauch || 0).toLocaleString('de-AT')}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Wasserverbrauch</p>
                  <p className="font-medium">{Number(unit.vs_wasser_verbrauch || 0).toLocaleString('de-AT')}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Lift (Wohnung)</p>
                  <p className="font-medium">{Number(unit.vs_lift_wohnung || 0).toLocaleString('de-AT')}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Müll</p>
                  <p className="font-medium">{Number(unit.vs_muell || 0).toLocaleString('de-AT')}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Strom Allgemein</p>
                  <p className="font-medium">{Number(unit.vs_strom_allgemein || 0).toLocaleString('de-AT')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingInvoice ? 'Vorschreibung bearbeiten' : 'Neue Vorschreibung erstellen'}
            </DialogTitle>
            <DialogDescription>
              {editingInvoice 
                ? 'Bearbeiten Sie die Vorschreibungsdaten. Nach der BK-Abrechnung werden diese automatisch angepasst.'
                : 'Erstellen Sie eine manuelle Vorschreibung. Diese wird später durch die BK-Abrechnung angepasst.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monat</Label>
                <Select
                  value={invoiceForm.month}
                  onValueChange={(value) => setInvoiceForm(prev => ({ ...prev, month: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {format(new Date(2000, i), 'MMMM', { locale: de })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jahr</Label>
                <Select
                  value={invoiceForm.year}
                  onValueChange={(value) => setInvoiceForm(prev => ({ ...prev, year: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Miete mit MwSt */}
            <div className="space-y-2">
              <Label className="font-semibold">Miete (brutto)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Betrag €</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={invoiceForm.grundmiete}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, grundmiete: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">MwSt %</Label>
                  <Select
                    value={invoiceForm.ust_satz_miete}
                    onValueChange={(value) => setInvoiceForm(prev => ({ ...prev, ust_satz_miete: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Betriebskosten mit MwSt */}
            <div className="space-y-2">
              <Label className="font-semibold">Betriebskosten (brutto)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Betrag €</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={invoiceForm.betriebskosten}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, betriebskosten: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">MwSt %</Label>
                  <Select
                    value={invoiceForm.ust_satz_bk}
                    onValueChange={(value) => setInvoiceForm(prev => ({ ...prev, ust_satz_bk: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Heizungskosten mit MwSt */}
            <div className="space-y-2">
              <Label className="font-semibold">Heizungskosten (brutto)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Betrag €</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={invoiceForm.heizungskosten}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, heizungskosten: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">MwSt %</Label>
                  <Select
                    value={invoiceForm.ust_satz_heizung}
                    onValueChange={(value) => setInvoiceForm(prev => ({ ...prev, ust_satz_heizung: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fällig am</Label>
              <Input
                type="date"
                value={invoiceForm.faellig_am}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, faellig_am: e.target.value }))}
              />
            </div>

            {/* Zusammenfassung */}
            <div className="rounded-lg border p-3 bg-muted/50 space-y-2">
              {(() => {
                const grundmiete = parseFloat(invoiceForm.grundmiete) || 0;
                const ust_satz_miete = parseFloat(invoiceForm.ust_satz_miete) || 0;
                const betriebskosten = parseFloat(invoiceForm.betriebskosten) || 0;
                const ust_satz_bk = parseFloat(invoiceForm.ust_satz_bk) || 0;
                const heizungskosten = parseFloat(invoiceForm.heizungskosten) || 0;
                const ust_satz_heizung = parseFloat(invoiceForm.ust_satz_heizung) || 0;
                
                const calcVat = (gross: number, rate: number) => rate === 0 ? 0 : gross - (gross / (1 + rate / 100));
                const vatMiete = calcVat(grundmiete, ust_satz_miete);
                const vatBk = calcVat(betriebskosten, ust_satz_bk);
                const vatHeizung = calcVat(heizungskosten, ust_satz_heizung);
                const totalVat = vatMiete + vatBk + vatHeizung;
                const totalGross = grundmiete + betriebskosten + heizungskosten;
                
                return (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">USt Miete ({ust_satz_miete}%)</span>
                      <span>€ {vatMiete.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">USt BK ({ust_satz_bk}%)</span>
                      <span>€ {vatBk.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">USt Heizung ({ust_satz_heizung}%)</span>
                      <span>€ {vatHeizung.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Gesamt USt</span>
                        <span className="font-medium">€ {totalVat.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Gesamtbetrag (brutto)</span>
                        <span className="text-lg font-bold">€ {totalGross.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSaveInvoice} 
              disabled={createInvoice.isPending || updateInvoice.isPending}
            >
              {(createInvoice.isPending || updateInvoice.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingInvoice ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
