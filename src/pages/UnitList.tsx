import { MainLayout } from '@/components/layout/MainLayout';
import { mockUnits, mockProperties, mockTenants } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Search, Filter, Home, Building2, Car } from 'lucide-react';
import { cn } from '@/lib/utils';

const unitTypeLabels = {
  wohnung: 'Wohnung',
  geschaeft: 'Geschäft',
  garage: 'Garage',
  stellplatz: 'Stellplatz',
  lager: 'Lager',
  sonstiges: 'Sonstiges',
};

const unitTypeIcons = {
  wohnung: Home,
  geschaeft: Building2,
  garage: Car,
  stellplatz: Car,
  lager: Building2,
  sonstiges: Building2,
};

const statusLabels = {
  aktiv: 'Vermietet',
  leerstand: 'Leerstand',
  beendet: 'Beendet',
};

const statusStyles = {
  aktiv: 'bg-success/10 text-success border-success/30',
  leerstand: 'bg-warning/10 text-warning border-warning/30',
  beendet: 'bg-muted text-muted-foreground border-border',
};

export default function UnitList() {
  const getProperty = (propertyId: string) => mockProperties.find((p) => p.id === propertyId);
  const getTenant = (tenantId?: string) => tenantId ? mockTenants.find((t) => t.id === tenantId) : null;

  // Combine all units from all properties for demo
  const allUnits = mockUnits;

  return (
    <MainLayout title="Einheiten" subtitle="Alle Mieteinheiten verwalten">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" placeholder="Einheit suchen..." className="pl-9" />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              <SelectItem value="wohnung">Wohnungen</SelectItem>
              <SelectItem value="geschaeft">Geschäfte</SelectItem>
              <SelectItem value="garage">Garagen</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="aktiv">Vermietet</SelectItem>
              <SelectItem value="leerstand">Leerstand</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Neue Einheit
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">{allUnits.length}</p>
          <p className="text-sm text-muted-foreground">Einheiten gesamt</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">
            {allUnits.filter((u) => u.type === 'wohnung').length}
          </p>
          <p className="text-sm text-muted-foreground">Wohnungen</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">
            {allUnits.filter((u) => u.type === 'geschaeft').length}
          </p>
          <p className="text-sm text-muted-foreground">Geschäfte</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-success">
            {allUnits.filter((u) => u.status === 'aktiv').length}
          </p>
          <p className="text-sm text-muted-foreground">Vermietet</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-warning">
            {allUnits.filter((u) => u.status === 'leerstand').length}
          </p>
          <p className="text-sm text-muted-foreground">Leerstand</p>
        </div>
      </div>

      {/* Units Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Einheit</TableHead>
              <TableHead>Liegenschaft</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Fläche</TableHead>
              <TableHead>MEA</TableHead>
              <TableHead>Mieter</TableHead>
              <TableHead>Miete</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allUnits.map((unit) => {
              const property = getProperty(unit.propertyId);
              const tenant = getTenant(unit.currentTenantId);
              const Icon = unitTypeIcons[unit.type];
              const totalRent = tenant
                ? tenant.grundmiete + tenant.betriebskostenVorschuss + tenant.heizungskostenVorschuss
                : 0;

              return (
                <TableRow key={unit.id} className="hover:bg-muted/30 cursor-pointer">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-muted p-1.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="font-medium">{unit.topNummer}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{property?.name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{unitTypeLabels[unit.type]}</Badge>
                  </TableCell>
                  <TableCell>{unit.qm.toLocaleString('de-AT')} m²</TableCell>
                  <TableCell>{unit.mea}‰</TableCell>
                  <TableCell>
                    {tenant ? (
                      <span className="font-medium">{tenant.firstName} {tenant.lastName}</span>
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
                    <Badge variant="outline" className={statusStyles[unit.status]}>
                      {statusLabels[unit.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </MainLayout>
  );
}
