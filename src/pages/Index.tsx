import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { PropertyCard } from '@/components/dashboard/PropertyCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { UpcomingPayments } from '@/components/dashboard/UpcomingPayments';
import { mockProperties, mockDashboardStats } from '@/data/mockData';
import { Building2, Home, Users, Euro, AlertTriangle, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const stats = mockDashboardStats;

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
          value={`€${stats.monthlyRevenue.toLocaleString('de-AT')}`}
          icon={Euro}
          trend={{ value: 3.2, isPositive: true }}
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
          value={`€${stats.overdueAmount.toLocaleString('de-AT')}`}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              units={{
                total: property.totalUnits,
                occupied: Math.floor(property.totalUnits * 0.85),
                vacant: Math.ceil(property.totalUnits * 0.15),
              }}
            />
          ))}
        </div>
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
