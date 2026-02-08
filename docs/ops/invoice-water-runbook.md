# Wasserkosten Runbook

## Zweck

Beschreibt wie Wasserkosten berechnet, getestet und historisch nachgerechnet werden.

## Architektur

Die Wasserkosten-Verteilung nutzt die `water_readings`-Tabelle mit gewichtetem Verbrauch (`consumption * coefficient`). Die Berechnung erfolgt über `SettlementService.calculateWaterCostShares()` im Settlement-Kontext, während monatliche Vorschüsse über den konfigurierbaren `lineType` `wasserkosten` in `vatConfig.ts` abgebildet werden.

## Voraussetzungen

- `water_readings`-Tabelle migriert (mit RLS-Policies für `organization_id`)
- Zählerstandsdaten in `water_readings` erfasst
- Wasserkosten als `expenses` mit `category = 'wasser'` und `ist_umlagefaehig = true` gebucht

## Dry-Run Backfill

```bash
node scripts/backfill/run_water_backfill.js --year 2025 --dry-run
```

Optional auf eine Liegenschaft beschränken:

```bash
node scripts/backfill/run_water_backfill.js --year 2025 --property-id <uuid> --dry-run
```

## Backfill ausführen

Nach Review der Dry-Run-Ausgabe:

```bash
node scripts/backfill/run_water_backfill.js --year 2025 --execute
```

Das Skript fügt idempotent `invoice_lines` vom Typ `wasserkosten_nachverrechnung` ein (Duplikate werden übersprungen).

## Verifizierung

```sql
-- Nachverrechnungs-Zeilen prüfen
SELECT il.unit_id, il.amount, il.meta
FROM invoice_lines il
WHERE il.line_type = 'wasserkosten_nachverrechnung'
ORDER BY il.created_at DESC;

-- Verbrauchsdaten prüfen
SELECT wr.unit_id, SUM(wr.consumption * wr.coefficient) as gewichtet
FROM water_readings wr
WHERE wr.reading_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY wr.unit_id;
```

## Rollback

Bei fehlerhaften Nachverrechnungen:

```sql
-- Soft-Delete der betroffenen Zeilen
UPDATE invoice_lines
SET deleted_at = now()
WHERE line_type = 'wasserkosten_nachverrechnung'
  AND meta->>'year' = '2025';
```

Anschließend Backfill mit korrigierten Daten erneut ausführen. Alle Änderungen werden automatisch in den `audit_logs` dokumentiert (SHA-256-Hashkette).

## CI-Integration

Der Workflow `.github/workflows/water-backfill-smoke.yml` führt bei Bedarf einen Dry-Run gegen die Staging-DB aus (manueller Trigger via `workflow_dispatch`).
