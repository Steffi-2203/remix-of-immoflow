import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

export function useIsAdmin() {
  const { data: role, isLoading } = useUserRole();
  return {
    queryKey: ['is-admin'],
    data: role === 'admin',
    isLoading,
  };
}

export interface AdminOrganization {
  id: string;
  name: string;
  subscription_tier: string;
  subscription_status: string;
  trial_ends_at: string | null;
  created_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  user_count: number;
  property_count: number;
  unit_count: number;
}

export function useAdminOrganizations() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ['admin-organizations'],
    queryFn: async () => {
      // Get all organizations
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgError) throw orgError;

      // Get user counts per organization
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id');

      if (profileError) throw profileError;

      // Get all properties with their units count
      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id');

      if (propError) throw propError;

      // Get property managers to link properties to organizations
      const { data: propertyManagers, error: pmError } = await supabase
        .from('property_managers')
        .select('property_id, user_id');

      if (pmError) throw pmError;

      // Get units
      const { data: units, error: unitError } = await supabase
        .from('units')
        .select('id, property_id');

      if (unitError) throw unitError;

      // Build user count per organization
      const userCountByOrg: Record<string, number> = {};
      profiles?.forEach(p => {
        if (p.organization_id) {
          userCountByOrg[p.organization_id] = (userCountByOrg[p.organization_id] || 0) + 1;
        }
      });

      // Build property count per user (via property_managers)
      const propertiesByUser: Record<string, string[]> = {};
      propertyManagers?.forEach(pm => {
        if (!propertiesByUser[pm.user_id]) {
          propertiesByUser[pm.user_id] = [];
        }
        propertiesByUser[pm.user_id].push(pm.property_id);
      });

      // Get user to org mapping
      const userToOrg: Record<string, string> = {};
      profiles?.forEach(p => {
        if (p.organization_id) {
          // We need user_id from profiles, but profiles.id is the user_id
          // This is tricky - we need another query
        }
      });

      // For now, simplify: count unique properties and units
      const propertyCountByOrg: Record<string, number> = {};
      const unitCountByOrg: Record<string, number> = {};

      // Get profiles with user ids
      const { data: profilesWithIds, error: profileIdError } = await supabase
        .from('profiles')
        .select('id, organization_id');

      if (profileIdError) throw profileIdError;

      // Map user_id to organization_id
      const userOrgMap: Record<string, string> = {};
      profilesWithIds?.forEach(p => {
        if (p.organization_id) {
          userOrgMap[p.id] = p.organization_id;
        }
      });

      // Now count properties per organization
      propertyManagers?.forEach(pm => {
        const orgId = userOrgMap[pm.user_id];
        if (orgId) {
          propertyCountByOrg[orgId] = (propertyCountByOrg[orgId] || 0) + 1;
        }
      });

      // Deduplicate property counts (same property might have multiple managers)
      const orgProperties: Record<string, Set<string>> = {};
      propertyManagers?.forEach(pm => {
        const orgId = userOrgMap[pm.user_id];
        if (orgId) {
          if (!orgProperties[orgId]) {
            orgProperties[orgId] = new Set();
          }
          orgProperties[orgId].add(pm.property_id);
        }
      });

      Object.entries(orgProperties).forEach(([orgId, propSet]) => {
        propertyCountByOrg[orgId] = propSet.size;
      });

      // Count units per organization
      units?.forEach(unit => {
        // Find which org this unit belongs to
        const pm = propertyManagers?.find(p => p.property_id === unit.property_id);
        if (pm) {
          const orgId = userOrgMap[pm.user_id];
          if (orgId) {
            unitCountByOrg[orgId] = (unitCountByOrg[orgId] || 0) + 1;
          }
        }
      });

      // Combine data
      const enrichedOrgs: AdminOrganization[] = organizations?.map(org => ({
        id: org.id,
        name: org.name,
        subscription_tier: org.subscription_tier,
        subscription_status: org.subscription_status,
        trial_ends_at: org.trial_ends_at,
        created_at: org.created_at,
        stripe_customer_id: org.stripe_customer_id,
        stripe_subscription_id: org.stripe_subscription_id,
        user_count: userCountByOrg[org.id] || 0,
        property_count: propertyCountByOrg[org.id] || 0,
        unit_count: unitCountByOrg[org.id] || 0,
      })) || [];

      return enrichedOrgs;
    },
    enabled: isAdmin === true,
  });
}

export function useAdminStats() {
  const { data: organizations } = useAdminOrganizations();

  if (!organizations) {
    return {
      totalOrganizations: 0,
      activeSubscriptions: 0,
      trialUsers: 0,
      cancelledSubscriptions: 0,
      expiredSubscriptions: 0,
      monthlyRecurringRevenue: 0,
    };
  }

  const TIER_PRICES: Record<string, number> = {
    starter: 29,
    professional: 59,
    premium: 49,
    enterprise: 49,
  };

  const activeSubscriptions = organizations.filter(o => o.subscription_status === 'active').length;
  const trialUsers = organizations.filter(o => o.subscription_status === 'trial').length;
  const cancelledSubscriptions = organizations.filter(o => o.subscription_status === 'cancelled').length;
  const expiredSubscriptions = organizations.filter(o => o.subscription_status === 'expired').length;

  // Calculate MRR from active subscriptions
  const monthlyRecurringRevenue = organizations
    .filter(o => o.subscription_status === 'active')
    .reduce((sum, org) => sum + (TIER_PRICES[org.subscription_tier] || 0), 0);

  return {
    totalOrganizations: organizations.length,
    activeSubscriptions,
    trialUsers,
    cancelledSubscriptions,
    expiredSubscriptions,
    monthlyRecurringRevenue,
  };
}
