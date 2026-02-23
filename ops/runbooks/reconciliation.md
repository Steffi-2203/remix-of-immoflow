# Reconciliation Runbook — paid_amount / payment_allocations

## Zweck
Sicherstellen, dass `monthly_invoices.paid_amount` mit der Summe aus `payment_allocations` übereinstimmt.

## Nightly Job
- **Workflow**: `.github/workflows/nightly-reconcile.yml`
- **Schedule**: Täglich 01:30 UTC
- **Alerting**: Slack + PagerDuty bei Abweichungen > 0.01 EUR
- **Artefakte**: Reconciliation-Report wird als Artifact hochgeladen (90 Tage Retention)

## Manuell ausführen

```bash
# Reconciliation-Report generieren
psql "$DATABASE_URL" -f scripts/reconcile_paid_amounts.sql

# Oder via GitHub Actions
gh workflow run nightly-reconcile.yml
```

## Report-Sektionen

| Sektion | Beschreibung |
|---|---|
| `summary` | Gesamtübersicht: Anzahl Rechnungen, bezahlte Beträge, offene Beträge |
| `variance_check` | Rechnungen wo `paid_amount` != Summe der `payment_allocations` |
| `status_consistency` | Rechnungen mit inkonsistentem Status (z.B. `bezahlt` aber `paid_amount = 0`) |
| `mahnstufe_distribution` | Verteilung der Mahnstufen bei offenen Rechnungen |

## Bei Abweichungen

### Schritt 1: Report analysieren
```bash
psql "$DATABASE_URL" -f scripts/reconcile_paid_amounts.sql -o report.txt
```

### Schritt 2: Einzelne Rechnung prüfen
```sql
SELECT mi.id, mi.status, mi.paid_amount, mi.gesamt_betrag, mi.mahnstufe
FROM monthly_invoices mi
WHERE mi.id = '<invoice-id>';

SELECT pa.id, pa.invoice_id, pa.amount, pa.created_at
FROM payment_allocations pa
WHERE pa.invoice_id = '<invoice-id>';
```

### Schritt 3: Backfill erneut ausführen
```bash
psql "$DATABASE_URL" -f migrations/2026-02-23-backfill-paid_amount-and-mahnstufe.sql
```

### Schritt 4: Verifizieren
```bash
psql "$DATABASE_URL" -f scripts/reconcile_paid_amounts.sql
```

## Rollback

```bash
# paid_amount zurücksetzen (Achtung: nur nach Rücksprache mit Finance!)
UPDATE monthly_invoices SET paid_amount = 0, mahnstufe = 0;

# Oder DB-Snapshot wiederherstellen
psql "$DATABASE_URL" -f <backup-file>.sql
```

## Eskalation
- **Varianz < 10 Rechnungen**: Team-Ticket erstellen, nächster Sprint
- **Varianz 10-50 Rechnungen**: Sofort-Fix im aktuellen Sprint
- **Varianz > 50 Rechnungen**: Incident, Finance informieren, Backfill-Rollback prüfen

## Kontakte
- **Dev**: @dev-team
- **Finance**: @finance-team
- **Ops**: @ops-team
