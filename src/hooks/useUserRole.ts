import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'property_manager' | 'finance' | 'viewer' | 'tester';

export function useUserRole() {
  return useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return 'viewer' as AppRole;
      }
      
      return (data?.role as AppRole) ?? 'viewer';
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
