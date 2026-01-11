-- Add Admin bypass to tenant_documents RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view tenant documents for tenants in their units" ON tenant_documents;
DROP POLICY IF EXISTS "Users can insert tenant documents for tenants in their units" ON tenant_documents;
DROP POLICY IF EXISTS "Users can delete tenant documents for tenants in their units" ON tenant_documents;

-- Recreate SELECT policy with admin bypass
CREATE POLICY "Users can view tenant documents for tenants in their units" ON tenant_documents
FOR SELECT USING (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM tenants t
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN property_managers pm ON p.id = pm.property_id
    WHERE t.id = tenant_documents.tenant_id AND pm.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM tenants t
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE t.id = tenant_documents.tenant_id AND is_property_unassigned(p.id)
  )
);

-- Recreate INSERT policy with admin bypass
CREATE POLICY "Users can insert tenant documents for tenants in their units" ON tenant_documents
FOR INSERT WITH CHECK (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM tenants t
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN property_managers pm ON p.id = pm.property_id
    WHERE t.id = tenant_documents.tenant_id AND pm.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM tenants t
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE t.id = tenant_documents.tenant_id AND is_property_unassigned(p.id)
  )
);

-- Recreate DELETE policy with admin bypass
CREATE POLICY "Users can delete tenant documents for tenants in their units" ON tenant_documents
FOR DELETE USING (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM tenants t
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN property_managers pm ON p.id = pm.property_id
    WHERE t.id = tenant_documents.tenant_id AND pm.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM tenants t
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE t.id = tenant_documents.tenant_id AND is_property_unassigned(p.id)
  )
);

-- Also add storage policies for the tenant-documents bucket if not exists
DO $$
BEGIN
  -- Policy for uploading files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow authenticated uploads to tenant-documents'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow authenticated uploads to tenant-documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'tenant-documents');
  END IF;
  
  -- Policy for reading files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow authenticated reads from tenant-documents'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow authenticated reads from tenant-documents"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'tenant-documents');
  END IF;
  
  -- Policy for deleting files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow authenticated deletes from tenant-documents'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow authenticated deletes from tenant-documents"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'tenant-documents');
  END IF;
END $$;