import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useMemo, useCallback } from 'react';
import { toast } from 'sonner';

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
  iban: string | null;
  bic: string | null;
  sepa_creditor_id: string | null;
}

// Unlimited usage - no subscription limits
export const TIER_LIMITS = {
  starter: { properties: 999, unitsPerProperty: 999 },
  professional: { properties: 999, unitsPerProperty: 999 },
  enterprise: { properties: 999, unitsPerProperty: 999 },
} as const;

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  starter: 'Vollversion',
  professional: 'Vollversion',
  enterprise: 'Vollversion',
};

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trial: 'Aktiv',
  active: 'Aktiv',
  cancelled: 'Aktiv',
  expired: 'Aktiv',
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

  // Always use unlimited limits
  const maxLimits = { properties: 999, unitsPerProperty: 999 };

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

  // Always allow adding properties and units (no limits)
  const canAddProperty = true;
  const canAddUnit = useCallback((_propertyId: string): boolean => true, []);
  const getRemainingUnits = useCallback((_propertyId: string): number => 999, []);

  return {
    // Loading state
    isLoading: isLoadingOrg || isLoadingProperties || isLoadingUnits,
    
    // Organization info
    organization,
    subscriptionTier: 'enterprise' as SubscriptionTier,
    tierLabel: 'Vollversion',
    status: 'active' as SubscriptionStatus,
    statusLabel: 'Aktiv',
    
    // No trial - always active
    trialEndsAt: null,
    trialDaysRemaining: 0,
    isTrialExpired: false,
    isTrialExpiringSoon: false,
    
    // Unlimited limits
    maxLimits,
    limits: maxLimits,
    
    // Current usage
    currentUsage,
    
    // Permission checks - always allowed
    canAddProperty,
    canAddUnit,
    getRemainingUnits,
    
    // No limits reached
    hasReachedPropertyLimit: false,
    getUnitLimitReached: (_propertyId: string) => false,
  };
}

export function calculateTrialDaysRemaining(_trialEndsAt: Date | null): number {
  return 0;
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      iban?: string;
      bic?: string;
      sepa_creditor_id?: string;
    }) => {
      const { id, ...updateData } = data;
      
      const { data: result, error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Organisation aktualisiert');
    },
    onError: (error) => {
      console.error('Error updating organization:', error);
      toast.error('Fehler beim Aktualisieren der Organisation');
    },
  });
}
