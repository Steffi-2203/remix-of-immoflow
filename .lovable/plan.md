
# Intensiv-Test-Infrastruktur fur ImmoflowMe

## Status: routes.ts ist bereits modularisiert (43 Zeilen)

Die Modularisierung ist abgeschlossen -- `server/routes.ts` ist ein schlanker 43-Zeilen-Orchestrator mit 11 Domain-Routern. Der Fokus liegt nun auf dem Aufbau der umfassenden Test-Infrastruktur.

---

## Phase 1: Test-Infrastruktur und Scripts

### 1.1 Package.json -- Neue Test-Scripts
Neue npm-Scripts hinzufugen:

```text
"test:unit"        -> vitest run tests/unit
"test:integration" -> vitest run tests/integration
"test:e2e"         -> playwright test
"test:typecheck"   -> tsc --noEmit
"test:all"         -> test:typecheck && test:unit && test:integration
```

### 1.2 Docker-Compose fur lokale Test-DB
Datei: `docker-compose.test.yml`
- PostgreSQL 15 Container mit Port 5433
- Test-Datenbank `immoflow_test`
- Volume fur Persistenz

### 1.3 Test-Environment-Konfiguration
Datei: `tests/env.test.ts`
- Zentrale Env-Defaults fur Tests (NODE_ENV=test, WORKER_ENABLED=false, etc.)
- Mock-Keys fur Sentry, OpenAI, Stripe

---

## Phase 2: Seed-Daten (SQL)

### 2.1 SQL Seed-Script
Datei: `scripts/seed-test-data.sql`

Daten:
- 3 Organisationen (Hausverwaltung Mustermann, WEG Testgasse, Immo GmbH)
- 10 Properties verteilt auf die 3 Orgs
- 3 Test-Accounts mit festen Passwortern:
  - `admin@test.immoflow.me` (Admin, Passwort: `TestAdmin123!`)
  - `manager@test.immoflow.me` (Manager, Passwort: `TestManager123!`)
  - `mieter@test.immoflow.me` (Tenant/Tester, Passwort: `TestMieter123!`)
- 50 Mietvertrage (Tenants mit Units)
- 200 Buchungen (Invoices + Payments uber 12 Monate)
- Expenses pro Property und Monat

### 2.2 Erweiterung von `tests/seeds/generateTestData.ts`
- SQL-Export-Funktion hinzufugen die INSERT-Statements generiert
- Deterministische UUIDs fur Reproduzierbarkeit

---

## Phase 3: Unit-Tests (Router Smoke Tests)

### 3.1 Health/Core Router
Datei: `tests/unit/routes/core.test.ts`
- GET /api/health liefert 200 + timestamp
- GET /api/metrics liefert uptime

### 3.2 Auth Router Smoke Tests
Datei: `tests/unit/routes/auth.test.ts`
- POST /api/auth/login mit leeren Feldern -> 400
- POST /api/auth/login mit falschen Credentials -> 401
- POST /api/auth/register ohne Invite -> 403
- GET /api/auth/user ohne Session -> 401
- POST /api/auth/logout -> 200

### 3.3 Domain Router Smoke Tests
Dateien pro Router (je 2-4 Tests):
- `tests/unit/routes/properties.test.ts` -- Unauth-Zugriff, Liste laden
- `tests/unit/routes/units.test.ts` -- Unauth-Zugriff
- `tests/unit/routes/tenants.test.ts` -- Unauth-Zugriff
- `tests/unit/routes/finance.test.ts` -- Unauth-Zugriff, Payment-Validierung
- `tests/unit/routes/banking.test.ts` -- Unauth-Zugriff
- `tests/unit/routes/settlements.test.ts` -- Unauth-Zugriff
- `tests/unit/routes/compliance.test.ts` -- Unauth-Zugriff
- `tests/unit/routes/exports.test.ts` -- Unauth-Zugriff
- `tests/unit/routes/jobs.test.ts` -- Unauth-Zugriff

Jeder Test nutzt `supertest` mit der Express-App und pruft:
1. 401 ohne Auth-Session
2. Korrekte HTTP-Methode/Pfad erreichbar

---

## Phase 4: Integration-Tests (DB-basiert)

### 4.1 JobQueue Integration
Datei: `tests/integration/jobqueue.test.ts`
- Enqueue Job -> Status pending
- processNext() -> Status completed
- Retry bei Fehler -> Status retrying mit Backoff
- FOR UPDATE SKIP LOCKED bei parallelem Zugriff
- Max-Retries -> Status failed

