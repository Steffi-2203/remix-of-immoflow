import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useActiveOrganization } from '@/contexts/ActiveOrganizationContext';
import type {
  Permissions,
  PermissionEntry,
  PermissionOverrideEntry,
  PermissionCheckResult,
} from '@/types/auth';

function mapPermissionFlags(perms: PermissionEntry[]): Record<string, boolean> {
  const set = new Set(perms.map(p => `${p.resource}:${p.action}`));
  return {
    canViewFinances: set.has('invoices:read') || set.has('payments:read'),
    canEditFinances: set.has('invoices:write') || set.has('payments:write'),
    canViewFullTenantData: set.has('tenants:read'),
    canManageMaintenance: set.has('properties:write'),
    canApproveInvoices: set.has('invoices:approve'),
    canSendMessages: set.has('tenants:write'),
    canManageUsers: set.has('users:write'),
  };
}

function useOrgId(): string | undefined {
  try {
    const ctx = useActiveOrganization();
    return ctx?.activeOrgId ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Check if user has a specific resource-level permission (P2-8a).
 */
export function useHasPermission(resource: string, action: string): { allowed: boolean; isLoading: boolean } {
  const { user } = useAuth();
  const organizationId = useOrgId();

  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.role || null;
    },
    enabled: !!user?.id,
  });

  const { data: allowed, isLoading: permLoading } = useQuery({
    queryKey: ['has-permission', userRole, resource, action, organizationId],
    queryFn: async () => {
      if (!userRole || !resource || !action) return false;
      if (userRole === 'admin') return true;

      // Check org override first
      if (organizationId) {
        const { data: overrideRows } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
          .rpc('check_permission_override' as any, {
            p_org_id: organizationId,
            p_role: userRole,
            p_resource: resource,
            p_action: action,
          }) as unknown as { data: PermissionCheckResult[] | null };
        // If we get an override, use it
        if (overrideRows && Array.isArray(overrideRows) && overrideRows.length > 0) {
          return overrideRows[0].allowed === true;
        }
      }

      // Fall back to default permissions via raw query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
      const { data, error } = await (supabase
        .from('permissions' as any)
        .select('id')
        .eq('role', userRole)
        .eq('resource', resource)
        .eq('action', action)
        .limit(1) as unknown as Promise<{ data: { id: string }[] | null; error: Error | null }>);
      return !error && (data?.length ?? 0) > 0;
    },
    enabled: !!userRole && !!resource && !!action,
  });

  return { allowed: allowed ?? false, isLoading: roleLoading || permLoading };
}

export function usePermissions(): Permissions {
  const { user } = useAuth();
  const organizationId = useOrgId();

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

  const isUserAdmin = userRole === 'admin';
  const isUserTester = userRole === 'tester';

  const { data: resourcePerms, isLoading: permsLoading } = useQuery({
    queryKey: ['resource-permissions', userRole, organizationId],
    queryFn: async () => {
      if (!userRole) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
      const { data: basePerms } = await (supabase
        .from('permissions' as any)
        .select('resource, action')
        .eq('role', userRole) as unknown as Promise<{ data: PermissionEntry[] | null }>);

      const perms: PermissionEntry[] = (basePerms || []).slice();

      if (organizationId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
        const { data: overrides } = await (supabase
          .from('role_permissions_override' as any)
          .select('resource, action, allowed')
          .eq('organization_id', organizationId)
          .eq('role', userRole) as unknown as Promise<{ data: PermissionOverrideEntry[] | null }>);

        if (overrides) {
          for (const ov of overrides) {
            if (!ov.allowed) {
              const idx = perms.findIndex(p => p.resource === ov.resource && p.action === ov.action);
              if (idx >= 0) perms.splice(idx, 1);
            } else {
              if (!perms.find(p => p.resource === ov.resource && p.action === ov.action)) {
                perms.push({ resource: ov.resource, action: ov.action });
              }
            }
          }
        }
      }

      return perms;
    },
    enabled: !!userRole && !isUserAdmin && !isUserTester,
  });

  const isLoading = roleLoading || (isUserAdmin || isUserTester ? false : permsLoading);

  if (isUserAdmin) {
    return {
      canViewFinances: true, canEditFinances: true, canViewFullTenantData: true,
      canManageMaintenance: true, canApproveInvoices: true, canSendMessages: true,
      canManageUsers: true, role: 'admin', isAdmin: true, isPropertyManager: false,
      isFinance: false, isViewer: false, isTester: false, isLoading: roleLoading,
    };
  }

  if (isUserTester) {
    return {
      canViewFinances: true, canEditFinances: true, canViewFullTenantData: true,
      canManageMaintenance: true, canApproveInvoices: true, canSendMessages: true,
      canManageUsers: false, role: 'tester', isAdmin: false, isPropertyManager: false,
      isFinance: false, isViewer: false, isTester: true, isLoading: roleLoading,
    };
  }

  const flags = mapPermissionFlags(resourcePerms || []);

  return {
    canViewFinances: flags.canViewFinances ?? false,
    canEditFinances: flags.canEditFinances ?? false,
    canViewFullTenantData: flags.canViewFullTenantData ?? false,
    canManageMaintenance: flags.canManageMaintenance ?? false,
    canApproveInvoices: flags.canApproveInvoices ?? false,
    canSendMessages: flags.canSendMessages ?? false,
    canManageUsers: flags.canManageUsers ?? false,
    role: userRole,
    isAdmin: false,
    isPropertyManager: userRole === 'property_manager',
    isFinance: userRole === 'finance',
    isViewer: userRole === 'viewer',
    isTester: false,
    isLoading,
  };
}
