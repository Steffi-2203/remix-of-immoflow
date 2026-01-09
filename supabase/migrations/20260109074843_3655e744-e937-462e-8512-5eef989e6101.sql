
-- Zuerst alle Trigger droppen, dann die Funktion mit CASCADE
DROP TRIGGER IF EXISTS prevent_tenant_delete ON tenants;
DROP TRIGGER IF EXISTS prevent_tenant_delete_trigger ON tenants;
DROP TRIGGER IF EXISTS prevent_tenant_deletion_trigger ON tenants;
DROP FUNCTION IF EXISTS prevent_tenant_deletion() CASCADE;

-- Lösche die doppelten Hofer-Mieter
DELETE FROM tenants 
WHERE id IN ('2b5fef9c-f713-49b4-b8c7-67b9a1c8c3ad', '7657a209-e690-4780-ada0-8f3ca99e7563');
