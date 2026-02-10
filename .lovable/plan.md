

# Monitoring, Retention, E2E-Tests und Testabdeckung -- die letzten 10 %

## 1. Structured Logging (Pino)

**Aktuell:** 1278 `console.*` Aufrufe verteilt auf 34 Dateien -- kein einheitliches Format, keine Log-Level-Steuerung, kein Correlation-ID.

**Umsetzung:**

- Neues Modul `server/lib/logger.ts` mit Pino als JSON-Logger
- Log-Level via `LOG_LEVEL` Environment-Variable steuerbar (default: `info`)
- Automatische Request-ID (`x-request-id`) als Correlation-ID in jedem Log
- Child-Logger fuer Services: `logger.child({ service: 'billing' })`
- Express-Middleware `server/middleware/requestLogger.ts` ersetzt den manuellen `onFinished`-Block in `server/index.ts`
- Schrittweise Migration: zuerst die kritischen Pfade (Billing, Payments, Auth), dann den Rest

**Kein Refactoring aller 1278 Stellen auf einmal** -- stattdessen wird der Logger exportiert und neue/geaenderte Dateien nutzen ihn. Bestehende `console.*` Aufrufe bleiben vorerst funktional.

## 2. Security-Event-Logging

**Aktuell:** `OrgOwnershipError`, `PeriodLockError`, und Auth-Fehler werden nur als HTTP-Responses gesendet, nicht separat protokolliert.

**Umsetzung:**

- Neues Modul `server/lib/securityEvents.ts` mit typisierten Events:
  - `ownership_violation` -- wenn `assertOrgOwnership` fehlschlaegt
  - `period_lock_violation` -- wenn gesperrte Periode manipuliert werden soll
  - `auth_failure` -- fehlgeschlagene Logins
  - `csrf_rejection` -- CSRF-Token ungueltig
  - `rate_limit_hit` -- Rate-Limiter greift
- Events werden ueber den Pino-Logger mit `level: 'warn'` und `category: 'security'` ausgegeben
- Integration in `assertOwnership` (catch-Block), `periodLock.ts`, `csrf.ts` und `auth.ts`

## 3. Prometheus-Metriken-Endpoint

**Aktuell:** `server/lib/metrics.ts` sammelt In-Memory-Metriken, `tools/metrics.cjs` nutzt `prom-client` -- aber es gibt keinen HTTP-Endpoint.

**Umsetzung:**

- Neuer Endpoint `GET /metrics` (oder `/api/metrics` mit Basic-Auth)
- Nutzt die bestehende `MetricsCollector`-Klasse aus `server/lib/metrics.ts`
- Zusaetzliche Standard-Metriken: `http_requests_total`, `http_request_duration_seconds`, `active_connections`
- Express-Middleware zaehlt Request-Rate und Latency automatisch
- Queue-Laenge aus `job_runs` Tabelle als Gauge

## 4. BAO/GoBD Retention-Enforcement

**Aktuell:** `archiveService.ts` implementiert 7-Jahre-Logik und Soft-Delete, aber:
- Kein Deletion-Freeze fuer steuerrelevante aktive Dokumente
- Kein GoBD-10-Jahres-Pfad
- Kein strukturierter Export

**Umsetzung:**

- `archiveService.ts` erweitern:
  - `RETENTION_YEARS_GOBD = 10` als Konfig-Option neben BAO 7 Jahre
  - `isDeletionFrozen(invoiceId)` -- prueft ob Dokument innerhalb Retention liegt und verhindert harte Loeschung
  - Deletion-Freeze als Guard in der `DELETE /api/invoices/:id` Route
- Neuer Endpoint `GET /api/archive/export` -- generiert ein ZIP-Paket mit:
  - Rechnungen als PDF/CSV
  - Zahlungsjournal
  - Audit-Trail fuer den Zeitraum
  - SHA-256 Pruefsumme pro Datei
- Integration mit dem bestehenden `tools/export_audit_package.js`

## 5. E2E-Test-Flows (Playwright + Supertest)

**Aktuell:** 38 Unit-Test-Dateien, 3 Integration-Suites -- aber keine durchgehenden User-Journey-Tests.

**Neue Testdateien:**

