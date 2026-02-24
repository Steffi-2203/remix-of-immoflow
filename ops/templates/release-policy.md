# Release Policy — Payment Path Changes

## Geltungsbereich
Alle Aenderungen an:
- `server/services/paymentService.ts`
- `server/services/paymentSplittingService.ts`
- `syncInvoicePaidAmount()` Helper
- `payment_allocations` Schema
- `monthly_invoices.paid_amount` Schreiblogik

## Vor Release

### 1. Code Review
- Minimum 2 Approvals (1x Dev, 1x Dev Lead)
- Pruefung: Werden alle `paid_amount`-Writes ueber `syncInvoicePaidAmount()` gemacht?
- CI-Regression: `grep -rn "paid_amount\s*=" server/ | grep -v syncInvoicePaidAmount | grep -v test | grep -v seed` muss leer sein

### 2. Staging-Test
- Backfill auf Staging ausfuehren
- Reconciliation-Report: 0 Varianzen
- Smoke-Test: Zahlung anlegen, Allocation pruefen, paid_amount verifizieren

### 3. Migration Window
- **Wann**: Dienstag oder Mittwoch, 06:00-08:00 UTC (vor Geschaeftsbetrieb)
- **Dauer**: Max. 2 Stunden inkl. Monitoring
- **Backup**: pg_dump vor Migration mandatory

### 4. Rollback-Kriterien
- variance_count > 0 nach Migration → sofort Rollback
- Allocation-Writes fehlerhaft → Feature-Flag deaktivieren
- Finance meldet Abweichungen → sofort Rollback

## Waehrend Release

### Deployment-Checkliste
1. DB-Snapshot erstellen
2. Migration ausfuehren
3. Reconciliation-Report (muss 0 Varianzen zeigen)
4. 15 Minuten Monitoring
5. Finance-Sign-off einholen

### Feature-Flag (zukuenftig)
- Variable: `PAYMENT_SOT_MODE` (Werte: `legacy`, `consolidated`)
- Default: `consolidated`
- Rollback: Setze auf `legacy` → alte Schreibpfade aktiv

## Nach Release

### Post-Cutover (72h)
- Taeglich: Reconciliation-Report + Sign-off
- Monitoring: variance_count, allocation_creation_rate, status_consistency
- Eskalation gemaess Runbook `ops/runbooks/reconciliation.md`

### Retention
- Reconciliation-Artifacts: 90 Tage (GitHub Actions)
- Audit-Logs (`financial_audit_log`): 7 Jahre (BAO Paragraph 132)
- Backups: 30 Tage (automatisch), Pre-Migration permanent

## DR-Test (Quarterly)
- Restore aus letztem Backup
- Reconciliation-Report auf Restore ausfuehren
- RTO-Ziel: <30 Minuten
- RPO-Ziel: <24 Stunden
- Ergebnis dokumentieren und archivieren
