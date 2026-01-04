import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Stripe product and price mappings
export const STRIPE_PLANS = {
  starter: {
    productId: 'prod_TjJF402Fz7UoVB',
    priceId: 'price_1SlqclHqzD0fpNciXFKIu0o1',
    name: 'Starter',
    price: 29,
  },
  professional: {
    productId: 'prod_TjJFK60F3qLg02',
    priceId: 'price_1SlqczHqzD0fpNcicovxDN0m',
    name: 'Professional',
    price: 59,
  },
  enterprise: {
    productId: 'prod_TjJFbvPbDQsy3j',
    priceId: 'price_1SlqdMHqzD0fpNcib7LpU0ra',
    name: 'Premium',
    price: 49,
  },
} as const;

export type PlanKey = keyof typeof STRIPE_PLANS;

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
      if (data?.url) {
        window.location.href = data.url;
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
      if (data?.url) {
        window.location.href = data.url;
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
