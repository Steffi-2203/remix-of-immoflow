
# Erweiterte Invoice Smoke-Tests

## Uebersicht

Sechs neue Tests in `tests/unit/routes/finance.test.ts`, die ueber den reinen 401-Check hinausgehen und Validation, Business-Rules und Edge-Cases abdecken. Alle Tests laufen mit gemockter DB/Storage -- kein Live-Postgres noetig.

## Mock-Strategie

Die bestehenden Mocks fuer `server/db` und `server/storage` muessen erweitert werden, damit authentifizierte Requests (mit `req.session.userId`) durch `isAuthenticated` kommen und die Handler-Logik erreichen. Dafuer:

- Session-Middleware setzt `userId` fuer authentifizierte Tests
- `storage` Mock wird um die benoetigten Methoden erweitert (`getProfileById`, `createInvoice`, `getInvoice`, `updateInvoice`, `deleteInvoice`, `getPaymentAllocationsByInvoice`)
- `assertOwnership` wird gemockt, um Org-Ownership-Pruefung zu umgehen (Unit-Tests pruefen Route-Logik, nicht Ownership)

## Die 6 Tests

### 1. POST /api/invoices mit fehlendem Pflichtfeld (unitId) -> 400
Sendet Body ohne `unitId`. Der `insertMonthlyInvoiceSchema.safeParse()` schlaegt fehl, Route antwortet mit `{ error: "Validation failed", details: ... }`.

### 2. POST /api/invoices mit ungueltigem Monat -> 400
Sendet `month: 13` oder `month: -1`. Schema-Validation erkennt den ungueltigen Wert.

### 3. POST /api/invoices erfolgreich -> 200 mit korrekten Feldern
Sendet vollstaendigen Body (tenantId, unitId, year, month). Mock `storage.createInvoice` gibt das erstellte Objekt zurueck. Prueft, dass Response die erwarteten Felder enthaelt.

**Anmerkung:** Die aktuelle Route antwortet mit `res.json(invoice)` (Status 200), nicht 201. Der Test prueft das tatsaechliche Verhalten (200). Eine Aenderung auf 201 waere ein separates Ticket.

### 4. GET /api/invoices/:id -> 200 mit korrekten Feldern
Mock `assertOwnership` gibt ein Invoice-Objekt zurueck. Prueft, dass Response die erwarteten Felder (id, unitId, year, month, status) enthaelt.

### 5. PATCH /api/invoices/:id Status-Update -> 200
Sendet `{ status: "bezahlt" }`. Mock `assertOwnership` + `storage.updateInvoice` geben aktualisiertes Objekt zurueck. Prueft, dass der neue Status im Response erscheint.

### 6. DELETE /api/invoices/:id mit Aufbewahrungspflicht -> 409
Mock `assertOwnership` gibt ein Invoice zurueck. Mock `archiveService.isDeletionFrozen` gibt `{ frozen: true, retentionUntil: "2032-12-31", standard: "bao", reason: "..." }` zurueck. Prueft 409 mit `retentionUntil` und `standard` im Response-Body.

## Technische Details

### Geaenderte Datei:
`tests/unit/routes/finance.test.ts`

### Neue Mocks (vi.mock Erweiterungen):

```text
server/storage:
  - getProfileById -> returns { id, organizationId }
  - createInvoice -> returns input + { id }
  - updateInvoice -> returns merged object
  - getInvoice -> returns mock invoice
  - getPaymentAllocationsByInvoice -> returns []

server/middleware/assertOrgOwnership:
  - assertOwnership -> returns mock resource or null

server/billing/archiveService:
  - archiveService.isDeletionFrozen -> configurable per test
```

### Test-App Setup:

Zweite Express-App mit authentifizierter Session (`req.session.userId = "test-user-id"`) fuer die neuen Tests, damit `isAuthenticated` durchlaesst. Die bestehenden 401-Tests bleiben unveraendert mit der unauthentifizierten App.

### Keine Aenderungen an:
- Produktivcode (keine Route-Aenderungen)
- Andere Testdateien
- DB-Schema
