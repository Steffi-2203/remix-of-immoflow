-- Neue Spalte property_id zu bank_accounts hinzufügen (optional, da ein Konto auch ohne Liegenschaft existieren kann)
ALTER TABLE bank_accounts 
ADD COLUMN property_id uuid REFERENCES properties(id) ON DELETE SET NULL;

-- Index für schnelle Abfragen
CREATE INDEX idx_bank_accounts_property_id ON bank_accounts(property_id);