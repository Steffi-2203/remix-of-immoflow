

# Tiefenanalyse: Eignung fuer grosse Immobilienverwaltung

## Gesamtbewertung: 7/10 - Solide Basis, aber kritische Maengel beheben

Die Architektur ist fuer mittlere bis grosse Hausverwaltungen (50-500 Einheiten) gut aufgestellt. Fuer Enterprise-Groesse (1000+ Einheiten) gibt es strukturelle Staerken, aber auch ernste Probleme.

---

## KRITISCH: Sofort zu beheben

### 1. allocatePayment() wird falsch aufgerufen (Schweregrad: KRITISCH)

Die Methode erwartet ein Objekt, wird aber mit 3 Positional-Argumenten aufgerufen. Das bedeutet: **Keine einzige Zahlungszuordnung funktioniert korrekt.**

```text
// Ist-Zustand (routes.ts Zeile 618):
paymentService.allocatePayment(payment.id, Number(payment.betrag), payment.tenantId)

// Soll-Zustand:
paymentService.allocatePayment({ paymentId: payment.id, amount: Number(payment.betrag), tenantId: payment.tenantId })
```

Betroffen: mindestens 3 Stellen in routes.ts (Zeile 618, 3958, 4034).

### 2. SQL-Injection-Risiko in optimisticLock.ts (Schweregrad: HOCH)

`sql.raw(selectSql)` und `sql.raw(updateSql)` in `optimisticLock.ts` nutzen String-Interpolation fuer SQL-Queries. Die `selectSql` in `paymentService.ts` (Zeile 89) baut die WHERE-Klausel mit `'${inv.id}'` per Template-Literal. Zwar stammt `inv.id` aus einer vorherigen DB-Abfrage (geringes Risiko), aber das Pattern ist grundsaetzlich unsicher und sollte durch parametrisierte Queries ersetzt werden.

### 3. Ueberzahlung ohne Organization-ID (Schweregrad: MITTEL)

`allocatePayment()` Zeile 133: `organization_id: NULL` bei der Ueberzahlungs-Transaktion. In einem Multi-Tenant-System wird diese Transaktion keiner Organisation zugeordnet und verschwindet aus allen Filtern.

---

## Architektur-Bewertung

### Staerken (was gut funktioniert)

| Bereich | Bewertung | Details |
|---|---|---|
| Datenmodell | Sehr gut | Klare Trennung payments/transactions/expenses mit definiertem Sync-Flow |
| Job-Queue | Sehr gut | PostgreSQL-basiert mit FOR UPDATE SKIP LOCKED, Retry, Backoff |
| Billing Engine | Gut | Idempotente Upserts, Bulk-Path (5000er Chunks), Metriken |
| Rundungsdeterminismus | Sehr gut | reconcileRounding mit deterministischer Sortierung |
| USt-Konfiguration | Gut | Konfigurierbar per Unit-Type, MRG-konforme Saetze |
| Audit Trail | Sehr gut | Hash-Kette, Write-Once, umfassende Protokollierung |
| RBAC | Gut | 5 Rollen, Permissions-Tabelle, Org-Overrides |
| Leerstand | Gut | Automatische Vacancy-Vorschreibungen mit BK/HK |

### Schwaechen (was fehlt oder problematisch ist)

| Bereich | Problem | Auswirkung |
|---|---|---|
| Payment Allocation | Falscher Funktionsaufruf | ALLE Zahlungszuordnungen scheitern |
| routes.ts | 5299 Zeilen in einer Datei | Unwartbar, hohe Fehleranfaelligkeit |
| Concurrency | Optimistic Lock mit String-SQL | SQL-Injection-Risiko, fragile Logik |
| Rate Limiting | Nicht vorhanden auf API-Ebene | DDoS-Anfaelligkeit |
| Pagination | Hardcoded LIMIT 500 | Skalierungsproblem bei 1000+ Einheiten |
| Multi-Org Isolation | Ueberzahlungen ohne org_id | Daten-Lecks moeglich |

---

## Detailanalyse pro Modul

### A. Billing / Vorschreibung

- **BillingService**: Solide. Dry-Run, Metriken, Bulk-Path. Die `reconcileRounding`-Funktion ist deterministisch und korrekt implementiert.
- **InvoiceGenerator**: Konfigurierbar ueber `vatConfig.ts`. Unterstuetzt dynamische sonstige Kosten.
- **Problem**: `InvoiceService` und `InvoiceGenerator` haben duplizierte Logik (`getVatRates`, `buildInvoiceData`, `buildInvoiceLines`). Bei 633 vs 188 Zeilen ist unklar, welche die kanonische ist.

### B. Payment Allocation

- **FIFO-Logik**: Korrekt implementiert (ORDER BY year, month).
- **Optimistic Locking**: Vorhanden mit 5 Retries, Fallback auf direktes Update.
- **KRITISCH**: Der Aufruf scheitert wegen Signatur-Mismatch (s.o.).
- **Ledger Sync**: Asynchron via Job-Queue – gutes Pattern. Idempotenz korrekt.

### C. Abrechnung / Settlement

