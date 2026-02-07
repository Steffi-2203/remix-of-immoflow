-- Add management_type column to properties to distinguish WEG vs MRG management
ALTER TABLE public.properties 
ADD COLUMN management_type text NOT NULL DEFAULT 'mrg' 
CHECK (management_type IN ('mrg', 'weg', 'gemischt'));

COMMENT ON COLUMN public.properties.management_type IS 'Art der Verwaltung: mrg = Mietverwaltung, weg = Wohnungseigentum, gemischt = beides';