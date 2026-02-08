#!/usr/bin/env bash
set -uo pipefail

# Usage: ./tools/load_test_bulk.sh <rows> <parallel_jobs> <DATABASE_URL> [scenario_tag]
#
# Outputs:
#   load_tests/<RUN_ID>/metrics.json   — structured results
#   load_tests/<RUN_ID>/locks.log      — lock snapshot during run
#   load_tests/<RUN_ID>/pg_stat_io.log — I/O stats delta
#   exit code 0 if acceptance criteria pass, 1 otherwise

ROWS=${1:-10000}
PARALLEL=${2:-1}
DATABASE_URL=${3:-$STAGING_DATABASE_URL}
SCENARIO_TAG=${4:-"custom-${ROWS}"}

# SLA: 100k rows within 30 minutes = 1800 seconds
SLA_SECONDS=1800

RUN_ID=$(node -e "console.log(require('crypto').randomUUID())")
OUTDIR="load_tests/${RUN_ID}"
mkdir -p "$OUTDIR"

echo "════════════════════════════════════════════════════"
echo "  Load Test: rows=$ROWS parallel=$PARALLEL"
echo "  Scenario:  $SCENARIO_TAG"
echo "  Run ID:    $RUN_ID"
echo "════════════════════════════════════════════════════"

# ── 0) Capture baseline DB settings & WAL position ──
echo "Capturing baseline..."
WAL_BEFORE=$(psql "$DATABASE_URL" -t -A -c "SELECT pg_current_wal_lsn();" 2>/dev/null || echo "0/0")
WORK_MEM=$(psql "$DATABASE_URL" -t -A -c "SHOW work_mem;" 2>/dev/null || echo "unknown")
MAX_WAL_SIZE=$(psql "$DATABASE_URL" -t -A -c "SHOW max_wal_size;" 2>/dev/null || echo "unknown")
MAINT_WORK_MEM=$(psql "$DATABASE_URL" -t -A -c "SHOW maintenance_work_mem;" 2>/dev/null || echo "unknown")
MAX_CONN=$(psql "$DATABASE_URL" -t -A -c "SHOW max_connections;" 2>/dev/null || echo "unknown")
SHARED_BUF=$(psql "$DATABASE_URL" -t -A -c "SHOW shared_buffers;" 2>/dev/null || echo "unknown")
PG_VERSION=$(psql "$DATABASE_URL" -t -A -c "SELECT version();" 2>/dev/null || echo "unknown")

# Capture pg_stat_bgwriter baseline for checkpoint analysis
psql "$DATABASE_URL" -t -A -c "
  SELECT json_build_object(
    'checkpoints_timed', checkpoints_timed,
    'checkpoints_req', checkpoints_req,
    'buffers_checkpoint', buffers_checkpoint,
    'buffers_backend', buffers_backend,
    'maxwritten_clean', maxwritten_clean
  ) FROM pg_stat_bgwriter;
" > "$OUTDIR/bgwriter_before.json" 2>/dev/null || echo '{}' > "$OUTDIR/bgwriter_before.json"

# ── 1) Generate realistic CSV ──
CSV="$OUTDIR/data.csv"
node -e "
const fs = require('fs');
const crypto = require('crypto');
const rows = ${ROWS};
const out = '${CSV}';
const w = fs.createWriteStream(out);
w.write('invoice_id,unit_id,line_type,description,amount,tax_rate,meta\n');

const lineTypes = ['grundmiete', 'betriebskosten', 'heizkosten', 'wasserkosten', 'sonstige'];
const descriptions = {
  grundmiete: ['Nettomiete Jänner', 'Nettomiete Februar', 'Nettomiete März', 'Nettomiete April', 'Nettomiete Mai', 'Nettomiete Juni', 'Nettomiete Juli', 'Nettomiete August', 'Nettomiete September', 'Nettomiete Oktober', 'Nettomiete November', 'Nettomiete Dezember'],
  betriebskosten: ['BK-Vorschuss'],
  heizkosten: ['HK-Vorschuss'],
  wasserkosten: ['Wasserkosten-Vorschuss'],
  sonstige: ['Lift', 'Garten', 'Schneeräumung', 'Müllabfuhr']
};
const taxRates = { grundmiete: 10, betriebskosten: 10, heizkosten: 20, wasserkosten: 10, sonstige: 20 };
const amountRanges = { grundmiete: [300, 2500], betriebskosten: [50, 400], heizkosten: [30, 250], wasserkosten: [10, 80], sonstige: [5, 150] };

