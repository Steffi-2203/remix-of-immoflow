import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { mockProperties, mockUnits, mockTenants, distributionKeys } from '@/data/mockData';
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
  MapPin,
  Edit,
  Plus,
  FileText,
  Home,
  Users,
  Euro,
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const unitTypeLabels = {
  wohnung: 'Wohnung',
  geschaeft: 'Geschäft',
  garage: 'Garage',
  stellplatz: 'Stellplatz',
  lager: 'Lager',
  sonstiges: 'Sonstiges',
};

const statusLabels = {
  aktiv: 'Vermietet',
  leerstand: 'Leerstand',
  beendet: 'Beendet',
};

const statusStyles = {
  aktiv: 'status-active',
  leerstand: 'status-vacant',
  beendet: 'status-ended',
};

export default function PropertyDetail() {
  const { id } = useParams();
  const property = mockProperties.find((p) => p.id === id) || mockProperties[0];
  const units = mockUnits.filter((u) => u.propertyId === property.id);

  const getTenant = (tenantId?: string) => {
    if (!tenantId) return null;
    return mockTenants.find((t) => t.id === tenantId);
  };

  const totalRent = units.reduce((sum, unit) => {
    const tenant = getTenant(unit.currentTenantId);
    if (tenant) {
      return sum + tenant.grundmiete + tenant.betriebskostenVorschuss + tenant.heizungskostenVorschuss;
    }
    return sum;
  }, 0);

  return (
    <MainLayout
      title={property.name}
      subtitle={`${property.address}, ${property.postalCode} ${property.city}`}
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
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Bearbeiten
          </Button>
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
          <p className="text-2xl font-bold text-foreground">{units.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {units.filter((u) => u.status === 'aktiv').length} vermietet • {units.filter((u) => u.status === 'leerstand').length} leer
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
              <Building2 className="h-5 w-5 text-accent" />
            </div>
            <span className="text-sm text-muted-foreground">Gesamtfläche</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{property.totalQm.toLocaleString('de-AT')} m²</p>
          <p className="text-xs text-muted-foreground mt-1">{property.totalMea}‰ MEA gesamt</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-warning/10 p-2">
              <Percent className="h-5 w-5 text-warning" />
            </div>
            <span className="text-sm text-muted-foreground">Betriebskosten</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            €{property.betriebskostenGesamt.toLocaleString('de-AT')}
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
            <h3 className="font-semibold text-foreground">Alle Einheiten ({units.length})</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Einheit hinzufügen
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Top</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Fläche</TableHead>
                  <TableHead>MEA</TableHead>
                  <TableHead>Mieter</TableHead>
                  <TableHead>Gesamtmiete</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => {
                  const tenant = getTenant(unit.currentTenantId);
                  const totalRent = tenant
                    ? tenant.grundmiete + tenant.betriebskostenVorschuss + tenant.heizungskostenVorschuss
                    : 0;

                  return (
                    <TableRow key={unit.id} className="hover:bg-muted/30 cursor-pointer">
                      <TableCell className="font-medium">{unit.topNummer}</TableCell>
                      <TableCell>{unitTypeLabels[unit.type]}</TableCell>
                      <TableCell>{unit.qm.toLocaleString('de-AT')} m²</TableCell>
                      <TableCell>{unit.mea}‰</TableCell>
                      <TableCell>
                        {tenant ? (
                          <div>
                            <p className="font-medium">{tenant.firstName} {tenant.lastName}</p>
                            <p className="text-xs text-muted-foreground">
                              seit {new Date(tenant.mietbeginn).toLocaleDateString('de-AT')}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tenant ? (
                          <span className="font-medium">
                            €{totalRent.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn('status-badge', statusStyles[unit.status])}>
                          {statusLabels[unit.status]}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Verteilerschlüssel (20 Schlüssel)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {distributionKeys.map((key) => (
                <div key={key.id} className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
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
                  <Badge variant="secondary">{property.bkAnteilWohnung}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Geschäft</span>
                  <Badge variant="secondary">{property.bkAnteilGeschaeft}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Garage</span>
                  <Badge variant="secondary">{property.bkAnteilGarage}%</Badge>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Heizkosten-Anteile</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Wohnung</span>
                  <Badge variant="secondary">{property.heizungAnteilWohnung}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Geschäft</span>
                  <Badge variant="secondary">{property.heizungAnteilGeschaeft}%</Badge>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 md:col-span-2">
              <h3 className="font-semibold text-foreground mb-4">Jahreskosten gesamt</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    €{property.betriebskostenGesamt.toLocaleString('de-AT')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Betriebskosten p.a.</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    €{property.heizungskostenGesamt.toLocaleString('de-AT')}
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
