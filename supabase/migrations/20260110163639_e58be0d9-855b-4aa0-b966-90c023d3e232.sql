-- Create enum for SEPA collection status
CREATE TYPE sepa_collection_status AS ENUM ('pending', 'exported', 'partially_completed', 'completed');

-- Create enum for SEPA collection item status
CREATE TYPE sepa_item_status AS ENUM ('pending', 'successful', 'returned', 'rejected');

-- Create table for SEPA collection batches
CREATE TABLE public.sepa_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  collection_date DATE NOT NULL,
  message_id TEXT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  status sepa_collection_status NOT NULL DEFAULT 'exported',
  xml_filename TEXT,
  creditor_name TEXT,
  creditor_iban TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for individual SEPA collection items
CREATE TABLE public.sepa_collection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.sepa_collections(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  unit_id UUID REFERENCES public.units(id),
  amount NUMERIC NOT NULL,
  mandate_reference TEXT,
  tenant_name TEXT NOT NULL,
  tenant_iban TEXT,
  status sepa_item_status NOT NULL DEFAULT 'pending',
  return_reason TEXT,
  return_date DATE,
  payment_id UUID REFERENCES public.payments(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sepa_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sepa_collection_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for sepa_collections
CREATE POLICY "Users can view sepa_collections in their org"
  ON public.sepa_collections
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create sepa_collections in their org"
  ON public.sepa_collections
  FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update sepa_collections in their org"
  ON public.sepa_collections
  FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete sepa_collections in their org"
  ON public.sepa_collections
  FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- RLS policies for sepa_collection_items (based on parent collection)
CREATE POLICY "Users can view sepa_collection_items in their org"
  ON public.sepa_collection_items
  FOR SELECT
  USING (collection_id IN (
    SELECT id FROM sepa_collections WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can create sepa_collection_items in their org"
  ON public.sepa_collection_items
  FOR INSERT
  WITH CHECK (collection_id IN (
    SELECT id FROM sepa_collections WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can update sepa_collection_items in their org"
  ON public.sepa_collection_items
  FOR UPDATE
  USING (collection_id IN (
    SELECT id FROM sepa_collections WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete sepa_collection_items in their org"
  ON public.sepa_collection_items
  FOR DELETE
  USING (collection_id IN (
    SELECT id FROM sepa_collections WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Create trigger for updated_at
CREATE TRIGGER update_sepa_collections_updated_at
  BEFORE UPDATE ON public.sepa_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sepa_collection_items_updated_at
  BEFORE UPDATE ON public.sepa_collection_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_sepa_collections_organization_id ON public.sepa_collections(organization_id);
CREATE INDEX idx_sepa_collections_status ON public.sepa_collections(status);
CREATE INDEX idx_sepa_collection_items_collection_id ON public.sepa_collection_items(collection_id);
CREATE INDEX idx_sepa_collection_items_tenant_id ON public.sepa_collection_items(tenant_id);
CREATE INDEX idx_sepa_collection_items_status ON public.sepa_collection_items(status);