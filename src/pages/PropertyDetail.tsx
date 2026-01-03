import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { distributionKeys } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Building2,
  Edit,
  Plus,
  FileText,
  Home,
  Euro,
  Percent,
  Loader2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProperty, useDeleteProperty } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
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
  aktiv: 'status-active',
  leerstand: 'status-vacant',
  beendet: 'status-ended',
};

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: property, isLoading: isLoadingProperty } = useProperty(id);
  const { data: units, isLoading: isLoadingUnits } = useUnits(id);
  const deleteProperty = useDeleteProperty();

  const handleDelete = async () => {
    if (id) {
      await deleteProperty.mutateAsync(id);
      navigate('/liegenschaften');
    }
  };

  if (isLoadingProperty || isLoadingUnits) {
    return (
      <MainLayout title="Laden..." subtitle="">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!property) {
    return (
      <MainLayout title="Nicht gefunden" subtitle="">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Liegenschaft nicht gefunden</p>
          <Link to="/liegenschaften">
            <Button>Zurück zur Übersicht</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const totalRent = units?.reduce((sum, unit) => {
    const tenants = unit.tenants as any[];
    const activeTenant = tenants?.find((t: any) => t.status === 'aktiv');
    if (activeTenant) {
      return (
        sum +
        Number(activeTenant.grundmiete || 0) +
        Number(activeTenant.betriebskosten_vorschuss || 0) +
        Number(activeTenant.heizungskosten_vorschuss || 0)
      );
    }
    return sum;
  }, 0) || 0;

  return (
    <MainLayout
      title={property.name}
      subtitle={`${property.address}, ${property.postal_code} ${property.city}`}
    >
      {/* Back Button & Actions */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/liegenschaften"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Dokumente
          </Button>
          <Link to={`/liegenschaften/${id}/bearbeiten`}>
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
                <AlertDialogTitle>Liegenschaft löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion kann nicht rückgängig gemacht werden. Alle zugehörigen Einheiten und
                  Mieter werden ebenfalls gelöscht.
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

      {/* Property Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Einheiten</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{units?.length || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {units?.filter((u) => u.status === 'aktiv').length || 0} vermietet •{' '}
            {units?.filter((u) => u.status === 'leerstand').length || 0} leer
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-success/10 p-2">
              <Euro className="h-5 w-5 text-success" />
            </div>
            <span className="text-sm text-muted-foreground">Monatliche Miete</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            €{totalRent.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">inkl. BK & Heizung</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-accent/10 p-2">
              <Building2 className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Gesamtfläche</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {Number(property.total_qm).toLocaleString('de-AT')} m²
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {Number(property.total_mea)}‰ MEA gesamt
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-warning/10 p-2">
              <Percent className="h-5 w-5 text-warning" />
            </div>
            <span className="text-sm text-muted-foreground">Betriebskosten</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            €{Number(property.betriebskosten_gesamt).toLocaleString('de-AT')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">pro Jahr</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="units" className="space-y-4">
        <TabsList>
          <TabsTrigger value="units">Einheiten</TabsTrigger>
          <TabsTrigger value="distribution">Verteilerschlüssel</TabsTrigger>
          <TabsTrigger value="costs">Betriebskosten</TabsTrigger>
          <TabsTrigger value="documents">Dokumente</TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Alle Einheiten ({units?.length || 0})</h3>
            <Link to={`/liegenschaften/${id}/einheiten/neu`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Einheit hinzufügen
              </Button>
            </Link>
          </div>

          {units && units.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Top</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Fläche</TableHead>
                    <TableHead>MEA</TableHead>
                    <TableHead>Personen</TableHead>
                    <TableHead>Mieter</TableHead>
                    <TableHead>Gesamtmiete</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit) => {
                    const tenants = unit.tenants as any[];
                    const activeTenant = tenants?.find((t: any) => t.status === 'aktiv');
                    const totalRent = activeTenant
                      ? Number(activeTenant.grundmiete || 0) +
                        Number(activeTenant.betriebskosten_vorschuss || 0) +
                        Number(activeTenant.heizungskosten_vorschuss || 0)
                      : 0;

                    return (
                      <TableRow key={unit.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{unit.top_nummer}</TableCell>
                        <TableCell>{unitTypeLabels[unit.type] || unit.type}</TableCell>
                        <TableCell>{Number(unit.qm).toLocaleString('de-AT')} m²</TableCell>
                        <TableCell>{Number(unit.mea)}‰</TableCell>
                        <TableCell>{unit.vs_personen || 0}</TableCell>
                        <TableCell>
                          {activeTenant ? (
                            <div>
                              <p className="font-medium">
                                {activeTenant.first_name} {activeTenant.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                seit{' '}
                                {new Date(activeTenant.mietbeginn).toLocaleDateString('de-AT')}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {activeTenant ? (
                            <span className="font-medium">
                              €{totalRent.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={cn('status-badge', statusStyles[unit.status])}>
                            {statusLabels[unit.status] || unit.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link to={`/liegenschaften/${id}/einheiten/${unit.id}/bearbeiten`}>
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
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Noch keine Einheiten vorhanden</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Fügen Sie die erste Einheit hinzu
              </p>
              <Link to={`/liegenschaften/${id}/einheiten/neu`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Einheit hinzufügen
                </Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Verteilerschlüssel (20 Schlüssel)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {distributionKeys.map((key) => (
                <div
                  key={key.id}
                  className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                >
                  <p className="font-medium text-sm text-foreground">{key.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{key.unit}</p>
                  <p className="text-xs text-muted-foreground">{key.description}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Betriebskosten-Anteile</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Wohnung</span>
                  <Badge variant="secondary">{Number(property.bk_anteil_wohnung)}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Geschäft</span>
                  <Badge variant="secondary">{Number(property.bk_anteil_geschaeft)}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Garage</span>
                  <Badge variant="secondary">{Number(property.bk_anteil_garage)}%</Badge>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Heizkosten-Anteile</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Wohnung</span>
                  <Badge variant="secondary">{Number(property.heizung_anteil_wohnung)}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Geschäft</span>
                  <Badge variant="secondary">{Number(property.heizung_anteil_geschaeft)}%</Badge>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 md:col-span-2">
              <h3 className="font-semibold text-foreground mb-4">Jahreskosten gesamt</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    €{Number(property.betriebskosten_gesamt).toLocaleString('de-AT')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Betriebskosten p.a.</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    €{Number(property.heizungskosten_gesamt).toLocaleString('de-AT')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Heizungskosten p.a.</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Dokumente</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Dokument hochladen
            </Button>
          </div>
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Noch keine Dokumente hochgeladen</p>
            <p className="text-sm text-muted-foreground mt-1">
              Laden Sie Energieausweis, Grundbuchauszug und andere wichtige Dokumente hoch
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
