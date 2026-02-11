# Backup-Strategie — ImmoflowMe

> **Ziel**: RPO < 1h, RTO < 2h, GoBD/BAO-konforme Aufbewahrung  
> **Letzte Aktualisierung**: 2026-02-11

---

## 1. Übersicht

| Komponente | Methode | Frequenz | Aufbewahrung |
|---|---|---|---|
| Full Backup | pgBackRest `--type=full` | Täglich (00:30) | 14 Tage |
| Differential Backup | pgBackRest `--type=diff` | Stündlich | 7 Tage |
| WAL Push | `archive_command` (wal-g) | Kontinuierlich (nach Commit) | 30 Tage |
| Weekly Full + Check | pgBackRest `--type=full` + `check` | Sonntag (03:00) | 14 Tage |
| Monthly Offsite Copy | pgBackRest `--repo=2` | 1. Tag (04:00) | 30 Tage |
| PITR | WAL-basiert | Beliebiger Zeitpunkt | 30 Tage |
| GoBD/BAO Export | `export_audit_package.js --worm` | Nach jedem Billing Run | 7/10 Jahre (WORM) |

---

## 2. PostgreSQL Konfiguration

### postgresql.conf

```ini
# WAL-Archiving aktivieren
archive_mode = on
archive_command = 'envdir /etc/wal-g.d wal-g wal-push %p'
archive_timeout = 300

# WAL-Level für PITR
wal_level = replica
max_wal_senders = 3
wal_keep_size = '1GB'
```

### pgBackRest Konfiguration (`/etc/pgbackrest/pgbackrest.conf`)

```ini
[global]
repo1-type=s3
repo1-path=/backups/immoflow
repo1-s3-bucket=immoflow-backup-prod
repo1-s3-endpoint=s3.amazonaws.com
repo1-s3-region=eu-central-1
repo1-s3-verify-tls=y
repo1-retention-full=14
repo1-retention-diff=7
repo1-retention-archive=30
compress-level=3
process-max=4

# Verschlüsselung at-rest (AES-256-CBC)
repo1-cipher-type=aes-256-cbc
# repo1-cipher-pass wird via Environment-Variable gesetzt

# Logging
log-level-console=info
log-level-file=detail
log-path=/var/log/pgbackrest

[prod]
pg1-path=/var/lib/postgresql/16/main
pg1-port=5432
pg1-user=postgres
```

> **WICHTIG**: S3-Zugangsdaten (`repo1-s3-key`, `repo1-s3-key-secret`) und
> Cipher-Passwort (`repo1-cipher-pass`) NIEMALS in Config-Dateien speichern.
> Stattdessen via Environment-Variablen oder IAM Instance Roles setzen.

---

## 3. Backup-Schedule (Cron / systemd)

```bash
# /etc/cron.d/pgbackrest-backup

# Full Backup: Täglich 00:30 UTC
30 0 * * *  postgres  /usr/bin/pgbackrest --stanza=prod --type=full backup >> /var/log/pgbackrest/backup.log 2>&1

# Differential Backup: Stündlich (außer 00:30)
0 1-23 * * *  postgres  pgbackrest --stanza=prod --type=diff backup >> /var/log/pgbackrest/backup.log 2>&1

# WAL Push: Kontinuierlich via archive_command (sofort nach Commit)
# → Konfiguriert in postgresql.conf: archive_command = 'envdir /etc/wal-g.d wal-g wal-push %p'

# Weekly Full + Integrity Check: Sonntag 03:00 UTC
0 3 * * 0  postgres  pgbackrest --stanza=prod --type=full backup && pgbackrest --stanza=prod check >> /var/log/pgbackrest/backup.log 2>&1

# Monthly Offsite Copy: 1. Tag des Monats 04:00 UTC
0 4 1 * *  postgres  pgbackrest --stanza=prod --type=full --repo=2 backup >> /var/log/pgbackrest/offsite.log 2>&1

# WAL-Archive Cleanup: Wöchentlich
0 5 * * 0  postgres  pgbackrest --stanza=prod expire >> /var/log/pgbackrest/backup.log 2>&1
```

