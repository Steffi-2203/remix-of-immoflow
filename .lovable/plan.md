
# Plan: EBICS Live-Verbesserung + E1a/E1b Steuer-Export

## Zusammenfassung

Zwei Verbesserungen: (1) EBICS von CSV-Import auf echte Live-Banking-Anbindung optimieren und (2) E1a/E1b Steuerbeilagen fuer Eigentuemer als neues Modul implementieren.

---

## Teil 1: EBICS Live-Banking Verbesserung

### Ist-Zustand

- EBICS-Infrastruktur existiert vollstaendig: Schema (3 Tabellen mit RLS), Service (664 Zeilen), Routes, Frontend
- RSA-Key-Management, INI/HIA-Initialisierung, CAMT.053-Download, pain.001-Upload sind implementiert
- Problem: Die Verbindung zum Bankserver ist "fire-and-forget" -- es fehlt Retry-Logik, Statuspolling und automatisierte Intervall-Abrufe

### Verbesserungen

1. **Automatischer Abruf-Scheduler**: Konfigurierbare Intervalle (taeglich/stuendlich) fuer automatischen Kontoauszugsabruf via CAMT.053
2. **Retry-Logik mit Backoff**: Bei Netzwerkfehlern automatisch 3 Versuche mit exponentiellem Backoff
3. **Connection Health Check**: Statusanzeige der Bankverbindung (letzte erfolgreiche Kommunikation, Fehlerquote)
4. **Batch-Payment Verbesserung**: Direkte Erstellung von Zahlungsauftraegen aus offenen Lieferantenrechnungen und Loehnen
5. **CAMT.053-Auto-Matching**: Automatische Zuordnung heruntergeladener Bankbewegungen zu offenen Forderungen

---

## Teil 2: E1a/E1b Steuer-Export (NEU)

### Was ist E1a/E1b?

- **E1a**: Beilage zur Einkommenssteuererklaerung fuer "Einkuenfte aus Vermietung und Verpachtung"
- **E1b**: Beilage fuer "Einkuenfte aus Grundstuecksveraeusserungen" (optional, spaeter)
- Jeder Eigentuemer braucht jaehrlich eine E1a pro Liegenschaft fuer den Steuerberater bzw. FinanzOnline

### Datenbank: Neue Tabelle

**`tax_reports`** -- Protokoll generierter Steuerbeilagen

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID PK | |
| organization_id | UUID FK | Organisation |
| owner_id | UUID FK | Eigentuemer |
| property_id | UUID FK | Liegenschaft |
| report_type | TEXT | 'E1a' oder 'E1b' |
| tax_year | INTEGER | Steuerjahr |
| data | JSONB | Berechnete Kennzahlen |
| xml_content | TEXT | FinanzOnline-XML |
| status | TEXT | 'entwurf', 'freigegeben', 'exportiert' |
| created_at | TIMESTAMPTZ | |

RLS: Nur eigene Organisation sichtbar.

### Backend-Service: `taxReportingService.ts`

Aggregiert aus bestehenden Daten:

- **Mieteinnahmen**: Aus `monthly_invoices` (Grundmiete pro Liegenschaft/Eigentuemer-Anteil)
- **Betriebskosten-Einnahmen**: Aus `monthly_invoices` (BK-Vorschreibungen)
- **Werbungskosten/Ausgaben**: Aus `expenses` (Instandhaltung, Versicherung, Verwaltung, etc.)
- **AfA**: Berechnung aus Gebaeude-Anschaffungskosten (1,5% p.a. nach EStG)
- **Zinsaufwand**: Aus Kreditzinsen (falls erfasst)

E1a-Kennzahlen (FinanzOnline-Formular):
- KZ 370: Mieteinnahmen brutto
- KZ 371: Betriebskosten-Einnahmen
- KZ 380: Werbungskosten (Instandhaltung)
- KZ 381: AfA
- KZ 382: Zinsen Fremdkapital
- KZ 383: Verwaltungskosten
- KZ 390: Einkuenfte aus V+V (Saldo)

### API-Endpunkte

```text
GET    /api/tax-reports/:ownerId/:year      -- E1a-Berechnung fuer Eigentuemer
GET    /api/tax-reports/:ownerId/:year/xml   -- FinanzOnline-XML-Export
GET    /api/tax-reports/properties/:propId/:year  -- E1a pro Liegenschaft
POST   /api/tax-reports/generate             -- Report generieren + speichern
GET    /api/tax-reports/history               -- Alle generierten Reports
```

### Frontend

- Neuer Tab "Steuer-Export" in der bestehenden FinanzOnline/Export-Seite
- **Eigentuemer-Auswahl** + Jahresauswahl
- **E1a-Vorschau**: Tabelle mit allen Kennzahlen, aufgeschluesselt nach Liegenschaft
- **Eigentuemer-Anteil**: Automatische Berechnung basierend auf `property_owners.ownership_share`
- **XML-Download**: Button fuer FinanzOnline-konformes XML
- **PDF-Export**: Zusammenfassung fuer den Steuerberater

### Integration mit bestehenden Daten

```text
property_owners (Anteil%) --+
                             |
monthly_invoices (Einnahmen) +--> taxReportingService --> E1a-Kennzahlen
                             |
expenses (Ausgaben)        --+
                             |
properties (Gebaeudedaten) --+
```

---

## Technischer Umfang

| Bereich | Dateien | Aufwand |
|---------|---------|--------|
| DB-Migration | 1 neue Tabelle (tax_reports) | Klein |
| Schema | `shared/schema/taxReporting.ts` | Klein |
| Backend | `server/services/taxReportingService.ts` | Mittel |
| API-Routes | `server/routes/taxReports.ts` + Registrierung | Klein |
| EBICS-Verbesserung | Update `ebicsService.ts` (Retry, Health, Scheduler) | Mittel |
| Frontend E1a | Neue Komponente in Export-Seite | Mittel |
| Frontend EBICS | Updates in `EbicsBanking.tsx` (Status-Dashboard) | Klein |
| Hooks | `useEbicsApi.ts` erweitern + `useTaxReports.ts` neu | Klein |

### Reihenfolge

1. E1a-Schema + Migration
2. taxReportingService (Kernlogik)
3. API-Routes + Frontend
4. EBICS-Verbesserungen (Retry, Health Check, Auto-Abruf)
