
-- Trigger temporär entfernen
DROP TRIGGER IF EXISTS prevent_tenant_delete ON tenants;

-- Alle Immocent Einträge löschen
DELETE FROM tenants WHERE id IN (
  '7891d7f1-b7a4-49c9-ae1c-3d90fd2caa54',
  '8ba9ae16-682c-46b3-8324-7048a814e825',
  '038f31f2-802e-4385-8f66-039c306c5eed',
  'f7da347e-1278-4821-afa4-02e757f48b26'
);

-- Max Mustermann mit 100€ Grundmiete löschen
DELETE FROM tenants WHERE id IN (
  '82ff99e9-76e3-46e7-b91d-572578bb55ab',
  '70771582-80aa-459a-ad6b-07ca29e1aaad'
);

-- Trigger wieder aktivieren
CREATE TRIGGER prevent_tenant_delete
  BEFORE DELETE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tenant_deletion();
