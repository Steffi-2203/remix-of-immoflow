#!/usr/bin/env bash
# tools/schema_compat_check.sh
# Schema compatibility gate for CI: compares PR DDL changes against baseline.
# Fails if destructive/incompatible changes are detected.

set -euo pipefail

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"

echo "── Schema Compatibility Gate ──"

# 1. Check critical tables exist
EXPECTED_TABLES=(
  organizations profiles properties units tenants
  monthly_invoices invoice_lines payments audit_logs
  reconcile_runs expenses distribution_keys bank_accounts
  transactions billing_runs artifact_metadata artifact_access_log
  user_roles permissions
)

MISSING=""
for tbl in "${EXPECTED_TABLES[@]}"; do
  EXISTS=$(psql "$DATABASE_URL" -t -A -c "SELECT count(*) FROM pg_tables WHERE tablename = '${tbl}' AND schemaname = 'public';" 2>/dev/null || echo "0")
  if [ "$EXISTS" = "0" ]; then
    MISSING="$MISSING $tbl"
  fi
done

if [ -n "$MISSING" ]; then
  echo "::error::Missing tables in schema:$MISSING"
  exit 1
fi
echo "✅ All critical tables present"

# 2. Check no GENERATED ALWAYS columns (they cause restore issues)
GENERATED=$(psql "$DATABASE_URL" -t -A -c "
  SELECT count(*) FROM information_schema.columns
  WHERE table_schema = 'public'
    AND is_generated = 'ALWAYS';
" 2>/dev/null || echo "0")

if [ "$GENERATED" -gt 0 ]; then
  echo "::error::Found $GENERATED GENERATED ALWAYS column(s) — these are incompatible with CI restore"
  psql "$DATABASE_URL" -c "
    SELECT table_name, column_name, generation_expression
    FROM information_schema.columns
    WHERE table_schema = 'public' AND is_generated = 'ALWAYS';
  "
  exit 1
fi
echo "✅ No GENERATED ALWAYS columns"

# 3. Check critical indexes exist
EXPECTED_INDEXES=(
  idx_invoice_lines_unique
  idx_invoice_lines_invoice_id
  idx_artifact_access_log_user
  idx_artifact_access_log_created
)

MISSING_IDX=""
for idx in "${EXPECTED_INDEXES[@]}"; do
  EXISTS=$(psql "$DATABASE_URL" -t -A -c "SELECT count(*) FROM pg_indexes WHERE indexname = '${idx}';" 2>/dev/null || echo "0")
  if [ "$EXISTS" = "0" ]; then
    MISSING_IDX="$MISSING_IDX $idx"
  fi
done

if [ -n "$MISSING_IDX" ]; then
  echo "::error::Missing indexes:$MISSING_IDX"
  exit 1
fi
echo "✅ All critical indexes present"

# 4. Check no columns were dropped from critical tables (compared to snapshot)
# This detects destructive DDL like DROP COLUMN
CRITICAL_COLUMNS=(
  "invoice_lines:id,invoice_id,unit_id,line_type,description,normalized_description,amount,tax_rate,deleted_at"
  "billing_runs:id,run_id,status,expected_lines,inserted,updated,conflict_count,scenario_tag"
  "audit_logs:id,user_id,table_name,record_id,action,old_data,new_data,hash,previous_hash"
)

COL_ERRORS=""
for spec in "${CRITICAL_COLUMNS[@]}"; do
  TABLE="${spec%%:*}"
  COLS="${spec##*:}"
  IFS=',' read -ra COL_ARRAY <<< "$COLS"
  for col in "${COL_ARRAY[@]}"; do
    EXISTS=$(psql "$DATABASE_URL" -t -A -c "
      SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${TABLE}' AND column_name = '${col}';
    " 2>/dev/null || echo "0")
    if [ "$EXISTS" = "0" ]; then
      COL_ERRORS="$COL_ERRORS ${TABLE}.${col}"
    fi
  done
done

if [ -n "$COL_ERRORS" ]; then
  echo "::error::Missing critical columns (possible destructive DDL):$COL_ERRORS"
  exit 1
fi
echo "✅ All critical columns intact"

# 5. Check RLS is enabled on security-sensitive tables
RLS_TABLES=(audit_logs artifact_metadata artifact_access_log user_roles)
RLS_ISSUES=""
for tbl in "${RLS_TABLES[@]}"; do
  RLS=$(psql "$DATABASE_URL" -t -A -c "
    SELECT relrowsecurity::text FROM pg_class
    WHERE relname = '${tbl}' AND relnamespace = 'public'::regnamespace;
  " 2>/dev/null || echo "f")
  if [ "$RLS" != "t" ]; then
    RLS_ISSUES="$RLS_ISSUES $tbl"
  fi
done

if [ -n "$RLS_ISSUES" ]; then
  echo "::error::RLS not enabled on security tables:$RLS_ISSUES"
  exit 1
fi
echo "✅ RLS enabled on all security-sensitive tables"

# 6. Check enum values are complete
EXPECTED_ROLES="admin auditor ops"
for role in $EXPECTED_ROLES; do
  EXISTS=$(psql "$DATABASE_URL" -t -A -c "
    SELECT count(*) FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = '${role}';
  " 2>/dev/null || echo "0")
  if [ "$EXISTS" = "0" ]; then
    echo "::error::Missing app_role enum value: ${role}"
    exit 1
  fi
done
echo "✅ All required enum values present"

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ Schema Compatibility Gate PASSED"
echo "══════════════════════════════════════════"
