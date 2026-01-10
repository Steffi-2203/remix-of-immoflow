-- RLS-Policies für user_roles Tabelle (für Admin-Benutzerverwaltung)

-- Erst alte Policies löschen falls vorhanden
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

-- Policy: Admins können alle Rollen sehen
CREATE POLICY "Admins can view all user roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
);

-- Policy: User können ihre eigene Rolle sehen
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Admins können Rollen zuweisen
CREATE POLICY "Admins can insert user roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
);

-- Policy: Admins können Rollen aktualisieren
CREATE POLICY "Admins can update user roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
);

-- Policy: Admins können Rollen entfernen
CREATE POLICY "Admins can delete user roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (
  public.is_admin(auth.uid())
);

-- RLS für profiles Tabelle - Admins können alle Profile sehen
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
);