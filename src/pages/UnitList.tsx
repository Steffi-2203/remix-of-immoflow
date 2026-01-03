import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Search, Filter, Home, Building2, Car, Loader2, Users, Receipt } from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';
import { useInvoices } from '@/hooks/useInvoices';
import { useState } from 'react';

const unitTypeLabels: Record<string, string> = {
  wohnung: 'Wohnung',
  geschaeft: 'Geschäft',
  garage: 'Garage',
  stellplatz: 'Stellplatz',
  lager: 'Lager',
  sonstiges: 'Sonstiges',
};

const unitTypeIcons: Record<string, React.ElementType> = {
  wohnung: Home,
  geschaeft: Building2,
  garage: Car,
  stellplatz: Car,
  lager: Building2,
  sonstiges: Building2,
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

export default function UnitList() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: units, isLoading: isLoadingUnits } = useUnits();
  const { data: properties } = useProperties();
  const { data: tenants } = useTenants();
  const { data: invoices } = useInvoices();

  const getProperty = (propertyId: string) => properties?.find((p) => p.id === propertyId);
  const getTenantForUnit = (unitId: string) => tenants?.find((t) => t.unit_id === unitId && t.status === 'aktiv');
  const getInvoicesForUnit = (unitId: string) => invoices?.filter((i) => i.unit_id === unitId) || [];

  // Filter units
  const filteredUnits = units?.filter(unit => {
    if (typeFilter !== 'all' && unit.type !== typeFilter) return false;
    if (statusFilter !== 'all' && unit.status !== statusFilter) return false;
    if (searchQuery) {
      const property = getProperty(unit.property_id);
      const tenant = getTenantForUnit(unit.id);
      const searchLower = searchQuery.toLowerCase();
      const matchesTop = unit.top_nummer.toLowerCase().includes(searchLower);
      const matchesProperty = property?.name.toLowerCase().includes(searchLower);
      const matchesTenant = tenant && `${tenant.first_name} ${tenant.last_name}`.toLowerCase().includes(searchLower);
      if (!matchesTop && !matchesProperty && !matchesTenant) return false;
    }
    return true;
  }) || [];

  // Calculate stats
  const stats = {
    total: units?.length || 0,
    wohnungen: units?.filter(u => u.type === 'wohnung').length || 0,
    geschaefte: units?.filter(u => u.type === 'geschaeft').length || 0,
    vermietet: units?.filter(u => u.status === 'aktiv').length || 0,
    leerstand: units?.filter(u => u.status === 'leerstand').length || 0,
  };

  if (isLoadingUnits) {
    return (
      <MainLayout title="Einheiten" subtitle="Alle Mieteinheiten verwalten">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Einheiten" subtitle="Alle Mieteinheiten mit Mietern und Vorschreibungen">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Einheit, Liegenschaft oder Mieter suchen..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Einheiten gesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{stats.wohnungen}</p>
            <p className="text-sm text-muted-foreground">Wohnungen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{stats.geschaefte}</p>
            <p className="text-sm text-muted-foreground">Geschäfte</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{stats.vermietet}</p>
            <p className="text-sm text-muted-foreground">Vermietet</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-yellow-600">{stats.leerstand}</p>
            <p className="text-sm text-muted-foreground">Leerstand</p>
          </CardContent>
        </Card>
      </div>

      {/* Units Table */}
      <Card>
        <CardContent className="p-0">
          {filteredUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Home className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine Einheiten gefunden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Einheit</TableHead>
                  <TableHead>Liegenschaft</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Fläche</TableHead>
                  <TableHead>Mieter</TableHead>
                  <TableHead className="text-right">Grundmiete</TableHead>
                  <TableHead className="text-right">BK</TableHead>
                  <TableHead className="text-right">HK</TableHead>
                  <TableHead className="text-right">Vorschreibung</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnits.map((unit) => {
                  const property = getProperty(unit.property_id);
                  const tenant = getTenantForUnit(unit.id);
                  const unitInvoices = getInvoicesForUnit(unit.id);
                  const openInvoices = unitInvoices.filter(i => i.status === 'offen').length;
                  const Icon = unitTypeIcons[unit.type] || Building2;
                  
                  const grundmiete = tenant ? Number(tenant.grundmiete) : 0;
                  const bk = tenant ? Number(tenant.betriebskosten_vorschuss) : 0;
                  const hk = tenant ? Number(tenant.heizungskosten_vorschuss) : 0;
                  const totalRent = grundmiete + bk + hk;

                  return (
                    <TableRow 
                      key={unit.id} 
                      className="hover:bg-muted/30 cursor-pointer"
                      onClick={() => window.location.href = `/einheiten/${unit.property_id}/${unit.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-muted p-1.5">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium">{unit.top_nummer}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{property?.name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{unitTypeLabels[unit.type]}</Badge>
                      </TableCell>
                      <TableCell>{Number(unit.qm).toLocaleString('de-AT')} m²</TableCell>
                      <TableCell>
                        {tenant ? (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{tenant.first_name} {tenant.last_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {tenant ? (
                          <span className="text-muted-foreground">
                            € {grundmiete.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {tenant ? (
                          <span className="text-muted-foreground">
                            € {bk.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {tenant ? (
                          <span className="text-muted-foreground">
                            € {hk.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {tenant ? (
                          <span className="font-semibold text-foreground">
                            € {totalRent.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusStyles[unit.status]}>
                          {statusLabels[unit.status]}
                        </Badge>
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
