-- MRG-Konformität: Phase 1 - Datenbankstruktur

-- 1. ENUM für MRG-Anwendungsbereich
CREATE TYPE public.mrg_scope AS ENUM (
  'vollanwendung',      -- Altbau vor 1945/1953, voller Mieterschutz
  'teilanwendung',      -- Neubauten mit bestimmten Schutzbestimmungen
  'ausgenommen'         -- Nicht dem MRG unterliegend
);

-- 2. ENUM für Ausstattungskategorie (§15a MRG)
CREATE TYPE public.ausstattungskategorie AS ENUM (
  'A',  -- Mit Zentralheizung oder Etagenheizung und Bad/WC
  'B',  -- Mit Bad/WC (mind. 1,5m²) aber ohne Heizung
  'C',  -- Mit WC und Wasserentnahme im Inneren
  'D'   -- Ohne WC oder Wasserentnahme
);

-- 3. Erweitere units Tabelle für MRG-Informationen
ALTER TABLE public.units 
ADD COLUMN mrg_scope public.mrg_scope DEFAULT 'vollanwendung',
ADD COLUMN ausstattungskategorie public.ausstattungskategorie DEFAULT 'A',
ADD COLUMN nutzflaeche_mrg NUMERIC DEFAULT 0,  -- Nutzfläche nach §17 MRG (kann von qm abweichen)
ADD COLUMN richtwertmiete_basis NUMERIC DEFAULT 0;  -- Basis-Richtwert €/m²

-- 4. Erweitere properties für MRG-relevante Daten
ALTER TABLE public.properties 
ADD COLUMN baujahr_mrg INTEGER,  -- Relevantes Baujahr für MRG
ADD COLUMN stichtag_mrg DATE DEFAULT '1945-01-01',  -- Stichtag für Altbau-Definition
ADD COLUMN baubewilligung_nach_1945 BOOLEAN DEFAULT false,
ADD COLUMN baubewilligung_nach_1953 BOOLEAN DEFAULT false,
ADD COLUMN foerderung_erhalten BOOLEAN DEFAULT false,
ADD COLUMN richtwert_bundesland TEXT DEFAULT 'Wien';

-- 5. Betriebskosten-Kategorien nach §21 MRG
CREATE TYPE public.mrg_bk_kategorie AS ENUM (
  'wasserversorgung',           -- §21 Abs 1 Z 1
  'abwasserentsorgung',         -- §21 Abs 1 Z 1  
  'rauchfangkehrer',            -- §21 Abs 1 Z 2
  'muellabfuhr',                -- §21 Abs 1 Z 3
  'schaedlingsbekaempfung',     -- §21 Abs 1 Z 4
  'beleuchtung_allgemein',      -- §21 Abs 1 Z 5
  'feuerversicherung',          -- §21 Abs 1 Z 6
  'haftpflicht_haus',           -- §21 Abs 1 Z 6
  'leitungswasserschaden',      -- §21 Abs 1 Z 6
  'hausbesorger',               -- §21 Abs 1 Z 7
  'hausbetreuung',              -- §21 Abs 1 Z 7a (bei Wegfall Hausbesorger)
  'lift_betrieb',               -- §21 Abs 1 Z 8
  'lift_wartung',               -- §21 Abs 1 Z 8
  'gemeinschaftsanlagen',       -- §21 Abs 1 Z 9
  'oeffentliche_abgaben',       -- §21 Abs 1 Z 10 (Grundsteuer, etc.)
  'verwaltungshonorar',         -- §22 MRG
  'ruecklage',                  -- §14 MRG (Erhaltungs- und Verbesserungsbeitrag)
  'heizung_betrieb',            -- HeizKG
  'heizung_wartung',            -- HeizKG
  'warmwasser',                 -- HeizKG
  'nicht_umlagefaehig'          -- Kosten die NICHT auf Mieter umgelegt werden dürfen
);

-- 6. Tabelle für Abrechnungsfristen
CREATE TABLE public.mrg_abrechnungen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  abrechnungsjahr INTEGER NOT NULL,
  abrechnungszeitraum_von DATE NOT NULL,  -- Muss Kalenderjahr sein
  abrechnungszeitraum_bis DATE NOT NULL,
  frist_abrechnung DATE NOT NULL,         -- 30. Juni des Folgejahres
  abrechnung_erstellt_am TIMESTAMP WITH TIME ZONE,
  abrechnung_versendet_am TIMESTAMP WITH TIME ZONE,
  einsicht_gewaehrt BOOLEAN DEFAULT false,
  einsicht_bis DATE,                      -- Einsichtsfrist
  status TEXT DEFAULT 'offen',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id, abrechnungsjahr)
);

