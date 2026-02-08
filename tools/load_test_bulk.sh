#!/usr/bin/env bash
set -euo pipefail

# Load test: generate properties, units, tenants, invoices for 1000+ units
# Usage: DATABASE_URL=... bash tools/load_test_bulk.sh [num_properties] [units_per_property]
# Column names match shared/schema.ts exactly

NUM_PROPERTIES=${1:-10}
UNITS_PER_PROPERTY=${2:-100}
TOTAL_UNITS=$((NUM_PROPERTIES * UNITS_PER_PROPERTY))

echo "=== ImmoflowMe Load Test ==="
echo "Properties: $NUM_PROPERTIES"
echo "Units per property: $UNITS_PER_PROPERTY"
echo "Total units: $TOTAL_UNITS"
echo ""

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

ORG_ID=$(psql "$DATABASE_URL" -tAc "SELECT id FROM organizations LIMIT 1")
if [ -z "$ORG_ID" ]; then
  echo "ERROR: No organization found"
  exit 1
fi
echo "Using organization: $ORG_ID"

START_TIME=$(date +%s)

for p in $(seq 1 $NUM_PROPERTIES); do
  PROP_NAME="Lasttest Liegenschaft $p"
  PROP_ID=$(psql "$DATABASE_URL" -tAc "
    INSERT INTO properties (id, organization_id, name, address, postal_code, city)
    VALUES (gen_random_uuid(), '$ORG_ID', '$PROP_NAME', 'Teststraße $p', '1${p}00', 'Wien')
    RETURNING id
  ")
  echo "Property $p: $PROP_ID"

  UNIT_SQL=""
  for u in $(seq 1 $UNITS_PER_PROPERTY); do
    TOP="Top $u"
    NW=$(echo "scale=2; 10 + $RANDOM % 90" | bc)
    FL=$(echo "scale=2; 30 + $RANDOM % 100" | bc)
    UNIT_SQL="$UNIT_SQL
      INSERT INTO units (id, property_id, top_nummer, nutzwert, flaeche, type, status)
      VALUES (gen_random_uuid(), '$PROP_ID', '$TOP', '$NW', '$FL', 'wohnung', 'aktiv');"
  done
  echo "$UNIT_SQL" | psql "$DATABASE_URL" -q

  UNIT_IDS=$(psql "$DATABASE_URL" -tAc "SELECT id FROM units WHERE property_id = '$PROP_ID'")
  
  TENANT_SQL=""
  for UNIT_ID in $UNIT_IDS; do
    MIETE=$(echo "scale=2; 300 + $RANDOM % 700" | bc)
    BK=$(echo "scale=2; 50 + $RANDOM % 150" | bc)
    HK=$(echo "scale=2; 20 + $RANDOM % 80" | bc)
    TENANT_SQL="$TENANT_SQL
      INSERT INTO tenants (id, unit_id, first_name, last_name, email, grundmiete, betriebskosten_vorschuss, heizungskosten_vorschuss, status, mietbeginn)
      VALUES (gen_random_uuid(), '$UNIT_ID', 'Test', 'Mieter-$RANDOM', 'test${RANDOM}@example.com', '$MIETE', '$BK', '$HK', 'aktiv', '2025-01-01');"
  done
  echo "$TENANT_SQL" | psql "$DATABASE_URL" -q
  echo "  Created $UNITS_PER_PROPERTY units + tenants"
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "=== Results ==="
echo "Duration: ${DURATION}s"
echo "Properties created: $NUM_PROPERTIES"
echo "Units created: $TOTAL_UNITS"
echo "Tenants created: $TOTAL_UNITS"
echo ""

echo "=== Acceptance Gates ==="
ACTUAL_UNITS=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM units WHERE property_id IN (SELECT id FROM properties WHERE name LIKE 'Lasttest%')")
ACTUAL_TENANTS=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM tenants WHERE unit_id IN (SELECT id FROM units WHERE property_id IN (SELECT id FROM properties WHERE name LIKE 'Lasttest%'))")

echo "Units: $ACTUAL_UNITS (expected: $TOTAL_UNITS)"
echo "Tenants: $ACTUAL_TENANTS (expected: $TOTAL_UNITS)"

if [ "$ACTUAL_UNITS" -ge "$TOTAL_UNITS" ] && [ "$ACTUAL_TENANTS" -ge "$TOTAL_UNITS" ]; then
  echo "PASS: All acceptance gates met"
else
  echo "FAIL: Data count mismatch"
  exit 1
fi

echo ""
echo "=== API Response Time Test ==="
echo "Test pagination on /api/units (requires running server)..."
echo "(Run manually: curl -s -w '%{time_total}' 'http://localhost:5000/api/units?page=1&limit=50')"
