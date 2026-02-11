# TEST SCENARIOS

> **Zweck**: Automatisierte End-to-End Test-Szenarien als Referenz für CI und lokale Testläufe.  
> **Fokus**: Abrechnung (BK), Zahlung / Allocation / FIFO / Storno, SEPA-Flows  
> **Letzte Aktualisierung**: 2026-02-11

---

## 1. Voraussetzungen

| Komponente | Details |
|---|---|
| Test-DB | Testcontainers Postgres oder dedizierte Test-DB |
| Config | `vitest.server.config.ts` für Integrationstests |
| Helpers | `resetDb()`, `seedPortfolio()` in `tests/helpers` |
| Mocks | SEPA-Gateway (WireMock/Nock), S3/MinIO oder LocalStack |
| Environment | `NODE_ENV=test`, Test-S3 Credentials, `DATABASE_URL` |

---

## 2. Testprinzipien

- **Deterministische Seeds**: Jeder Test verwendet deterministische Fixtures oder erzeugt eigene Tenant/Org IDs (`tests/seeds/generateTestData.ts`)
- **Isolation**: `resetDb()` führt `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` auf allen Core-Tabellen aus
- **Idempotentes Setup/Teardown**: `resetDb()` vor jedem Testfile, `seedPortfolio()` für benötigte Entities
- **Keine Flaky Waits**: Polling auf Business-State statt feste Sleeps
- **Artifacts**: Bei Fehlschlag werden Logs, DB-Tail, Playwright Screenshots und HTTP-Bodies als CI-Artifacts gespeichert

---

## 3. Priorisierte Szenarien

### 3.1 Abrechnung Flow (BK)

**Ziel**: Erzeuge Vorschreibung, generiere BK, finalisiere BK, prüfe Status und Retention Flags.

```
Seed → Vorschreibung erstellen → BK generieren → BK finalisieren → Assertions
```

**Checks**:
- [ ] BK existiert mit Status `finalized`
- [ ] `settlement_warnings` reflektiert Abschluss
- [ ] Retention-Felder gesetzt (`retention_until` = +10 Jahre für GoBD)
- [ ] Audit-Event `event_type=CREATE` mit korrektem `payload_hash`
- [ ] Rundungsstabilität über alle Einheiten (Cent-genau)

### 3.2 Zahlung Allocation FIFO Flow

**Ziel**: Erzeuge mehrere offene Rechnungen, erzeuge Zahlung, prüfe FIFO Allocation, führe Storno durch, prüfe Ledger-Reconciliation.

```
Seed → 3 Rechnungen erstellen → Zahlung (Teilbetrag) → FIFO prüfen → Storno → Ledger verify
```

**Checks**:
- [ ] Zahlungen werden in Reihenfolge der offenen Posten allokiert (älteste zuerst)
- [ ] `payment_allocations` korrekt verteilt (SSOT für Invoice-Status)
- [ ] `ledger_entries` asynchron synchronisiert (via Job Queue `ledger_sync`)
- [ ] Storno erzeugt Audit-Event (`event_type=STORNO`) und Ledger-Korrektur
- [ ] Überzahlung wird als Tenant-Credit in `transactions` erfasst
- [ ] Optimistic Locking (`version`-Spalte) verhindert Doppelallokation

### 3.3 Period Lock Edge Cases

**Ziel**: Sperre Periode, versuche Allocation, erwarte 409 und unveränderte DB.

```
Seed → Periode 2025-12 sperren → Zahlung mit booking_date=2025-12-15 → 409 erwarten
```

**Checks**:
- [ ] `assertPeriodOpen()` löst `PeriodLockError` (409) aus
- [ ] Keine `payment_allocations` Rows nach gescheiterter Anfrage
- [ ] Keine `ledger_entries` erzeugt
- [ ] Audit-Event für Lock-Violation (Security Event Emitter)

### 3.4 SEPA Flow

**Ziel**: Erzeuge SEPA-Mandat, generiere pain.008, sende an Bank-Mock, verarbeite Rückmeldung.

```
Seed → Mandat erstellen → SEPA-Export Job → pain.008 validieren → Bank-Response → Buchungen prüfen
```

