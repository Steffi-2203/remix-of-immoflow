

# Refactoring: functions.ts aufbrechen, LSP-Fehler beheben, WAF/IP-Blacklisting

## Uebersicht

Drei Massnahmen zur Code-Hygiene und Haertung:

1. **functions.ts (937 Zeilen, 12 Endpoints)** in thematische Module aufteilen
2. **LSP-Fehler beheben** (doppelte `isAuthenticated`, Session-Typ-Import)
3. **WAF / IP-Blacklisting Middleware** fuer Brute-Force-Schutz

---

## 1. functions.ts aufbrechen

Die Datei enthaelt Endpoints aus voellig verschiedenen Domaenen. Aufteilung in bestehende und neue Route-Module:

| Endpoint | Ziel-Modul | Status |
|---|---|---|
| `generate-monthly-invoices` | `server/routes/finance.ts` | verschieben |
| `cron-generate-invoices` | `server/routes/jobs.ts` | verschieben |
| `validate-invoice` | `server/routes/finance.ts` | verschieben |
| `send-dunning` | `server/routes/finance.ts` | verschieben |
| `send-settlement-email` | `server/routes/settlements.ts` | verschieben |
| `send-invite` | **neu:** `server/routes/notifications.ts` | erstellen |
| `send-message` | **neu:** `server/routes/notifications.ts` | erstellen |
| `ocr-invoice` | **neu:** `server/routes/ocr.ts` | erstellen |
| `ocr-invoice-text` | **neu:** `server/routes/ocr.ts` | erstellen |
| `ocr-bank-statement` | **neu:** `server/routes/ocr.ts` | erstellen |
| `export-user-data` | `server/routes/exports.ts` | verschieben |
| `delete-account` | `server/routes/core.ts` | verschieben |
| `check-maintenance-reminders` | `server/routes/jobs.ts` | verschieben |

Nach der Migration wird `server/functions.ts` geloescht und der Import in `server/routes.ts` entfernt.

Hilfsfunktionen (`calculateTenantCarryForward`, `getVatRates`, `calculateVatFromGross`, `formatCurrency`, `ROLE_LABELS`, `VALID_UST_RATES_*`) werden in ein neues `server/lib/invoiceUtils.ts` extrahiert, damit die Route-Module schlank bleiben.

---

## 2. LSP-Fehler beheben

### 2a. Doppelte isAuthenticated entfernen

`functions.ts` (Zeile 15-20) definiert eine eigene `isAuthenticated` -- identisch mit `server/routes/helpers.ts` und `server/auth.ts`. Nach dem Aufbrechen wird diese entfernt. Alle Module importieren aus `./helpers`.

### 2b. Session-Typ-Deklaration zentralisieren

Die `declare module "express-session"` steht aktuell in `server/auth.ts` (Zeile 13-18). Das funktioniert, weil TypeScript das Modul global augmentiert. Um LSP-Fehler in anderen Dateien zu vermeiden (wenn `auth.ts` nicht im Compile-Pfad liegt), wird die Deklaration in eine dedizierte Datei verschoben:

**Neue Datei: `server/types/session.d.ts`**
```typescript
import "express-session";
declare module "express-session" {
  interface SessionData {
    userId: string;
    email: string;
  }
}
```

Aus `server/auth.ts` wird die Deklaration entfernt (Zeilen 13-18).

### 2c. @shared/schema Import-Pfad

Der `@shared/schema`-Alias ist in `tsconfig.json` korrekt konfiguriert. Falls der LSP trotzdem warnt, wird in `tsconfig.node.json` geprueft, ob `paths` dort ebenfalls gesetzt ist. Kein Code-Change noetig, nur Verifikation.

---

## 3. WAF / IP-Blacklisting

### Neue Datei: `server/middleware/ipBlacklist.ts`

Funktionalitaet:
- **Statische Blockliste**: Konfigurierbar via `IP_BLACKLIST` Environment-Variable (kommagetrennte IPs/CIDRs)
- **Dynamische Brute-Force-Sperre**: Zaehlt fehlgeschlagene Auth-Versuche pro IP (In-Memory Map mit TTL)
- **Schwellwert**: 10 fehlgeschlagene Versuche in 15 Minuten = 30 Minuten IP-Sperre
- **Logging**: Blockierte IPs werden via Pino geloggt
- **Graceful Degradation**: Bei Redis-Ausfall faellt auf In-Memory zurueck (bereits Pattern im Projekt)

Implementierung:

```text
Anfrage
  |
  v
[IP in statischer Blockliste?] --ja--> 403 Forbidden
  |
  nein
  v
[IP dynamisch gesperrt?] --ja--> 403 Forbidden + Retry-After
  |
  nein
  v
[Weiter zu Route]
  |
  v
[Auth fehlgeschlagen?] --ja--> Zaehler erhoehen
                                Wenn >= 10 --> IP sperren (30 Min)
```

### Integration in server/index.ts

Die Middleware wird VOR dem Rate-Limiter eingehaengt:

```typescript
app.use(ipBlacklistMiddleware);  // NEU
app.use(apiLimiter);             // bestehend
```

### Auth-Hook in server/auth.ts

Nach fehlgeschlagenem Login (`POST /api/auth/login` mit 401) wird `recordFailedAttempt(ip)` aufgerufen. Nach erfolgreichem Login wird `clearFailedAttempts(ip)` aufgerufen.

---

## Technische Details

### Neue Dateien:
1. `server/types/session.d.ts` -- Session-Typ-Deklaration
2. `server/routes/notifications.ts` -- E-Mail-Versand (Invite, Message)
3. `server/routes/ocr.ts` -- OCR-Endpoints (Invoice, Bank Statement)
4. `server/lib/invoiceUtils.ts` -- Shared Hilfsfunktionen
5. `server/middleware/ipBlacklist.ts` -- WAF/IP-Blocking

### Geaenderte Dateien:
1. `server/routes.ts` -- `registerFunctionRoutes` entfernen, neue Module registrieren
2. `server/routes/finance.ts` -- Invoice/Dunning-Endpoints aufnehmen
3. `server/routes/settlements.ts` -- Settlement-Email aufnehmen
4. `server/routes/exports.ts` -- User-Data-Export aufnehmen
5. `server/routes/core.ts` -- Delete-Account aufnehmen
6. `server/routes/jobs.ts` -- Cron/Maintenance-Endpoints aufnehmen
7. `server/auth.ts` -- Session-Deklaration entfernen, Brute-Force-Hook einfuegen
8. `server/index.ts` -- ipBlacklist-Middleware registrieren
9. `server/functions.ts` -- **geloescht**

### Reihenfolge:
1. `server/types/session.d.ts` + `server/lib/invoiceUtils.ts` erstellen
2. Neue Route-Module erstellen (notifications, ocr)
3. Endpoints in bestehende Module verschieben
4. `functions.ts` loeschen, `routes.ts` bereinigen
5. `ipBlacklist.ts` erstellen und in `index.ts` + `auth.ts` integrieren
