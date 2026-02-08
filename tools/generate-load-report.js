#!/usr/bin/env node
/**
 * generate-load-report.js
 *
 * Reads metrics.json files from load test artifacts and populates
 * docs/LOAD_TEST_REPORT.md with actual measured values.
 *
 * Usage:
 *   node tools/generate-load-report.js [artifacts_dir]
 *
 * The artifacts_dir should contain subdirectories like S1-10k/, S2-50k/, S3-100k/
 * each with a metrics.json file.
 */

const fs = require('fs');
const path = require('path');

const artifactsDir = process.argv[2] || 'load_tests';
const reportPath = 'docs/LOAD_TEST_REPORT.md';

function loadMetrics(dir) {
  const scenarios = {};
  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }

  for (const entry of fs.readdirSync(dir)) {
    const metricsFile = path.join(dir, entry, 'metrics.json');
    if (fs.existsSync(metricsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(metricsFile, 'utf-8'));
        scenarios[data.scenario || entry] = data;
      } catch (e) {
        console.warn(`Skipping ${metricsFile}: ${e.message}`);
      }
    }
  }

  return scenarios;
}

function formatRow(label, m) {
  if (!m) return `| ${label} | — | — | — | — | — | — | — | no data |`;
  return `| ${label} | ${m.duration_s ?? '—'} | ${m.inserted ?? '—'} | ${m.updated ?? '—'} | ${m.duplicates ?? '—'} | ${m.wal_mb ?? '—'} | ${m.work_mem ?? '—'} | ${m.max_connections ?? '—'} | ${m.parallel ?? 1} parallel |`;
}