### systemd Timer (Alternative)

```ini
# /etc/systemd/system/pgbackrest-full.timer
[Unit]
Description=pgBackRest Full Backup Daily

[Timer]
OnCalendar=*-*-* 00:30:00
Persistent=true

[Install]
WantedBy=timers.target
```

---

## 4. Restore-Prozeduren

### 4.1 Point-in-Time Recovery (PITR)

```bash
# Stoppe PostgreSQL
sudo systemctl stop postgresql

# Restore bis zu einem bestimmten Zeitpunkt
pgbackrest --stanza=prod restore --type=time "--target=2026-02-11 15:30:00"

# Starte PostgreSQL
sudo systemctl start postgresql
```

### 4.2 Katastrophenfall — Full Restore

**Schritt-für-Schritt:**

1. **Neuen Host provisionieren** (VM, Bare-Metal oder RDS Instance)
2. **Datenbank stoppen & Datenverzeichnis sichern**
   ```bash
   sudo systemctl stop postgresql
   mv /var/lib/postgresql/16/main /var/lib/postgresql/16/main.bak
   ```
3. **Full Restore ausführen**
   ```bash
   # Self-hosted
   pgbackrest --stanza=prod restore

   # AWS RDS Alternative
   # aws rds restore-db-instance-to-point-in-time ...
   ```
4. **Datenbank starten & Smoke-Tests**
   ```bash
   sudo systemctl start postgresql

   # API Health Check
   curl -f https://api.immoflow.at/health

   # Datenintegrität
   psql -c "SELECT count(*) FROM organizations;"
   psql -c "SELECT count(*) FROM monthly_invoices;"
   psql -c "SELECT count(*) FROM audit_logs WHERE hash IS NOT NULL;"

   # Payment Reconciliation
   psql -c "SELECT count(*) FROM ledger_entries WHERE booking_date > now() - interval '7 days';"
   ```
5. **LoadBalancer / DNS umschalten** auf neuen Host
6. **Post-Restore Aufgaben**
   ```bash
   # Reindex
   psql -c "REINDEX DATABASE postgres;"

   # VACUUM
   psql -c "VACUUM ANALYZE;"

   # Ledger-Reconciliation
   psql -c "SELECT tenant_id, sum(amount) FROM ledger_entries GROUP BY tenant_id HAVING sum(amount) != 0;"

   # Automatisierter DR-Test
   bash tools/dr_restore_test.sh "$DATABASE_URL"
   ```

### 4.3 Entscheidungstabelle

| Szenario | Methode | Befehl |
|---|---|---|
| Einzelne Tabelle wiederherstellen | Logischer Dump aus Backup-DB | `pg_dump --table=<table> backup_db \| psql prod_db` |
| Vollständige DB-Korruption | Full Restore + WAL Replay | `pgbackrest --stanza=prod restore` |
| Zeitpunktgenaue Wiederherstellung | PITR | `pgbackrest --stanza=prod restore --type=time "--target=..."` |
| RDS Instance | AWS Console / CLI | `aws rds restore-db-instance-to-point-in-time` |

### 4.4 Validierung nach Restore

```bash
# Automatisierter DR-Test
bash tools/dr_restore_test.sh "$DATABASE_URL"

# Manuelle Checks
psql -c "SELECT count(*) FROM organizations;"
psql -c "SELECT count(*) FROM monthly_invoices;"
psql -c "SELECT count(*) FROM audit_logs WHERE hash IS NOT NULL;"
```

---

## 5. Managed Database (AWS RDS / Azure)

Falls PostgreSQL als Managed Service betrieben wird:

