import { useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useOrganization } from "@/hooks/useOrganization";
import { useProperties } from "@/hooks/useProperties";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Plus, Sparkles, ArrowRight } from "lucide-react";
import { SyncStatusWidget } from "@/components/dashboard/SyncStatusWidget";
import { DataQualityWidget } from "@/components/dashboard/DataQualityWidget";
import { BankAccountsWidget } from "@/components/dashboard/BankAccountsWidget";
import { UpcomingMaintenanceWidget } from "@/components/dashboard/UpcomingMaintenanceWidget";
import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { FeatureTour } from "@/components/tour/FeatureTour";
import { useFeatureTour } from "@/hooks/useFeatureTour";
import { useIsTester } from "@/hooks/useUserRole";

export default function SimpleDashboard() {
  const { data: organization, isLoading } = useOrganization();
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { isComplete, markComplete } = useOnboardingStatus();
  const { isOpen, steps, startTour, closeTour, completeTour, autoStartTour, hasCompletedTour } = useFeatureTour();
  const { isTester } = useIsTester();

  const propertiesList = properties || [];
  const isDemoMode = organization?.name === 'Demo-Organisation';
  const showOnboarding = !isTester && !isDemoMode && !isComplete && propertiesList.length === 0 && !propertiesLoading;

  // Auto-start tour for new users
  useEffect(() => {
    if (!isLoading && organization && !showOnboarding) {
      autoStartTour();
    }
  }, [isLoading, organization, showOnboarding, autoStartTour]);

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

  if (!organization && !isDemoMode) {
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

  return (
    <MainLayout title="Dashboard" subtitle="Übersicht">
      {/* Feature Tour */}
      <FeatureTour
        steps={steps}
        isOpen={isOpen}
        onClose={closeTour}
        onComplete={completeTour}
      />

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard onComplete={markComplete} onSkip={markComplete} />
      )}

      <div className="max-w-4xl" data-tour="dashboard">
        {/* Header mit Aktionen */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold">ImmoflowMe</h1>
          <div className="flex gap-2">
            {hasCompletedTour && (
              <Button variant="outline" size="sm" onClick={startTour}>
                <Sparkles className="h-4 w-4 mr-2" />
                Tour starten
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/einstellungen">Einstellungen</Link>
            </Button>
          </div>
        </div>

        {/* Organization Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Organisation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-lg font-medium">{organization?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="secondary">Aktiv</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sync Status Widget */}
        <SyncStatusWidget />

        {/* Data Quality Widget */}
        <div className="mt-6">
          <DataQualityWidget />
        </div>

        {/* Bank Accounts Widget */}
        <div className="mt-6">
          <BankAccountsWidget />
        </div>

        {/* Upcoming Maintenance Widget */}
        <div className="mt-6">
          <UpcomingMaintenanceWidget />
        </div>

        {/* Calendar Widget */}
        <div className="mt-6">
          <CalendarWidget />
        </div>

        {/* Properties Overview – links to dedicated page */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Meine Liegenschaften ({propertiesList.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link to="/liegenschaften">
                    Alle anzeigen
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/liegenschaften/neu">
                    <Plus className="h-4 w-4 mr-2" />
                    Neue Liegenschaft
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {propertiesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : propertiesList.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">
                Noch keine Liegenschaften vorhanden. Erstellen Sie Ihre erste Liegenschaft!
              </p>
            ) : (
              <div className="space-y-3">
                {propertiesList.slice(0, 5).map((property) => (
                  <Link
                    key={property.id}
                    to={`/liegenschaften/${property.id}`}
                    className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition"
                  >
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{property.name}</h3>
                      <p className="text-muted-foreground text-sm truncate">
                        {property.address}, {property.postal_code} {property.city}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-medium">{property.total_units} Einheiten</p>
                      <p className="text-xs text-muted-foreground">{property.total_qm} m²</p>
                    </div>
                  </Link>
                ))}
                {propertiesList.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    … und {propertiesList.length - 5} weitere.{' '}
                    <Link to="/liegenschaften" className="text-primary hover:underline">Alle anzeigen</Link>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
