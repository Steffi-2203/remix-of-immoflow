

## Problem: Load Test bricht nach 32 Sekunden ab

### Ursache
Der `batch_upsert.js` generiert synthetische UUIDs (z.B. `00000000-0000-0000-0000-000000001000`) fuer `invoice_id` und `unit_id`. In der CI-Datenbank existieren diese Datensaetze aber nicht. Wenn `invoice_lines` Foreign Keys auf `invoices` und `units` hat, schlaegt das INSERT mit einem FK-Constraint-Fehler fehl, und `set -euo pipefail` bricht das Shell-Script sofort ab.

Zusaetzlich fehlt ein `timeout-minutes` im CI-Job, was bei echten Laenglaeufen zu GitHub-Defaults (6h) fuehrt.

### Loesung

**1. Seed-Daten vor dem Load Test einfuegen**

Im CI-Job einen neuen Step **vor** dem Load Test einfuegen, der die benoetigten `invoices` und `units` Dummy-Datensaetze anlegt:

```sql
-- Erzeuge 5000 Dummy-Invoices
INSERT INTO invoices (id, ...)
SELECT '00000000-0000-0000-0000-' || lpad((1000 + g)::text, 12, '0'), ...
FROM generate_series(0, 4999) g
ON CONFLICT DO NOTHING;

-- Erzeuge 100 Dummy-Units
INSERT INTO units (id, ...)
SELECT '00000000-0000-0000-0000-' || lpad((2000 + g)::text, 12, '0'), ...
FROM generate_series(0, 99) g
ON CONFLICT DO NOTHING;
```

**2. Timeout und Error-Handling im CI-Job**

- `timeout-minutes: 15` zum `load-test` Job hinzufuegen
- Im `load_test_bulk.sh` das `set -e` durch besseres Error-Handling ersetzen, damit Teilergebnisse sichtbar bleiben

**3. batch_upsert.js robuster machen**

- Bessere Fehlermeldung bei FK-Violations ausgeben statt nur "ROLLED BACK"
- Optional: `--skip-fk-check` Flag oder `SET session_replication_role = 'replica'` fuer Tests

### Aenderungen im Detail

| Datei | Aenderung |
|---|---|
| `.github/workflows/ci.yml` | `timeout-minutes: 15` zum load-test Job; neuer Step "Seed test data" vor "Run load test" |
| `tools/load_test_bulk.sh` | Fehlerbehandlung verbessern; CSV-Meta-Feld fixen (escaped quotes) |
| `tools/batch_upsert.js` | Bessere Fehlerausgabe bei FK-Constraint-Fehlern |

### Technische Details

Die CSV-Generierung in `load_test_bulk.sh` hat auch ein Quoting-Problem bei der `meta`-Spalte (einfache Anfuehrungszeichen statt korrekte JSON-Escaping), was ebenfalls zu Parse-Fehlern fuehren kann. Das wird mitkorrigiert.

