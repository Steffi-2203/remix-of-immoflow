
# Hardening: Alle verbleibenden bare-ID Lookups auf `assertOwnership` umstellen

## Ueberblick

Es gibt noch ~20 Endpunkte in `server/routes.ts`, die Ressourcen per `storage.getX(id)` laden und dann manuell `organizationId` vergleichen, anstatt den zentralen `assertOwnership`-Helper zu verwenden. Ausserdem fehlen bei einigen Pruefungen harte 404-Antworten (statt 403), was ID-Enumeration ermoeglicht.

Zusaetzlich gibt es in `server/storage.ts` Mutations-Methoden (`updateBankAccount`, `deleteBankAccount`, `updateProperty`, `deleteProperty`, `updateUnit`, `updateExpense`, `updateDistributionKey`, `deleteDistributionKey`, `softDeleteUnit`, `softDeleteTenant`), die nur auf `id` filtern -- ohne Org-Scoping. Da die Absicherung auf Route-Ebene erfolgt, ist das akzeptabel, aber bei jedem Aufruf muss sichergestellt sein, dass vorher `assertOwnership` geprueft wurde.

## Betroffene Endpunkte in `server/routes.ts`

### Kategorie A: Direkte Tabellen (einfach umstellbar)

| Zeile | Endpunkt | Aktueller Code | Aenderung |
|---|---|---|---|
| 246 | `GET /api/properties/:id` | `storage.getProperty` + manueller Vergleich | `assertOwnership(req, res, id, "properties")` |
| 262 | `GET /api/properties/:propertyId/units` | `storage.getProperty` + manueller Vergleich | `assertOwnership(req, res, propertyId, "properties")` |
| 519 | `PATCH /api/properties/:id` | `storage.getProperty` + manueller Vergleich | `assertOwnership(req, res, id, "properties")` |
| 963 | `GET /api/units/:id` | `storage.getUnit` + `getProperty` + Vergleich | `assertOwnership(req, res, id, "units")` |
| 1019 | `PATCH /api/units/:id` | `storage.getUnit` + `getProperty` + Vergleich | `assertOwnership(req, res, id, "units")` |
| 1059 | `GET /api/units/:unitId/tenants` | `storage.getUnit` + `getProperty` + Vergleich | `assertOwnership(req, res, unitId, "units")` |
| 1090 | `GET /api/tenants/:id` | `storage.getTenant` + `getUnit` + `getProperty` | `assertOwnership(req, res, id, "tenants")` |
| 1111 | `DELETE /api/units/:id` | `storage.getUnit` + `getProperty` + Vergleich | `assertOwnership(req, res, id, "units")` |
| 1129 | `DELETE /api/tenants/:id` | `storage.getTenant` + `getUnit` + `getProperty` | `assertOwnership(req, res, id, "tenants")` |
| 1208 | `GET /api/tenants/:tenantId/rent-history` | Manuell 3-Stufen Lookup | `assertOwnership(req, res, tenantId, "tenants")` |
| 1230 | `POST /api/tenants/:tenantId/rent-history` | Manuell 3-Stufen Lookup | `assertOwnership(req, res, tenantId, "tenants")` |
| 1635 | `GET /api/properties/:propertyId/expenses` | `storage.getProperty` + Vergleich | `assertOwnership(req, res, propertyId, "properties")` |
| 1654 | `GET /api/properties/:propertyId/vacancy-report` | `storage.getProperty` + Vergleich | `assertOwnership(req, res, propertyId, "properties")` |

### Kategorie B: Indirekte / Mutations-Eingangspruefung

| Zeile | Endpunkt | Aktueller Code | Aenderung |
|---|---|---|---|
| 602 | `POST /api/payments` | `getTenant` -> `getUnit` -> `getProperty` | `assertOwnership(req, res, tenantId, "tenants")` |
| 644 | `PATCH /api/payments/:id` | `getPayment` -> `getTenant` -> `getUnit` -> `getProperty` | `assertOwnership(req, res, id, "payments")` |
| 686 | `GET /api/payments/:id` | `getPayment` -> `getTenant` -> `getUnit` -> `getProperty` | `assertOwnership(req, res, id, "payments")` |
| 723 | `POST /api/transactions` | `getBankAccount` + manueller Vergleich | `assertOwnership(req, res, bankAccountId, "bank_accounts")` |
| 745 | `GET /api/transactions/:id` | `getBankAccount` + manueller Vergleich | Neuer `transactions` Case in `assertOrgOwnership` oder expliziter Bank-Account-Check |
| 765 | `DELETE /api/transactions/:id` | `getBankAccount` + manueller Vergleich | Wie `GET /api/transactions/:id` |
| 828 | `PATCH /api/expenses/:id` | `getExpense` -> `getProperty` | `assertOwnership(req, res, id, "expenses")` |
| 987 | `POST /api/units` | `getProperty` + manueller Vergleich | `assertOwnership(req, res, propertyId, "properties")` |
| 1150 | `POST /api/tenants` | `getUnit` -> `getProperty` + Vergleich | `assertOwnership(req, res, unitId, "units")` |
| 1416 | `POST /api/invoices` | `getTenant` -> `getUnit` -> `getProperty` | `assertOwnership(req, res, tenantId, "tenants")` |