### 4.2 Auth-Flow Integration
Datei: `tests/integration/auth-flow.test.ts`
- Register mit Invite-Token -> Profile + Role erstellt
- Login -> Session gesetzt
- Password Reset Token Lifecycle

---

## Phase 5: E2E-Tests (Playwright)

### 5.1 Playwright-Konfiguration aktualisieren
- baseURL auf localhost:5000 (Express-Server)
- Test-Accounts aus Env-Variablen

### 5.2 Kritische Flows
Bestehende `tests/basic-flow.spec.ts` ist bereits gut. Erganzungen:

Datei: `tests/e2e/property-crud.spec.ts`
- Login als Manager -> Property erstellen -> Einheit anlegen -> Mieter zuweisen

Datei: `tests/e2e/billing-flow.spec.ts`
- Vorschreibung generieren -> Zahlung erfassen -> Status "bezahlt"

---

## Phase 6: Security-Tests

### 6.1 RLS/Isolations-Tests
Datei: `tests/unit/security/rls-isolation.test.ts`
- Org A darf keine Daten von Org B sehen
- Tester-Rolle bekommt maskierte Daten

### 6.2 API-Security-Tests
Datei: `tests/unit/security/api-security.test.ts`
- SQL-Injection Payloads gegen Search-Endpoints
- CSRF-Token Validierung
- Rate-Limiting verifizieren
- Leaked-Password-Check aktiv

---

## Phase 7: Load-Test (k6)

### 7.1 k6 Script
Datei: `tests/load/k6-api-smoke.js`
- 100 VUs, 2 Minuten
- GET /api/properties, /api/payments, /api/tenants
- Checks: Status 200, Latenz < 1s

### 7.2 Erweiterung bestehender Load-Test
Der existierende `tests/load/load-test-1000.ts` bleibt unverandert -- erganzend kommt der k6-basierte HTTP-Load-Test dazu.

---

## Phase 8: CI-Konfiguration und Reporting

### 8.1 GitHub Actions Workflow
Datei: `.github/workflows/test-intensive.yml`

```text
Jobs:
  typecheck   -> tsc --noEmit (every push)
  test-unit   -> vitest run tests/unit (every push)
  test-integ  -> vitest run tests/integration (PRs, mit DB-Service)
  test-e2e    -> playwright test (PRs, optional)
  test-load   -> k6 run (workflow_dispatch / nightly)
```

### 8.2 Test-Report-Template
Datei: `docs/TEST_REPORT_TEMPLATE.md`
- Test-Summary (pass/fail)
- Top 10 Failures mit Stack-Traces
- Performance-Graphen Platzhalter
- Security Findings mit PoC
- Bug-Report-Template mit Severity/Zuweisung

---

## Zusammenfassung der neuen Dateien

| Datei | Zweck |
|---|---|
| `docker-compose.test.yml` | Lokale Test-DB |
| `scripts/seed-test-data.sql` | 3 Mandanten, 10 Properties, 50 Mieter, 200 Buchungen |
| `tests/env.test.ts` | Test-Environment-Defaults |
| `tests/unit/routes/*.test.ts` (10 Dateien) | Router Smoke Tests |
| `tests/integration/jobqueue.test.ts` | JobQueue Lifecycle |
| `tests/integration/auth-flow.test.ts` | Auth Flow Integration |
| `tests/e2e/property-crud.spec.ts` | Property CRUD E2E |
| `tests/e2e/billing-flow.spec.ts` | Billing E2E |
| `tests/unit/security/*.test.ts` (2 Dateien) | RLS + API Security |
| `tests/load/k6-api-smoke.js` | k6 HTTP Load Test |
| `.github/workflows/test-intensive.yml` | CI Pipeline |
| `docs/TEST_REPORT_TEMPLATE.md` | Report-Template |

**Gesamt: ~20 neue Dateien, ~50+ neue Tests**

## Akzeptanzkriterien-Mapping

- tsc --noEmit sauber: via test:typecheck Script
- Critical bugs = 0: Security-Tests decken Auth-Bypass, Data-Leak, RLS ab
- p95 API Latenz < 1s: k6 Script pruft das
- E2E kritische Flows grun: Playwright deckt Login, CRUD, Billing ab
- Jeder Router mindestens 1 Test: 10 Router-Smoke-Test-Dateien