// Generate realistic property/unit/invoice hierarchy
const numProperties = Math.max(5, Math.floor(rows / 200));
const unitsPerProperty = Math.max(3, Math.floor(rows / numProperties / 4));

for (let i = 0; i < rows; i++) {
  const propIdx = i % numProperties;
  const unitIdx = Math.floor(i / numProperties) % unitsPerProperty;
  const month = (Math.floor(i / (numProperties * unitsPerProperty)) % 12) + 1;
  
  const invoice = crypto.createHash('md5').update('inv-' + propIdx + '-' + unitIdx + '-' + month).digest('hex');
  const invoiceUuid = [invoice.slice(0,8), invoice.slice(8,12), '4' + invoice.slice(13,16), '8' + invoice.slice(17,20), invoice.slice(20,32)].join('-');
  
  const unitHash = crypto.createHash('md5').update('unit-' + propIdx + '-' + unitIdx).digest('hex');
  const unitUuid = [unitHash.slice(0,8), unitHash.slice(8,12), '4' + unitHash.slice(13,16), '8' + unitHash.slice(17,20), unitHash.slice(20,32)].join('-');
  
  const lt = lineTypes[i % lineTypes.length];
  const descList = descriptions[lt];
  const desc = descList[month % descList.length] + ' 2025';
  const [minAmt, maxAmt] = amountRanges[lt];
  const amount = (minAmt + Math.random() * (maxAmt - minAmt)).toFixed(2);
  const tax = taxRates[lt];
  const meta = JSON.stringify({ reference: lt === 'grundmiete' ? 'MRG §15' : 'MRG §21', run: '${RUN_ID}' });
  
  w.write(invoiceUuid + ',' + unitUuid + ',' + lt + ',\"' + desc + '\",' + amount + ',' + tax + ',\"' + meta.replace(/\"/g, '\"\"') + '\"\\n');
}
w.end();
console.log('CSV generated:', out, '(' + rows + ' rows, ' + numProperties + ' properties, ' + unitsPerProperty + ' units/prop)');
"

# ── 2) Start lock profiler in background ──
echo "Starting lock profiler..."
(
  LOCK_LOG="$OUTDIR/locks.log"
  echo "timestamp,relation,mode,granted,count,max_wait_ms" > "$LOCK_LOG"
  while true; do
    psql "$DATABASE_URL" -t -A -F',' -c "
      SELECT now(),
             COALESCE(relation::regclass::text, 'none'),
             mode,
             granted,
             count(*),
             COALESCE(EXTRACT(EPOCH FROM max(now() - pg_stat_activity.query_start)) * 1000, 0)::int
      FROM pg_locks
      LEFT JOIN pg_stat_activity USING (pid)
      WHERE relation IS NOT NULL
        AND relation::regclass::text LIKE '%invoice_lines%'
      GROUP BY 1, 2, 3, 4
      ORDER BY 5 DESC;
    " >> "$LOCK_LOG" 2>/dev/null
    sleep 2
  done
) &
LOCK_PID=$!

# ── 3) Run batch_upsert ──
START=$(date +%s%3N)

if [ "$PARALLEL" -le 1 ]; then
  node tools/batch_upsert.js --csv "$CSV" --run-id "$RUN_ID" --database-url "$DATABASE_URL" --batch-size 10000
else
  # Split CSV into N parts (excluding header)
  tail -n +2 "$CSV" | split -l $(( (ROWS + PARALLEL - 1) / PARALLEL )) - "$OUTDIR/part_"

  for f in "$OUTDIR"/part_*; do
    ( echo "invoice_id,unit_id,line_type,description,amount,tax_rate,meta"; cat "$f" ) > "${f}.csv"
  done

  # Run parallel jobs
  ls "$OUTDIR"/part_*.csv | xargs -n1 -P"$PARALLEL" -I{} \
    bash -c "node tools/batch_upsert.js --csv '{}' --run-id '$RUN_ID' --database-url '$DATABASE_URL' --batch-size 10000"
fi

END=$(date +%s%3N)
DURATION_MS=$((END - START))
DURATION_S=$(echo "scale=2; $DURATION_MS / 1000" | bc)

# ── 4) Stop lock profiler ──
kill $LOCK_PID 2>/dev/null || true
wait $LOCK_PID 2>/dev/null || true

# ── 5) Collect post-run metrics ──
echo "Collecting post-run metrics..."

WAL_AFTER=$(psql "$DATABASE_URL" -t -A -c "SELECT pg_current_wal_lsn();" 2>/dev/null || echo "0/0")
WAL_BYTES=$(psql "$DATABASE_URL" -t -A -c "SELECT pg_wal_lsn_diff('${WAL_AFTER}', '${WAL_BEFORE}');" 2>/dev/null || echo "0")
WAL_MB=$(echo "scale=2; ${WAL_BYTES:-0} / 1048576" | bc 2>/dev/null || echo "0")

INSERTED=$(psql "$DATABASE_URL" -t -A -c "SELECT count(*) FROM invoice_lines WHERE created_at >= now() - interval '30 min';" 2>/dev/null || echo "0")

DUPES=$(psql "$DATABASE_URL" -t -A -c "
  SELECT count(*) FROM (
    SELECT invoice_id, unit_id, line_type,
           regexp_replace(lower(trim(description)), '\s+', ' ', 'g') AS norm
    FROM invoice_lines
    GROUP BY invoice_id, unit_id, line_type, norm
    HAVING count(*) > 1
  ) sub;
" 2>/dev/null || echo "0")

# Lock analysis: max wait and total blocking events
MAX_LOCK_WAIT_MS=0
LOCK_EVENTS=0
if [ -f "$OUTDIR/locks.log" ]; then
  MAX_LOCK_WAIT_MS=$(tail -n +2 "$OUTDIR/locks.log" | awk -F',' '{if($6+0 > max) max=$6+0} END{print max+0}')
  LOCK_EVENTS=$(tail -n +2 "$OUTDIR/locks.log" | grep -c "false" || echo "0")
fi

# Checkpoint delta
psql "$DATABASE_URL" -t -A -c "
  SELECT json_build_object(
    'checkpoints_timed', checkpoints_timed,
    'checkpoints_req', checkpoints_req,
    'buffers_checkpoint', buffers_checkpoint,
    'buffers_backend', buffers_backend,
    'maxwritten_clean', maxwritten_clean
  ) FROM pg_stat_bgwriter;
" > "$OUTDIR/bgwriter_after.json" 2>/dev/null || echo '{}' > "$OUTDIR/bgwriter_after.json"

# Rows per second
RPS=0
if [ "$DURATION_S" != "0" ] && [ "$DURATION_S" != ".00" ]; then
  RPS=$(echo "scale=1; ${INSERTED:-0} / $DURATION_S" | bc 2>/dev/null || echo "0")
fi

CONFLICT_COUNT=$((ROWS - ${INSERTED:-0}))
if [ $CONFLICT_COUNT -lt 0 ]; then CONFLICT_COUNT=0; fi
CONFLICT_RATE=$(echo "scale=4; $CONFLICT_COUNT / $ROWS" | bc 2>/dev/null || echo "0")

# ── 6) Write metrics.json ──
cat > "$OUTDIR/metrics.json" <<EOF
{
  "scenario": "${SCENARIO_TAG}",
  "run_id": "${RUN_ID}",
  "rows": ${ROWS},
  "parallel": ${PARALLEL},
  "batch_size": 10000,
  "duration_ms": ${DURATION_MS},
  "duration_s": ${DURATION_S},
  "inserted": ${INSERTED:-0},
  "conflict_count": ${CONFLICT_COUNT},
  "conflict_rate": ${CONFLICT_RATE},
  "duplicates": ${DUPES:-0},
  "rows_per_second": ${RPS},
  "wal_mb": ${WAL_MB},
  "max_lock_wait_ms": ${MAX_LOCK_WAIT_MS},
  "lock_blocking_events": ${LOCK_EVENTS},
  "pg_settings": {
    "work_mem": "${WORK_MEM}",
    "max_wal_size": "${MAX_WAL_SIZE}",
    "maintenance_work_mem": "${MAINT_WORK_MEM}",
    "max_connections": "${MAX_CONN}",
    "shared_buffers": "${SHARED_BUF}"
  },
  "pg_version": "${PG_VERSION}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "commit": "${GITHUB_SHA:-local}"
}
EOF

# ── 7) Print summary ──
echo ""
echo "════════════════════════════════════════════════════"
echo "  RESULTS: $SCENARIO_TAG"
echo "════════════════════════════════════════════════════"
echo "  Duration:       ${DURATION_S}s (${DURATION_MS}ms)"
echo "  Rows inserted:  ${INSERTED:-0} / $ROWS"
echo "  Conflicts:      $CONFLICT_COUNT (${CONFLICT_RATE})"
echo "  Duplicates:     ${DUPES:-0}"
echo "  Throughput:     ${RPS} rows/s"
echo "  WAL generated:  ${WAL_MB} MB"
echo "  Max lock wait:  ${MAX_LOCK_WAIT_MS}ms"
echo "  Lock blocks:    ${LOCK_EVENTS}"
echo "  Settings:       work_mem=$WORK_MEM  max_wal_size=$MAX_WAL_SIZE  maintenance_work_mem=$MAINT_WORK_MEM"
echo "════════════════════════════════════════════════════"

# ── 8) Acceptance gate ──
PASS=true

# Gate 1: Duration SLA
if [ "$DURATION_S" != "" ]; then
  OVER=$(echo "$DURATION_S > $SLA_SECONDS" | bc 2>/dev/null || echo "0")
  if [ "$OVER" = "1" ]; then
    echo "❌ FAIL: Duration ${DURATION_S}s exceeds SLA ${SLA_SECONDS}s"
    PASS=false
  else
    echo "✅ PASS: Duration ${DURATION_S}s within SLA ${SLA_SECONDS}s"
  fi
fi

# Gate 2: No locks > 30s on OLTP tables
if [ "$MAX_LOCK_WAIT_MS" -gt 30000 ] 2>/dev/null; then
  echo "❌ FAIL: Max lock wait ${MAX_LOCK_WAIT_MS}ms exceeds 30s threshold"
  PASS=false
else
  echo "✅ PASS: Max lock wait ${MAX_LOCK_WAIT_MS}ms within 30s threshold"
fi

# Gate 3: Zero post-run duplicates
if [ "${DUPES:-0}" -gt 0 ]; then
  echo "❌ FAIL: ${DUPES} duplicate groups found"
  PASS=false
else
  echo "✅ PASS: Zero duplicates"
fi

# Gate 4: Conflict rate < 10%
CONFLICT_HIGH=$(echo "$CONFLICT_RATE > 0.10" | bc 2>/dev/null || echo "0")
if [ "$CONFLICT_HIGH" = "1" ]; then
  echo "⚠️  WARN: Conflict rate ${CONFLICT_RATE} exceeds 10% threshold"
fi

echo ""
echo "Results in $OUTDIR"

if [ "$PASS" = "false" ]; then
  echo "::error::Load test acceptance criteria FAILED"
  exit 1
else
  echo "✅ All acceptance criteria passed"
  exit 0
fi
