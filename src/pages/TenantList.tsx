import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Download, Upload, Mail, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenants } from '@/hooks/useTenants';
import { useUnits } from '@/hooks/useUnits';
import { useProperties } from '@/hooks/useProperties';
import { TenantImportDialog } from '@/components/tenants/TenantImportDialog';

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyIdFromUrl = searchParams.get('propertyId');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(propertyIdFromUrl || 'all');
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { data: properties = [] } = useProperties();
  const { data: allUnits = [] } = useUnits(); // All units for filtering
  const { data: propertyUnits = [] } = useUnits(selectedPropertyId !== 'all' ? selectedPropertyId : undefined);
  const { data: tenants = [], isLoading, refetch } = useTenants();
  
  const units = selectedPropertyId === 'all' ? allUnits : propertyUnits;

  // Filter tenants
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = searchTerm === '' || 
      `${tenant.first_name} ${tenant.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedPropertyId === 'all') return matchesSearch;
    
    const tenantUnit = units.find(u => u.id === tenant.unit_id);
    return matchesSearch && tenantUnit?.property_id === selectedPropertyId;
  });

  const getUnit = (unitId: string) => units.find((u) => u.id === unitId);
  const getProperty = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return null;
    return properties.find(p => p.id === unit.property_id);
  };

  const activeCount = filteredTenants.filter(t => t.status === 'aktiv').length;
  const sepaCount = filteredTenants.filter(t => t.sepa_mandat).length;
  const totalKaution = filteredTenants.reduce((sum, t) => sum + (t.kaution || 0), 0);

  // Get units for the selected property for import
  const importUnits = selectedPropertyId !== 'all' 
    ? units.map(u => ({ id: u.id, top_nummer: u.top_nummer }))
    : [];

  return (
    <MainLayout title="Mieter" subtitle="Alle Mietverhältnisse verwalten">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Mieter suchen..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Alle Liegenschaften" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Liegenschaften</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {selectedPropertyId !== 'all' && (
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              CSV Import
            </Button>
          )}
          <Button onClick={() => navigate('/tenants/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Mieter
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">{filteredTenants.length}</p>
          <p className="text-sm text-muted-foreground">Mieter gesamt</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-success">{activeCount}</p>
          <p className="text-sm text-muted-foreground">Aktive Verträge</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-primary">{sepaCount}</p>
          <p className="text-sm text-muted-foreground">SEPA-Mandate</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">
            €{totalKaution.toLocaleString('de-AT')}
          </p>
          <p className="text-sm text-muted-foreground">Kautionen gesamt</p>
        </div>
      </div>

      {/* Tenant Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Laden...</div>
        ) : filteredTenants.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm ? 'Keine Mieter gefunden' : 'Noch keine Mieter vorhanden'}
          </div>
        ) : (
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
              {filteredTenants.map((tenant) => {
                const unit = getUnit(tenant.unit_id);
                const property = getProperty(tenant.unit_id);
                const totalRent = (tenant.grundmiete || 0) + (tenant.betriebskosten_vorschuss || 0) + (tenant.heizungskosten_vorschuss || 0);

                return (
                  <TableRow 
                    key={tenant.id} 
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(`/tenants/${tenant.id}/edit`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {tenant.first_name} {tenant.last_name}
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
                      <span className="font-medium">{unit?.top_nummer || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{property?.name || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          €{totalRent.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          (€{tenant.grundmiete} + €{tenant.betriebskosten_vorschuss} BK + €{tenant.heizungskosten_vorschuss} HK)
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(tenant.mietbeginn).toLocaleDateString('de-AT')}
                    </TableCell>
                    <TableCell>
                      {tenant.sepa_mandat ? (
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
        )}
      </div>

      {/* Import Dialog */}
      {selectedPropertyId !== 'all' && (
        <TenantImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          propertyId={selectedPropertyId}
          units={importUnits}
          onSuccess={() => refetch()}
        />
      )}
    </MainLayout>
  );
}
