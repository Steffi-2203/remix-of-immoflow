import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SUBSCRIPTION_TIERS, SubscriptionTierKey } from '@/config/stripe';
import { useAuth } from './useAuth';

// Re-export for backwards compatibility
export const STRIPE_PLANS = SUBSCRIPTION_TIERS;
export type PlanKey = SubscriptionTierKey;

export function useSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Query profile to get organization_id
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Profile fetch error:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id
  });

  // Query organization for subscription data
  const { data: organization, isLoading, refetch } = useQuery({
    queryKey: ['organization-subscription', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;
      
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();
      
      if (error) {
        console.error('Organization fetch error:', error);
        return null;
      }
      return data;
    },
    enabled: !!profile?.organization_id,
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

  // Determine subscription status from organization data
  const subscriptionStatus = organization?.subscription_status || 'trial';
  const subscriptionTier = organization?.subscription_tier || 'starter';
  const isSubscribed = subscriptionStatus === 'active';

  return {
    organization,
    isLoading,
    isSubscribed,
    subscriptionTier,
    subscriptionStatus,
    subscriptionEnd: organization?.trial_ends_at || null,
    startCheckout,
    openCustomerPortal,
    isCheckoutLoading: checkoutMutation.isPending,
    isPortalLoading: portalMutation.isPending,
    refetch,
  };
}
