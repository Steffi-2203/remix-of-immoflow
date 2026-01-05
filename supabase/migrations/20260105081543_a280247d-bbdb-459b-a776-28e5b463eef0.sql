-- 1. Neue Tabelle: account_categories (Kontenplan)
CREATE TABLE account_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'asset')),
  parent_id UUID REFERENCES account_categories(id) ON DELETE CASCADE,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies für account_categories
ALTER TABLE account_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories in their org"
  ON account_categories FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert custom categories"
  ON account_categories FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update custom categories"
  ON account_categories FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND is_system = false
  );

CREATE POLICY "Users can delete custom categories"
  ON account_categories FOR DELETE
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND is_system = false
  );

-- 2. Trigger: System-Kategorien bei Org-Erstellung
CREATE OR REPLACE FUNCTION create_default_account_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Einnahmen
  INSERT INTO account_categories (organization_id, name, type, is_system) VALUES
    (NEW.id, 'Mieteinnahmen', 'income', true),
    (NEW.id, 'Betriebskostenvorauszahlungen', 'income', true),
    (NEW.id, 'Sonstige Einnahmen', 'income', true);
  
  -- Ausgaben
  INSERT INTO account_categories (organization_id, name, type, is_system) VALUES
    (NEW.id, 'Versicherungen', 'expense', true),
    (NEW.id, 'Instandhaltung', 'expense', true),
    (NEW.id, 'Lift/Aufzug', 'expense', true),
    (NEW.id, 'Heizung', 'expense', true),
    (NEW.id, 'Wasser/Abwasser', 'expense', true),
    (NEW.id, 'Strom Allgemein', 'expense', true),
    (NEW.id, 'Müllabfuhr', 'expense', true),
    (NEW.id, 'Hausbetreuung/Reinigung', 'expense', true),
    (NEW.id, 'Gartenpflege', 'expense', true),
    (NEW.id, 'Schneeräumung', 'expense', true),
    (NEW.id, 'Grundsteuer', 'expense', true),
    (NEW.id, 'Verwaltungskosten', 'expense', true),
    (NEW.id, 'Reparaturen', 'expense', true),
    (NEW.id, 'Sonstige Ausgaben', 'expense', true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_organization_created_add_categories
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION create_default_account_categories();

-- 3. Default-Kategorien für BESTEHENDE Organisationen einfügen
INSERT INTO account_categories (organization_id, name, type, is_system)
SELECT o.id, cat.name, cat.type, true
FROM organizations o
CROSS JOIN (
  VALUES 
    ('Mieteinnahmen', 'income'),
    ('Betriebskostenvorauszahlungen', 'income'),
    ('Sonstige Einnahmen', 'income'),
    ('Versicherungen', 'expense'),
    ('Instandhaltung', 'expense'),
    ('Lift/Aufzug', 'expense'),
    ('Heizung', 'expense'),
    ('Wasser/Abwasser', 'expense'),
    ('Strom Allgemein', 'expense'),
    ('Müllabfuhr', 'expense'),
    ('Hausbetreuung/Reinigung', 'expense'),
    ('Gartenpflege', 'expense'),
    ('Schneeräumung', 'expense'),
    ('Grundsteuer', 'expense'),
    ('Verwaltungskosten', 'expense'),
    ('Reparaturen', 'expense'),
    ('Sonstige Ausgaben', 'expense')
) AS cat(name, type);

-- 4. Bank-Konten erweitern
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS opening_balance_date DATE;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS current_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- 5. Transaktionen erweitern
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES account_categories(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_split BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tags TEXT[];

-- 6. Neue Tabelle: transaction_splits
CREATE TABLE transaction_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  category_id UUID REFERENCES account_categories(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE transaction_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view splits for their transactions"
  ON transaction_splits FOR SELECT
  USING (transaction_id IN (
    SELECT id FROM transactions 
    WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can insert splits for their transactions"
  ON transaction_splits FOR INSERT
  WITH CHECK (transaction_id IN (
    SELECT id FROM transactions 
    WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can update splits for their transactions"
  ON transaction_splits FOR UPDATE
  USING (transaction_id IN (
    SELECT id FROM transactions 
    WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can delete splits for their transactions"
  ON transaction_splits FOR DELETE
  USING (transaction_id IN (
    SELECT id FROM transactions 
    WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  ));

-- 7. Funktion: Kontostand berechnen
CREATE OR REPLACE FUNCTION calculate_bank_balance(account_id UUID, as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  opening_bal DECIMAL(10,2);
  opening_date DATE;
  transaction_sum DECIMAL(10,2);
BEGIN
  SELECT opening_balance, opening_balance_date 
  INTO opening_bal, opening_date
  FROM bank_accounts WHERE id = account_id;
  
  SELECT COALESCE(SUM(amount), 0)
  INTO transaction_sum
  FROM transactions
  WHERE bank_account_id = account_id
    AND transaction_date >= COALESCE(opening_date, '1900-01-01')
    AND transaction_date <= as_of_date;
  
  RETURN COALESCE(opening_bal, 0) + transaction_sum;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;