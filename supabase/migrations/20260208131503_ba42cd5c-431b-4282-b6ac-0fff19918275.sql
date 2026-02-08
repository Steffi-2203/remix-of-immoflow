
-- 1. Create the private artifacts bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('artifacts', 'artifacts', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies: SELECT — nur eigene Org
CREATE POLICY "Org members can view artifacts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'artifacts'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- 3. Storage Policies: INSERT — nur eigene Org
CREATE POLICY "Org members can upload artifacts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artifacts'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- 4. Storage Policies: DELETE — nur Admins
CREATE POLICY "Admins can delete artifacts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'artifacts'
  AND EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
);
