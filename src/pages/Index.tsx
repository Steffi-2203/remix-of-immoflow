import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { PropertyCard } from '@/components/dashboard/PropertyCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { UpcomingPayments } from '@/components/dashboard/UpcomingPayments';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { useInvoices } from '@/hooks/useInvoices';
import { Building2, Home, Users, Euro, AlertTriangle, Receipt, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';

const Index = () => {
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: units, isLoading: unitsLoading } = useUnits();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();

  const isLoading = propertiesLoading || unitsLoading || tenantsLoading || invoicesLoading;

  // Calculate real stats
  const stats = useMemo(() => {
    const activeTenants = tenants?.filter(t => t.status === 'aktiv') || [];
    const occupiedUnits = units?.filter(u => u.status === 'aktiv').length || 0;
    
    // Monthly revenue from active tenants
    const monthlyRevenue = activeTenants.reduce((sum, t) => 
      sum + Number(t.grundmiete) + Number(t.betriebskosten_vorschuss) + Number(t.heizungskosten_vorschuss), 0
    );

    // Open invoices
    const openInvoices = invoices?.filter(i => i.status === 'offen' || i.status === 'teilbezahlt') || [];
    
    // Overdue invoices
    const overdueInvoices = invoices?.filter(i => i.status === 'ueberfaellig') || [];
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + Number(i.gesamtbetrag), 0);

    return {
      totalProperties: properties?.length || 0,
      totalUnits: units?.length || 0,
      occupiedUnits,
      totalTenants: activeTenants.length,
      monthlyRevenue,
      openInvoices: openInvoices.length,
      overdueAmount,
    };
  }, [properties, units, tenants, invoices]);

  // Calculate units per property
  const propertyUnits = useMemo(() => {
    const unitsByProperty: Record<string, { total: number; occupied: number; vacant: number }> = {};
    
    properties?.forEach(p => {
      const propertyUnits = units?.filter(u => u.property_id === p.id) || [];
      const occupied = propertyUnits.filter(u => u.status === 'aktiv').length;
      unitsByProperty[p.id] = {
        total: propertyUnits.length,
        occupied,
        vacant: propertyUnits.length - occupied,
      };
    });
    
    return unitsByProperty;
  }, [properties, units]);

  if (isLoading) {
    return (
      <MainLayout title="Dashboard" subtitle="Übersicht Ihrer Immobilienverwaltung">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard" subtitle="Übersicht Ihrer Immobilienverwaltung">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard
          title="Liegenschaften"
          value={stats.totalProperties}
          icon={Building2}
        />
        <StatCard
          title="Einheiten"
          value={stats.totalUnits}
          icon={Home}
          subtitle={`${stats.occupiedUnits} vermietet`}
        />
        <StatCard
          title="Mieter"
          value={stats.totalTenants}
          icon={Users}
        />
        <StatCard
          title="Monatsumsatz"
          value={`€${stats.monthlyRevenue.toLocaleString('de-AT', { minimumFractionDigits: 2 })}`}
          icon={Euro}
          variant="success"
        />
        <StatCard
          title="Offene Zahlungen"
          value={stats.openInvoices}
          icon={Receipt}
          variant="warning"
        />
        <StatCard
          title="Überfällig"
          value={`€${stats.overdueAmount.toLocaleString('de-AT', { minimumFractionDigits: 2 })}`}
          icon={AlertTriangle}
          variant="destructive"
        />
      </div>

      {/* Properties Overview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Liegenschaften</h2>
            <p className="text-sm text-muted-foreground">Ihre verwalteten Immobilien</p>
          </div>
          <Link to="/liegenschaften/neu">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neue Liegenschaft
            </Button>
          </Link>
        </div>
        {properties && properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                units={propertyUnits[property.id] || { total: 0, occupied: 0, vacant: 0 }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Noch keine Liegenschaften angelegt</p>
            <Link to="/liegenschaften/neu">
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Erste Liegenschaft anlegen
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingPayments />
        <RecentActivity />
      </div>
    </MainLayout>
  );
};

export default Index;