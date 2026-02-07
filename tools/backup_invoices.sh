#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-tmp/backups}"
LABEL="${2:-manual}"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
DUMP_FILE="${BACKUP_DIR}/pre_upsert_${LABEL}_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "=== Backup: monthly_invoices + invoice_lines ==="
echo "Ziel: ${DUMP_FILE}"

pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --table=monthly_invoices \
  --table=invoice_lines \
  --file="$DUMP_FILE"

SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "Backup erstellt: ${DUMP_FILE} (${SIZE})"
echo ""
echo "Restore-Befehl:"
echo "  pg_restore -d \"\$DATABASE_URL\" --clean --if-exists ${DUMP_FILE}"
echo ""

ROWS_MI=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM monthly_invoices" 2>/dev/null | tr -d ' ')
ROWS_IL=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM invoice_lines" 2>/dev/null | tr -d ' ')
echo "Gesichert: ${ROWS_MI} Rechnungen, ${ROWS_IL} Rechnungszeilen"
