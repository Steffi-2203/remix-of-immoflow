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
 * each with a metrics.json file. Also accepts flat RUN_ID dirs with scenario tags.
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
        const key = data.scenario || entry;
        // Keep the latest run per scenario
        if (!scenarios[key] || new Date(data.timestamp) > new Date(scenarios[key].timestamp)) {
          scenarios[key] = data;
        }
      } catch (e) {
        console.warn(`Skipping ${metricsFile}: ${e.message}`);
      }
    }
  }

  return scenarios;
}

function fmtNum(v, fallback = '—') {
  if (v == null || v === undefined) return fallback;
  if (typeof v === 'number') return v.toLocaleString('de-DE');
  return String(v);
}

function formatMetricsRow(label, m) {
  if (!m) return `| ${label} | — | — | — | — | — | — | — | — | no data |`;
  const settings = m.pg_settings || {};
  return [
    `| ${label}`,
    `${fmtNum(m.duration_s)}`,
    `${fmtNum(m.inserted)}`,
    `${fmtNum(m.conflict_count)}`,
    `${m.conflict_rate != null ? (m.conflict_rate * 100).toFixed(1) + '%' : '—'}`,
    `${fmtNum(m.rows_per_second)}`,
    `${fmtNum(m.wal_mb)}`,
    `${fmtNum(m.max_lock_wait_ms)}`,
    `${fmtNum(m.lock_blocking_events)}`,
    `${m.parallel || 1}p, work_mem=${settings.work_mem || '?'} |`,
  ].join(' | ');
}

function slaStatus(m, slaSeconds) {
  if (!m) return '⬜ No data';
  if (m.duration_s <= slaSeconds) return `✅ ${m.duration_s}s ≤ ${slaSeconds}s`;
  return `❌ ${m.duration_s}s > ${slaSeconds}s`;
}

function lockStatus(m) {
  if (!m) return '⬜ No data';
  if (m.max_lock_wait_ms <= 30000) return `✅ ${m.max_lock_wait_ms}ms ≤ 30s`;
  return `❌ ${m.max_lock_wait_ms}ms > 30s`;
}

