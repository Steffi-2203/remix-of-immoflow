import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useSubscriptionLimits, calculateTrialDaysRemaining } from "@/hooks/useOrganization";
import { useProperties, useCreateProperty, useDeleteProperty } from "@/hooks/useProperties";
import { useUnits, useCreateUnit } from "@/hooks/useUnits";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Plus, Trash2, ChevronDown, ChevronRight, Home } from "lucide-react";
import { TrialExpiredModal } from "@/components/dashboard/TrialExpiredModal";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { supabase } from "@/integrations/supabase/client";

// Subscription limits
const LIMITS = {
  starter: { properties: 1, unitsPerProperty: 5 },
  professional: { properties: 3, unitsPerProperty: 15 },
  enterprise: { properties: 999, unitsPerProperty: 999 },
};

function UnitsSection({ propertyId, maxUnits, isExpired }: { propertyId: string; maxUnits: number; isExpired: boolean }) {
  const { data: units, isLoading } = useUnits(propertyId);
  const createUnit = useCreateUnit();
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnit, setNewUnit] = useState({ top_nummer: '' });

  const unitsList = units || [];
  const canAddUnit = unitsList.length < maxUnits && !isExpired;

  if (isLoading) {
    return <div className="mt-4 pt-4 border-t"><Skeleton className="h-20 w-full" /></div>;
  }

  return (
    <div className="mt-4 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-sm">
          Einheiten ({unitsList.length} von {maxUnits})
        </h4>
        {isExpired ? (
          <span className="text-sm text-destructive">Abo abgelaufen</span>
        ) : canAddUnit ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddUnit(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Einheit
          </Button>
        ) : (
          <span className="text-sm text-orange-600">Limit erreicht</span>
        )}
      </div>

      {showAddUnit && (
        <div className="mb-3 p-3 bg-muted rounded-lg">
          <Input
            type="text"
            placeholder="Einheit (z.B. Top 1, Whg. 3)"
            value={newUnit.top_nummer}
            onChange={(e) => setNewUnit({ top_nummer: e.target.value })}
            className="mb-2"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                if (!newUnit.top_nummer) return;
                await createUnit.mutateAsync({
                  top_nummer: newUnit.top_nummer,
                  property_id: propertyId,
                });
                setNewUnit({ top_nummer: '' });
                setShowAddUnit(false);
              }}
              disabled={createUnit.isPending}
            >
              Speichern
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddUnit(false)}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      {unitsList.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Einheiten</p>
      ) : (
        <div className="space-y-2">
          {unitsList.map((unit) => (
            <div key={unit.id} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{unit.top_nummer}</span>
                <Badge variant={unit.status === 'aktiv' ? 'default' : 'secondary'} className="text-xs">
                  {unit.status === 'aktiv' ? 'Vermietet' : 'Leerstand'}
                </Badge>
              </div>
              <span className="text-muted-foreground">{unit.qm} m²</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SimpleDashboard() {
  const { user } = useAuth();
  const { organization, isLoading, subscriptionStatus, subscriptionTier, refetch } = useSubscription();
  const { trialDaysRemaining, isTrialExpiringSoon, status } = useSubscriptionLimits();
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const createProperty = useCreateProperty();
  const deleteProperty = useDeleteProperty();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newProperty, setNewProperty] = useState({ name: '', address: '', city: '', postal_code: '' });
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  // Check for expired trials on mount
  useEffect(() => {
    const checkTrialExpiration = async () => {
      try {
        await supabase.functions.invoke('check-trial-expiration');
        refetch();
      } catch (error) {
        console.error('Error checking trial expiration:', error);
      }
    };
    
    checkTrialExpiration();
  }, [refetch]);

  const propertiesList = properties || [];
  const currentLimits = LIMITS[subscriptionTier as keyof typeof LIMITS] || LIMITS.starter;
  const currentPropertyCount = propertiesList.length;
  const maxProperties = currentLimits.properties;
  
  const isExpired = subscriptionStatus === 'expired';
  const canAddProperty = currentPropertyCount < maxProperties && !isExpired;

  if (isLoading) {
    return (
      <MainLayout title="Dashboard" subtitle="Übersicht">
        <div className="max-w-4xl">
          <div className="bg-card rounded-lg shadow p-6 mb-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!organization) {
    return (
      <MainLayout title="Dashboard" subtitle="Übersicht">
        <div className="max-w-4xl">
          <div className="bg-card rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Organisation nicht gefunden</h2>
            <p className="text-muted-foreground">Bitte erstellen Sie zuerst eine Organisation.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const statusColors: Record<string, string> = {
    trial: "bg-yellow-100 text-yellow-800",
    active: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    expired: "bg-gray-100 text-gray-800",
  };

  const tierLabels: Record<string, string> = {
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
  };

  return (
    <MainLayout title="Dashboard" subtitle="Übersicht">
      {/* Trial Expired Modal */}
      <TrialExpiredModal open={isExpired} />
      
      <div className="max-w-4xl">
        {/* Trial Banner */}
        {subscriptionStatus === 'trial' && trialDaysRemaining > 0 && (
          <div className="mb-6">
            <TrialBanner 
              daysRemaining={trialDaysRemaining} 
              isExpiringSoon={isTrialExpiringSoon} 
            />
          </div>
        )}

        {/* Header mit Aktionen */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Property Partner Pro</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/einstellungen">Einstellungen</Link>
            </Button>
            <Button asChild>
              <Link to="/upgrade">Plan upgraden</Link>
            </Button>
          </div>
        </div>

        {/* Subscription Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Ihr Abo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-lg font-medium">{tierLabels[subscriptionTier] || subscriptionTier}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={statusColors[subscriptionStatus] || "bg-gray-100"}>
                  {subscriptionStatus === "trial" ? "Testphase" : 
                   subscriptionStatus === "active" ? "Aktiv" :
                   subscriptionStatus === "cancelled" ? "Gekündigt" :
                   subscriptionStatus === "expired" ? "Abgelaufen" : subscriptionStatus}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Organisation</p>
                <p className="text-lg font-medium">{organization.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Properties Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Meine Liegenschaften ({currentPropertyCount} von {maxProperties})
              </CardTitle>
              {isExpired ? (
                <Button variant="destructive" asChild>
                  <Link to="/pricing">Abo abgelaufen - Jetzt upgraden</Link>
                </Button>
              ) : canAddProperty ? (
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Liegenschaft
                </Button>
              ) : (
                <Button variant="secondary" asChild>
                  <Link to="/pricing">Limit erreicht - Upgraden</Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Add Form */}
            {showAddForm && (
              <div className="mb-6 p-4 border rounded-lg bg-muted">
                <h3 className="font-semibold mb-4">Neue Liegenschaft</h3>
                <div className="space-y-3">
                  <Input
                    type="text"
                    placeholder="Name (z.B. Bahnhofstraße 12)"
                    value={newProperty.name}
                    onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
                  />
                  <Input
                    type="text"
                    placeholder="Adresse"
                    value={newProperty.address}
                    onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="text"
                      placeholder="PLZ"
                      value={newProperty.postal_code}
                      onChange={(e) => setNewProperty({ ...newProperty, postal_code: e.target.value })}
                    />
                    <Input
                      type="text"
                      placeholder="Stadt"
                      value={newProperty.city}
                      onChange={(e) => setNewProperty({ ...newProperty, city: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        if (!newProperty.name || !newProperty.address || !newProperty.city || !newProperty.postal_code) return;
                        await createProperty.mutateAsync(newProperty);
                        setNewProperty({ name: '', address: '', city: '', postal_code: '' });
                        setShowAddForm(false);
                      }}
                      disabled={createProperty.isPending}
                    >
                      Speichern
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewProperty({ name: '', address: '', city: '', postal_code: '' });
                      }}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Properties List */}
            {propertiesLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : propertiesList.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">
                Noch keine Liegenschaften vorhanden. Erstellen Sie Ihre erste Liegenschaft!
              </p>
            ) : (
              <div className="space-y-4">
                {propertiesList.map((property) => (
                  <div
                    key={property.id}
                    className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                    onClick={() => setSelectedProperty(property.id === selectedProperty ? null : property.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        {selectedProperty === property.id ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <h3 className="font-semibold text-lg">{property.name}</h3>
                          <p className="text-muted-foreground text-sm">
                            {property.address}, {property.postal_code} {property.city}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {property.total_units} Einheiten • {property.total_qm} m²
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Liegenschaft wirklich löschen?')) {
                            deleteProperty.mutate(property.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    {/* Units Section - nur wenn Property ausgewählt */}
                    {selectedProperty === property.id && (
                      <UnitsSection
                        propertyId={property.id}
                        maxUnits={currentLimits.unitsPerProperty}
                        isExpired={isExpired}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