**Checks**:
- [ ] SEPA-XML valide gegen ISO 20022 `pain.008.001.02` Schema
- [ ] IBAN, BIC, Amounts korrekt formatiert
- [ ] Bank-Mock akzeptiert → Buchung erstellt
- [ ] Bank-Mock lehnt ab → Chargeback-Flow mit korrekten Gegenbuchungen
- [ ] `sepa_batches` Status korrekt aktualisiert
- [ ] Job Queue `sepa_export` idempotent bei Retry

### 3.5 Ownership & Security Guards

**Ziel**: IDOR / Ownership Tests, CSRF, Auth.

```
Seed (2 Orgs) → Cross-Org Access → 403/404 → CSRF Test → Auth Test
```

**Checks**:
- [ ] Fremde Org Update/Read → 404 (nicht 403, verhindert Enumeration)
- [ ] `assertOrgOwnership` blockiert Cross-Tenant-Zugriff über 16 Tabellen
- [ ] POST ohne CSRF-Token → 403
- [ ] Login → CSRF-geschützter POST → 200
- [ ] Indirekte Ownership-Auflösung (Payment → Tenant → Unit → Property → Org)

### 3.6 Audit Chain Integrity

**Ziel**: Verifiziere Hash-Chain-Integrität über mehrere Operationen.

```
Seed → 10 Operationen (CREATE, UPDATE, DELETE, STORNO) → Chain validieren
```

**Checks**:
- [ ] `chain_index` ist monoton steigend (unique)
- [ ] `prev_hash` referenziert korrekten Vorgänger
- [ ] `payload_hash` = SHA-256 über kanonisierten Payload (`canonicalHash.ts`)
- [ ] UPDATE/DELETE auf `audit_events` wird durch Trigger blockiert
- [ ] `retention_until` korrekt gesetzt (10 Jahre für GoBD)

---

## 4. Test Doubles & Infrastruktur

| Komponente | Test Double | Produktiv |
|---|---|---|
| SEPA Gateway | WireMock / Nock HTTP-Stubs | PSP API |
| S3 / WORM | LocalStack / MinIO mit Object Lock | AWS S3 + KMS |
| Datenbank | Testcontainers Postgres | Lovable Cloud DB |
| Job Queue | In-Memory (synchron) | Async Job Queue |
| E-Mail | Mock / Spy | Resend API |

---

## 5. CI Integration

### Job Stages

```yaml
e2e:
  stages:
    - name: setup
      run: docker compose -f docker-compose.test.yml up -d  # Testcontainers / LocalStack

    - name: unit
      run: npx vitest -c vitest.server.config.ts tests/unit --run

    - name: integration
      run: npx vitest -c vitest.server.config.ts tests/integration --run

    - name: e2e
      run: npx vitest -c vitest.server.config.ts tests/e2e --run

    - name: teardown
      run: docker compose -f docker-compose.test.yml down
      always: true

  artifacts:
    on_failure:
      - logs/*.log
      - tests/artifacts/db-tail.sql
      - tests/artifacts/screenshots/
      - tests/artifacts/http-responses/
```

### Quality Gates

| Metrik | Schwellenwert |
|---|---|
| E2E Pass Rate | ≥ 98% auf `main` |
| Unit Test Coverage | ≥ 80% (Finanzlogik ≥ 95%) |
| Integration Test Duration | < 5 Minuten |
| Flaky Test Rate | < 2% |

---

## 6. Laufbefehle

```bash
# Unit Tests (Mock-DB)
npx vitest -c vitest.server.config.ts tests/unit --run

# Integration Tests (echte DB)
NODE_ENV=test npx vitest -c vitest.server.config.ts tests/integration --run

# E2E Tests (Full Stack)
NODE_ENV=test npx vitest -c vitest.server.config.ts tests/e2e --run

# Einzelnes Szenario
NODE_ENV=test npx vitest -c vitest.server.config.ts tests/integration/payment-allocation-e2e.test.ts --run

# Mit Coverage
NODE_ENV=test npx vitest -c vitest.server.config.ts --coverage --run
```
