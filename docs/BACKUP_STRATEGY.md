# Backup-Strategie — ImmoflowMe

> **Ziel**: RPO < 1h, RTO < 2h, GoBD/BAO-konforme Aufbewahrung  
> **Letzte Aktualisierung**: 2026-02-11

---

## 1. Übersicht

| Komponente | Methode | Frequenz | Aufbewahrung |
|---|---|---|---|
| Full Backup | pgBackRest `--type=full` | Wöchentlich (So 02:00) | 14 Tage |
| Differential Backup | pgBackRest `--type=diff` | Täglich (02:00) | 7 Tage |
| WAL-Archiving | Continuous via `archive_command` | Laufend | 30 Tage |
| PITR | WAL-basiert | Beliebiger Zeitpunkt | 30 Tage |
| GoBD/BAO Export | `export_audit_package.js --worm` | Nach jedem Billing Run | 7/10 Jahre (WORM) |

---

## 2. PostgreSQL Konfiguration

### postgresql.conf

```ini
# WAL-Archiving aktivieren
archive_mode = on
archive_command = 'pgbackrest --stanza=prod archive-push %p'
archive_timeout = 300

# WAL-Level für PITR
wal_level = replica
max_wal_senders = 5
max_wal_size = 2GB
min_wal_size = 512MB
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

# Full Backup: Sonntag 02:00 UTC
0 2 * * 0  postgres  pgbackrest --stanza=prod --type=full backup 2>&1 | logger -t pgbackrest

# Differential Backup: Mo-Sa 02:00 UTC
0 2 * * 1-6  postgres  pgbackrest --stanza=prod --type=diff backup 2>&1 | logger -t pgbackrest

# Stanza Check: Täglich 01:00 UTC
0 1 * * *  postgres  pgbackrest --stanza=prod check 2>&1 | logger -t pgbackrest

# WAL-Archive Cleanup: Wöchentlich
0 4 * * 0  postgres  pgbackrest --stanza=prod expire 2>&1 | logger -t pgbackrest
```

### systemd Timer (Alternative)

```ini
# /etc/systemd/system/pgbackrest-full.timer
[Unit]
Description=pgBackRest Full Backup Weekly

[Timer]
OnCalendar=Sun *-*-* 02:00:00
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
pgbackrest --stanza=prod --type=time \
  --target="2026-02-11 14:30:00+01" \
  --target-action=promote \
  restore

# Starte PostgreSQL
sudo systemctl start postgresql
```

### 4.2 Full Restore (letztes Backup)

```bash
pgbackrest --stanza=prod --type=default restore
```

### 4.3 Validierung nach Restore

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

### Prometheus Metriken

```yaml
# prometheus/rules/backup.yml
groups:
  - name: backup_alerts
    rules:
      - alert: BackupMissing
        expr: time() - pgbackrest_backup_last_full_timestamp > 172800  # 48h
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "Kein Full Backup in den letzten 48 Stunden"

      - alert: WALArchiveLag
        expr: pgbackrest_wal_archive_lag_seconds > 3600
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "WAL-Archive-Lag über 1 Stunde"

      - alert: BackupSizeDrop
        expr: pgbackrest_backup_size_bytes < pgbackrest_backup_size_bytes offset 7d * 0.5
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Backup-Größe um >50% gesunken — möglicher Datenverlust"
```

### Grafana Dashboard

Empfohlene Panels:
- Backup-Größe (Full/Diff/WAL) über Zeit
- Letzte Backup-Zeitpunkte
- WAL-Archive-Lag
- Restore-Testdauer (aus `tools/dr_restore_test.sh`)
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
