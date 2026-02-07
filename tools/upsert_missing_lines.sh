#!/usr/bin/env bash
set -euo pipefail

TMP_DIR="tmp"
mkdir -p "$TMP_DIR"

usage() {
  echo "Usage:"
  echo "  Vollständiger Audit-Workflow:"
  echo "    $0 YEAR MONTH [--persist]"
  echo "    Beispiel: $0 2026 9 --persist"
  echo ""
  echo "  Direkt-Upsert aus CSV/JSON:"
  echo "    $0 <datei.csv|datei.json> [RUN_ID] [--persist]"
  echo "    Beispiel: $0 missing_lines.csv 88030ba3-... --persist"
  echo ""
  echo "  Standard: --dry-run (Vorschau ohne DB-Änderungen)"
  exit 1
}

if [ $# -lt 1 ]; then
  usage
fi

is_file_input() {
  [[ "$1" == *.csv || "$1" == *.json ]] && [ -f "$1" ]
}

if is_file_input "${1:-}"; then
  INPUT_FILE="$1"
  RUN_ID="${2:-}"
  MODE="${3:---dry-run}"

  echo "=== ImmoflowMe Direkt-Upsert ==="
  echo "Datei: ${INPUT_FILE}"
  [ -n "$RUN_ID" ] && echo "RunId: ${RUN_ID}"
  echo "Modus: ${MODE}"
  echo ""

  UPSERT_ARGS=""
  if [[ "$INPUT_FILE" == *.csv ]]; then
    UPSERT_ARGS="--csv=${INPUT_FILE}"
  else
    UPSERT_ARGS="--json=${INPUT_FILE}"
  fi

  [ -n "$RUN_ID" ] && UPSERT_ARGS="${UPSERT_ARGS} --run-id=${RUN_ID}"

  if [ "$MODE" = "--persist" ]; then
    LINES=$(wc -l < "$INPUT_FILE")
    echo "ACHTUNG: Schreibe ~${LINES} Zeilen in die Datenbank..."
    node tools/upsert_missing_lines.js ${UPSERT_ARGS}
  else
    echo "Vorschau:"
    node tools/upsert_missing_lines.js ${UPSERT_ARGS} --dry-run
  fi

  echo ""
  echo "=== Fertig ==="
  exit 0
fi

YEAR="${1:-$(date +%Y)}"
MONTH="${2:-$(date +%-m)}"
MODE="${3:---dry-run}"

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
node tools/find_missing_lines.js "$DRYRUN_FILE" "$DB_FILE" --out="$MISSING_FILE"
echo ""

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
