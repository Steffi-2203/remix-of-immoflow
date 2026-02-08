

## Roadmap-Umsetzungsplan

Dein Backlog umfasst 8 Punkte in 3 Prioritaetsstufen. Hier ist der konkrete Plan, was wo geaendert wird.

---

### P0 – Sofort (Quick Wins)

#### 1. normalizeDescription zentralisieren
**Problem**: `tools/upsert_missing_lines.js` hat eine eigene Kopie der Normalisierungslogik (Zeilen 18-27) als Fallback. `tools/compare_dryrun_db.js` und `tools/find_missing_lines.js` nutzen die Funktion gar nicht.

**Aenderungen**:
- `tools/upsert_missing_lines.js`: Fallback-Normalizer (Zeilen 12-29) entfernen, stattdessen festen Import verwenden
- `tools/compare_dryrun_db.js`: Die `normalize()`-Funktion (Zeile 9) verwendet `description.trim()` statt `normalizeDescription` – hier den Import einbauen
- `tools/find_missing_lines.js`: Verwendet rohe Beschreibungen fuer den Set-Vergleich (Zeile 40/44) – auf `normalizeDescription` umstellen
- Alle drei Tools von CommonJS (.js) auf ESM-kompatiblen Import umstellen oder einen CommonJS-Wrapper fuer `normalizeDescription` bereitstellen

#### 2. Audit-Payload anreichern
**Problem**: Der Audit-Eintrag in `billing.service.ts` (Zeilen 217-224) schreibt nur `run_id, invoice_id, unit_id, line_type, description, amount`. Es fehlen `actor`, `old_amount` und `new_amount`.

**Aenderungen**:
- `server/services/billing.service.ts` (Zeile 217-224): Audit-Payload erweitern:
  - `actor: userId` hinzufuegen
  - `old_amount` aus dem vorherigen Wert (vor Upsert) ermitteln – dafuer das SQL um `RETURNING ... old.amount` erweitern oder einen separaten Lookup machen
  - `new_amount: r.amount` explizit benennen
- `tools/upsert_missing_lines.js` (Zeile 89-101): Gleiche Felder im Audit-Payload ergaenzen

#### 3. CSVs aus Git entfernen, Summary + Hash committen
**Problem**: Volle CSV-Dateien koennten versehentlich committed werden; `.gitignore` schuetzt nur wenn bereits eingerichtet.

**Aenderungen**:
- `.gitignore`: Bereits erledigt (CSVs sind drin) ✅
- Neues Script `tools/generate-summary.js`: Liest `dryrun.json`, erzeugt `summary.json` (Zeilenzahl, Checksummen, Zeitstempel) und `summary.sha256`
- `.github/workflows/ci.yml`: Im Artifacts-Schritt `summary.json` + `summary.sha256` statt voller Dateien hochladen
- Pre-commit Hook: `.husky/pre-commit` Datei erstellen die prueft ob CSV/JSON-Artefakte im Staging sind und den Commit blockiert

---

### P1 – Mittelfristig (1-2 Sprints)

#### 4. CI Parity Job gegen Staging-Snapshot
**Status**: Bereits teilweise implementiert im `test-billing-parity` Job in `.github/workflows/ci.yml`. Laeuft aber gegen eine leere CI-Datenbank, nicht gegen einen Staging-Snapshot.

**Aenderungen**:
- `.github/workflows/ci.yml`: Neuen Job `parity-staging` hinzufuegen der einen DB-Dump vom Staging importiert bevor die Tests laufen
- Artifact-Upload ist bereits implementiert (Zeilen am Ende des Jobs) ✅

#### 5. Duplicate Precheck + Merge Script
**Status**: Duplicate Precheck existiert bereits in CI (SQL-Query in ci.yml). Aber es gibt kein automatisches Merge-Script.

**Aenderungen**:
- Neues Script `tools/merge-duplicates.js`: Findet Duplikat-Gruppen, merged sie (hoechsten Betrag behalten oder summieren je nach Regel) und schreibt Audit-Eintraege
- CI-Job erweitern: Nach dem Precheck optional das Merge-Script ausfuehren

#### 6. Metrics & Alerts (Prometheus/Datadog)
**Aenderungen**:
- `server/lib/metrics.ts`: Neues Modul mit Counter/Histogram fuer `invoice_lines_upserted`, `billing_run_duration_ms`, `conflict_count`
- `server/services/billing.service.ts`: Metriken nach jedem Run exportieren
- Prometheus-Endpoint oder Datadog-Agent-Integration je nach Infrastruktur

---

### P2 – Strategisch (2-6 Sprints)

#### 7. Temp-Table COPY + Upsert CTE
Fuer grosse Portfolios (10.000+ Zeilen) ist das zeilenweise Upsert zu langsam.

**Aenderungen**:
- `server/services/billing.service.ts`: Neuer Codepfad fuer Gross-Batches:
  1. Temp-Table erstellen
  2. `COPY` fuer Bulk-Insert in Temp-Table
  3. Single CTE: `INSERT INTO invoice_lines SELECT ... FROM temp ON CONFLICT DO UPDATE`
  4. Audit-Insert aus dem gleichen CTE

#### 8. Enterprise Features (RBAC, SSO, verschluesselte Artefakte)
Langfristige Features die mehrere Sprints brauchen und Produkt-Entscheidungen erfordern. Keine konkreten Code-Aenderungen in diesem Plan.

---

### Empfohlene Reihenfolge der Umsetzung

```text
Woche 1:  P0-1 (normalizeDescription) + P0-2 (Audit Payload)
Woche 2:  P0-3 (Summary + Pre-commit Hook)
Sprint 2: P1-4 (CI Staging Snapshot) + P1-5 (Merge Script)
Sprint 3: P1-6 (Metrics)
Spaeter:  P2-7 + P2-8
```

### Technische Details

**Betroffene Dateien (P0)**:
- `tools/upsert_missing_lines.js` – Import aendern, Fallback entfernen, Audit erweitern
- `tools/compare_dryrun_db.js` – `normalizeDescription` Import einbauen
- `tools/find_missing_lines.js` – Normalisierung beim Set-Vergleich nutzen
- `server/services/billing.service.ts` – Audit-Payload mit actor/old_amount/new_amount
- `tools/generate-summary.js` – Neu erstellen
- `.husky/pre-commit` – Neu erstellen
- `package.json` – husky als devDependency + prepare-Script