-- Enable RLS
ALTER TABLE public.mrg_abrechnungen ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Managers can view mrg_abrechnungen for their properties"
ON public.mrg_abrechnungen FOR SELECT
USING (property_id IN (SELECT get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can create mrg_abrechnungen for their properties"
ON public.mrg_abrechnungen FOR INSERT
WITH CHECK (property_id IN (SELECT get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can update mrg_abrechnungen for their properties"
ON public.mrg_abrechnungen FOR UPDATE
USING (property_id IN (SELECT get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can delete mrg_abrechnungen for their properties"
ON public.mrg_abrechnungen FOR DELETE
USING (property_id IN (SELECT get_managed_property_ids(auth.uid())));

-- 7. Tabelle für Rücklage §14 MRG mit Kategoriegrenzen
CREATE TABLE public.mrg_ruecklage_grenzen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gueltig_ab DATE NOT NULL,
  gueltig_bis DATE,
  kategorie public.ausstattungskategorie NOT NULL,
  betrag_pro_qm NUMERIC NOT NULL,  -- Höchstbetrag pro m² Nutzfläche
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Füge aktuelle Richtwerte ein (Stand 2024/2025)
INSERT INTO public.mrg_ruecklage_grenzen (gueltig_ab, kategorie, betrag_pro_qm) VALUES
  ('2024-04-01', 'A', 2.49),
  ('2024-04-01', 'B', 1.87),
  ('2024-04-01', 'C', 1.25),
  ('2024-04-01', 'D', 0.63);

-- Enable RLS (read-only für alle authentifizierten User)
ALTER TABLE public.mrg_ruecklage_grenzen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view mrg_ruecklage_grenzen"
ON public.mrg_ruecklage_grenzen FOR SELECT
TO authenticated
USING (true);

-- 8. Tabelle für Richtwerte pro Bundesland
CREATE TABLE public.mrg_richtwerte (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundesland TEXT NOT NULL,
  gueltig_ab DATE NOT NULL,
  gueltig_bis DATE,
  richtwert_pro_qm NUMERIC NOT NULL,  -- Richtwert €/m²
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Füge aktuelle Richtwerte ein (Stand April 2024)
INSERT INTO public.mrg_richtwerte (bundesland, gueltig_ab, richtwert_pro_qm) VALUES
  ('Wien', '2024-04-01', 6.67),
  ('Niederösterreich', '2024-04-01', 6.85),
  ('Oberösterreich', '2024-04-01', 7.23),
  ('Steiermark', '2024-04-01', 9.43),
  ('Kärnten', '2024-04-01', 7.81),
  ('Salzburg', '2024-04-01', 9.22),
  ('Tirol', '2024-04-01', 8.14),
  ('Vorarlberg', '2024-04-01', 10.25),
  ('Burgenland', '2024-04-01', 6.09);

-- Enable RLS
ALTER TABLE public.mrg_richtwerte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view mrg_richtwerte"
ON public.mrg_richtwerte FOR SELECT
TO authenticated
USING (true);

-- 9. Verteilerschlüssel MRG-konform erweitern
ALTER TABLE public.distribution_keys
ADD COLUMN mrg_konform BOOLEAN DEFAULT true,
ADD COLUMN mrg_paragraph TEXT,  -- Referenz zum Gesetzesparagraph
ADD COLUMN erlaubter_schluessel TEXT[];  -- Erlaubte Verteilungsarten (nutzflaeche, mea, personen, verbrauch)

-- Update bestehende Schlüssel mit MRG-Konformität
UPDATE public.distribution_keys SET 
  mrg_konform = true,
  mrg_paragraph = '§17 MRG',
  erlaubter_schluessel = ARRAY['nutzflaeche']
WHERE key_code = 'qm';

UPDATE public.distribution_keys SET 
  mrg_konform = true,
  mrg_paragraph = '§17 MRG',
  erlaubter_schluessel = ARRAY['mea']
WHERE key_code = 'mea';

UPDATE public.distribution_keys SET 
  mrg_konform = true,
  mrg_paragraph = '§21 MRG',
  erlaubter_schluessel = ARRAY['personen', 'verbrauch']
WHERE key_code IN ('personen', 'wasser_verbrauch');

-- 10. Erweitere expenses für MRG-Kategorisierung
ALTER TABLE public.expenses
ADD COLUMN mrg_kategorie public.mrg_bk_kategorie,
ADD COLUMN ist_umlagefaehig BOOLEAN DEFAULT true,
ADD COLUMN mrg_paragraph TEXT;

-- Trigger für updated_at auf mrg_abrechnungen
CREATE TRIGGER update_mrg_abrechnungen_updated_at
  BEFORE UPDATE ON public.mrg_abrechnungen
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();