-- Marktwert/Immobilienwert pro Liegenschaft (für Renditeberechnung)
ALTER TABLE public.properties 
ADD COLUMN marktwert numeric DEFAULT NULL;

COMMENT ON COLUMN public.properties.marktwert IS 'Geschätzter Marktwert der Liegenschaft in EUR für die Renditeberechnung';