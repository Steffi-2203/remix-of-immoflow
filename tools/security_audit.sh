#!/usr/bin/env bash
# tools/security_audit.sh
# Automated security audit for the application.
# Checks RLS, RBAC, input validation, and compliance requirements.
#
# Usage: bash tools/security_audit.sh [DATABASE_URL]

set -euo pipefail

DATABASE_URL="${1:-${DATABASE_URL:?DATABASE_URL is required}}"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
REPORT_FILE="security_audit_report_$(date +%Y%m%d).md"

ERRORS=0
WARNINGS=0

log_pass() { echo "  ✅ $1"; }
log_fail() { echo "  ❌ $1"; ERRORS=$((ERRORS + 1)); }
log_warn() { echo "  ⚠️  $1"; WARNINGS=$((WARNINGS + 1)); }

echo "══════════════════════════════════════════"
echo "  Security & Compliance Audit"
echo "  ${TIMESTAMP}"
echo "══════════════════════════════════════════"

# ── 1. RLS Coverage ──
echo ""
echo "▸ 1. Row Level Security Coverage"

ALL_TABLES=$(psql "$DATABASE_URL" -t -A -c "
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE '_tmp_%'
  ORDER BY tablename;
")

RLS_MISSING=""
for tbl in $ALL_TABLES; do
  RLS=$(psql "$DATABASE_URL" -t -A -c "
    SELECT COALESCE(relrowsecurity::text, 'f') FROM pg_class
    WHERE relname = '${tbl}' AND relnamespace = 'public'::regnamespace;
  " 2>/dev/null || echo "f")
  if [ "$RLS" != "t" ]; then
    RLS_MISSING="$RLS_MISSING $tbl"
  fi
done

if [ -z "$RLS_MISSING" ]; then
  log_pass "RLS enabled on all public tables"
else
  log_warn "RLS not enabled on:$RLS_MISSING"
fi

# ── 2. Sensitive Tables with RLS ──
echo ""
echo "▸ 2. Security-Critical Tables"

CRITICAL_TABLES="audit_logs user_roles artifact_metadata artifact_access_log profiles"
for tbl in $CRITICAL_TABLES; do
  EXISTS=$(psql "$DATABASE_URL" -t -A -c "SELECT count(*) FROM pg_tables WHERE tablename='${tbl}' AND schemaname='public';" 2>/dev/null || echo "0")
  if [ "$EXISTS" = "0" ]; then
    log_fail "Critical table missing: ${tbl}"
    continue
  fi

  RLS=$(psql "$DATABASE_URL" -t -A -c "
    SELECT COALESCE(relrowsecurity::text, 'f') FROM pg_class
    WHERE relname = '${tbl}' AND relnamespace = 'public'::regnamespace;
  " 2>/dev/null || echo "f")

  POLICY_COUNT=$(psql "$DATABASE_URL" -t -A -c "
    SELECT count(*) FROM pg_policies WHERE tablename = '${tbl}' AND schemaname = 'public';
  " 2>/dev/null || echo "0")

  if [ "$RLS" = "t" ] && [ "$POLICY_COUNT" -gt 0 ]; then
    log_pass "${tbl}: RLS ✓, ${POLICY_COUNT} policies"
  elif [ "$RLS" = "t" ] && [ "$POLICY_COUNT" = "0" ]; then
    log_fail "${tbl}: RLS enabled but NO policies (blocks all access)"
  else
    log_fail "${tbl}: RLS not enabled"
  fi
done

# ── 3. Audit Log Immutability ──
echo ""
echo "▸ 3. Audit Log Immutability"

UPDATE_TRIGGER=$(psql "$DATABASE_URL" -t -A -c "
  SELECT count(*) FROM pg_trigger
  WHERE tgrelid = 'public.audit_logs'::regclass
    AND tgname LIKE '%prevent%update%';
" 2>/dev/null || echo "0")

DELETE_TRIGGER=$(psql "$DATABASE_URL" -t -A -c "
  SELECT count(*) FROM pg_trigger
  WHERE tgrelid = 'public.audit_logs'::regclass
    AND tgname LIKE '%prevent%delete%';
" 2>/dev/null || echo "0")

HASH_TRIGGER=$(psql "$DATABASE_URL" -t -A -c "
  SELECT count(*) FROM pg_trigger
  WHERE tgrelid = 'public.audit_logs'::regclass
    AND tgname LIKE '%hash%';
" 2>/dev/null || echo "0")

[ "$UPDATE_TRIGGER" -gt 0 ] && log_pass "Audit log UPDATE prevention trigger" || log_fail "Missing audit log UPDATE prevention trigger"
[ "$DELETE_TRIGGER" -gt 0 ] && log_pass "Audit log DELETE prevention trigger" || log_fail "Missing audit log DELETE prevention trigger"
[ "$HASH_TRIGGER" -gt 0 ] && log_pass "Audit log hash chain trigger" || log_fail "Missing audit log hash chain trigger"

# ── 4. RBAC Configuration ──
echo ""
echo "▸ 4. RBAC Role Configuration"

ROLES=$(psql "$DATABASE_URL" -t -A -c "
  SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder)
  FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'app_role';
" 2>/dev/null || echo "")

echo "  Configured roles: ${ROLES}"

for role in admin auditor ops; do
  EXISTS=$(psql "$DATABASE_URL" -t -A -c "
    SELECT count(*) FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = '${role}';
  " 2>/dev/null || echo "0")
  [ "$EXISTS" -gt 0 ] && log_pass "Role '${role}' exists" || log_fail "Role '${role}' missing"
done

# ── 5. Security Functions ──
echo ""
echo "▸ 5. Security Definer Functions"

SEC_FUNCS="has_role is_admin is_org_admin has_finance_access owns_property owns_tenant"
for fn in $SEC_FUNCS; do
  EXISTS=$(psql "$DATABASE_URL" -t -A -c "
    SELECT count(*) FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = '${fn}';
  " 2>/dev/null || echo "0")
  [ "$EXISTS" -gt 0 ] && log_pass "Function ${fn}() exists" || log_fail "Function ${fn}() missing"
done

# ── 6. Artifact Access Control ──
echo ""
echo "▸ 6. Artifact Access Control"

ARTIFACT_TABLE=$(psql "$DATABASE_URL" -t -A -c "SELECT count(*) FROM pg_tables WHERE tablename='artifact_access_log' AND schemaname='public';" 2>/dev/null || echo "0")
[ "$ARTIFACT_TABLE" -gt 0 ] && log_pass "artifact_access_log table exists" || log_fail "artifact_access_log table missing"

ARTIFACT_POLICIES=$(psql "$DATABASE_URL" -t -A -c "
  SELECT count(*) FROM pg_policies WHERE tablename = 'artifact_access_log' AND schemaname = 'public';
" 2>/dev/null || echo "0")
[ "$ARTIFACT_POLICIES" -gt 0 ] && log_pass "artifact_access_log has ${ARTIFACT_POLICIES} RLS policies" || log_fail "artifact_access_log has no RLS policies"

# ── 7. Encryption Configuration ──
echo ""
echo "▸ 7. Encryption & Storage"

ARTIFACTS_BUCKET=$(psql "$DATABASE_URL" -t -A -c "
  SELECT count(*) FROM storage.buckets WHERE id = 'artifacts' AND public = false;
" 2>/dev/null || echo "0")
[ "$ARTIFACTS_BUCKET" -gt 0 ] && log_pass "Artifacts storage bucket is private" || log_warn "Artifacts bucket missing or public"

# ── 8. Input Validation (code scan) ──
echo ""
echo "▸ 8. Input Validation (code patterns)"

# Check for zod usage in routes
ZOD_USAGE=$(grep -rc "\.parse\|\.safeParse\|insertSchema\|Schema" server/routes.ts 2>/dev/null || echo "0")
[ "$ZOD_USAGE" -gt 3 ] && log_pass "Zod validation found in routes (${ZOD_USAGE} usages)" || log_warn "Limited Zod validation in routes (${ZOD_USAGE} usages)"

# Check for SQL injection patterns
RAW_SQL=$(grep -rn "req\.body\.\|req\.query\.\|req\.params\." server/routes.ts 2>/dev/null | grep -c "sql\`.*\${" 2>/dev/null || echo "0")
echo "  Parameterized SQL queries with user input: ${RAW_SQL} (review manually)"

# Check for dangerouslySetInnerHTML
DANGEROUS=$(grep -rn "dangerouslySetInnerHTML" src/ 2>/dev/null | wc -l || echo "0")
[ "$DANGEROUS" = "0" ] && log_pass "No dangerouslySetInnerHTML usage" || log_warn "${DANGEROUS} dangerouslySetInnerHTML usage(s) — review for XSS"

# ── Summary ──
echo ""
echo "══════════════════════════════════════════"
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo "  ✅ SECURITY AUDIT PASSED"
elif [ "$ERRORS" -eq 0 ]; then
  echo "  ⚠️  AUDIT PASSED WITH ${WARNINGS} WARNING(S)"
else
  echo "  ❌ AUDIT FAILED: ${ERRORS} error(s), ${WARNINGS} warning(s)"
fi
echo "  Timestamp: ${TIMESTAMP}"
echo "══════════════════════════════════════════"

exit $ERRORS
