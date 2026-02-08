#!/usr/bin/env bash

set -euo pipefail

TS=$(date +%Y%m%dT%H%M%S)
OUT="ci/reports/validation-${TS}.md"
mkdir -p ci/reports

echo "# Validation Report ${TS}" > "$OUT"
echo "## Environment" >> "$OUT"
echo "- STAGING_DATABASE_URL: ${STAGING_DATABASE_URL:-<unset>}" >> "$OUT"
echo "- REDIS_HOST: ${REDIS_HOST:-127.0.0.1}" >> "$OUT"
echo "" >> "$OUT"

# 1 Smoke E2E
echo "## Smoke E2E" >> "$OUT"
RUN_ID="smoke-${TS}"
echo "Running smoke with RUN_ID=${RUN_ID}" >> "$OUT"
set +e
node tools/export_audit_package.js --run-id "$RUN_ID" --out "tmp/audit/$RUN_ID" --storage local
bash tools/load_test_bulk.sh 1000 1 "${STAGING_DATABASE_URL}"
node tools/batch_upsert.js --run-id "$RUN_ID" --database-url "${STAGING_DATABASE_URL}" --csv "tmp/audit/${RUN_ID}/missing_lines.csv"
PSQL="psql ${STAGING_DATABASE_URL} -t -A -c"
RECONCILE_STATUS=$($PSQL "SELECT status||'|'||coalesce(inserted::text,'0')||'|'||coalesce(updated::text,'0') FROM reconcile_runs WHERE run_id='${RUN_ID}' LIMIT 1" 2>&1)
AUDIT_COUNT=$($PSQL "SELECT count(*) FROM audit_logs WHERE new_data->>'run_id'='${RUN_ID}'" 2>&1)
echo "- reconcile_runs: ${RECONCILE_STATUS}" >> "$OUT"
echo "- audit_logs_count: ${AUDIT_COUNT}" >> "$OUT"
set -e

# 2 Load tests
echo "## Load Tests" >> "$OUT"
for SCEN in "10000:1" "50000:1" "100000:4"; do
  IFS=":" read -r ROWS PAR <<< "$SCEN"
  echo "### Scenario ${ROWS} rows, ${PAR} parallel" >> "$OUT"
  START=$(date +%s)
  bash tools/load_test_bulk.sh "$ROWS" "$PAR" "${STAGING_DATABASE_URL}" 2>&1 | tee /tmp/load_${ROWS}.log
  END=$(date +%s)
  DURATION=$((END-START))
  echo "- duration_seconds: ${DURATION}" >> "$OUT"
  # collect WAL size and lock snapshot
  WAL_SIZE=$($PSQL "SELECT pg_size_pretty(pg_database_size(current_database()));")
  echo "- db_size: ${WAL_SIZE}" >> "$OUT"
done

# 3 Worker smoke
echo "## Worker Smoke" >> "$OUT"
docker run -d --name validate_redis -p 6379:6379 redis:7 >/dev/null
node server/workers/sepa-worker.js & sleep 1
node scripts/enqueue-test-job.js --type sepa --payload '{"batchId":"validate-'"${TS}"'","payments":[{"creditorName":"ACME","iban":"DE89370400440532013000","amount":"10.00"}]}' 2>&1 | tee /tmp/enq.log
sleep 5
SEPA_ROW=$($PSQL "SELECT status FROM sepa_batches WHERE batch_id='validate-${TS}' LIMIT 1" 2>&1)
echo "- sepa_batch_status: ${SEPA_ROW}" >> "$OUT"
docker rm -f validate_redis >/dev/null || true

# 4 Security scans
echo "## Security Scans" >> "$OUT"
npm audit --json > /tmp/npm-audit.json || true
NPM_CRITICAL=$(jq '.metadata.vulnerabilities.critical' /tmp/npm-audit.json)
echo "- npm_critical_vulns: ${NPM_CRITICAL}" >> "$OUT"
gitleaks detect --source . --report-path /tmp/gitleaks.json || true
GITLEAKS_COUNT=$(jq '.summary.findings' /tmp/gitleaks.json 2>/dev/null || echo "0")
echo "- gitleaks_findings: ${GITLEAKS_COUNT}" >> "$OUT"

# 5 Password protection check (if AUTH_URL set)
if [ -n "${AUTH_URL:-}" ]; then
  echo "## Auth Password Protection" >> "$OUT"
  node tools/check_password_protection.js > /tmp/pwcheck.out 2>&1 || true
  cat /tmp/pwcheck.out >> "$OUT"
else
  echo "## Auth Password Protection" >> "$OUT"
  echo "- AUTH_URL not set; manual check required" >> "$OUT"
fi

# 6 DR restore test (optional)
if [ -n "${RESTORE_DB_URL:-}" ] && [ -n "${LATEST_BACKUP:-}" ]; then
  echo "## DR Restore Test" >> "$OUT"
  bash tools/dr/restore_test.sh --backup "${LATEST_BACKUP}" --target-db "${RESTORE_DB_URL}" 2>&1 | tee /tmp/dr.log
  echo "- dr_log: /tmp/dr.log" >> "$OUT"
else
  echo "## DR Restore Test" >> "$OUT"
  echo "- RESTORE_DB_URL or LATEST_BACKUP not set; skip" >> "$OUT"
fi

echo "" >> "$OUT"
echo "Validation finished. See ${OUT}"
