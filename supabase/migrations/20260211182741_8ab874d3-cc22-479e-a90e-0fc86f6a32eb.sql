
-- Fix overly permissive UPDATE policy on gdpr_export_requests
-- Drop the permissive one and create a proper service-role-only policy
DROP POLICY IF EXISTS "Service role can update export requests" ON public.gdpr_export_requests;

-- Only allow users to update their own requests (for marking as delivered/downloaded)
CREATE POLICY "Users can update own export requests"
  ON public.gdpr_export_requests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix storage INSERT policy to be scoped to user folder
DROP POLICY IF EXISTS "Service can insert GDPR exports" ON storage.objects;

CREATE POLICY "Service can insert GDPR exports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gdpr-exports' AND auth.uid()::text = (storage.foldername(name))[1]);
