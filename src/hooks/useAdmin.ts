import { useQuery } from '@tanstack/react-query';

interface ProfileWithRoles {
  id: string;
  email: string;
  fullName: string;
  organizationId: string | null;
  roles: string[];
}

export function useIsAdmin() {
  const { data: profile, isLoading } = useQuery<ProfileWithRoles>({
    queryKey: ['/api/profile'],
  });

  return {
    data: profile?.roles?.includes('admin') ?? false,
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

  return useQuery<AdminOrganization[]>({
    queryKey: ['/api/admin/organizations'],
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
