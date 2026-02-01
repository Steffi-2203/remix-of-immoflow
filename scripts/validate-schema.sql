-- ============================================================================
-- Validierungsskript: Prüft Constraints, Indices, FK für neue Tabellen
-- ============================================================================

-- 1. Prüfe ob Tabellen existieren
SELECT 
    'Tabellen-Check' AS check_type,
    table_name,
    CASE WHEN table_name IS NOT NULL THEN 'OK' ELSE 'FEHLT' END AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('invoice_lines', 'expense_allocations');

-- 2. Prüfe Foreign Keys
SELECT 
    'FK-Check' AS check_type,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    'OK' AS status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('invoice_lines', 'expense_allocations');

-- 3. Prüfe Check Constraints
SELECT 
    'Check-Constraint' AS check_type,
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS definition,
    'OK' AS status
FROM pg_constraint
WHERE contype = 'c'
AND conrelid::regclass::text IN ('invoice_lines', 'expense_allocations', 'monthly_invoices');

-- 4. Prüfe Indices
SELECT 
    'Index-Check' AS check_type,
    tablename,
    indexname,
    'OK' AS status
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('invoice_lines', 'expense_allocations', 'units', 'tenants', 'monthly_invoices', 'expenses', 'meter_readings', 'payments', 'audit_logs');

-- 5. Prüfe Unique Constraints
SELECT 
    'Unique-Check' AS check_type,
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    'OK' AS status
FROM pg_constraint
WHERE contype = 'u'
AND conrelid::regclass::text IN ('invoice_lines', 'expense_allocations', 'units');

-- 6. Prüfe NOT NULL Constraints für kritische Felder
SELECT 
    'NOT NULL Check' AS check_type,
    table_name,
    column_name,
    is_nullable,
    CASE WHEN is_nullable = 'NO' THEN 'OK' ELSE 'NULLABLE' END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('invoice_lines', 'expense_allocations')
AND column_name IN ('invoice_id', 'expense_id', 'unit_id', 'net_amount', 'allocated_net', 'expense_type', 'allocation_basis', 'vat_rate', 'gross_amount');

-- 7. Beispiel-Queries zur Datenprüfung
-- Invoice Lines mit zugehöriger Rechnung
SELECT 
    'Beispiel: Invoice Lines' AS query_type,
    il.id,
    il.expense_type,
    il.net_amount,
    il.vat_rate,
    il.gross_amount,
    mi.year,
    mi.month
FROM invoice_lines il
JOIN monthly_invoices mi ON il.invoice_id = mi.id
LIMIT 5;

-- Expense Allocations mit Einheit und Ausgabe
SELECT 
    'Beispiel: Expense Allocations' AS query_type,
    ea.id,
    e.bezeichnung AS expense,
    u.top_nummer AS unit,
    ea.allocated_net,
    ea.allocation_basis
FROM expense_allocations ea
JOIN expenses e ON ea.expense_id = e.id
JOIN units u ON ea.unit_id = u.id
LIMIT 5;