- **Verteilungsschluessel**: 6 MRG-konforme Keys implementiert.
- **Wasserkosten**: Verbrauchsbasiert mit Koeffizient und Fallback.
- **HeizKG 70/30**: Dokumentiert aber Implementation nicht verifizierbar in 414 Zeilen.

### D. SEPA Export

- **pain.008.001.02** (Lastschrift) und **pain.001.001.03** (Ueberweisung): Implementiert.
- **XML-Escaping**: Vorhanden.
- IBAN/BIC-Validierung: Basis-Escaping, aber keine algorithmische IBAN-Pruefung (Mod97).

### E. Mahnwesen / Dunning

- **3-Stufen-System**: Korrekt (14/30/45 Tage).
- **Duplizierung**: `PaymentService.getDunningLevel()` und `AutomatedDunningService.getDunningLevel()` existieren parallel mit leicht unterschiedlicher Logik (letztere hat interestRate im Level-Objekt).
- **ABGB 1333**: 4% p.a. korrekt implementiert in beiden Services.

### F. Sicherheit

- **RBAC**: Server-seitig mit Permissions-Tabelle. Gut.
- **Org-Isolation**: Routes pruefen `profile.organizationId` – konsequent fuer CRUD.
- **Tester-Masking**: Umfassende PII-Maskierung.
- **Schwaeche**: `optimisticLock.ts` nutzt `sql.raw()` mit interpolierten Strings.

---

## Skalierbarkeits-Bewertung

### Fuer 500+ Einheiten:

```text
Vorschreibung:  OK  (Bulk-Upsert mit 5000er Chunks, Temp-Table CTE)
Zahlungen:      NOK (allocatePayment defekt)
Abrechnung:     OK  (Batch-faehig, Distribution Keys)
Job-Queue:      OK  (SKIP LOCKED, 5 Jobs/Tick)
Reports:        OK  (Aggregation auf DB-Ebene)
```

### Fuer 2000+ Einheiten:

```text
routes.ts:      NOK (5299 Zeilen, monolithisch)
Pagination:     NOK (LIMIT 500 hartcodiert)
Connection Pool: ?  (Pool-Konfiguration nicht sichtbar)
Caching:        NOK (kein Redis/Memcache, jeder Request = DB-Query)
```

---

## Empfohlene Massnahmen (priorisiert)

### Prioritaet 1 – Sofort

1. **allocatePayment-Aufrufe fixen** – 3 Stellen in routes.ts auf Objekt-Syntax umstellen
2. **optimisticLock.ts** – sql.raw() durch parametrisierte Queries ersetzen
3. **Ueberzahlung org_id** – aus dem Tenant-Kontext ableiten

### Prioritaet 2 – Kurzfristig

4. **routes.ts aufteilen** – in Domain-Module (payments/, tenants/, properties/, etc.)
5. **Duplizierte Services bereinigen** – InvoiceService vs InvoiceGenerator konsolidieren
6. **DunningLevel-Logik** zusammenfuehren (PaymentService + AutomatedDunningService)

### Prioritaet 3 – Mittelfristig

7. **IBAN-Validierung** mit Mod97-Algorithmus
8. **API Rate Limiting** implementieren
9. **Cursor-basierte Pagination** statt LIMIT/OFFSET
10. **Connection Pooling** konfigurieren und dokumentieren

---

## Technische Details

### allocatePayment Fix (alle 3 Stellen):

```text
// Zeile 618, 3958, 4034 in routes.ts
// ALT:
paymentService.allocatePayment(payment.id, amount, tenantId)

// NEU:
paymentService.allocatePayment({ paymentId: payment.id, amount, tenantId: payment.tenantId, userId: req.session?.userId })
```

### optimisticLock.ts Fix:

Die `selectSql` und `updateSqlBuilder` sollten parametrisierte Drizzle-Queries statt String-Interpolation verwenden. Das gesamte Pattern kann durch ein einfacheres `WHERE id = $1 AND version = $2` mit gebundenen Parametern ersetzt werden.

### routes.ts Aufteilung:

```text
server/routes/
  payments.ts      (~300 Zeilen)
  tenants.ts       (~400 Zeilen)
  properties.ts    (~300 Zeilen)
  invoices.ts      (~500 Zeilen)
  banking.ts       (~400 Zeilen)
  settlements.ts   (~300 Zeilen)
  maintenance.ts   (~300 Zeilen)
  reports.ts       (~400 Zeilen)
  admin.ts         (~200 Zeilen)
  ...
```

---

## Fazit

Die Software hat eine **professionelle Architektur** mit korrektem MRG-/ABGB-Compliance, deterministischen Abrechnungen, und einem soliden Job-Queue-System. Die **kritischen Bugs** (v.a. allocatePayment-Signatur) verhindern aber aktuell den produktiven Einsatz fuer grosse Verwaltungen. Nach Behebung der P1-Issues und Aufspaltung von routes.ts ist das System fuer 500-1000 Einheiten einsatzbereit. Fuer 2000+ Einheiten braucht es zusaetzlich Caching und Cursor-Pagination.

