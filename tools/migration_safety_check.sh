#!/usr/bin/env bash
# tools/migration_safety_check.sh
#
# Validates that pending DB migrations follow backward/forward compatible patterns.
# Checks for destructive operations that should be split into separate deploys.
#
# Usage: ./tools/migration_safety_check.sh [migrations_dir]

set -euo pipefail

MIGRATIONS_DIR="${1:-migrations}"
ERRORS=0
WARNINGS=0

echo "═══════════════════════════════════════════════"
echo "  DB Migration Safety Check"
echo "  Directory: $MIGRATIONS_DIR"
echo "═══════════════════════════════════════════════"
echo ""

# Find SQL migration files
MIGRATION_FILES=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f 2>/dev/null | sort)

if [ -z "$MIGRATION_FILES" ]; then
  echo "No SQL migration files found in $MIGRATIONS_DIR"
  exit 0
fi

for FILE in $MIGRATION_FILES; do
  BASENAME=$(basename "$FILE")
  ISSUES=""

  # ── Rule 1: DROP TABLE is destructive ──
  if grep -qiE '^\s*DROP\s+TABLE' "$FILE"; then
    ISSUES="${ISSUES}\n  ❌ DROP TABLE detected — must be in a separate deploy after all code references are removed"
    ERRORS=$((ERRORS + 1))
  fi

  # ── Rule 2: DROP COLUMN is destructive ──
  if grep -qiE 'ALTER\s+TABLE.*DROP\s+COLUMN' "$FILE"; then
    ISSUES="${ISSUES}\n  ❌ DROP COLUMN detected — must be a separate deploy (step 1: stop reading, step 2: drop)"
    ERRORS=$((ERRORS + 1))
  fi

  # ── Rule 3: NOT NULL without DEFAULT ──
  if grep -qiE 'ADD\s+COLUMN.*NOT\s+NULL' "$FILE" && ! grep -qiE 'ADD\s+COLUMN.*DEFAULT' "$FILE"; then
    ISSUES="${ISSUES}\n  ❌ ADD COLUMN NOT NULL without DEFAULT — will fail on existing rows"
    ERRORS=$((ERRORS + 1))
  fi

  # ── Rule 4: RENAME COLUMN (breaks old code) ──
  if grep -qiE 'RENAME\s+COLUMN' "$FILE"; then
    ISSUES="${ISSUES}\n  ⚠️  RENAME COLUMN detected — ensure old code handles both names during transition"
    WARNINGS=$((WARNINGS + 1))
  fi

  # ── Rule 5: RENAME TABLE ──
  if grep -qiE 'ALTER\s+TABLE.*RENAME\s+TO' "$FILE"; then
    ISSUES="${ISSUES}\n  ⚠️  RENAME TABLE detected — use a view as alias during transition"
    WARNINGS=$((WARNINGS + 1))
  fi

  # ── Rule 6: ALTER COLUMN TYPE (may lock table) ──
  if grep -qiE 'ALTER\s+COLUMN.*TYPE' "$FILE"; then
    ISSUES="${ISSUES}\n  ⚠️  ALTER COLUMN TYPE — may acquire ACCESS EXCLUSIVE lock on large tables"
    WARNINGS=$((WARNINGS + 1))
  fi

  # ── Rule 7: CREATE INDEX without CONCURRENTLY ──
  if grep -qiE '^\s*CREATE\s+INDEX\s' "$FILE" && ! grep -qiE 'CREATE\s+INDEX\s+CONCURRENTLY' "$FILE"; then
    ISSUES="${ISSUES}\n  ⚠️  CREATE INDEX without CONCURRENTLY — will lock table for writes"
    WARNINGS=$((WARNINGS + 1))
  fi

  # ── Rule 8: LOCK TABLE explicit ──
  if grep -qiE '^\s*LOCK\s+TABLE' "$FILE"; then
    ISSUES="${ISSUES}\n  ⚠️  Explicit LOCK TABLE — verify timeout and necessity"
    WARNINGS=$((WARNINGS + 1))
  fi

  # ── Rule 9: TRUNCATE (data loss) ──
  if grep -qiE '^\s*TRUNCATE' "$FILE"; then
    ISSUES="${ISSUES}\n  ❌ TRUNCATE detected — potential data loss, requires explicit approval"
    ERRORS=$((ERRORS + 1))
  fi

  # ── Rule 10: Change column constraint from NULL to NOT NULL ──
  if grep -qiE 'ALTER\s+COLUMN.*SET\s+NOT\s+NULL' "$FILE"; then
    ISSUES="${ISSUES}\n  ⚠️  SET NOT NULL — ensure all existing rows have values first"
    WARNINGS=$((WARNINGS + 1))
  fi

  if [ -n "$ISSUES" ]; then
    echo "📄 $BASENAME"
    echo -e "$ISSUES"
    echo ""
  fi
done

echo "═══════════════════════════════════════════════"
echo "  Results: $ERRORS errors, $WARNINGS warnings"
echo "═══════════════════════════════════════════════"

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "::error::Migration safety check found $ERRORS destructive patterns."
  echo ""
  echo "Recommended pattern for destructive changes:"
  echo "  Deploy 1: Add new column/table (backward compatible)"
  echo "  Deploy 2: Migrate code to use new column/table"
  echo "  Deploy 3: Backfill data if needed"
  echo "  Deploy 4: Remove old column/table"
  exit 1
fi

echo "✅ All migrations follow safe patterns"
