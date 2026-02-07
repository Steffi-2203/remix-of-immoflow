#!/usr/bin/env bash
set -euo pipefail

YEAR="${1:-$(date +%Y)}"
MONTH="${2:-$(date +%-m)}"
MODE="${3:---dry-run}"
TMP_DIR="tmp"

mkdir -p "$TMP_DIR"

echo "=== ImmoflowMe Vorschreibungs-Audit ==="
echo "Periode: ${YEAR}-$(printf '%02d' $MONTH)"
echo "Modus: ${MODE}"
echo ""

DRYRUN_FILE="${TMP_DIR}/dryrun_${YEAR}_$(printf '%02d' $MONTH).json"
DB_FILE="${TMP_DIR}/db_lines_${YEAR}_$(printf '%02d' $MONTH).json"
MISSING_FILE="${TMP_DIR}/missing_lines_${YEAR}_$(printf '%02d' $MONTH).json"

echo "--- Schritt 1: Dry-Run erzeugen ---"
npx tsx scripts/dryrun.ts --year="$YEAR" --month="$MONTH" --output="$DRYRUN_FILE"
echo ""

RUN_ID=$(node -e "const d=require('./${DRYRUN_FILE}'); console.log(d.runId || '')")

if [ -z "$RUN_ID" ]; then
  echo "FEHLER: Kein runId im Dry-Run gefunden."
  exit 1
fi

echo "--- Schritt 2: DB Lines exportieren ---"
node tools/export_db_lines.js "$RUN_ID" --out="$DB_FILE" || true
echo ""

echo "--- Schritt 3: Fehlende Zeilen finden ---"
node tools/find_missing_lines.js "$DRYRUN_FILE" "$DB_FILE"
echo ""

if [ -f missing_lines.json ]; then
  cp missing_lines.json "$MISSING_FILE"
fi

MISSING_COUNT=$(node -e "try{const d=require('./${MISSING_FILE}');console.log(d.length)}catch(e){console.log(0)}")

if [ "$MISSING_COUNT" -eq 0 ]; then
  echo "Keine fehlenden Zeilen gefunden. Alles vollständig."
  exit 0
fi

echo "--- Schritt 4: Upsert fehlende Zeilen (${MODE}) ---"
if [ "$MODE" = "--persist" ]; then
  echo "ACHTUNG: Schreibe ${MISSING_COUNT} Zeilen in die Datenbank..."
  node tools/upsert_missing_lines.js "$MISSING_FILE"
else
  echo "Vorschau (${MISSING_COUNT} Zeilen):"
  node tools/upsert_missing_lines.js "$MISSING_FILE" --dry-run
fi

echo ""
echo "=== Fertig ==="
