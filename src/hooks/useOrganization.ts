import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SubscriptionTier = 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'trial' | 'active' | 'cancelled' | 'expired';

export interface Organization {
  id: string;
  name: string;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

// Limits per subscription tier
export const TIER_LIMITS = {
  starter: { maxProperties: 1, maxUnitsPerProperty: 5 },
  professional: { maxProperties: 2, maxUnitsPerProperty: 10 },
  enterprise: { maxProperties: 1, maxUnitsPerProperty: 15 }, // "premium" mapped to enterprise
} as const;

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Premium',
};

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trial: 'Testphase',
  active: 'Aktiv',
  cancelled: 'Gekündigt',
  expired: 'Abgelaufen',
};

export function useOrganization() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['organization', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // First get the user's profile to find their organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.organization_id) return null;

      // Then get the organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) throw orgError;
      return org as Organization;
    },
    enabled: !!user,
  });
}

export function useSubscriptionLimits() {
  const { data: organization } = useOrganization();

  const tier = organization?.subscription_tier || 'starter';
  const limits = TIER_LIMITS[tier];

  return {
    tier,
    limits,
    tierLabel: TIER_LABELS[tier],
    status: organization?.subscription_status || 'trial',
    statusLabel: STATUS_LABELS[organization?.subscription_status || 'trial'],
    trialEndsAt: organization?.trial_ends_at ? new Date(organization.trial_ends_at) : null,
  };
}

export function calculateTrialDaysRemaining(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  const now = new Date();
  const diff = trialEndsAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
