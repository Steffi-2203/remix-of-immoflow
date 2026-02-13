-- =============================================================
-- ImmoflowMe Test Seed Data
-- 3 Organisations, 10 Properties, 50 Tenants, 200 Bookings
-- =============================================================

-- Deterministic UUIDs for reproducibility
-- Org UUIDs
-- org1: 00000000-0000-4000-a000-000000000001
-- org2: 00000000-0000-4000-a000-000000000002
-- org3: 00000000-0000-4000-a000-000000000003

BEGIN;

-- ==================== ORGANIZATIONS ====================
INSERT INTO organizations (id, name, created_at) VALUES
  ('00000000-0000-4000-a000-000000000001', 'Hausverwaltung Mustermann GmbH', now()),
  ('00000000-0000-4000-a000-000000000002', 'WEG Testgasse 12', now()),
  ('00000000-0000-4000-a000-000000000003', 'Immo Invest GmbH', now())
ON CONFLICT (id) DO NOTHING;

-- ==================== PROPERTIES ====================
-- Org1: 4 properties
INSERT INTO properties (id, organization_id, name, address, city, postal_code, type, created_at) VALUES
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001', 'Musterhaus Wien 1', 'Musterstraße 1', 'Wien', '1010', 'residential', now()),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000001', 'Musterhaus Wien 2', 'Testgasse 5', 'Wien', '1020', 'residential', now()),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000001', 'Gewerbepark Süd', 'Industriestr. 10', 'Wien', '1100', 'commercial', now()),
  ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000001', 'Wohnanlage Nord', 'Nordring 22', 'Wien', '1210', 'residential', now()),
-- Org2: 3 properties
  ('00000000-0000-4000-b000-000000000005', '00000000-0000-4000-a000-000000000002', 'WEG Haus A', 'Testgasse 12/A', 'Graz', '8010', 'residential', now()),
  ('00000000-0000-4000-b000-000000000006', '00000000-0000-4000-a000-000000000002', 'WEG Haus B', 'Testgasse 12/B', 'Graz', '8010', 'residential', now()),
  ('00000000-0000-4000-b000-000000000007', '00000000-0000-4000-a000-000000000002', 'WEG Haus C', 'Testgasse 12/C', 'Graz', '8010', 'residential', now()),
-- Org3: 3 properties
  ('00000000-0000-4000-b000-000000000008', '00000000-0000-4000-a000-000000000003', 'Invest Tower', 'Hauptplatz 1', 'Linz', '4020', 'commercial', now()),
  ('00000000-0000-4000-b000-000000000009', '00000000-0000-4000-a000-000000000003', 'Wohnpark Ost', 'Ostweg 15', 'Linz', '4040', 'residential', now()),
  ('00000000-0000-4000-b000-000000000010', '00000000-0000-4000-a000-000000000003', 'Gartenanlage Süd', 'Südstraße 8', 'Salzburg', '5020', 'residential', now())
ON CONFLICT (id) DO NOTHING;

-- ==================== UNITS (5 per property = 50 total) ====================
DO $$
DECLARE
  prop_id TEXT;
  prop_ids TEXT[] := ARRAY[
    '00000000-0000-4000-b000-000000000001',
    '00000000-0000-4000-b000-000000000002',
    '00000000-0000-4000-b000-000000000003',
    '00000000-0000-4000-b000-000000000004',
    '00000000-0000-4000-b000-000000000005',
    '00000000-0000-4000-b000-000000000006',
    '00000000-0000-4000-b000-000000000007',
    '00000000-0000-4000-b000-000000000008',
    '00000000-0000-4000-b000-000000000009',
    '00000000-0000-4000-b000-000000000010'
  ];
  p_idx INT;
  u_idx INT;
  unit_uuid TEXT;
BEGIN
  FOR p_idx IN 1..10 LOOP
    FOR u_idx IN 1..5 LOOP
      unit_uuid := '00000000-0000-4000-c' || LPAD(((p_idx - 1) * 5 + u_idx)::TEXT, 3, '0') || '-000000000000';
      INSERT INTO units (id, property_id, name, floor, area_sqm, created_at)
      VALUES (
        unit_uuid,
        prop_ids[p_idx],
        'Top ' || u_idx,
        u_idx,
        45 + (u_idx * 10),
        now()
      ) ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ==================== TENANTS (50 = 1 per unit) ====================