| Feature | AWS RDS | Azure Database |
|---|---|---|
| Automatische Backups | ✅ Täglich | ✅ Täglich |
| PITR | ✅ Bis 35 Tage | ✅ Bis 35 Tage |
| Snapshot on-demand | ✅ | ✅ |
| Cross-Region Replikation | ✅ Read Replicas | ✅ Geo-Replicas |
| Encryption at-rest | ✅ KMS | ✅ ADE |
| WAL-Archiving | Automatisch | Automatisch |

> Bei Managed Services entfällt die manuelle pgBackRest-Konfiguration.
> WAL-Archiving und PITR sind nativ integriert.

---

## 6. S3 Object Storage

### Bucket-Konfiguration

```bash
# Backup-Bucket (Standard)
aws s3api create-bucket \
  --bucket immoflow-backup-prod \
  --region eu-central-1 \
  --create-bucket-configuration LocationConstraint=eu-central-1

# Versioning aktivieren (für WORM)
aws s3api put-bucket-versioning \
  --bucket immoflow-backup-prod \
  --versioning-configuration Status=Enabled

# TLS-Only Policy
aws s3api put-bucket-policy --bucket immoflow-backup-prod \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "DenyUnencryptedTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::immoflow-backup-prod",
        "arn:aws:s3:::immoflow-backup-prod/*"
      ],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    }]
  }'
```

### Lifecycle-Regel (Kostenkontrolle)

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket immoflow-backup-prod \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "ArchiveOldBackups",
      "Status": "Enabled",
      "Filter": { "Prefix": "backups/" },
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 90, "StorageClass": "GLACIER" }
      ]
    }]
  }'