### Kategorie C: Sicherheitsluecken (schwache Pruefungen)

Einige Endpunkte verwenden "weiche" Pruefungen, die bei fehlendem Zwischenresultat stillschweigend weitermachen:

```text
// Zeile 693-702 (GET /api/payments/:id) – PROBLEM
if (tenant) {           // <-- wenn tenant fehlt, kein Fehler!
  const unit = ...
  if (unit) {           // <-- wenn unit fehlt, kein Fehler!
    const property = ...
    if (property && property.orgId !== profileOrgId) {
      return 403;
    }
  }
}
// Hier wird das Payment trotzdem zurueckgegeben
```

Gleiches Muster bei:
- `GET /api/units/:unitId/tenants` (Zeile 1063)
- `GET /api/tenants/:id` (Zeile 1098)
- `DELETE /api/tenants/:id` (Zeile 1137)

Diese werden durch `assertOwnership` behoben, da dieser bei fehlenden Zwischenresultaten immer 404 wirft.

## Umsetzungsschritte

### 1. `server/routes.ts` refactoren (~20 Endpunkte)

Jeden der oben gelisteten Endpunkte wie folgt umstellen:

**Vorher (Beispiel GET /api/properties/:id):**
```typescript
const profile = await getProfileFromSession(req);
const property = await storage.getProperty(req.params.id);
if (!property) return res.status(404)...;
if (property.organizationId !== profile?.organizationId) return res.status(403)...;
res.json(property);
```

**Nachher:**
```typescript
const property = await assertOwnership(req, res, req.params.id, "properties");
if (!property) return;
res.json(property);
```

### 2. `assertOrgOwnership.ts` erweitern

Neuen Case `"transactions"` hinzufuegen:
- Lookup: `storage.getTransaction(id)` -> `storage.getBankAccount(bankAccountId)` -> Org-Vergleich
- Gleiche Kette wie die bestehende manuelle Pruefung, aber zentralisiert

`ResourceTable` Type um `"transactions"` erweitern.

### 3. Generische `assertOrgOwnershipDirect` Funktion hinzufuegen

Wie im vorherigen Plan besprochen -- die generische Drizzle-basierte Funktion fuer Direkttabellen:

```typescript
export async function assertOrgOwnershipDirect<T extends PgTable>({
  table, id, organizationId,
  idColumn, orgColumn,
}) { ... }
```

Die bestehenden Switch-Cases fuer `contractors`, `maintenance_contracts`, `maintenance_tasks`, `settlements` werden darauf umgestellt.

### 4. Bestehende Tests erweitern

In `tests/unit/cross-tenant-isolation.test.ts`:
- Tests fuer `transactions`-Case hinzufuegen
- Tests fuer die Kategorie-C "weiche Pruefungen" sicherstellen (Payment ohne validen Tenant darf nicht durchrutschen)

## Sicherheitsbewertung

| Risiko | Schwere | Betroffene Endpunkte |
|---|---|---|
| Weiche Pruefungen (Kategorie C) | **HOCH** | 4 Endpunkte geben Daten zurueck wenn Zwischenresultat fehlt |
| Inkonsistente Fehler-Codes (403 statt 404) | MITTEL | ~10 Endpunkte leaken Existenz durch 403 |
| Fehlende Pruefung bei Mutations-Inputs | MITTEL | `POST /api/units`, `POST /api/tenants`, `POST /api/invoices` |

## Dateiaenderungen

| Datei | Aenderung |
|---|---|
| `server/routes.ts` | ~20 Endpunkte auf `assertOwnership` umstellen |
| `server/middleware/assertOrgOwnership.ts` | `transactions` Case und `assertOrgOwnershipDirect` hinzufuegen |
| `tests/unit/cross-tenant-isolation.test.ts` | Tests fuer Transactions und schwache Pruefungen |

## Keine Breaking Changes

- Alle API-Antworten bleiben identisch (JSON-Struktur unveraendert)
- Einzige Verhaltensaenderung: Kategorie-C Endpunkte geben jetzt korrekt 404 zurueck statt Daten ohne Org-Pruefung durchzulassen
