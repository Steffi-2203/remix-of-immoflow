import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Clock,
  CreditCard,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnit, useDeleteUnit } from '@/hooks/useUnits';
import { useProperty } from '@/hooks/useProperties';
import { useTenantsByUnit, Tenant } from '@/hooks/useTenants';
import { useInvoices, useUpdateInvoiceStatus, Invoice } from '@/hooks/useInvoices';
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
  
  const { data: unit, isLoading: isLoadingUnit } = useUnit(unitId);
  const { data: property, isLoading: isLoadingProperty } = useProperty(propertyId);
  const { data: tenants, isLoading: isLoadingTenants } = useTenantsByUnit(unitId);
  const { data: allInvoices } = useInvoices();
  const deleteUnit = useDeleteUnit();
  const updateInvoiceStatus = useUpdateInvoiceStatus();

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
            <Link to={`/einheiten/${unitId}/mieter/neu`}>
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
                <Link to={`/einheiten/${unitId}/mieter/neu`}>
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
                          {invoice.status === 'offen' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsPaid(invoice.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Bezahlt
                            </Button>
                          )}
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
                <p className="text-sm text-muted-foreground mt-1">
                  Vorschreibungen werden automatisch generiert
                </p>
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
    </MainLayout>
  );
}
