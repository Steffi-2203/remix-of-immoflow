import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CreditCard, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type PaymentStatus = 'active' | 'past_due' | 'canceled' | 'unpaid';

interface UserProfile {
  paymentStatus?: PaymentStatus;
  paymentFailedAt?: string;
  canceledAt?: string;
  subscriptionTier?: string;
}

export function PaymentStatusBanner() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['/api/auth/user'],
  });

  const paymentStatus = profile?.paymentStatus;
  const subscriptionTier = profile?.subscriptionTier;

  if (dismissed || !paymentStatus || paymentStatus === 'active') {
    return null;
  }

  if (subscriptionTier === 'trial' || subscriptionTier === 'inactive') {
    return null;
  }

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    }
  };

  if (paymentStatus === 'past_due') {
    return (
      <Alert variant="destructive" className="mx-4 mt-4 mb-0">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle data-testid="text-payment-status-title">
          Zahlungsproblem
        </AlertTitle>
        <AlertDescription data-testid="text-payment-status-message">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Ihre letzte Zahlung konnte nicht verarbeitet werden. 
              Bitte aktualisieren Sie Ihre Zahlungsinformationen.
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManageSubscription}
              data-testid="button-update-payment"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Zahlung aktualisieren
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (paymentStatus === 'canceled' || paymentStatus === 'unpaid') {
    return (
      <Alert variant="destructive" className="mx-4 mt-4 mb-0">
        <XCircle className="h-4 w-4" />
        <AlertTitle data-testid="text-subscription-canceled-title">Abonnement beendet</AlertTitle>
        <AlertDescription data-testid="text-subscription-canceled-message">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Ihr Abonnement wurde aufgrund nicht bezahlter Rechnungen gekündigt.
              Einige Funktionen sind eingeschränkt.
            </span>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => navigate('/pricing')}
              data-testid="button-resubscribe"
            >
              Erneut abonnieren
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
