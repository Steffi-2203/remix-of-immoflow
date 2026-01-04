import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SUBSCRIPTION_TIERS, SubscriptionTierKey } from '@/config/stripe';

// Re-export for backwards compatibility
export const STRIPE_PLANS = SUBSCRIPTION_TIERS;
export type PlanKey = SubscriptionTierKey;

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  product_id: string | null;
}

export function useSubscription() {
  const queryClient = useQueryClient();

  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: async (): Promise<SubscriptionStatus> => {
      // Check if user is authenticated first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return {
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
          product_id: null,
        };
      }

      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Error checking subscription:', error);
        throw error;
      }
      
      return data;
    },
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const url = data?.url;
      if (url) {
        // Stripe Checkout cannot be embedded in the preview iframe; open in a new tab.
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (!win) window.location.href = url; // fallback if popup blocked
      }
    },
    onError: (error) => {
      console.error('Checkout error:', error);
      toast.error('Fehler beim Starten des Checkouts');
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const url = data?.url;
      if (url) {
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (!win) window.location.href = url;
      }
    },
    onError: (error) => {
      console.error('Portal error:', error);
      toast.error('Fehler beim Öffnen des Kundenportals');
    },
  });

  const startCheckout = (planKey: PlanKey) => {
    const plan = STRIPE_PLANS[planKey];
    if (plan) {
      checkoutMutation.mutate(plan.priceId);
    }
  };

  const openCustomerPortal = () => {
    portalMutation.mutate();
  };

  return {
    subscription,
    isLoading,
    isSubscribed: subscription?.subscribed ?? false,
    subscriptionTier: subscription?.subscription_tier,
    subscriptionEnd: subscription?.subscription_end,
    startCheckout,
    openCustomerPortal,
    isCheckoutLoading: checkoutMutation.isPending,
    isPortalLoading: portalMutation.isPending,
    refetch,
  };
}
