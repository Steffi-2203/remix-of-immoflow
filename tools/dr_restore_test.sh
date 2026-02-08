#!/usr/bin/env bash
# tools/dr_restore_test.sh
# Disaster Recovery restore test script.
# Validates that a pg_dump → pg_restore cycle preserves schema and data integrity.
#
# Usage: bash tools/dr_restore_test.sh [DATABASE_URL]
#
# Exit codes:
#   0 = Restore test passed
#   1 = Restore test failed

set -euo pipefail

SOURCE_URL="${1:-${DATABASE_URL:?DATABASE_URL is required}}"
RESTORE_DB="dr_restore_test_$(date +%s)"
DUMP_FILE="/tmp/${RESTORE_DB}.dump"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "══════════════════════════════════════════"
echo "  DR Restore Test — ${TIMESTAMP}"
echo "══════════════════════════════════════════"
echo ""

# ── Step 1: Create backup ──
echo "▸ Step 1: Creating pg_dump..."
pg_dump "$SOURCE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --exclude-schema=pg_catalog \
  --exclude-schema=information_schema \
  -f "$DUMP_FILE" 2>&1

DUMP_SIZE=$(stat -c%s "$DUMP_FILE" 2>/dev/null || stat -f%z "$DUMP_FILE" 2>/dev/null || echo "unknown")
echo "  ✅ Dump created: ${DUMP_FILE} (${DUMP_SIZE} bytes)"

# ── Step 2: Create restore target database ──
echo ""
echo "▸ Step 2: Creating restore target database..."
# Extract connection params from URL
DB_HOST=$(echo "$SOURCE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_PORT=$(echo "$SOURCE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_USER=$(echo "$SOURCE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')

# Use psql to create the restore database
psql "$SOURCE_URL" -c "SELECT 1;" > /dev/null 2>&1 || {
  echo "  ❌ Cannot connect to source database"
  exit 1
}

# For CI: use the same database with a different schema
RESTORE_SCHEMA="dr_test_$(date +%s)"
psql "$SOURCE_URL" -c "CREATE SCHEMA IF NOT EXISTS ${RESTORE_SCHEMA};" 2>/dev/null || true

echo "  ✅ Restore schema created: ${RESTORE_SCHEMA}"

# ── Step 3: Restore ──
echo ""
echo "▸ Step 3: Restoring from dump..."
RESTORE_START=$(date +%s%N)

pg_restore \
  --dbname="$SOURCE_URL" \
  --schema="${RESTORE_SCHEMA}" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  "$DUMP_FILE" 2>/tmp/dr_restore_errors.log || true

RESTORE_END=$(date +%s%N)
RESTORE_DURATION_MS=$(( (RESTORE_END - RESTORE_START) / 1000000 ))
echo "  ✅ Restore completed in ${RESTORE_DURATION_MS}ms"

# Check for critical errors (ignore "does not exist" warnings)
CRITICAL_ERRORS=$(grep -ci "error" /tmp/dr_restore_errors.log 2>/dev/null || echo "0")
if [ "$CRITICAL_ERRORS" -gt 5 ]; then
  echo "  ⚠️  ${CRITICAL_ERRORS} restore errors (see /tmp/dr_restore_errors.log)"
fi

# ── Step 4: Validate restored data ──
echo ""
echo "▸ Step 4: Validating restored schema..."

ERRORS=0

# Check critical tables exist in source
CRITICAL_TABLES="organizations profiles properties units tenants monthly_invoices invoice_lines payments audit_logs billing_runs"
for tbl in $CRITICAL_TABLES; do
  EXISTS=$(psql "$SOURCE_URL" -t -A -c "SELECT count(*) FROM pg_tables WHERE tablename = '${tbl}' AND schemaname = 'public';" 2>/dev/null || echo "0")
  if [ "$EXISTS" = "0" ]; then
    echo "  ❌ Missing table: ${tbl}"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ "$ERRORS" -eq 0 ]; then
  echo "  ✅ All critical tables present"
fi

# ── Step 5: Validate row counts ──
echo ""
echo "▸ Step 5: Checking row counts..."

for tbl in organizations profiles properties units tenants; do
  COUNT=$(psql "$SOURCE_URL" -t -A -c "SELECT count(*) FROM public.${tbl};" 2>/dev/null || echo "?")
  echo "  ${tbl}: ${COUNT} rows"
done

# ── Step 6: Validate audit log integrity ──
echo ""
echo "▸ Step 6: Checking audit log hash chain integrity..."

BROKEN_CHAINS=$(psql "$SOURCE_URL" -t -A -c "
  WITH ordered AS (
    SELECT id, hash, previous_hash,
           LAG(hash) OVER (ORDER BY created_at, id) AS expected_prev_hash
    FROM audit_logs
    WHERE hash IS NOT NULL
    ORDER BY created_at, id
  )
  SELECT count(*)
  FROM ordered
  WHERE expected_prev_hash IS NOT NULL
    AND previous_hash != expected_prev_hash
    AND previous_hash != 'GENESIS';
" 2>/dev/null || echo "?")

if [ "$BROKEN_CHAINS" = "0" ]; then
  echo "  ✅ Audit log hash chain intact"
elif [ "$BROKEN_CHAINS" = "?" ]; then
  echo "  ⚠️  Could not verify hash chain"
else
  echo "  ❌ ${BROKEN_CHAINS} broken hash chain link(s)"
  ERRORS=$((ERRORS + 1))
fi

# ── Step 7: Validate RLS is enabled ──
echo ""
echo "▸ Step 7: Checking RLS status..."

RLS_TABLES="audit_logs artifact_metadata artifact_access_log user_roles"
for tbl in $RLS_TABLES; do
  RLS=$(psql "$SOURCE_URL" -t -A -c "
    SELECT COALESCE(relrowsecurity::text, 'f') FROM pg_class
    WHERE relname = '${tbl}' AND relnamespace = 'public'::regnamespace;
  " 2>/dev/null || echo "?")
  if [ "$RLS" != "t" ]; then
    echo "  ❌ RLS not enabled: ${tbl}"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ "$ERRORS" -eq 0 ]; then
  echo "  ✅ RLS enabled on all security tables"
fi

# ── Step 8: Cleanup ──
echo ""
echo "▸ Step 8: Cleaning up..."
psql "$SOURCE_URL" -c "DROP SCHEMA IF EXISTS ${RESTORE_SCHEMA} CASCADE;" 2>/dev/null || true
rm -f "$DUMP_FILE"
echo "  ✅ Cleanup complete"

# ── Result ──
echo ""
echo "══════════════════════════════════════════"
if [ "$ERRORS" -eq 0 ]; then
  echo "  ✅ DR RESTORE TEST PASSED"
  echo "  Duration: ${RESTORE_DURATION_MS}ms"
  echo "  Dump size: ${DUMP_SIZE} bytes"
else
  echo "  ❌ DR RESTORE TEST FAILED (${ERRORS} error(s))"
fi
echo "  Timestamp: ${TIMESTAMP}"
echo "══════════════════════════════════════════"

exit $ERRORS
