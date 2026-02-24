# Reconciliation Runbook — paid_amount / payment_allocations

## Source of Truth (SoT)
- **Ledger**: `payment_allocations` (Tabelle) ist die einzige Wahrheitsquelle
- **Cache**: `monthly_invoices.paid_amount` ist ein abgeleiteter Wert, synchronisiert via `syncInvoicePaidAmount()` in `server/services/paymentSplittingService.ts`
- **Direkte Writes auf `paid_amount` sind verboten** — alle Schreibpfade laufen über `syncInvoicePaidAmount()`

## Schreibpfade (erschöpfende Liste)
| Service | Methode | Erstellt Allocation? | Synced paid_amount? |
|---|---|---|---|
| `paymentService.ts` | `allocatePayment()` | Ja | Ja via `syncInvoicePaidAmount(id, tx)` |
| `paymentSplittingService.ts` | `splitPaymentByPriority()` | Ja | Ja via `syncInvoicePaidAmount(id)` |
| `paymentSplittingService.ts` | `allocatePaymentToInvoice()` | Ja | Ja via `syncInvoicePaidAmount(id)` |
| Seed-Scripts | `seed-demo.ts`, `seed-leases-payments.ts` | Ja (source='seed') | Direkt (akzeptabel fuer Seed) |

## Nightly Job
- **Workflow**: `.github/workflows/nightly-reconcile.yml`
- **Schedule**: Taeglich 01:30 UTC
- **Secrets-Guard**: Bricht sofort ab wenn `STAGING_DB_URL` nicht gesetzt
- **Thresholds**: WARN bei >0 Varianzen, FAIL bei >1000 (temporaer, TODO: auf >55 zuruecksetzen wenn Seed-Rows exkludiert)
- **Alerting**: Slack + PagerDuty bei Abweichungen >0.01 EUR
- **Artefakte**: Reconciliation-Report als Artifact (90 Tage Retention)
- **Metriken**: `variance_count`, `seed_count`

## Manuell ausfuehren

```bash
psql "$DATABASE_URL" -f scripts/reconcile_paid_amounts.sql

# Oder via GitHub Actions
gh workflow run nightly-reconcile.yml
```

## Report-Sektionen

| Sektion | Beschreibung |
|---|---|
| `summary` | Gesamtuebersicht: Anzahl Rechnungen, bezahlte Betraege, offene Betraege |
| `variance_check` | Rechnungen wo `paid_amount` != Summe der `payment_allocations` |
| `status_consistency` | Rechnungen mit inkonsistentem Status (z.B. `bezahlt` aber `paid_amount = 0`) |
| `mahnstufe_distribution` | Verteilung der Mahnstufen bei offenen Rechnungen |
| `source_breakdown` | Aufschluesselung nach `source` (seed/manual/auto/backfill) |

## Bei Abweichungen

### Schritt 1: Report analysieren
```bash
psql "$DATABASE_URL" -f scripts/reconcile_paid_amounts.sql -o report.txt
```

### Schritt 2: Einzelne Rechnung pruefen
```sql
SELECT mi.id, mi.status, mi.paid_amount, mi.gesamtbetrag, mi.mahnstufe
FROM monthly_invoices mi
WHERE mi.id = '<invoice-id>';

SELECT pa.id, pa.payment_id, pa.invoice_id, pa.applied_amount, pa.allocation_type, pa.source, pa.created_at
FROM payment_allocations pa
WHERE pa.invoice_id = '<invoice-id>'
ORDER BY pa.created_at;
```

### Schritt 3: paid_amount aus Allocations re-syncen
```sql
-- Einzelne Rechnung
UPDATE monthly_invoices SET
  paid_amount = COALESCE((SELECT SUM(applied_amount::numeric) FROM payment_allocations WHERE invoice_id = '<invoice-id>'), 0),
  updated_at = NOW()
WHERE id = '<invoice-id>';

-- Alle Rechnungen (Batch-Resync)
UPDATE monthly_invoices mi SET
  paid_amount = COALESCE(pa.total, 0),
  status = CASE
    WHEN COALESCE(pa.total, 0) >= mi.gesamtbetrag THEN 'bezahlt'
    WHEN COALESCE(pa.total, 0) > 0 THEN 'teilbezahlt'
    ELSE 'offen'
  END,
  updated_at = NOW()
FROM (
  SELECT invoice_id, SUM(applied_amount::numeric) AS total
  FROM payment_allocations GROUP BY invoice_id
) pa
WHERE pa.invoice_id = mi.id
  AND ABS(mi.paid_amount - pa.total) > 0.01;
```

### Schritt 4: Safety-Net Backfill (fuer fehlende Allocations)
```bash
psql "$DATABASE_URL" -f migrations/2026-02-24-backfill-create-allocations-from-paid-amounts.sql
```

