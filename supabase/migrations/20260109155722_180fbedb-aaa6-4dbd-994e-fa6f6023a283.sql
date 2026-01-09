-- Drop the trigger and function that prevents tenant deletion
DROP TRIGGER IF EXISTS prevent_tenant_delete ON tenants;
DROP FUNCTION IF EXISTS prevent_tenant_deletion() CASCADE;