function generateReport(scenarios) {
  const s1 = scenarios['S1-10k'];
  const s2 = scenarios['S2-50k'];
  const s3 = scenarios['S3-100k'];
  const pgVersion = s1?.pg_version || s2?.pg_version || s3?.pg_version || '<unknown>';
  const timestamp = new Date().toISOString().split('T')[0];
  const hasData = Object.keys(scenarios).length > 0;
  const anySettings = s1?.pg_settings || s2?.pg_settings || s3?.pg_settings || {};

  return `# Load Test Report & Capacity Plan

> **Status**: ${hasData ? '✅ Completed' : '⬜ Template — fill metrics after running tests'}
> **Date**: ${timestamp}
> **Author**: CI Pipeline (automated)
> **Postgres**: ${pgVersion}

---

## Acceptance Criteria

| Criterion | Threshold | S1 (10k) | S2 (50k) | S3 (100k) |
|-----------|-----------|----------|----------|-----------|
| Duration ≤ SLA | 100k < 30 min | ${slaStatus(s1, 1800)} | ${slaStatus(s2, 1800)} | ${slaStatus(s3, 1800)} |
| Max lock wait | ≤ 30s on OLTP | ${lockStatus(s1)} | ${lockStatus(s2)} | ${lockStatus(s3)} |
| Zero duplicates | 0 groups | ${s1 ? (s1.duplicates === 0 ? '✅' : '❌ ' + s1.duplicates) : '⬜'} | ${s2 ? (s2.duplicates === 0 ? '✅' : '❌ ' + s2.duplicates) : '⬜'} | ${s3 ? (s3.duplicates === 0 ? '✅' : '❌ ' + s3.duplicates) : '⬜'} |
| Conflict rate | < 10% | ${s1 ? ((s1.conflict_rate || 0) < 0.1 ? '✅' : '⚠️') + ' ' + ((s1.conflict_rate || 0) * 100).toFixed(1) + '%' : '⬜'} | ${s2 ? ((s2.conflict_rate || 0) < 0.1 ? '✅' : '⚠️') + ' ' + ((s2.conflict_rate || 0) * 100).toFixed(1) + '%' : '⬜'} | ${s3 ? ((s3.conflict_rate || 0) < 0.1 ? '✅' : '⚠️') + ' ' + ((s3.conflict_rate || 0) * 100).toFixed(1) + '%' : '⬜'} |

---

## Measured Metrics

| Scenario | Duration (s) | Inserted | Conflicts | Conflict % | Rows/s | WAL MB | Max Lock (ms) | Lock Blocks | Notes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
${formatMetricsRow('S1 10k', s1)}
${formatMetricsRow('S2 50k', s2)}
${formatMetricsRow('S3 100k (4×25k)', s3)}

---

## PostgreSQL Settings (captured during run)

| Parameter | Value (from run) | Recommended Baseline | Bulk Window Override |
|-----------|-----------------|---------------------|---------------------|
| \`work_mem\` | ${anySettings.work_mem || '—'} | **16 MB** | **64 MB** per worker |
| \`max_wal_size\` | ${anySettings.max_wal_size || '—'} | **2 GB** | **4 GB** |
| \`maintenance_work_mem\` | ${anySettings.maintenance_work_mem || '—'} | **256 MB** | **512 MB** |
| \`shared_buffers\` | ${anySettings.shared_buffers || '—'} | **2 GB** (25% RAM) | — |
| \`max_connections\` | ${anySettings.max_connections || '—'} | **100+** | — |
| \`checkpoint_timeout\` | 5 min (default) | **15 min** | **30 min** |

### Final Tuning Recommendations

| Parameter | S1 (10k) | S2 (50k) | S3 (100k) | Rationale |
|-----------|----------|----------|-----------|-----------|
| \`batch_size\` | 10,000 | 10,000 | 10,000 | Sweet spot for CTE upsert + audit |
| \`work_mem\` | 16 MB | 32 MB | 64 MB | Sort/hash in upsert CTE |
| \`max_wal_size\` | 2 GB | 2 GB | 4 GB | Prevent forced checkpoints during bulk |
| \`maintenance_work_mem\` | 128 MB | 256 MB | 512 MB | Index maintenance after bulk |
| \`parallel_jobs\` | 1 | 1 | 4 | Diminishing returns >4 |
| \`checkpoint_timeout\` | 5 min | 15 min | 30 min | Reduce checkpoint I/O during bulk window |

### Applying for Bulk Window

\`\`\`sql
-- Per-session (no restart required)
SET work_mem = '64MB';
SET maintenance_work_mem = '512MB';

-- Server-wide (reload, no restart)
ALTER SYSTEM SET max_wal_size = '4GB';
ALTER SYSTEM SET checkpoint_timeout = '30min';
SELECT pg_reload_conf();

-- After bulk window: reset
ALTER SYSTEM RESET max_wal_size;
ALTER SYSTEM RESET checkpoint_timeout;
SELECT pg_reload_conf();
\`\`\`

---

## Decision Matrix

\`\`\`
IF duration > 60s per 10k rows:
  → Increase work_mem to 32–64 MB
  → Check pg_locks (see locks.log artifact)
  → Reduce batch_size to 5000

IF max_lock_wait > 30s:
  → Reduce parallel_jobs
  → Stagger batches with sleep
  → Check for concurrent DDL or VACUUM

IF conflicts > 5% of rows:
  → Run duplicate precheck first
  → Verify normalization trigger is active
  → Check ON CONFLICT key correctness

IF WAL > 500 MB per 50k rows:
  → Increase max_wal_size to 4 GB
  → Increase checkpoint_timeout
  → Stagger parallel jobs
\`\`\`

---

## Run Commands

\`\`\`bash
# Via GitHub Actions (recommended)
# Go to Actions → "Billing Parity & Release" → Run workflow
# Set run_load_test: true — S1/S2/S3 run automatically via matrix

# Local execution
bash tools/load_test_bulk.sh 10000  1 "$STAGING_DATABASE_URL" S1-10k
bash tools/load_test_bulk.sh 50000  1 "$STAGING_DATABASE_URL" S2-50k
bash tools/load_test_bulk.sh 100000 4 "$STAGING_DATABASE_URL" S3-100k

# Generate report from results
node tools/generate-load-report.js load_tests/
\`\`\`

---

## Artifacts per Run

Each run produces in \`load_tests/<RUN_ID>/\`:

| File | Description |
|------|-------------|
| \`metrics.json\` | All measured values, settings, acceptance results |
| \`locks.log\` | Lock profiling snapshots (2s intervals) on invoice_lines |
| \`bgwriter_before.json\` | Checkpoint stats baseline |
| \`bgwriter_after.json\` | Checkpoint stats after run |
| \`data.csv\` | Generated test data |

---

## Post-Run Verification

\`\`\`bash
# 1) Generate report
node tools/generate-load-report.js load_tests/

# 2) Duplicate check (must be 0)
psql "$STAGING_DATABASE_URL" -c "
  SELECT COUNT(*) FROM (
    SELECT invoice_id, unit_id, line_type,
           regexp_replace(lower(trim(description)), '\\s+', ' ', 'g') AS norm
    FROM invoice_lines
    GROUP BY 1, 2, 3, norm
    HAVING COUNT(*) > 1
  ) sub;
"

# 3) Audit trail
psql "$STAGING_DATABASE_URL" -c "
  SELECT (new_data->>'run_id') AS run_id,
         count(*) AS audit_entries
  FROM audit_logs
  WHERE action = 'invoice_line_upsert'
    AND created_at >= now() - interval '1 hour'
  GROUP BY 1;
"
\`\`\`

---

## Cleanup

\`\`\`sql
-- Remove test data
DELETE FROM invoice_lines
WHERE id IN (
  SELECT record_id::uuid FROM audit_logs
  WHERE action = 'invoice_line_upsert'
    AND new_data->>'run_id' LIKE 'load-test-%'
);

-- Reset tuning
ALTER SYSTEM RESET max_wal_size;
ALTER SYSTEM RESET checkpoint_timeout;
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
