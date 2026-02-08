# Billing Reconciliation — Operator Runbook

> **Audience**: DevOps / Database Operators  
> **Last updated**: 2026-02-08  
> **Related CI job**: `.github/workflows/ci.yml` → `billing-parity`

---

## 1. Pre-Deploy Checklist

### 1.1 Database Backup

```bash
# Full logical backup (schema + data)
pg_dump "$PRODUCTION_DATABASE_URL" \
  --format=custom \
  --file="backup_$(date +%Y%m%d_%H%M%S).dump" \
  --verbose

# Verify backup is readable
pg_restore --list "backup_*.dump" | head -20
```

**Expected**: No errors, file size > 0.

### 1.2 Duplicate Precheck

Run **before** any migration or upsert to ensure no collisions exist:

```sql
SELECT invoice_id, unit_id, line_type,
       regexp_replace(lower(trim(description)), '\s+', ' ', 'g') AS normalized,
       COUNT(*) AS cnt,
       array_agg(id ORDER BY created_at DESC) AS ids
FROM invoice_lines
GROUP BY invoice_id, unit_id, line_type, normalized
HAVING COUNT(*) > 1;
```

**Expected output**: Empty result set (0 rows).  
**If duplicates found**: See [§5.1 Troubleshooting — Duplicate Groups](#51-duplicate-groups).

### 1.3 Staging Dry-Run

```bash
export STAGING_DATABASE_URL="postgres://user:pass@staging-host:5432/staging_db"

# Run parity harness
npx tsx scripts/dryrun.ts 2>&1 | tee dryrun.log

# Validate artifacts
./tools/validate-artifacts.sh reconciliations/<RUN_ID>
```

**Expected**: `Artifact validation passed`, `missing_lines_count: 0`.

---

## 2. Migration & Index Creation

### 2.1 Run Schema Migrations

```bash
NODE_ENV=production node migrations/run-migration.cjs
```

### 2.2 Create Indexes

> ⚠️ **IMPORTANT**: Use `CONCURRENTLY` on production to avoid table locks.  
> `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block.

```sql
-- Unique dedup index (supports the ON CONFLICT clause)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  idx_invoice_lines_dedup
  ON invoice_lines (
    invoice_id, unit_id, line_type, normalized_description
  );

-- Performance index for settlement queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_invoice_lines_unit_month
  ON invoice_lines (unit_id, invoice_id);
```

**Verify**:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'invoice_lines'
ORDER BY indexname;
```

**Expected**: Both indexes listed with `valid = true`.

```sql
-- Check for invalid indexes (failed CONCURRENTLY builds)
SELECT indexrelid::regclass, indisvalid
FROM pg_index
WHERE NOT indisvalid;
```

**Expected**: Empty result set.

---

## 3. Running `batch_upsert.js`

### 3.1 Basic Usage

```bash
node tools/batch_upsert.js \
  --csv reconciliations/<RUN_ID>/missing_lines.csv \
  --run-id "manual-20260208-fix42" \
  --database-url "$PRODUCTION_DATABASE_URL"
```

### 3.2 With Custom Batch Size

```bash
node tools/batch_upsert.js \
  --csv missing_lines.csv \
  --run-id "batch-large-portfolio" \
  --database-url "$PRODUCTION_DATABASE_URL" \
  --batch-size 10000
```

### 3.3 Dry-Run Mode

```bash
node tools/batch_upsert.js \
  --csv missing_lines.csv \
  --run-id "dryrun-check" \
  --database-url "$PRODUCTION_DATABASE_URL" \
  --dry-run
```

### 3.4 Expected Output

```
[batch_upsert] Loading CSV: missing_lines.csv
[batch_upsert] COPY streamed 128 rows into tmp_invoice_lines
[batch_upsert] Upsert complete: 120 inserted, 8 updated (1243ms)
[batch_upsert] Audit logs written for run_id=manual-20260208-fix42
[batch_upsert] Done.
```

### 3.5 CLI Flags Reference

| Flag             | Required | Default | Description                          |
|------------------|----------|---------|--------------------------------------|
| `--csv`          | Yes      | —       | Path to CSV with missing lines       |
| `--run-id`       | Yes      | —       | Unique identifier for audit trail    |
| `--database-url` | Yes      | —       | PostgreSQL connection string         |
| `--batch-size`   | No       | 50000   | Rows per COPY batch                  |
| `--dry-run`      | No       | false   | Run in transaction, then ROLLBACK    |

---

## 4. Post-Upsert Verification

### 4.1 Verify Row Counts

```sql
SELECT COUNT(*) AS total_lines FROM invoice_lines;

-- Verify no new duplicates were introduced
SELECT COUNT(*) FROM (
  SELECT invoice_id, unit_id, line_type,
         normalized_description
  FROM invoice_lines
  GROUP BY 1, 2, 3, 4
  HAVING COUNT(*) > 1
) sub;
-- Expected: 0
```

### 4.2 Verify Audit Trail

```sql
SELECT action,
       (new_data->>'operation') AS op,
       (new_data->>'run_id') AS run_id,
       COUNT(*) AS cnt
FROM audit_logs
WHERE action = 'upsert_missing_lines'
  AND new_data->>'run_id' = 'manual-20260208-fix42'
GROUP BY 1, 2, 3;
```

**Expected**:

```
 action               | op     | run_id                  | cnt
----------------------+--------+-------------------------+-----
 upsert_missing_lines | insert | manual-20260208-fix42   | 120
 upsert_missing_lines | update | manual-20260208-fix42   |   8
```

---

## 5. Troubleshooting

### 5.1 Duplicate Groups

**Symptom**: Precheck query returns rows.

**Resolution**:

```sql
-- Inspect the duplicates
SELECT * FROM invoice_lines
WHERE id = ANY(ARRAY['<id1>', '<id2>'])
ORDER BY created_at;

-- Keep the newest, delete the rest
DELETE FROM invoice_lines
WHERE id IN (
  SELECT unnest(ids[2:])  -- all except first (newest)
  FROM (
    SELECT array_agg(id ORDER BY created_at DESC) AS ids
    FROM invoice_lines
    GROUP BY invoice_id, unit_id, line_type, normalized_description
    HAVING COUNT(*) > 1
  ) sub
);
```

Re-run the precheck to confirm 0 duplicates before proceeding.

### 5.2 Long-Running COPY

**Symptom**: COPY hangs or takes >60s for <10k rows.

**Check**:

```sql
-- Look for blocking locks
SELECT pid, wait_event_type, wait_event, query
FROM pg_stat_activity
WHERE state = 'active' AND query ILIKE '%tmp_invoice_lines%';

-- Check for table-level locks
SELECT relation::regclass, mode, granted
FROM pg_locks
WHERE relation = 'invoice_lines'::regclass;
```

**Resolution**: Cancel the blocking query (`SELECT pg_cancel_backend(<pid>)`) or wait for it to complete. Retry the upsert.

### 5.3 Partial Failure / Rollback by Script

**Symptom**: Script exits with error, reports ROLLBACK.

The script is fully transactional — a failure means **zero rows were committed**. Safe to retry:

```bash
# Re-run with same parameters
node tools/batch_upsert.js \
  --csv missing_lines.csv \
  --run-id "retry-20260208-fix42" \
  --database-url "$PRODUCTION_DATABASE_URL"
```

> Use a **new run-id** for the retry to keep audit trail distinct.

### 5.4 Audit Hash Chain Verification

```sql
-- Verify the last 100 audit entries have valid hash chain
SELECT id, hash, previous_hash,
       LAG(hash) OVER (ORDER BY created_at) AS expected_previous
FROM audit_logs
ORDER BY created_at DESC
LIMIT 100;

-- Any row where previous_hash ≠ expected_previous indicates tampering
```

---

## 6. Rollback

### 6.1 Full Database Restore

```bash
# 1) Stop application connections
# (e.g. scale down, enable maintenance mode)

# 2) Restore from backup
pg_restore \
  --dbname="$PRODUCTION_DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --verbose \
  "backup_20260208_140000.dump"

# 3) Verify restore
psql "$PRODUCTION_DATABASE_URL" -c "SELECT COUNT(*) FROM invoice_lines;"
```

### 6.2 Selective Rollback (Undo a Specific Run)

```sql
-- Delete only lines inserted by a specific run
DELETE FROM invoice_lines
WHERE id IN (
  SELECT record_id::uuid
  FROM audit_logs
  WHERE action = 'upsert_missing_lines'
    AND new_data->>'run_id' = 'manual-20260208-fix42'
    AND new_data->>'operation' = 'insert'
);

-- For updated lines: restore old values from audit old_data
-- (manual review required per case)
```

### 6.3 Stakeholder Notification

After any rollback, notify:

| Channel          | Who                        | Template                                                       |
|------------------|----------------------------|----------------------------------------------------------------|
| Slack `#ops`     | Engineering & DevOps       | `🔴 Rollback executed for run <RUN_ID>. Reason: <reason>`     |
| Email            | Product Owner / Finance    | `Billing reconciliation rolled back. No invoices affected.`   |
| Audit Log        | Compliance                 | Automatic via `audit_logs` DELETE entries                      |

---

## Appendix: Quick Reference

```bash
# Full pipeline in one go
pg_dump "$PROD_DB" -Fc -f pre_upsert.dump          # backup
psql "$PROD_DB" -f tools/duplicate_precheck.sql     # precheck
node tools/batch_upsert.js --csv X --run-id Y --database-url "$PROD_DB"
./tools/validate-artifacts.sh reconciliations/Y     # validate
```
