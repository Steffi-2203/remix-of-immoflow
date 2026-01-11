-- Create tenant_documents table for storing documents linked to tenants
CREATE TABLE public.tenant_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_documents
CREATE POLICY "Users can view tenant documents for tenants in their units"
ON public.tenant_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.units u ON t.unit_id = u.id
    JOIN public.properties p ON u.property_id = p.id
    JOIN public.property_managers pm ON p.id = pm.property_id
    WHERE t.id = tenant_documents.tenant_id
    AND pm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.units u ON t.unit_id = u.id
    JOIN public.properties p ON u.property_id = p.id
    WHERE t.id = tenant_documents.tenant_id
    AND public.is_property_unassigned(p.id)
  )
);

CREATE POLICY "Users can insert tenant documents for tenants in their units"
ON public.tenant_documents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.units u ON t.unit_id = u.id
    JOIN public.properties p ON u.property_id = p.id
    JOIN public.property_managers pm ON p.id = pm.property_id
    WHERE t.id = tenant_documents.tenant_id
    AND pm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.units u ON t.unit_id = u.id
    JOIN public.properties p ON u.property_id = p.id
    WHERE t.id = tenant_documents.tenant_id
    AND public.is_property_unassigned(p.id)
  )
);

CREATE POLICY "Users can delete tenant documents for tenants in their units"
ON public.tenant_documents FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.units u ON t.unit_id = u.id
    JOIN public.properties p ON u.property_id = p.id
    JOIN public.property_managers pm ON p.id = pm.property_id
    WHERE t.id = tenant_documents.tenant_id
    AND pm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.units u ON t.unit_id = u.id
    JOIN public.properties p ON u.property_id = p.id
    WHERE t.id = tenant_documents.tenant_id
    AND public.is_property_unassigned(p.id)
  )
);

-- Add vorschuss_gueltig_ab column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN vorschuss_gueltig_ab DATE DEFAULT NULL;

COMMENT ON COLUMN public.tenants.vorschuss_gueltig_ab IS 'Datum, ab dem die aktuellen BK/HK Vorschüsse gültig sind';

-- Create storage bucket for tenant documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tenant-documents', 'tenant-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tenant-documents bucket
CREATE POLICY "Users can view tenant document files"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-documents');

CREATE POLICY "Users can upload tenant document files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tenant-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete tenant document files"
ON storage.objects FOR DELETE
USING (bucket_id = 'tenant-documents' AND auth.uid() IS NOT NULL);