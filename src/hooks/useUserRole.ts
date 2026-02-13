import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export type AppRole = 'admin' | 'property_manager' | 'finance' | 'viewer' | 'tester' | 'auditor' | 'ops';

interface AuthUser {
  id: string;
  email: string;
  roles: AppRole[];
}

export function useUserRole() {
  return useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/auth/user');
        if (!res.ok) return null;
        const user: AuthUser = await res.json();
        return user.roles?.[0] as AppRole ?? 'viewer';
      } catch {
        return null;
      }
    },
  });
}

export function useHasFinanceAccess() {
  const { data: role, isLoading } = useUserRole();
  return {
    hasAccess: role === 'admin' || role === 'finance' || role === 'tester',
    isLoading,
  };
}

export function useIsAdmin() {
  const { data: role, isLoading } = useUserRole();
  return {
    isAdmin: role === 'admin',
    isLoading,
  };
}

export function useIsTester() {
  const { data: role, isLoading } = useUserRole();
  return {
    isTester: role === 'tester',
    isLoading,
  };
}
