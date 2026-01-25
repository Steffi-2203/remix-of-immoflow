import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export type UserSubscriptionTier = 'trial' | 'inactive' | 'starter' | 'pro' | 'enterprise';

interface SubscriptionLimits {
  maxProperties: number;
  maxTenants: number;
  canExport: boolean;
  canUpload: boolean;
  canViewSettlements: boolean;
  canEditSettlements: boolean;
  canUseAutomation: boolean;
  hasFullAccess: boolean;
}

const TIER_LIMITS: Record<UserSubscriptionTier, SubscriptionLimits> = {
  trial: {
    maxProperties: 1,
    maxTenants: 3,
    canExport: false,
    canUpload: false,
    canViewSettlements: true,
    canEditSettlements: false,
    canUseAutomation: false,
    hasFullAccess: false,
  },
  inactive: {
    maxProperties: 0,
    maxTenants: 0,
    canExport: false,
    canUpload: false,
    canViewSettlements: false,
    canEditSettlements: false,
    canUseAutomation: false,
    hasFullAccess: false,
  },
  starter: {
    maxProperties: 50,
    maxTenants: Infinity,
    canExport: true,
    canUpload: true,
    canViewSettlements: true,
    canEditSettlements: true,
    canUseAutomation: false,
    hasFullAccess: false,
  },
  pro: {
    maxProperties: Infinity,
    maxTenants: Infinity,
    canExport: true,
    canUpload: true,
    canViewSettlements: true,
    canEditSettlements: true,
    canUseAutomation: true,
    hasFullAccess: true,
  },
  enterprise: {
    maxProperties: Infinity,
    maxTenants: Infinity,
    canExport: true,
    canUpload: true,
    canViewSettlements: true,
    canEditSettlements: true,
    canUseAutomation: true,
    hasFullAccess: true,
  },
};

interface UserSubscriptionData {
  tier: UserSubscriptionTier;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  trialDaysRemaining: number | null;
  isTrialExpired: boolean;
  isSubscriptionExpired: boolean;
}

export function useSubscriptionLimits() {
  const { user } = useAuth();

  const { data: subscriptionData, isLoading } = useQuery<UserSubscriptionData>({
    queryKey: ['/api/user/subscription'],
    enabled: !!user,
  });

  const tier: UserSubscriptionTier = subscriptionData?.tier || 'trial';
  const limits = TIER_LIMITS[tier];

  const trialEndsAt = subscriptionData?.trialEndsAt ? new Date(subscriptionData.trialEndsAt) : null;
  const subscriptionEndsAt = subscriptionData?.subscriptionEndsAt ? new Date(subscriptionData.subscriptionEndsAt) : null;
  
  const now = new Date();
  const trialDaysRemaining = trialEndsAt 
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const isTrialExpired = tier === 'trial' && trialEndsAt ? trialEndsAt < now : false;
  const isSubscriptionExpired = subscriptionEndsAt ? subscriptionEndsAt < now : false;
  
  const effectiveTier: UserSubscriptionTier = isTrialExpired || isSubscriptionExpired ? 'inactive' : tier;
  const effectiveLimits = TIER_LIMITS[effectiveTier];

  const isTrial = tier === 'trial' && !isTrialExpired;
  const isInactive = effectiveTier === 'inactive';
  const isPaid = ['starter', 'pro', 'enterprise'].includes(effectiveTier);
  const isPro = effectiveTier === 'pro' || effectiveTier === 'enterprise';

  return {
    tier,
    effectiveTier,
    limits: effectiveLimits,
    trialEndsAt,
    subscriptionEndsAt,
    trialDaysRemaining,
    isTrialExpired,
    isSubscriptionExpired,
    isTrial,
    isInactive,
    isPaid,
    isPro,
    isLoading,
    canCreateProperty: (currentCount: number) => currentCount < effectiveLimits.maxProperties,
    canCreateTenant: (currentCount: number) => currentCount < effectiveLimits.maxTenants,
  };
}

export function useCanAccessFeature(feature: keyof SubscriptionLimits): boolean {
  const { limits } = useSubscriptionLimits();
  const value = limits[feature];
  return typeof value === 'boolean' ? value : value > 0;
}
