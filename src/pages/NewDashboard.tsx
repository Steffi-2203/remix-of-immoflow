import { MainLayout } from "@/components/layout/MainLayout";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, Crown, Sparkles } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

const NewDashboard = () => {
  const navigate = useNavigate();
  const { subscriptionStatus, subscriptionEnd, isSubscribed } = useSubscription();
  const isTrial = subscriptionStatus === 'trial';
  
  // Calculate days remaining in trial
  const daysRemaining = subscriptionEnd 
    ? Math.max(0, differenceInDays(parseISO(subscriptionEnd), new Date()))
    : 0;

  return (
    <MainLayout title="Dashboard">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="text-muted-foreground">Willkommen zurück!</p>
        
        {/* Trial Countdown Banner */}
        {isTrial && (
          <Alert className="mt-6 border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50">
            <Clock className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-800 flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Kostenlose Testversion
            </AlertTitle>
            <AlertDescription className="text-amber-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
                <div>
                  <p className="font-medium">
                    {daysRemaining > 0 ? (
                      <>
                        Noch <span className="text-2xl font-bold text-amber-800">{daysRemaining}</span> {daysRemaining === 1 ? 'Tag' : 'Tage'} verbleibend
                      </>
                    ) : (
                      <span className="text-destructive font-bold">Ihre Testversion ist abgelaufen</span>
                    )}
                  </p>
                  <p className="text-sm mt-1">
                    {daysRemaining > 0 
                      ? 'Upgraden Sie jetzt, um alle Funktionen freizuschalten und Ihre Daten zu behalten.'
                      : 'Upgraden Sie jetzt, um Ihre Daten zu behalten und alle Funktionen zu nutzen.'
                    }
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/upgrade')}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shrink-0"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Jetzt upgraden
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Subscribed Banner */}
        {isSubscribed && (
          <Alert className="mt-6 border-green-500 bg-green-50">
            <Crown className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-800">Premium aktiv</AlertTitle>
            <AlertDescription className="text-green-700">
              Sie haben vollen Zugriff auf alle Funktionen.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">Liegenschaften</h3>
            <p className="text-2xl font-bold mt-2">-</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">Einheiten</h3>
            <p className="text-2xl font-bold mt-2">-</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">Mieter</h3>
            <p className="text-2xl font-bold mt-2">-</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">Offene Zahlungen</h3>
            <p className="text-2xl font-bold mt-2">-</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default NewDashboard;
