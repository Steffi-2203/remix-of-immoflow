import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';

export type AppRole = 'admin' | 'property_manager' | 'finance' | 'viewer' | 'tester';

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  role: AppRole;
  invited_by: string | null;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  organization?: {
    name: string;
  };
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrator',
  property_manager: 'Hausverwalter',
  finance: 'Buchhalter',
  viewer: 'Betrachter',
  tester: 'Tester (30 Min.)',
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: 'Vollzugriff auf alle Funktionen inkl. Benutzerverwaltung',
  property_manager: 'Verwaltung von Immobilien, Einheiten und Mietern',
  finance: 'Zugriff auf Banking, SEPA, Rechnungen und Finanzdaten',
  viewer: 'Nur Leserechte, sensible Daten maskiert',
  tester: 'Zeitlich begrenzt (30 Minuten), nur Leserechte',
};

// Internal roles (for regular team invitations via email)
export const INTERNAL_ROLES: AppRole[] = ['admin', 'property_manager', 'finance', 'viewer'];

// Fetch pending invites for the current organization
export function usePendingInvites() {
  const { data: organization } = useOrganization();

  return useQuery({
    queryKey: ['organization_invites', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('organization_invites')
        .select('*')
        .eq('organization_id', organization.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OrganizationInvite[];
    },
    enabled: !!organization?.id,
  });
}

// Fetch a single invite by token (for registration)
export function useInviteByToken(token: string | null) {
  return useQuery({
    queryKey: ['organization_invite_token', token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase
        .from('organization_invites')
        .select(`
          *,
          organization:organizations(name)
        `)
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;
      return data as (OrganizationInvite & { organization: { name: string } }) | null;
    },
    enabled: !!token,
  });
}

// Create a new invite
export function useCreateInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: organization } = useOrganization();

  return useMutation({
    mutationFn: async (data: { email: string; role: AppRole }) => {
      if (!organization?.id || !user?.id) {
        throw new Error('Organisation oder Benutzer nicht gefunden');
      }

      // Check if invite already exists
      const { data: existing } = await supabase
        .from('organization_invites')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('email', data.email.toLowerCase())
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existing) {
        throw new Error('Eine Einladung für diese E-Mail-Adresse existiert bereits');
      }

      // Create the invite
      const { data: invite, error } = await supabase
        .from('organization_invites')
        .insert({
          organization_id: organization.id,
          email: data.email.toLowerCase(),
          role: data.role,
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Call edge function to send email
      const baseUrl = window.location.origin;
      const { error: emailError } = await supabase.functions.invoke('send-invite', {
        body: {
          email: data.email.toLowerCase(),
          inviteToken: invite.token,
          organizationName: organization.name,
          role: data.role,
          baseUrl,
        },
      });

      if (emailError) {
        console.error('Email send error:', emailError);
        // Don't throw - invite was created, email just failed
        toast.warning('Einladung erstellt, aber E-Mail konnte nicht gesendet werden');
      }

      return invite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization_invites'] });
      toast.success('Einladung erfolgreich gesendet');
    },
    onError: (error) => {
      console.error('Create invite error:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Erstellen der Einladung');
    },
  });
}

// Create a tester invite (no email sent, link is shown to admin for manual sharing)
export function useCreateTesterInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: organization } = useOrganization();

  return useMutation({
    mutationFn: async (email: string) => {
      if (!organization?.id || !user?.id) {
        throw new Error('Organisation oder Benutzer nicht gefunden');
      }

      // Check if invite already exists
      const { data: existing } = await supabase
        .from('organization_invites')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('email', email.toLowerCase())
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existing) {
        throw new Error('Eine Einladung für diese E-Mail-Adresse existiert bereits');
      }

      // Create the invite with tester role - no email is sent
      const { data: invite, error } = await supabase
        .from('organization_invites')
        .insert({
          organization_id: organization.id,
          email: email.toLowerCase(),
          role: 'tester' as AppRole,
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return invite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization_invites'] });
      toast.success('Tester-Einladung erstellt - Link kann jetzt geteilt werden');
    },
    onError: (error) => {
      console.error('Create tester invite error:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Erstellen der Tester-Einladung');
    },
  });
}

// Accept an invite (called after registration)
export function useAcceptInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht angemeldet');

      // Get the invite
      const { data: invite, error: inviteError } = await supabase
        .from('organization_invites')
        .select('*')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (inviteError || !invite) {
        throw new Error('Einladung nicht gefunden oder abgelaufen');
      }

      // Update user's profile with organization
      // For testers, set access_expires_at to 30 minutes from now
      const profileUpdate: Record<string, any> = { 
        organization_id: invite.organization_id 
      };
      
      if (invite.role === 'tester') {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30);
        profileUpdate.access_expires_at = expiresAt.toISOString();
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Add user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
          role: invite.role,
        }, {
          onConflict: 'user_id,role',
        });

      if (roleError) throw roleError;

      // Mark invite as accepted
      const { error: acceptError } = await supabase
        .from('organization_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id);

      if (acceptError) throw acceptError;

      return invite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['user_role'] });
      toast.success('Einladung erfolgreich angenommen');
    },
    onError: (error) => {
      console.error('Accept invite error:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Annehmen der Einladung');
    },
  });
}

// Delete/revoke an invite
export function useDeleteInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('organization_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization_invites'] });
      toast.success('Einladung widerrufen');
    },
    onError: (error) => {
      console.error('Delete invite error:', error);
      toast.error('Fehler beim Widerrufen der Einladung');
    },
  });
}
