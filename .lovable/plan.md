

# Load-Tests durchfuehren und Ergebnisse dokumentieren

## Ausgangslage

Die Load-Test-Infrastruktur ist vollstaendig vorhanden:
- `tools/load_test_bulk.sh` -- Generiert CSV, fuehrt batch_upsert parallel aus, sammelt DB-Stats
- `tools/batch_upsert.js` -- Fuehrt den eigentlichen Bulk-Upsert mit FK-Error-Handling durch
- `.github/workflows/ci.yml` -- Enthaelt einen `load-test` Job mit `workflow_dispatch` Trigger
- `docs/LOAD_TEST_REPORT.md` -- Template fuer Ergebnisse (noch leer)

Das Problem: Die Tests koennen nicht direkt aus Lovable heraus ausgefuehrt werden, da sie Shell-Zugriff auf eine Postgres-Datenbank erfordern. Sie muessen ueber GitHub Actions oder lokal ausgefuehrt werden.

## Plan

### 1. CI Workflow erweitern -- Automatische Metriken-Erfassung

Der bestehende `load-test` Job im CI-Workflow wird erweitert, damit die Ergebnisse automatisch in ein strukturiertes JSON geschrieben und als Artifact hochgeladen werden. Aktuell werden die Metriken nur in stdout geloggt.

Aenderungen an `.github/workflows/ci.yml`:
- Nach dem Load-Test-Schritt: WAL-Position, `work_mem`, `max_wal_size`, `max_connections` per SQL abfragen
- Duplikat-Count und Audit-Log-Statistiken erfassen
- Alles in eine `metrics.json` schreiben und als Artifact hochladen
- Drei vordefinierte Szenarien als Matrix-Strategy (10k/1, 50k/1, 100k/4)

### 2. Load-Test Report-Generator erstellen

Ein neues Script `tools/generate-load-report.js` das die `metrics.json` Artifacts einliest und `docs/LOAD_TEST_REPORT.md` mit den tatsaechlichen Messwerten befuellt.

### 3. LOAD_TEST_REPORT.md mit Tuning-Baseline aktualisieren

Das bestehende Template in `docs/LOAD_TEST_REPORT.md` wird um eine konkrete Tuning-Referenztabelle erweitert mit empfohlenen Werten fuer:

| Parameter | 10k Baseline | 50k Empfehlung | 100k Empfehlung |
|-----------|-------------|----------------|-----------------|
| `batch_size` | 10000 | 10000 | 10000 |
| `work_mem` | 16MB | 32MB | 64MB |
| `max_wal_size` | 2GB | 2GB | 4GB |
| `parallel_jobs` | 1 | 1 | 4 |

## Technische Details

### CI Matrix-Strategy fuer die drei Szenarien

Der `load-test` Job wird so umgebaut, dass er mit einer Matrix-Strategy die drei Szenarien automatisch durchlaeuft:

```text
matrix:
  include:
    - name: "S1-10k"    rows: 10000   parallel: 1
    - name: "S2-50k"    rows: 50000   parallel: 1
    - name: "S3-100k"   rows: 100000  parallel: 4
```

### Metriken-Erfassung (neuer CI-Step)

Nach jedem Load-Test-Lauf wird ein SQL-Block ausgefuehrt:

```text
SELECT pg_current_wal_lsn()                    -- WAL Position
current_setting('work_mem')                     -- work_mem
current_setting('max_wal_size')                 -- max_wal_size
current_setting('max_connections')              -- max_connections
count(*) FROM invoice_lines WHERE created_at >= now() - interval '10 min'  -- inserted rows
count(*) FROM audit_logs WHERE action = 'upsert_missing_lines' AND ...     -- audit count
```

Diese Werte werden in `load_tests/<scenario>/metrics.json` geschrieben.

### Dateien die geaendert/erstellt werden

1. **`.github/workflows/ci.yml`** -- Matrix-Strategy fuer load-test Job, Metriken-Step
2. **`docs/LOAD_TEST_REPORT.md`** -- Tuning-Baseline-Tabelle und Ausfuell-Anleitung
3. **`tools/generate-load-report.js`** -- Script zum Befuellen des Reports aus metrics.json

## So fuehrst du die Tests aus

Nach der Implementierung:

1. Gehe zu GitHub Actions
2. Waehle den Workflow "Billing Parity and Release"
3. Klicke "Run workflow"
4. Setze `run_load_test` auf `true` und waehle die gewuenschte Zeilenanzahl
5. Nach Abschluss: Lade das `load-test-results` Artifact herunter
6. Fuehre `node tools/generate-load-report.js load_tests/` aus um den Report zu generieren

