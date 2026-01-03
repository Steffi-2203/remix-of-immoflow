-- Function to sync unit status based on tenant status
CREATE OR REPLACE FUNCTION public.sync_unit_status_on_tenant_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For INSERT or UPDATE: Check if tenant is active
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status = 'aktiv' THEN
      -- Set unit to active when tenant is active
      UPDATE units SET status = 'aktiv' WHERE id = NEW.unit_id;
    ELSIF NEW.status = 'beendet' THEN
      -- Check if there's another active tenant for this unit
      IF NOT EXISTS (
        SELECT 1 FROM tenants 
        WHERE unit_id = NEW.unit_id 
        AND status = 'aktiv' 
        AND id != NEW.id
      ) THEN
        -- No other active tenant, set unit to leerstand
        UPDATE units SET status = 'leerstand' WHERE id = NEW.unit_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Trigger for tenant insert/update
DROP TRIGGER IF EXISTS sync_unit_status_trigger ON tenants;
CREATE TRIGGER sync_unit_status_trigger
AFTER INSERT OR UPDATE OF status ON tenants
FOR EACH ROW
EXECUTE FUNCTION public.sync_unit_status_on_tenant_change();

-- Prevent deletion of tenants - they should be set to 'beendet' instead (Altmieter)
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

DROP TRIGGER IF EXISTS prevent_tenant_delete_trigger ON tenants;
CREATE TRIGGER prevent_tenant_delete_trigger
BEFORE DELETE ON tenants
FOR EACH ROW
EXECUTE FUNCTION public.prevent_tenant_deletion();

-- Sync all existing units based on current tenant status
UPDATE units u
SET status = 'aktiv'
WHERE EXISTS (
  SELECT 1 FROM tenants t 
  WHERE t.unit_id = u.id 
  AND t.status = 'aktiv'
);

UPDATE units u
SET status = 'leerstand'
WHERE NOT EXISTS (
  SELECT 1 FROM tenants t 
  WHERE t.unit_id = u.id 
  AND t.status = 'aktiv'
)
AND u.status != 'leerstand';