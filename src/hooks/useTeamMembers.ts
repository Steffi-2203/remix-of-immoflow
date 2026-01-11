import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface TeamMember {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole | null;
  created_at: string;
  assignedPropertiesCount: number;
}

export function useTeamMembers() {
  const { user } = useAuth();
  const { data: organization } = useOrganization();

  return useQuery({
    queryKey: ['team-members', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Fetch profiles for the organization
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .eq('organization_id', organization.id);

      if (profilesError) {
        console.error('Error fetching team profiles:', profilesError);
        throw profilesError;
      }

      // Fetch roles for all users
      const userIds = profiles?.map(p => p.id) || [];
      if (userIds.length === 0) return [];
      
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        throw rolesError;
      }

      // Fetch property assignments count for each user
      const { data: propertyAssignments, error: assignmentsError } = await supabase
        .from('property_managers')
        .select('user_id')
        .in('user_id', userIds);

      if (assignmentsError) {
        console.error('Error fetching property assignments:', assignmentsError);
        // Continue without assignments count
      }

      // Count assignments per user
      const assignmentCountMap = new Map<string, number>();
      (propertyAssignments || []).forEach(assignment => {
        const count = assignmentCountMap.get(assignment.user_id) || 0;
        assignmentCountMap.set(assignment.user_id, count + 1);
      });

      // Combine profiles with roles and assignments
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      
      const teamMembers: TeamMember[] = (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: roleMap.get(profile.id) || null,
        created_at: profile.created_at,
        assignedPropertiesCount: assignmentCountMap.get(profile.id) || 0,
      }));

      return teamMembers;
    },
    enabled: !!organization?.id && !!user?.id,
  });
}

export function useTeamStats() {
  const { data: teamMembers } = useTeamMembers();

  const stats = {
    total: teamMembers?.length || 0,
    admins: teamMembers?.filter(m => m.role === 'admin').length || 0,
    propertyManagers: teamMembers?.filter(m => m.role === 'property_manager').length || 0,
    finance: teamMembers?.filter(m => m.role === 'finance').length || 0,
    viewers: teamMembers?.filter(m => m.role === 'viewer').length || 0,
    noRole: teamMembers?.filter(m => !m.role).length || 0,
  };

  return stats;
}

export function useUpdateTeamMemberRole() {
  const queryClient = useQueryClient();
  const { data: organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // First check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { data, error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new role
        const { data, error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', organization?.id] });
      toast.success('Rolle erfolgreich aktualisiert');
    },
    onError: (error) => {
      console.error('Error updating role:', error);
      toast.error('Fehler beim Aktualisieren der Rolle');
    },
  });
}

export function useRemoveTeamMemberRole() {
  const queryClient = useQueryClient();
  const { data: organization } = useOrganization();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', organization?.id] });
      toast.success('Rolle erfolgreich entfernt');
    },
    onError: (error) => {
      console.error('Error removing role:', error);
      toast.error('Fehler beim Entfernen der Rolle');
    },
  });
}
