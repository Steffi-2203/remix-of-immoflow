import { runMigrations } from "./runner";

const migration = {
  name: "20260217_validate_fk_uuid_types",

  up: `
    -- Validate all FK columns use UUID type consistently
    -- This migration acts as a guard: it will FAIL if any FK type mismatch is found,
    -- preventing deployment until the mismatch is manually corrected.
    -- Current state (2026-02-17): All FKs validated, zero mismatches found.
    DO $$
    DECLARE
      r RECORD;
      mismatch_count INT := 0;
    BEGIN
      FOR r IN
        SELECT
          tc.table_name,
          kcu.column_name,
          c.data_type AS col_type,
          ccu.table_name AS ref_table,
          ccu.column_name AS ref_column,
          c2.data_type AS ref_type
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        JOIN information_schema.columns c
          ON c.table_name = kcu.table_name
          AND c.column_name = kcu.column_name
          AND c.table_schema = kcu.table_schema
        JOIN information_schema.columns c2
          ON c2.table_name = ccu.table_name
          AND c2.column_name = ccu.column_name
          AND c2.table_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND c.data_type != c2.data_type
      LOOP
        RAISE NOTICE 'FK type mismatch: %.% (%) -> %.% (%)',
          r.table_name, r.column_name, r.col_type,
          r.ref_table, r.ref_column, r.ref_type;
        mismatch_count := mismatch_count + 1;
      END LOOP;

      IF mismatch_count > 0 THEN
        RAISE EXCEPTION 'Found % FK type mismatch(es) — see NOTICE output above', mismatch_count;
      END IF;

      RAISE NOTICE 'FK UUID type validation passed — all foreign keys use consistent types';
    END $$;

    -- Ensure UUID extension is available
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Add validation constraint: organization_id columns must be valid UUID format
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_properties_org_id_uuid'
      ) THEN
        ALTER TABLE properties
          ADD CONSTRAINT chk_properties_org_id_uuid
          CHECK (organization_id IS NULL OR organization_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
      END IF;
    END $$;
  `,

  down: `
    ALTER TABLE properties DROP CONSTRAINT IF EXISTS chk_properties_org_id_uuid;
  `,
};

const isMain = process.argv[1]?.includes("20260217_validate_fk_uuid_types");
if (isMain) {
  const direction = process.argv.includes("--down") ? "down" as const : "up" as const;
  runMigrations([migration], direction)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default migration;