### Schritt 5: Verifizieren
```bash
psql "$DATABASE_URL" -f scripts/reconcile_paid_amounts.sql
```

## Backup und Restore

### Vor Backfill: Snapshot erstellen
```bash
pg_dump "$DATABASE_URL" --no-owner --no-acl -f backup-pre-backfill-$(date +%Y%m%d).sql
```

### Restore-Test
```bash
createdb restore_test
psql restore_test -f backup-pre-backfill-YYYYMMDD.sql
psql restore_test -f scripts/reconcile_paid_amounts.sql
dropdb restore_test
```

### DR Restore (Quarterly Test)
1. Snapshot laden in Staging-DB
2. Reconciliation-Report ausfuehren
3. Ergebnis dokumentieren (RTO: <30min, RPO: <24h)
4. Sign-off durch Ops + Finance

## Post-Cutover Monitoring (72h)

### Tag 1-3: Intensives Monitoring
- Morgens + Abends: Reconciliation-Report pruefen
- Metriken: `variance_count = 0`, `allocation_creation_rate` stabil
- Daily Sign-off durch Ops + Finance

### Monitoring-Queries
```sql
-- Taeglich: Varianz-Check
SELECT COUNT(*) AS variance_count
FROM monthly_invoices mi
LEFT JOIN (SELECT invoice_id, SUM(applied_amount::numeric) AS t FROM payment_allocations GROUP BY invoice_id) pa ON pa.invoice_id = mi.id
WHERE ABS(mi.paid_amount - COALESCE(pa.t, 0)) > 0.01;

-- Taeglich: Neue Allocations in den letzten 24h
SELECT source, COUNT(*) AS count, SUM(applied_amount::numeric) AS total
FROM payment_allocations
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source;

-- Taeglich: Status-Konsistenz
SELECT
  CASE
    WHEN paid_amount = gesamtbetrag AND status = 'bezahlt' THEN 'ok'
    WHEN paid_amount > 0 AND paid_amount < gesamtbetrag AND status = 'teilbezahlt' THEN 'ok'
    WHEN paid_amount = 0 AND status IN ('offen', 'ueberfaellig') THEN 'ok'
    ELSE 'MISMATCH'
  END AS check, COUNT(*)
FROM monthly_invoices GROUP BY 1;
```

### Stopp-Kriterien (Rollback)
- variance_count > 10 nach Cutover
- Status-Inkonsistenzen > 5
- Allocation-Rate faellt auf 0 bei laufendem Betrieb

### Rollback-Schritte
1. Ingests stoppen (Rate-Limit auf 0 oder Maintenance-Mode)
2. DB-Snapshot wiederherstellen
3. Reconciliation-Report ausfuehren
4. Finance + Ops informieren
5. Post-Mortem

## Eskalation
| Schwere | Kriterium | Aktion |
|---|---|---|
| Low | Varianz < 5 Rechnungen | Team-Ticket, naechster Sprint |
| Medium | Varianz 5-50 Rechnungen | Sofort-Fix, Finance informieren |
| High | Varianz > 50 Rechnungen | Incident, Rollback pruefen, Finance + Ops Call |
| Critical | Varianz > 100 oder steigende Tendenz | Sofort-Rollback, Post-Mortem |

## Kontakte
- **Dev**: @dev-team
- **Finance**: @finance-team
- **Ops**: @ops-team
- **Eskalation**: @dev-lead + @cfo

## Aenderungsuebersicht (SoT-Konsolidierung 2026-02-24)

### Geaenderte Services
| Datei | Aenderung |
|---|---|
| `server/services/paymentSplittingService.ts` | Neuer Helper `syncInvoicePaidAmount()`, `splitPaymentByPriority()` erstellt jetzt Allocations |
| `server/services/paymentService.ts` | `allocatePayment()` nutzt `syncInvoicePaidAmount()` statt lokaler Berechnung |
| `server/routes/paymentRoutes.ts` | Audit-Logging fuer `payment_updated`, `payment_deleted`, `allocation_created`, `allocation_deleted` |
| `server/storage.ts` | Neues Interface `getPaymentAllocation(id)` |

### Migrationen
| ID | Beschreibung | Betroffene Rows |
|---|---|---|
| `2026-02-24-add-source-to-payments.sql` | `source` Spalte auf payments + payment_allocations | Schema-only |
| `2026-02-24-backfill-seed-source.sql` | 649 payments + 512 allocations als 'seed' getaggt | 1161 |
| `2026-02-24-backfill-create-allocations-from-paid-amounts.sql` | Safety-Net: erstellt fehlende Allocations | 0 (aktuell) |

### CI-Aenderungen
| Workflow | Aenderung |
|---|---|
| `e2e-browser.yml` | Fail on missing `TEST_STRIPE_WEBHOOK_SECRET` |
| `nightly-reconcile.yml` | Secrets-Guard, Threshold >1000 (temporaer), `seed_count` Metrik |
