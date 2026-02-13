

# Implementierung: CAMT-Route, DB-Migration, Health-Endpoint

## Uebersicht

Der Health-Endpoint existiert bereits (`/api/health`), prueft aber nur ob der Server laeuft - nicht ob die Datenbank erreichbar ist. Zusaetzlich fehlt die API-Route fuer den CAMT-Bankimport und die Transactions-Tabelle hat nicht alle Spalten, die der BankImportService benoetigt.

---

## 1. Health-Endpoint erweitern (server/routes/core.ts)

**Aktuell:** Gibt nur `{ status: "ok", timestamp }` zurueck - keine DB-Pruefung.

**Neu:** Der Health-Endpoint prueft zusaetzlich:
- Datenbank-Konnektivitaet (SELECT 1)
- Antwortzeit der DB-Abfrage
- Version/Uptime

So kann ein externer Monitor (z.B. UptimeRobot, Grafana) erkennen, ob das Gesamtsystem funktioniert - nicht nur der Express-Server.

---

## 2. Matching-Metadata Migration (Datenbank)

Der `bankImportService.ts` verwendet Spalten, die im Schema nicht existieren. Die Spaltennamen muessen an das bestehende Schema angepasst werden:

| BankImportService verwendet | Schema hat | Aktion |
|---|---|---|
| `tenantId` | `matchedTenantId` | Code anpassen |
| `unitId` | `matchedUnitId` | Code anpassen |
| `status` | `isMatched` | Code anpassen |
| `counterpartyName` | `partnerName` | Code anpassen |
| `counterpartyIban` | `partnerIban` | Code anpassen |
| `description` | `bookingText` | Code anpassen |
| `matchConfidence` | -- (fehlt) | **Neue Spalte** |
| `matchMethod` | -- (fehlt) | **Neue Spalte** |
| `bookingDate` | -- (fehlt) | **Neue Spalte** (optionales Import-Datum) |
| `endToEndId` | -- (fehlt) | **Neue Spalte** |

**DB-Migration:** Zwei neue Spalten `match_confidence` und `match_method` zur `transactions`-Tabelle hinzufuegen, plus optionale `booking_date` und `end_to_end_id`.

**Schema-Update:** `shared/schema/finance.ts` um die neuen Spalten erweitern.

**BankImportService-Fix:** Alle Insert-Aufrufe an die korrekten Spaltennamen des bestehenden Schemas anpassen.

---

## 3. CAMT-Import API-Route (server/routes/banking.ts)

Neue Route `POST /api/bank/import-camt`:
- Nimmt XML-Datei als Text-Body oder Multipart-Upload entgegen
- Authentifizierung + Org-Pruefung
- Ruft `bankImportService.importCamtFile()` auf
- Gibt Matching-Ergebnis zurueck (matched/unmatched/created/skipped)

Zusaetzlich: `POST /api/bank/learn-match` - damit manuell zugeordnete Zahlungen als Pattern gespeichert werden.

---

## Technische Details

### Dateien die geaendert werden:

1. **server/routes/core.ts** - Health-Endpoint mit DB-Check erweitern
2. **DB-Migration** - `match_confidence`, `match_method`, `booking_date`, `end_to_end_id` Spalten
3. **shared/schema/finance.ts** - Neue Spalten im Drizzle-Schema
4. **server/services/bankImportService.ts** - Spaltennamen an Schema anpassen
5. **server/routes/banking.ts** - CAMT-Import und Learn-Match Routen

### Reihenfolge:
1. DB-Migration (neue Spalten)
2. Schema-Update
3. BankImportService-Fix
4. Banking-Route
5. Health-Endpoint

