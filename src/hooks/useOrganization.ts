import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useMemo, useCallback } from 'react';

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
  starter: { properties: 1, unitsPerProperty: 5 },
  professional: { properties: 2, unitsPerProperty: 10 },
  enterprise: { properties: 1, unitsPerProperty: 15 }, // "premium" in UI
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

interface PropertyUnitCount {
  propertyId: string;
  unitCount: number;
}

export function useSubscriptionLimits() {
  const { user } = useAuth();
  const { data: organization, isLoading: isLoadingOrg } = useOrganization();

  // Fetch managed properties count
  const { data: propertiesData, isLoading: isLoadingProperties } = useQuery({
    queryKey: ['managed_properties_count', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: managedPropertyIds, error: pmError } = await supabase
        .from('property_managers')
        .select('property_id')
        .eq('user_id', user.id);
      
      if (pmError) throw pmError;
      return managedPropertyIds?.map(pm => pm.property_id) || [];
    },
    enabled: !!user,
  });

  // Fetch units count per property
  const { data: unitsData, isLoading: isLoadingUnits } = useQuery({
    queryKey: ['units_per_property', propertiesData],
    queryFn: async () => {
      if (!propertiesData || propertiesData.length === 0) return [];
      
      const { data: units, error } = await supabase
        .from('units')
        .select('id, property_id')
        .in('property_id', propertiesData);
      
      if (error) throw error;
      
      // Count units per property
      const countByProperty: Record<string, number> = {};
      units?.forEach(unit => {
        countByProperty[unit.property_id] = (countByProperty[unit.property_id] || 0) + 1;
      });
      
      return Object.entries(countByProperty).map(([propertyId, unitCount]) => ({
        propertyId,
        unitCount,
      })) as PropertyUnitCount[];
    },
    enabled: !!propertiesData && propertiesData.length > 0,
  });

  const tier = organization?.subscription_tier || 'starter';
  const maxLimits = TIER_LIMITS[tier];

  // Current usage
  const currentUsage = useMemo(() => {
    const propertiesCount = propertiesData?.length || 0;
    const unitsPerProperty: Record<string, number> = {};
    
    unitsData?.forEach(item => {
      unitsPerProperty[item.propertyId] = item.unitCount;
    });

    // Also include properties with 0 units
    propertiesData?.forEach(propertyId => {
      if (!(propertyId in unitsPerProperty)) {
        unitsPerProperty[propertyId] = 0;
      }
    });

    return {
      properties: propertiesCount,
      units: unitsPerProperty,
      totalUnits: Object.values(unitsPerProperty).reduce((sum, count) => sum + count, 0),
    };
  }, [propertiesData, unitsData]);

  // Can add property
  const canAddProperty = useMemo(() => {
    return currentUsage.properties < maxLimits.properties;
  }, [currentUsage.properties, maxLimits.properties]);

  // Can add unit for a specific property
  const canAddUnit = useCallback((propertyId: string): boolean => {
    const currentUnits = currentUsage.units[propertyId] || 0;
    return currentUnits < maxLimits.unitsPerProperty;
  }, [currentUsage.units, maxLimits.unitsPerProperty]);

  // Get remaining units for a property
  const getRemainingUnits = useCallback((propertyId: string): number => {
    const currentUnits = currentUsage.units[propertyId] || 0;
    return Math.max(0, maxLimits.unitsPerProperty - currentUnits);
  }, [currentUsage.units, maxLimits.unitsPerProperty]);

  // Trial days remaining
  const trialEndsAt = organization?.trial_ends_at ? new Date(organization.trial_ends_at) : null;
  const trialDaysRemaining = calculateTrialDaysRemaining(trialEndsAt);

  return {
    // Loading state
    isLoading: isLoadingOrg || isLoadingProperties || isLoadingUnits,
    
    // Organization info
    organization,
    subscriptionTier: tier,
    tierLabel: TIER_LABELS[tier],
    status: organization?.subscription_status || 'trial',
    statusLabel: STATUS_LABELS[organization?.subscription_status || 'trial'],
    
    // Trial info
    trialEndsAt,
    trialDaysRemaining,
    isTrialExpired: organization?.subscription_status === 'trial' && trialDaysRemaining === 0,
    isTrialExpiringSoon: organization?.subscription_status === 'trial' && trialDaysRemaining <= 3 && trialDaysRemaining > 0,
    
    // Limits
    maxLimits: {
      properties: maxLimits.properties,
      unitsPerProperty: maxLimits.unitsPerProperty,
    },
    limits: maxLimits, // backwards compatibility
    
    // Current usage
    currentUsage,
    
    // Permission checks
    canAddProperty,
    canAddUnit,
    getRemainingUnits,
    
    // Helper for reaching limits
    hasReachedPropertyLimit: !canAddProperty,
    getUnitLimitReached: (propertyId: string) => !canAddUnit(propertyId),
  };
}

export function calculateTrialDaysRemaining(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  const now = new Date();
  const diff = trialEndsAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
