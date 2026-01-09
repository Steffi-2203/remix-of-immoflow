
-- Funktion zum Verhindern des Löschens von Mietern wiederherstellen
CREATE OR REPLACE FUNCTION public.prevent_tenant_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Mieter können nicht gelöscht werden. Bitte setzen Sie den Status auf "beendet" (Altmieter).';
  RETURN NULL;
END;
$$;

-- Trigger wieder einfügen
CREATE TRIGGER prevent_tenant_delete
  BEFORE DELETE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tenant_deletion();
