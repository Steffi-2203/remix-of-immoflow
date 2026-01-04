import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SimpleDashboard() {
  const { user } = useAuth();
  const { organization, isLoading, subscriptionStatus, subscriptionTier } = useSubscription();

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
      <div className="max-w-4xl">
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
        <div className="bg-card rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Ihr Abo</h2>
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
        </div>

        {/* Properties Section */}
        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Meine Liegenschaften</h2>
          <p className="text-muted-foreground">Liegenschaften werden hier angezeigt...</p>
        </div>
      </div>
    </MainLayout>
  );
}
