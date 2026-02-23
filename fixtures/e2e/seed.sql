INSERT INTO organizations (id, name, created_at)
VALUES ('e2e00000-0000-0000-0000-000000000001', 'E2E Test Hausverwaltung', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, organization_id, created_at)
VALUES ('e2e00000-0000-0000-0000-000000000005', 'e2e-admin@immoflowme.at', 'E2E Admin', 'e2e00000-0000-0000-0000-000000000001', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO properties (id, organization_id, name, address, city, postal_code, created_at)
VALUES ('e2e00000-0000-0000-0000-000000000002', 'e2e00000-0000-0000-0000-000000000001', 'E2E Testobjekt Waidhofen', 'Hauptplatz 10', 'Waidhofen an der Ybbs', '3340', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO units (id, property_id, top_nummer, type, stockwerk, zimmer, flaeche, created_at)
VALUES ('e2e00000-0000-0000-0000-000000000003', 'e2e00000-0000-0000-0000-000000000002', 'Top 1', 'wohnung', 1, 3, 72.50, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO units (id, property_id, top_nummer, type, stockwerk, zimmer, flaeche, created_at)
VALUES ('e2e00000-0000-0000-0000-000000000006', 'e2e00000-0000-0000-0000-000000000002', 'Top 2', 'wohnung', 2, 2, 55.00, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenants (id, unit_id, first_name, last_name, email, status, grundmiete, betriebskosten_vorschuss, heizungskosten_vorschuss, mietbeginn, created_at)
VALUES ('e2e00000-0000-0000-0000-000000000004', 'e2e00000-0000-0000-0000-000000000003', 'Max', 'Mustermann', 'max.mustermann@test.at', 'aktiv', 650.00, 180.00, 95.00, '2025-01-01', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenants (id, unit_id, first_name, last_name, email, status, grundmiete, betriebskosten_vorschuss, heizungskosten_vorschuss, mietbeginn, created_at)
VALUES ('e2e00000-0000-0000-0000-000000000007', 'e2e00000-0000-0000-0000-000000000006', 'Anna', 'Gruber', 'anna.gruber@test.at', 'aktiv', 520.00, 145.00, 75.00, '2025-03-01', NOW())
ON CONFLICT (id) DO NOTHING;
