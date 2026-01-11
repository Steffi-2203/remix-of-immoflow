import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Permissions {
  canViewFinances: boolean;
  canEditFinances: boolean;
  canViewFullTenantData: boolean;
  canManageMaintenance: boolean;
  canApproveInvoices: boolean;
  canSendMessages: boolean;
  canManageUsers: boolean;
  role: string | null;
  isAdmin: boolean;
  isPropertyManager: boolean;
  isFinance: boolean;
  isViewer: boolean;
  isLoading: boolean;
}

export function usePermissions(): Permissions {
  const { user } = useAuth();

  // Fetch user's role from user_roles table
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }
      return data?.role || null;
    },
    enabled: !!user?.id,
  });

  // Fetch permissions for the user's role
  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['role-permissions', userRole],
    queryFn: async () => {
      if (!userRole) return null;
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', userRole)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching role permissions:', error);
        return null;
      }
      return data;
    },
    enabled: !!userRole,
  });

  const isLoading = roleLoading || permissionsLoading;

  return {
    canViewFinances: permissions?.can_view_finances ?? false,
    canEditFinances: permissions?.can_edit_finances ?? false,
    canViewFullTenantData: permissions?.can_view_full_tenant_data ?? false,
    canManageMaintenance: permissions?.can_manage_maintenance ?? false,
    canApproveInvoices: permissions?.can_approve_invoices ?? false,
    canSendMessages: permissions?.can_send_messages ?? false,
    canManageUsers: permissions?.can_manage_users ?? false,
    role: userRole,
    isAdmin: userRole === 'admin',
    isPropertyManager: userRole === 'property_manager',
    isFinance: userRole === 'finance',
    isViewer: userRole === 'viewer',
    isLoading,
  };
}
