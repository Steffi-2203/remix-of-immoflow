-- Add access expiration column to profiles for time-limited sessions
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS access_expires_at timestamp with time zone;

-- Add tester permissions (view only, no invites, no user management)
INSERT INTO public.role_permissions (role, can_view_finances, can_edit_finances, can_approve_invoices, can_manage_users, can_send_messages, can_manage_maintenance, can_view_full_tenant_data)
VALUES ('tester', false, false, false, false, false, false, false)
ON CONFLICT (role) DO UPDATE SET
  can_view_finances = false,
  can_edit_finances = false,
  can_approve_invoices = false,
  can_manage_users = false,
  can_send_messages = false,
  can_manage_maintenance = false,
  can_view_full_tenant_data = false;