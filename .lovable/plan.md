

## Backup-Dokumentation aktualisieren

Die `docs/BACKUP_STRATEGY.md` wird mit den vom Benutzer angegebenen PostgreSQL-Werten aktualisiert.

### Aenderungen

In Abschnitt 2 ("PostgreSQL Konfiguration") werden folgende Werte angepasst:

| Parameter | Aktuell dokumentiert | Neu |
|---|---|---|
| `max_wal_senders` | 5 | 3 |
| `max_wal_size` | 2GB | (entfernen) |
| `min_wal_size` | 512MB | (entfernen) |
| `wal_keep_size` | (nicht vorhanden) | 1GB |

### Technische Details

**Datei:** `docs/BACKUP_STRATEGY.md`, Abschnitt `postgresql.conf`

Der Block wird wie folgt aussehen:

```ini
archive_mode = on
archive_command = 'pgbackrest --stanza=prod archive-push %p'
archive_timeout = 300

wal_level = replica
max_wal_senders = 3
wal_keep_size = '1GB'
```

Keine weiteren Dateien betroffen.