| Datei | Flow |
|---|---|
| `tests/integration/payment-to-lock.spec.ts` | Zahlung -> Allocation -> BK-Abschluss -> Period-Lock |
| `tests/integration/owner-change-flow.spec.ts` | Eigentuemerwechsel -> Vorschreibung -> Abrechnung |
| `tests/integration/dunning-storno-flow.spec.ts` | Mahnlauf -> Zahlung -> Storno -> Reconciliation |
| `tests/integration/auth-csrf-flow.spec.ts` | Login -> CSRF-geschuetzter POST -> Logout |

Jeder Test nutzt die bestehenden `resetDb()` und `seedPortfolio()` Helpers aus `tests/helpers/`.

## 6. Fehlende Testbereiche (Enterprise-kritisch)

| Testdatei | Was wird getestet |
|---|---|
| `tests/unit/race-condition-payments.test.ts` | Gleichzeitige Payment-Allocations mit `Promise.all` + Assertions auf finale Salden |
| `tests/unit/period-lock-edge-cases.test.ts` | Monatswechsel (31.1. vs 1.2.), Jahreswechsel, Schaltjahr |
| `tests/unit/settlement-warning-edge.test.ts` | MRG-Frist genau am 30.06., einen Tag davor/danach |
| `tests/unit/ownership-bypass.test.ts` | ID-Manipulation, UUID einer fremden Org, SQL-Injection in ID-Feld |

## Technische Details

### Pino Logger Setup

```typescript
// server/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
```

### Security Event Schema

```typescript
interface SecurityEvent {
  category: 'security';
  eventType: 'ownership_violation' | 'period_lock_violation' | 
             'auth_failure' | 'csrf_rejection' | 'rate_limit_hit';
  severity: 'warn' | 'error';
  ip: string;
  userId?: string;
  resourceId?: string;
  resourceType?: string;
  details: Record<string, unknown>;
}
```

### Retention Guard

```typescript
// In DELETE /api/invoices/:id route
const frozen = await archiveService.isDeletionFrozen(id);
if (frozen) {
  return res.status(409).json({ 
    error: 'Dokument unterliegt der gesetzlichen Aufbewahrungspflicht',
    retentionUntil: frozen.retentionUntil 
  });
}
```

## Dateiaenderungen

| Datei | Aenderung |
|---|---|
| `server/lib/logger.ts` | **NEU** -- Pino Logger |
| `server/lib/securityEvents.ts` | **NEU** -- Security Event Emitter |
| `server/middleware/requestLogger.ts` | **NEU** -- Request-Logging Middleware |
| `server/middleware/assertOrgOwnership.ts` | Security-Event bei Ownership-Fehler |
| `server/middleware/periodLock.ts` | Security-Event bei Period-Lock-Verletzung |
| `server/middleware/csrf.ts` | Security-Event bei CSRF-Rejection |
| `server/billing/archiveService.ts` | Retention-Enforcement + Export |
| `server/routes.ts` | `/metrics` Endpoint + Retention-Guard bei Invoice-Delete |
| `server/index.ts` | Pino-Middleware statt manuelles Logging |
| `tests/integration/payment-to-lock.spec.ts` | **NEU** -- E2E Flow |
| `tests/integration/owner-change-flow.spec.ts` | **NEU** -- E2E Flow |
| `tests/integration/dunning-storno-flow.spec.ts` | **NEU** -- E2E Flow |
| `tests/integration/auth-csrf-flow.spec.ts` | **NEU** -- E2E Flow |
| `tests/unit/race-condition-payments.test.ts` | **NEU** |
| `tests/unit/period-lock-edge-cases.test.ts` | **NEU** |
| `tests/unit/settlement-warning-edge.test.ts` | **NEU** |
| `tests/unit/ownership-bypass.test.ts` | **NEU** |
| `package.json` | `pino` Dependency hinzufuegen |

## Abhaengigkeiten

Neues npm-Paket: `pino` (keine weiteren Abhaengigkeiten noetig -- `prom-client` ist bereits via `tools/metrics.cjs` vorhanden)

## Reihenfolge

1. Pino Logger + Security Events (Grundlage fuer alles Weitere)
2. Retention-Enforcement (BAO/GoBD)
3. Prometheus-Endpoint
4. Unit-Tests (Edge Cases)
5. E2E-Flow-Tests