```

---

## 7. Monitoring & Alerting

### 7.1 Prometheus Metriken

```yaml
# prometheus/rules/backup.yml
groups:
  - name: backup_metrics
    rules:
      # Backup success/failure
      - record: pgbackrest_backup_last_full_age_seconds
        expr: time() - pgbackrest_backup_last_full_timestamp

      - record: pgbackrest_backup_last_diff_age_seconds
        expr: time() - pgbackrest_backup_last_diff_timestamp

      # WAL-Lag
      - record: wal_archive_lag_seconds
        expr: pgbackrest_wal_archive_lag_seconds

      # Storage usage
      - record: backup_storage_used_bytes
        expr: pgbackrest_backup_size_bytes

  - name: backup_alerts
    rules:
      # --- CRITICAL: Backup Failure → Pager/Slack ---
      - alert: BackupFailure
        expr: time() - pgbackrest_backup_last_full_timestamp > 86400  # 24h (täglich erwartet)
        for: 30m
        labels:
          severity: critical
          channel: pager
        annotations:
          summary: "Backup fehlgeschlagen — kein Full Backup in den letzten 24h"
          runbook: "docs/BACKUP_STRATEGY.md#41-point-in-time-recovery-pitr"

      # --- WARNING: WAL-Lag > RPO ---
      - alert: WALLagExceedsRPO
        expr: wal_archive_lag_seconds > 3600  # RPO = 1h
        for: 15m
        labels:
          severity: warning
          channel: slack
        annotations:
          summary: "WAL-Archive-Lag ({{ $value }}s) überschreitet RPO von 1h"

      # --- CRITICAL: Restore Test Failure → Pager ---
      - alert: RestoreTestFailure
        expr: pgbackrest_restore_test_success == 0
        for: 5m
        labels:
          severity: critical
          channel: pager
        annotations:
          summary: "Automatisierter Restore-Test fehlgeschlagen"

      # --- WARNING: Storage Usage ---
      - alert: BackupStorageHigh
        expr: backup_storage_used_bytes > 100e9  # > 100 GB
        for: 1h
        labels:
          severity: warning
          channel: slack
        annotations:
          summary: "Backup-Storage über 100 GB ({{ $value | humanize1024 }})"

      - alert: BackupSizeDrop
        expr: pgbackrest_backup_size_bytes < pgbackrest_backup_size_bytes offset 7d * 0.5
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Backup-Größe um >50% gesunken — möglicher Datenverlust"
```

### 7.2 Alerting-Kanäle

| Alert | Severity | Kanal | Aktion |
|---|---|---|---|
| Backup Failure (kein Full in 24h) | 🔴 Critical | PagerDuty + Slack | Sofortige Eskalation |
| WAL-Lag > RPO (1h) | 🟡 Warning | Slack | Ursache prüfen, ggf. manuelles WAL-Push |
| Restore Test Failure | 🔴 Critical | PagerDuty | DR-Runbook ausführen |
| Storage > 100 GB | 🟡 Warning | Slack | Retention/Lifecycle prüfen |
| Backup-Größe -50% | 🟡 Warning | Slack | Datenintegrität prüfen |

### 7.3 Tests

#### Wöchentliche Restore-Probe (Staging, automatisiert)

```bash
# /etc/cron.d/restore-test-staging
# Jeden Montag 05:00 UTC
0 5 * * 1  postgres  bash tools/dr_restore_test.sh "$STAGING_DATABASE_URL" >> /var/log/restore-test.log 2>&1
```

#### Monatliche DR-Übung (vollständiger Smoke-Test)

```bash
# /etc/cron.d/dr-exercise-monthly
# 1. Samstag im Monat, 06:00 UTC
0 6 1-7 * 6  postgres  bash tools/dr_full_exercise.sh >> /var/log/dr-exercise.log 2>&1
```

**Monatliche DR-Übung umfasst:**
1. Full Restore auf isolierter Staging-Instanz
2. API Health Check (`/health`, `/api/metrics`)
3. Payment Reconciliation (Ledger-Summen)
4. Audit-Log-Integrität (Hash-Chain verifizieren)
5. Ergebnis-Report an Ops-Team (E-Mail/Slack)

### 7.4 Grafana Dashboard

Empfohlene Panels:
- Backup-Größe (Full/Diff/WAL) über Zeit
- Letzte Backup-Zeitpunkte
- WAL-Archive-Lag (`wal_archive_lag_seconds`)
- Restore-Testdauer & Ergebnis
- Storage-Nutzung & Trend
- Retention-Lock-Status (aus `/api/compliance/worm-status`)

---

## 8. Lovable Cloud (Aktuelle Umgebung)

In der Lovable Cloud Umgebung ist die Backup-Infrastruktur **vollständig verwaltet**:

| Feature | Status |
|---|---|
| PITR | ✅ Automatisch aktiv |
| Tägliche Snapshots | ✅ Managed |
| WAL-Archiving | ✅ Plattformebene |
| Encryption at-rest | ✅ AES-256 |
| TLS in-transit | ✅ Erzwungen |

**Anwendungsseitige Ergänzungen** (im Code implementiert):
- `tools/dr_restore_test.sh` — Automatisierter Restore-Test
- `tools/export_audit_package.js --worm` — GoBD/BAO-konformer Export mit WORM-Lock
- `server/lib/wormStorage.ts` — S3 Object Lock Integration
- `server/lib/backupAudit.ts` — Audit-Events für alle Backup-Aktionen
- `GET /api/compliance/backup-events` — Backup-Event-Historie
- `GET /api/compliance/worm-status` — WORM Compliance Dashboard

---

## 9. Checkliste

- [ ] pgBackRest Stanza initialisiert (`pgbackrest --stanza=prod stanza-create`)
- [ ] Full Backup erfolgreich (`pgbackrest --stanza=prod --type=full backup`)
- [ ] WAL-Archiving verifiziert (`pgbackrest --stanza=prod check`)
- [ ] PITR-Restore getestet
- [ ] S3 Bucket mit Versioning + TLS-Policy
- [ ] Monitoring-Alerts konfiguriert
- [ ] DR-Restore-Test monatlich ausgeführt
- [ ] WORM-Locks für steuerrelevante Exporte aktiv
