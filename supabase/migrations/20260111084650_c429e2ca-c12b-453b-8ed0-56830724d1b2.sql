-- Phase 1: Create negative transactions for all expenses in 2026 and link them

-- Step 1: Insert negative transactions for each expense
INSERT INTO transactions (amount, transaction_date, booking_date, description, category_id, property_id, status, reference, currency)
SELECT 
  -e.betrag as amount,
  e.datum as transaction_date,
  e.datum as booking_date,
  e.bezeichnung as description,
  (SELECT ac.id FROM account_categories ac WHERE ac.name = CASE e.expense_type
    WHEN 'versicherung' THEN 'Versicherungen'
    WHEN 'grundsteuer' THEN 'Grundsteuer'
    WHEN 'muellabfuhr' THEN 'Müllabfuhr'
    WHEN 'wasser_abwasser' THEN 'Wasser/Abwasser'
    WHEN 'heizung' THEN 'Heizkosten'
    WHEN 'strom_allgemein' THEN 'Strom Allgemein'
    WHEN 'hausbetreuung' THEN 'Hausbetreuung'
    WHEN 'lift' THEN 'Lift'
    WHEN 'gartenpflege' THEN 'Gartenpflege'
    WHEN 'schneeraeumung' THEN 'Schneeräumung'
    WHEN 'verwaltung' THEN 'Verwaltungskosten'
    WHEN 'ruecklage' THEN 'Rücklage'
    WHEN 'reparatur' THEN 'Instandhaltung'
    WHEN 'sanierung' THEN 'Instandhaltung'
    WHEN 'sonstiges' THEN 'Sonstige Kosten'
    WHEN 'makler' THEN 'Sonstige Kosten'
    WHEN 'notar' THEN 'Sonstige Kosten'
    WHEN 'grundbuch' THEN 'Sonstige Kosten'
    WHEN 'finanzierung' THEN 'Sonstige Kosten'
    ELSE 'Sonstige Kosten'
  END LIMIT 1) as category_id,
  e.property_id,
  'matched' as status,
  'EXP-' || e.id as reference,
  'EUR' as currency
FROM expenses e
WHERE EXTRACT(YEAR FROM e.datum::date) = 2026
  AND e.transaction_id IS NULL;

-- Step 2: Link expenses to their newly created transactions
UPDATE expenses e
SET transaction_id = t.id, updated_at = now()
FROM transactions t
WHERE t.reference = 'EXP-' || e.id
  AND e.transaction_id IS NULL;