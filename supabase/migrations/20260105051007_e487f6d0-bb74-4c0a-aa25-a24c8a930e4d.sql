-- Add storage policies for property and unit documents in the expense-receipts bucket

-- Allow authenticated users to upload property documents
CREATE POLICY "Users can upload property documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'expense-receipts' AND (storage.foldername(name))[1] = 'property-docs');

-- Allow authenticated users to view property documents
CREATE POLICY "Users can view property documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'expense-receipts' AND (storage.foldername(name))[1] = 'property-docs');

-- Allow authenticated users to delete property documents
CREATE POLICY "Users can delete property documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'expense-receipts' AND (storage.foldername(name))[1] = 'property-docs');

-- Allow authenticated users to upload unit documents
CREATE POLICY "Users can upload unit documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'expense-receipts' AND (storage.foldername(name))[1] = 'unit-docs');

-- Allow authenticated users to view unit documents
CREATE POLICY "Users can view unit documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'expense-receipts' AND (storage.foldername(name))[1] = 'unit-docs');

-- Allow authenticated users to delete unit documents
CREATE POLICY "Users can delete unit documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'expense-receipts' AND (storage.foldername(name))[1] = 'unit-docs');