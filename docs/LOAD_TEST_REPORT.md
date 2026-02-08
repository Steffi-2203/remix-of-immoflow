# Load Test Report & Tuning Recommendations

> **Status**: Template — fill metrics after running tests  
> **Date**: 2026-02-08  
> **Author**: Ops Team

---

## Test Summary

### Test Runs

| Scenario | Rows | Parallel Jobs | Description |
|----------|-----:|:-------------:|-------------|
| S1 | 10,000 | 1 | Baseline single-threaded |
| S2 | 50,000 | 1 | Medium load single-threaded |
| S3 | 100,000 | 4 × 25k | Parallel ingest stress test |
| S4 | 50,000 | 1 | Index maintenance concurrency (+ `CREATE INDEX CONCURRENTLY` on other table) |

### Environment

- **Postgres version**: `<replace after pg_version query>`
- **Staging DB host**: `$STAGING_DATABASE_URL`
- **Runner**: t3.large equivalent, Node 18
- **Tools**: `tools/batch_upsert.js`, `tools/load_test_bulk.sh`

---

## Measured Metrics (fill after runs)

| Scenario | Duration (s) | Inserted | Updated | Conflicts | WAL MB | max_work_mem | max_connections | Notes |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| S1 10k | | | | | | | | |
| S2 50k | | | | | | | | |
| S3 100k (4×25k) | | | | | | | | |
| S4 index concurrency | | | | | | | | |

### How to Collect Metrics

```sql
-- WAL usage (run before and after, diff)
SELECT pg_current_wal_lsn();

-- Current settings
SHOW shared_buffers;
SHOW work_mem;
SHOW max_wal_size;
SHOW max_connections;

-- Active locks during run
SELECT relation::regclass, mode, granted, COUNT(*)
FROM pg_locks
WHERE relation IS NOT NULL
GROUP BY 1, 2, 3
ORDER BY 4 DESC;
```

---

## Observed Bottlenecks & Symptoms

| Symptom | Likely Cause | Mitigation |
|---------|-------------|------------|
| WAL throughput spike during COPY | Large batch overwhelming checkpointer | Increase `max_wal_size`, stagger batches |
| Short lock waits during upsert CTE | Row-level conflicts on unique index | Reduce `batch_size`, increase `work_mem` |
| CPU bound on runner during CSV parse | Node.js single-threaded CSV parsing | Use streaming, larger runner, or split files |
| Long checkpoint duration | Too many dirty pages | Increase `checkpoint_timeout` for bulk windows |

---

## Recommended Postgres Tuning

### Starting Points

| Parameter | Default | Recommended (8GB RAM) | Bulk Window Override | Notes |
|-----------|---------|----------------------|---------------------|-------|
| `shared_buffers` | 128MB | **2GB** (25% RAM) | — | Restart required |
| `work_mem` | 4MB | **16MB** | **64MB** per worker | Per-sort/hash operation |
| `max_wal_size` | 1GB | **2GB** | **4GB** | For large bulk runs |
| `checkpoint_timeout` | 5min | **15min** | **30min** | Monitor checkpoint warnings |
| `max_parallel_workers_per_gather` | 2 | **2–4** | — | Test with `EXPLAIN ANALYZE` |
| `max_connections` | 100 | **100+** | — | Use connection pooler for parallel |
| `effective_cache_size` | 4GB | **6GB** (75% RAM) | — | Planner hint only |

### Applying Temporarily (no restart)

```sql
-- For the current bulk window session
SET work_mem = '64MB';
SET maintenance_work_mem = '256MB';

-- Server-wide (reload, no restart)
ALTER SYSTEM SET max_wal_size = '4GB';
SELECT pg_reload_conf();
```

---

## Batch Tuning Knobs (Application Side)

| Knob | Default | Range | When to Adjust |
|------|---------|-------|----------------|
| `--batch-size` | 10,000 | 2k–50k | Reduce if WAL/locks high; increase if IO is fast |
| `--parallel` (load_test) | 1 | 1–8 | Watch DB CPU and WAL; diminishing returns >4 |
| COPY vs INSERT | COPY | — | Always use COPY for bulk; never per-row INSERT |
| `--dry-run` | false | — | Always dry-run first on production |

### Decision Matrix

```
IF duration > 60s per 10k rows:
  → Check pg_locks, reduce batch_size
  → Check work_mem, increase to 32–64MB

IF conflicts > 5% of rows:
  → Run duplicate precheck first
  → Verify normalization trigger is active

IF WAL > 500MB per 50k rows:
  → Increase max_wal_size
  → Stagger parallel jobs (add sleep between)
```

---

## Run Commands

```bash
# S1: Baseline 10k
bash tools/load_test_bulk.sh 10000 1 "$STAGING_DATABASE_URL"

# S2: Medium 50k
bash tools/load_test_bulk.sh 50000 1 "$STAGING_DATABASE_URL"

# S3: Parallel 100k (4 workers × 25k)
bash tools/load_test_bulk.sh 100000 4 "$STAGING_DATABASE_URL"

# S4: Run S2 while creating index on another table
bash tools/load_test_bulk.sh 50000 1 "$STAGING_DATABASE_URL" &
psql "$STAGING_DATABASE_URL" -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_concurrent ON payments (tenant_id, eingangs_datum);"
wait
```

---

## Post-Run Verification

```bash
# 1) Duplicate precheck (must be 0)
psql "$STAGING_DATABASE_URL" -c "
  SELECT COUNT(*) FROM (
    SELECT invoice_id, unit_id, line_type,
           regexp_replace(lower(trim(description)), '\s+', ' ', 'g') AS norm
    FROM invoice_lines
    GROUP BY 1, 2, 3, norm
    HAVING COUNT(*) > 1
  ) sub;
"

# 2) Audit trail verification
psql "$STAGING_DATABASE_URL" -c "
  SELECT (new_data->>'run_id') AS run_id,
         SUM(CASE WHEN new_data->>'operation' = 'insert' THEN 1 ELSE 0 END) AS inserted,
         SUM(CASE WHEN new_data->>'operation' = 'update' THEN 1 ELSE 0 END) AS updated
  FROM audit_logs
  WHERE action = 'upsert_missing_lines'
    AND created_at >= now() - interval '1 hour'
  GROUP BY 1;
"

# 3) Validate artifacts
./tools/validate-artifacts.sh load_tests/<RUN_ID>
```

---

## Cleanup (after testing)

```sql
-- Remove test data (use the run_id from audit logs)
DELETE FROM invoice_lines
WHERE id IN (
  SELECT record_id::uuid FROM audit_logs
  WHERE action = 'upsert_missing_lines'
    AND new_data->>'run_id' LIKE 'load-test-%'
);

-- Reset WAL tuning if changed
ALTER SYSTEM RESET max_wal_size;
SELECT pg_reload_conf();
```