DO $$
DECLARE
  t_idx INT;
  tenant_uuid TEXT;
  unit_uuid TEXT;
  prop_idx INT;
  org_id TEXT;
  org_ids TEXT[] := ARRAY[
    '00000000-0000-4000-a000-000000000001',
    '00000000-0000-4000-a000-000000000001',
    '00000000-0000-4000-a000-000000000001',
    '00000000-0000-4000-a000-000000000001',
    '00000000-0000-4000-a000-000000000002',
    '00000000-0000-4000-a000-000000000002',
    '00000000-0000-4000-a000-000000000002',
    '00000000-0000-4000-a000-000000000003',
    '00000000-0000-4000-a000-000000000003',
    '00000000-0000-4000-a000-000000000003'
  ];
BEGIN
  FOR t_idx IN 1..50 LOOP
    tenant_uuid := '00000000-0000-4000-d' || LPAD(t_idx::TEXT, 3, '0') || '-000000000000';
    unit_uuid := '00000000-0000-4000-c' || LPAD(t_idx::TEXT, 3, '0') || '-000000000000';
    prop_idx := ((t_idx - 1) / 5) + 1;
    org_id := org_ids[prop_idx];

    INSERT INTO tenants (id, organization_id, unit_id, firstname, lastname, email, phone, move_in_date, rent_amount_cents, created_at)
    VALUES (
      tenant_uuid,
      org_id,
      unit_uuid,
      'Mieter',
      'Test-' || t_idx,
      'mieter' || t_idx || '@test.immoflow.me',
      '+43 660 ' || LPAD(t_idx::TEXT, 7, '0'),
      (DATE '2023-01-01' + (t_idx * INTERVAL '5 days'))::DATE,
      (450 + t_idx * 15) * 100,
      now()
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- ==================== MONTHLY INVOICES (200 across 12 months) ====================
DO $$
DECLARE
  inv_idx INT := 1;
  t_idx INT;
  m INT;
  inv_uuid TEXT;
  tenant_uuid TEXT;
  prop_idx INT;
  prop_id TEXT;
  prop_ids TEXT[] := ARRAY[
    '00000000-0000-4000-b000-000000000001',
    '00000000-0000-4000-b000-000000000002',
    '00000000-0000-4000-b000-000000000003',
    '00000000-0000-4000-b000-000000000004',
    '00000000-0000-4000-b000-000000000005',
    '00000000-0000-4000-b000-000000000006',
    '00000000-0000-4000-b000-000000000007',
    '00000000-0000-4000-b000-000000000008',
    '00000000-0000-4000-b000-000000000009',
    '00000000-0000-4000-b000-000000000010'
  ];
BEGIN
  -- Generate ~200 invoices: 4 tenants * 12 months = 48 per cycle, repeat until 200
  FOR t_idx IN 1..20 LOOP
    FOR m IN 1..10 LOOP
      IF inv_idx > 200 THEN EXIT; END IF;
      inv_uuid := '00000000-0000-4000-e' || LPAD(inv_idx::TEXT, 3, '0') || '-000000000000';
      tenant_uuid := '00000000-0000-4000-d' || LPAD(t_idx::TEXT, 3, '0') || '-000000000000';
      prop_idx := ((t_idx - 1) / 5) + 1;
      prop_id := prop_ids[prop_idx];

      INSERT INTO monthly_invoices (id, property_id, tenant_id, year, month, total_amount, status, created_at)
      VALUES (
        inv_uuid,
        prop_id,
        tenant_uuid,
        2024,
        m,
        (450 + t_idx * 15) * 100,
        CASE WHEN m <= 8 THEN 'paid' ELSE 'open' END,
        make_date(2024, m, 1)
      ) ON CONFLICT (id) DO NOTHING;

      inv_idx := inv_idx + 1;
    END LOOP;
  END LOOP;
END $$;

-- ==================== PAYMENTS (matching paid invoices) ====================
DO $$
DECLARE
  inv_idx INT;
  pay_uuid TEXT;
  inv_uuid TEXT;
  t_idx INT;
  prop_idx INT;
  prop_ids TEXT[] := ARRAY[
    '00000000-0000-4000-b000-000000000001',
    '00000000-0000-4000-b000-000000000002',
    '00000000-0000-4000-b000-000000000003',
    '00000000-0000-4000-b000-000000000004',
    '00000000-0000-4000-b000-000000000005',
    '00000000-0000-4000-b000-000000000006',
    '00000000-0000-4000-b000-000000000007',
    '00000000-0000-4000-b000-000000000008',
    '00000000-0000-4000-b000-000000000009',
    '00000000-0000-4000-b000-000000000010'
  ];
BEGIN
  FOR inv_idx IN 1..160 LOOP  -- first 160 invoices are 'paid' (8 months * 20 tenants)
    pay_uuid := '00000000-0000-4000-f' || LPAD(inv_idx::TEXT, 3, '0') || '-000000000000';
    inv_uuid := '00000000-0000-4000-e' || LPAD(inv_idx::TEXT, 3, '0') || '-000000000000';
    t_idx := ((inv_idx - 1) / 10) + 1;
    prop_idx := ((t_idx - 1) / 5) + 1;

    INSERT INTO payments (id, property_id, tenant_id, amount, payment_date, payment_type, reference, created_at)
    VALUES (
      pay_uuid,
      prop_ids[prop_idx],
      '00000000-0000-4000-d' || LPAD(t_idx::TEXT, 3, '0') || '-000000000000',
      (450 + t_idx * 15) * 100,
      make_date(2024, ((inv_idx - 1) % 10) + 1, 5),
      'bank_transfer',
      'SEPA-' || LPAD(inv_idx::TEXT, 6, '0'),
      now()
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- ==================== EXPENSES (1 per property per month, 12 months = 120) ====================
DO $$
DECLARE
  exp_idx INT := 1;
  p_idx INT;
  m INT;
  exp_uuid TEXT;
  prop_ids TEXT[] := ARRAY[
    '00000000-0000-4000-b000-000000000001',
    '00000000-0000-4000-b000-000000000002',
    '00000000-0000-4000-b000-000000000003',
    '00000000-0000-4000-b000-000000000004',
    '00000000-0000-4000-b000-000000000005',
    '00000000-0000-4000-b000-000000000006',
    '00000000-0000-4000-b000-000000000007',
    '00000000-0000-4000-b000-000000000008',
    '00000000-0000-4000-b000-000000000009',
    '00000000-0000-4000-b000-000000000010'
  ];
  categories TEXT[] := ARRAY['water', 'heating', 'elevator', 'insurance', 'management'];
BEGIN
  FOR p_idx IN 1..10 LOOP
    FOR m IN 1..12 LOOP
      exp_uuid := '00000000-0000-4000-aa' || LPAD(exp_idx::TEXT, 2, '0') || '-000000000000';

      INSERT INTO expenses (id, property_id, bezeichnung, betrag, datum, year, month, category, expense_type, created_at)
      VALUES (
        exp_uuid,
        prop_ids[p_idx],
        categories[((exp_idx - 1) % 5) + 1] || ' ' || TO_CHAR(make_date(2024, m, 1), 'Mon YYYY'),
        (200 + (p_idx * 30) + (m * 10)),
        make_date(2024, m, 15),
        2024,
        m,
        categories[((exp_idx - 1) % 5) + 1],
        'operating',
        now()
      ) ON CONFLICT (id) DO NOTHING;

      exp_idx := exp_idx + 1;
    END LOOP;
  END LOOP;
END $$;

-- ==================== TEST ACCOUNTS ====================
-- Note: User accounts should be created via the auth system.
-- These are profile entries for the test accounts.
-- Passwords must be set via the auth API or seeded in auth.users separately.
--
-- Test credentials:
--   admin@test.immoflow.me   / TestAdmin123!   (role: admin,   org: org1)
--   manager@test.immoflow.me / TestManager123!  (role: manager, org: org1)
--   mieter@test.immoflow.me  / TestMieter123!   (role: tester,  org: org1)

COMMIT;
