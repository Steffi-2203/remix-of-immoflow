import { MainLayout } from '@/components/layout/MainLayout';
import { mockTenants, mockUnits, mockProperties } from '@/data/mockData';
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
import { Plus, Search, Download, Mail, Phone, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusLabels = {
  aktiv: 'Aktiv',
  leerstand: 'Leerstand',
  beendet: 'Beendet',
};

const statusStyles = {
  aktiv: 'bg-success/10 text-success border-success/30',
  leerstand: 'bg-warning/10 text-warning border-warning/30',
  beendet: 'bg-muted text-muted-foreground border-border',
};

export default function TenantList() {
  const getUnit = (unitId: string) => mockUnits.find((u) => u.id === unitId);
  const getProperty = (propertyId: string) => mockProperties.find((p) => p.id === propertyId);

  return (
    <MainLayout title="Mieter" subtitle="Alle Mietverhältnisse verwalten">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Mieter suchen..." className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Mieter
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">{mockTenants.length}</p>
          <p className="text-sm text-muted-foreground">Mieter gesamt</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-success">
            {mockTenants.filter((t) => t.status === 'aktiv').length}
          </p>
          <p className="text-sm text-muted-foreground">Aktive Verträge</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-primary">
            {mockTenants.filter((t) => t.sepaMandat).length}
          </p>
          <p className="text-sm text-muted-foreground">SEPA-Mandate</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">
            €{mockTenants.reduce((sum, t) => sum + t.kaution, 0).toLocaleString('de-AT')}
          </p>
          <p className="text-sm text-muted-foreground">Kautionen gesamt</p>
        </div>
      </div>

      {/* Tenant Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Mieter</TableHead>
              <TableHead>Einheit</TableHead>
              <TableHead>Liegenschaft</TableHead>
              <TableHead>Miete gesamt</TableHead>
              <TableHead>Mietbeginn</TableHead>
              <TableHead>SEPA</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockTenants.map((tenant) => {
              const unit = getUnit(tenant.unitId);
              const property = unit ? getProperty(unit.propertyId) : null;
              const totalRent = tenant.grundmiete + tenant.betriebskostenVorschuss + tenant.heizungskostenVorschuss;

              return (
                <TableRow key={tenant.id} className="hover:bg-muted/30 cursor-pointer">
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">
                        {tenant.firstName} {tenant.lastName}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {tenant.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {tenant.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{unit?.topNummer}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{property?.name}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        €{totalRent.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        (€{tenant.grundmiete} + €{tenant.betriebskostenVorschuss} BK + €{tenant.heizungskostenVorschuss} HK)
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(tenant.mietbeginn).toLocaleDateString('de-AT')}
                  </TableCell>
                  <TableCell>
                    {tenant.sepaMandat ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                        <CreditCard className="h-3 w-3 mr-1" />
                        Aktiv
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusStyles[tenant.status]}>
                      {statusLabels[tenant.status]}
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
