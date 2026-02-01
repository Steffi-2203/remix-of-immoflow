-- ============================================================================
-- Seed-Datei: Testdaten für invoice_lines und expense_allocations
-- Beschreibung: Erstellt minimale Testdaten zur Validierung der neuen Tabellen
-- ============================================================================

BEGIN;

-- Temporäre Variablen für IDs
DO $$
DECLARE
    v_org_id UUID;
    v_property_id UUID;
    v_unit_id UUID;
    v_tenant_id UUID;
    v_invoice_id UUID;
    v_expense_id UUID;
BEGIN
    -- Suche existierende Organisation oder erstelle Test-Org
    SELECT id INTO v_org_id FROM organizations LIMIT 1;
    
    IF v_org_id IS NULL THEN
        INSERT INTO organizations (name, subscription_tier, subscription_status)
        VALUES ('Test Hausverwaltung', 'starter', 'trial')
        RETURNING id INTO v_org_id;
    END IF;

    -- Suche existierende Liegenschaft oder erstelle Test-Property
    SELECT id INTO v_property_id FROM properties WHERE organization_id = v_org_id LIMIT 1;
    
    IF v_property_id IS NULL THEN
        INSERT INTO properties (organization_id, name, address, city, postal_code, total_units)
        VALUES (v_org_id, 'Testliegenschaft', 'Teststraße 1', 'Wien', '1010', 1)
        RETURNING id INTO v_property_id;
    END IF;

    -- Suche existierende Einheit oder erstelle Test-Unit
    SELECT id INTO v_unit_id FROM units WHERE property_id = v_property_id LIMIT 1;
    
    IF v_unit_id IS NULL THEN
        INSERT INTO units (property_id, top_nummer, type, flaeche, status)
        VALUES (v_property_id, 'Top 1', 'wohnung', 75.50, 'aktiv')
        RETURNING id INTO v_unit_id;
    END IF;

    -- Suche existierenden Mieter oder erstelle Test-Tenant
    SELECT id INTO v_tenant_id FROM tenants WHERE unit_id = v_unit_id LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        INSERT INTO tenants (unit_id, first_name, last_name, status, grundmiete, betriebskosten_vorschuss)
        VALUES (v_unit_id, 'Max', 'Mustermann', 'aktiv', 850.00, 150.00)
        RETURNING id INTO v_tenant_id;
    END IF;

    -- Erstelle Test-Invoice
    INSERT INTO monthly_invoices (tenant_id, unit_id, year, month, grundmiete, betriebskosten, ust, gesamtbetrag, status)
    VALUES (v_tenant_id, v_unit_id, 2026, 1, 850.00, 150.00, 100.00, 1100.00, 'offen')
    RETURNING id INTO v_invoice_id;

    -- Erstelle 2 Invoice Lines
    INSERT INTO invoice_lines (invoice_id, expense_type, description, net_amount, vat_rate, gross_amount, allocation_reference)
    VALUES 
        (v_invoice_id, 'grundmiete', 'Nettomiete Januar 2026', 772.73, 10, 850.00, 'MRG §15'),
        (v_invoice_id, 'betriebskosten', 'BK-Vorschuss Januar 2026', 136.36, 10, 150.00, 'MRG §21');

    -- Erstelle Test-Expense
    INSERT INTO expenses (property_id, category, expense_type, bezeichnung, betrag, datum, year, month, ist_umlagefaehig)
    VALUES (v_property_id, 'betriebskosten_umlagefaehig', 'hausbetreuung', 'Hausbetreuung Januar', 200.00, '2026-01-15', 2026, 1, true)
    RETURNING id INTO v_expense_id;

    -- Erstelle 2 Expense Allocations (für 2 Einheiten - hier simuliert mit einer)
    INSERT INTO expense_allocations (expense_id, unit_id, allocated_net, allocation_basis, allocation_detail)
    VALUES 
        (v_expense_id, v_unit_id, 200.00, 'nutzflaeche', 'Anteil: 100% (75.50 m² / 75.50 m² Gesamt)');

    RAISE NOTICE 'Seed-Daten erfolgreich erstellt:';
    RAISE NOTICE '  - Organization ID: %', v_org_id;
    RAISE NOTICE '  - Property ID: %', v_property_id;
    RAISE NOTICE '  - Unit ID: %', v_unit_id;
    RAISE NOTICE '  - Tenant ID: %', v_tenant_id;
    RAISE NOTICE '  - Invoice ID: %', v_invoice_id;
    RAISE NOTICE '  - Expense ID: %', v_expense_id;
END $$;

COMMIT;

-- ============================================================================
-- Validierung: Prüfe ob Daten korrekt eingefügt wurden
-- ============================================================================
SELECT 'invoice_lines' AS tabelle, COUNT(*) AS anzahl FROM invoice_lines
UNION ALL
SELECT 'expense_allocations', COUNT(*) FROM expense_allocations;
