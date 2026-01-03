import { MainLayout } from '@/components/layout/MainLayout';
import { PropertyCard } from '@/components/dashboard/PropertyCard';
import { mockProperties } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function PropertyList() {
  return (
    <MainLayout title="Liegenschaften" subtitle="Alle verwalteten Immobilien">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Liegenschaft suchen..."
              className="pl-9"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="vacant">Mit Leerstand</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link to="/liegenschaften/neu">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neue Liegenschaft
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">{mockProperties.length}</p>
          <p className="text-sm text-muted-foreground">Liegenschaften</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">
            {mockProperties.reduce((sum, p) => sum + p.totalUnits, 0)}
          </p>
          <p className="text-sm text-muted-foreground">Einheiten gesamt</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">
            {mockProperties.reduce((sum, p) => sum + p.totalQm, 0).toLocaleString('de-AT')} m²
          </p>
          <p className="text-sm text-muted-foreground">Gesamtfläche</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-bold text-success">87%</p>
          <p className="text-sm text-muted-foreground">Ø Auslastung</p>
        </div>
      </div>

      {/* Properties Grid */}
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
    </MainLayout>
  );
}
