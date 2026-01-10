import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';

export type AppRole = 'admin' | 'property_manager' | 'finance' | 'viewer';

export interface AdminUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
  organization_id: string | null;
  organization_name: string | null;
  role: AppRole | null;
  created_at: string;
}

export function useAdminUsers() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async (): Promise<AdminUser[]> => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, organization_id, created_at');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        throw rolesError;
      }

      // Fetch all organizations
      const { data: organizations, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name');

      if (orgsError) {
        console.error('Error fetching organizations:', orgsError);
        throw orgsError;
      }

      // Create lookup maps
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role as AppRole]) || []);
      const orgsMap = new Map(organizations?.map(o => [o.id, o.name]) || []);

      // Combine data
      const users: AdminUser[] = (profiles || []).map(profile => ({
        user_id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        organization_id: profile.organization_id,
        organization_name: profile.organization_id ? orgsMap.get(profile.organization_id) || null : null,
        role: rolesMap.get(profile.id) || null,
        created_at: profile.created_at,
      }));

      return users;
    },
    enabled: !!isAdmin,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Check if role already exists for this user
      const { data: existing, error: checkError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Rolle wurde aktualisiert');
    },
    onError: (error) => {
      console.error('Error updating role:', error);
      toast.error('Fehler beim Aktualisieren der Rolle');
    },
  });
}

export function useRemoveUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Rolle wurde entfernt');
    },
    onError: (error) => {
      console.error('Error removing role:', error);
      toast.error('Fehler beim Entfernen der Rolle');
    },
  });
}

export function useAdminUserStats() {
  const { data: users } = useAdminUsers();

  if (!users) {
    return {
      totalUsers: 0,
      adminCount: 0,
      financeCount: 0,
      managerCount: 0,
      viewerCount: 0,
      noRoleCount: 0,
    };
  }

  return {
    totalUsers: users.length,
    adminCount: users.filter(u => u.role === 'admin').length,
    financeCount: users.filter(u => u.role === 'finance').length,
    managerCount: users.filter(u => u.role === 'property_manager').length,
    viewerCount: users.filter(u => u.role === 'viewer').length,
    noRoleCount: users.filter(u => !u.role).length,
  };
}
