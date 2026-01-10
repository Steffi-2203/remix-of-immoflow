import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { PropertyCard } from '@/components/dashboard/PropertyCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { UpcomingPayments } from '@/components/dashboard/UpcomingPayments';
import { PaymentStatusWidget } from '@/components/dashboard/PaymentStatusWidget';
import { SyncStatusWidget } from '@/components/dashboard/SyncStatusWidget';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { useInvoices } from '@/hooks/useInvoices';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Home, Users, Euro, AlertTriangle, Receipt, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Index = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: units, isLoading: unitsLoading } = useUnits();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const [claimingPropertyId, setClaimingPropertyId] = useState<string | null>(null);

  // Check which properties the user already manages
  const { data: myPropertyIds } = useQuery({
    queryKey: ['my_property_managers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('property_managers')
        .select('property_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return data.map(pm => pm.property_id);
    },
    enabled: !!user,
  });

  const isLoading = propertiesLoading || unitsLoading || tenantsLoading || invoicesLoading;

  // Separate properties into managed and unassigned
  const { managedProperties, unassignedProperties } = useMemo(() => {
    const myIds = new Set(myPropertyIds || []);
    const managed = properties?.filter(p => myIds.has(p.id)) || [];
    const unassigned = properties?.filter(p => !myIds.has(p.id)) || [];
    return { managedProperties: managed, unassignedProperties: unassigned };
  }, [properties, myPropertyIds]);

  // Calculate real stats (only for managed properties)
  const stats = useMemo(() => {
    const managedUnitIds = new Set(
      units?.filter(u => managedProperties.some(p => p.id === u.property_id)).map(u => u.id) || []
    );
    
    const activeTenants = tenants?.filter(t => t.status === 'aktiv' && managedUnitIds.has(t.unit_id)) || [];
    const managedUnits = units?.filter(u => managedProperties.some(p => p.id === u.property_id)) || [];
    const occupiedUnits = managedUnits.filter(u => u.status === 'aktiv').length;
    
    // Monthly revenue from active tenants
    const monthlyRevenue = activeTenants.reduce((sum, t) => 
      sum + Number(t.grundmiete) + Number(t.betriebskosten_vorschuss) + Number(t.heizungskosten_vorschuss), 0
    );

    // Open invoices
    const managedInvoices = invoices?.filter(i => managedUnitIds.has(i.unit_id)) || [];
    const openInvoices = managedInvoices.filter(i => i.status === 'offen' || i.status === 'teilbezahlt');
    
    // Overdue invoices
    const overdueInvoices = managedInvoices.filter(i => i.status === 'ueberfaellig');
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + Number(i.gesamtbetrag), 0);

    return {
      totalProperties: managedProperties.length,
      totalUnits: managedUnits.length,
      occupiedUnits,
      totalTenants: activeTenants.length,
      monthlyRevenue,
      openInvoices: openInvoices.length,
      overdueAmount,
    };
  }, [managedProperties, units, tenants, invoices]);

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

  const handleClaimProperty = async (propertyId: string) => {
    if (!user) {
      toast.error('Sie müssen angemeldet sein');
      return;
    }

    setClaimingPropertyId(propertyId);
    try {
      const { error } = await supabase
        .from('property_managers')
        .insert({
          user_id: user.id,
          property_id: propertyId,
        });

      if (error) throw error;

      toast.success('Liegenschaft erfolgreich übernommen');
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['my_property_managers'] });
    } catch (error) {
      console.error('Claim property error:', error);
      toast.error('Fehler beim Übernehmen der Liegenschaft');
    } finally {
      setClaimingPropertyId(null);
    }
  };

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
      {/* Unassigned Properties Alert */}
      {unassignedProperties.length > 0 && (
        <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <UserPlus className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            Es gibt {unassignedProperties.length} Liegenschaft(en) ohne Verwalter. Klicken Sie auf "Übernehmen" um diese zu Ihrem Konto hinzuzufügen.
          </AlertDescription>
        </Alert>
      )}

      {/* Unassigned Properties Section */}
      {unassignedProperties.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Nicht zugewiesene Liegenschaften</h2>
              <p className="text-sm text-muted-foreground">Diese Liegenschaften haben noch keinen Verwalter</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unassignedProperties.map((property) => (
              <Card key={property.id} className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{property.name}</CardTitle>
                  <CardDescription>{property.address}, {property.postal_code} {property.city}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {propertyUnits[property.id]?.total || 0} Einheiten
                    </span>
                    <Button 
                      size="sm" 
                      onClick={() => handleClaimProperty(property.id)}
                      disabled={claimingPropertyId === property.id}
                    >
                      {claimingPropertyId === property.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Übernehmen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

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
            <h2 className="text-lg font-semibold text-foreground">Meine Liegenschaften</h2>
            <p className="text-sm text-muted-foreground">
              {managedProperties.length} Liegenschaften
            </p>
          </div>
          <Link to="/liegenschaften/neu">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neue Liegenschaft
            </Button>
          </Link>
        </div>
        {managedProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {managedProperties.map((property) => (
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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <PaymentStatusWidget />
        <UpcomingPayments />
        <RecentActivity />
        <SyncStatusWidget />
      </div>
    </MainLayout>
  );
};

export default Index;