function generateReport(scenarios) {
  const s1 = scenarios['S1-10k'];
  const s2 = scenarios['S2-50k'];
  const s3 = scenarios['S3-100k'];
  const pgVersion = s1?.pg_version || s2?.pg_version || s3?.pg_version || '<unknown>';
  const timestamp = new Date().toISOString().split('T')[0];

  return `# Load Test Report & Tuning Recommendations

> **Status**: ${Object.keys(scenarios).length > 0 ? 'Completed' : 'Template — fill metrics after running tests'}
> **Date**: ${timestamp}
> **Author**: CI Pipeline (automated)

---

## Test Summary

### Test Runs

| Scenario | Rows | Parallel Jobs | Description |
|----------|-----:|:-------------:|-------------|
| S1 | 10,000 | 1 | Baseline single-threaded |
| S2 | 50,000 | 1 | Medium load single-threaded |
| S3 | 100,000 | 4 × 25k | Parallel ingest stress test |

### Environment

- **Postgres version**: ${pgVersion}
- **Runner**: GitHub Actions ubuntu-latest
- **Tools**: \`tools/batch_upsert.js\`, \`tools/load_test_bulk.sh\`

---

## Measured Metrics

| Scenario | Duration (s) | Inserted | Updated | Conflicts | WAL MB | work_mem | max_connections | Notes |
|---|---:|---:|---:|---:|---:|---:|---:|---|
${formatRow('S1 10k', s1)}
${formatRow('S2 50k', s2)}
${formatRow('S3 100k (4×25k)', s3)}

---

## Tuning Baseline

| Parameter | S1 (10k) | S2 (50k) | S3 (100k) |
|-----------|----------|----------|-----------|
| \`batch_size\` | 10,000 | 10,000 | 10,000 |
| \`work_mem\` | 16 MB | 32 MB | 64 MB |
| \`max_wal_size\` | 2 GB | 2 GB | 4 GB |
| \`parallel_jobs\` | 1 | 1 | 4 |
| \`checkpoint_timeout\` | 5 min | 15 min | 30 min |

---

## Observed Bottlenecks & Symptoms

| Symptom | Likely Cause | Mitigation |
|---------|-------------|------------|
| WAL throughput spike during COPY | Large batch overwhelming checkpointer | Increase \`max_wal_size\`, stagger batches |
| Short lock waits during upsert CTE | Row-level conflicts on unique index | Reduce \`batch_size\`, increase \`work_mem\` |
| CPU bound on runner during CSV parse | Node.js single-threaded CSV parsing | Use streaming, larger runner, or split files |
| Long checkpoint duration | Too many dirty pages | Increase \`checkpoint_timeout\` for bulk windows |

---

## Recommended Postgres Tuning

| Parameter | Default | Recommended (8 GB RAM) | Bulk Window Override |
|-----------|---------|----------------------|---------------------|
| \`shared_buffers\` | 128 MB | **2 GB** (25% RAM) | — |
| \`work_mem\` | 4 MB | **16 MB** | **64 MB** per worker |
| \`max_wal_size\` | 1 GB | **2 GB** | **4 GB** |
| \`checkpoint_timeout\` | 5 min | **15 min** | **30 min** |
| \`max_parallel_workers_per_gather\` | 2 | **2–4** | — |
| \`effective_cache_size\` | 4 GB | **6 GB** (75% RAM) | — |

### Applying Temporarily (no restart)

\`\`\`sql
-- For the current bulk window session
SET work_mem = '64MB';
SET maintenance_work_mem = '256MB';

-- Server-wide (reload, no restart)
ALTER SYSTEM SET max_wal_size = '4GB';
SELECT pg_reload_conf();
\`\`\`

---

## Batch Tuning Knobs (Application Side)

| Knob | Default | Range | When to Adjust |
|------|---------|-------|----------------|
| \`--batch-size\` | 10,000 | 2k–50k | Reduce if WAL/locks high; increase if IO is fast |
| \`--parallel\` | 1 | 1–8 | Watch DB CPU and WAL; diminishing returns >4 |
| COPY vs INSERT | COPY | — | Always use COPY for bulk; never per-row INSERT |
| \`--dry-run\` | false | — | Always dry-run first on production |

### Decision Matrix

\`\`\`
IF duration > 60s per 10k rows:
  → Check pg_locks, reduce batch_size
  → Check work_mem, increase to 32–64MB

IF conflicts > 5% of rows:
  → Run duplicate precheck first
  → Verify normalization trigger is active

IF WAL > 500MB per 50k rows:
  → Increase max_wal_size
  → Stagger parallel jobs (add sleep between)
\`\`\`

---

## Run Commands

\`\`\`bash
# Via GitHub Actions (recommended)
# Go to Actions → "Billing Parity & Release" → Run workflow
# Set run_load_test: true — all three scenarios run automatically via matrix

# Local execution
bash tools/load_test_bulk.sh 10000 1 "$STAGING_DATABASE_URL"   # S1
bash tools/load_test_bulk.sh 50000 1 "$STAGING_DATABASE_URL"   # S2
bash tools/load_test_bulk.sh 100000 4 "$STAGING_DATABASE_URL"  # S3
\`\`\`

---

## Post-Run Verification

\`\`\`bash
# 1) Generate report from artifacts
node tools/generate-load-report.js load_tests/

# 2) Duplicate precheck (must be 0)
psql "$STAGING_DATABASE_URL" -c "
  SELECT COUNT(*) FROM (
    SELECT invoice_id, unit_id, line_type,
           regexp_replace(lower(trim(description)), '\\s+', ' ', 'g') AS norm
    FROM invoice_lines
    GROUP BY 1, 2, 3, norm
    HAVING COUNT(*) > 1
  ) sub;
"

# 3) Audit trail verification
psql "$STAGING_DATABASE_URL" -c "
  SELECT (new_data->>'run_id') AS run_id,
         SUM(CASE WHEN new_data->>'operation' = 'insert' THEN 1 ELSE 0 END) AS inserted,
         SUM(CASE WHEN new_data->>'operation' = 'update' THEN 1 ELSE 0 END) AS updated
  FROM audit_logs
  WHERE action = 'upsert_missing_lines'
    AND created_at >= now() - interval '1 hour'
  GROUP BY 1;
"
\`\`\`

---

## Cleanup (after testing)

\`\`\`sql
DELETE FROM invoice_lines
WHERE id IN (
  SELECT record_id::uuid FROM audit_logs
  WHERE action = 'upsert_missing_lines'
    AND new_data->>'run_id' LIKE 'load-test-%'
);

ALTER SYSTEM RESET max_wal_size;
SELECT pg_reload_conf();
\`\`\`
`;
}

// Main
const scenarios = loadMetrics(artifactsDir);
console.log(`Found ${Object.keys(scenarios).length} scenario(s): ${Object.keys(scenarios).join(', ')}`);

const report = generateReport(scenarios);
fs.writeFileSync(reportPath, report);
console.log(`Report written to ${reportPath}`);
