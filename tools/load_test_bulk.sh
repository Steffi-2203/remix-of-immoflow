#!/usr/bin/env bash
set -uo pipefail

# Usage: ./tools/load_test_bulk.sh <rows> <parallel_jobs> <DATABASE_URL>

ROWS=${1:-10000}
PARALLEL=${2:-1}
DATABASE_URL=${3:-$STAGING_DATABASE_URL}

RUN_ID=$(uuidgen)
OUTDIR="load_tests/${RUN_ID}"
mkdir -p "$OUTDIR"

echo "Load test: rows=$ROWS parallel=$PARALLEL run=$RUN_ID"

# 1) Generate CSV
CSV="$OUTDIR/data.csv"
node -e "
const fs = require('fs');
const rows = ${ROWS};
const out = '${CSV}';
const w = fs.createWriteStream(out);
w.write('invoice_id,unit_id,line_type,description,amount,tax_rate,meta\n');
for (let i = 0; i < rows; i++) {
  const invoice = '00000000-0000-0000-0000-' + (1000 + Math.floor(i / 10)).toString().padStart(12, '0');
  const unit = '00000000-0000-0000-0000-' + (2000 + (i % 100)).toString().padStart(12, '0');
  const lineType = 'rent';
  const desc = 'Test line ' + i;
  const amount = (Math.random() * 1000).toFixed(2);
  const tax = 0;
  const meta = '{}';
  w.write(invoice + ',' + unit + ',' + lineType + ',\"' + desc + '\",' + amount + ',' + tax + ',\"' + meta + '\"\\n');
}
w.end();
console.log('CSV generated', out);
"

# 2) Run batch_upsert in parallel
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
DURATION=$((END - START))

echo "Total duration ms: $DURATION"

# 3) Collect DB stats
psql "$DATABASE_URL" -c "SELECT count(*) FROM invoice_lines WHERE created_at >= now() - interval '1 hour';"
psql "$DATABASE_URL" -c "SELECT sum((new_data->>'new_amount')::numeric) FROM audit_logs WHERE (new_data->>'run_id') = '$RUN_ID';"

echo "Results in $OUTDIR"
