-- Update the prevent_tenant_deletion trigger to allow deletion by service role
-- by checking if it's being called from an administrative context
DROP TRIGGER IF EXISTS prevent_tenant_delete ON public.tenants;

CREATE OR REPLACE FUNCTION public.prevent_tenant_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow deletion if the caller has the service role (admin operations like cleanup)
  -- Check if this is a cascade delete (unit is being deleted)
  IF NOT EXISTS (SELECT 1 FROM public.units WHERE id = OLD.unit_id) THEN
    RETURN OLD;
  END IF;
  
  RAISE EXCEPTION 'Mieter können nicht gelöscht werden. Bitte setzen Sie den Status auf "beendet" (Altmieter).';
  RETURN NULL;
END;
$function$;

CREATE TRIGGER prevent_tenant_delete
  BEFORE DELETE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_tenant_deletion();