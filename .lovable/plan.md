
# Premium-Addon: Lohnverrechnung und Steuerreporting (120 EUR netto)

Zwei Features werden schrittweise umgesetzt. Dieses erste Paket startet mit der **ELDA/OeGK-Schnittstelle fuer Hausbetreuer-Lohnverrechnung**.

---

## Feature 1: ELDA/OeGK-Lohnverrechnung

### Was wird gebaut

Ein Modul zur Verwaltung von Hausbetreuern (Reinigung, Winterdienst, Haustechnik) mit automatischer Berechnung der Sozialversicherungsbeitraege und Export im ELDA-XML-Format fuer die Anmeldung/Abmeldung und monatliche Beitragsgrundlagenmeldung an die OeGK.

### Datenbank (neue Tabellen)

**`property_employees`** -- Hausbetreuer-Stammdaten
- id, organization_id, property_id (Zuordnung zur Liegenschaft)
- vorname, nachname, svnr (Sozialversicherungsnummer)
- geburtsdatum, adresse, plz, ort
- eintrittsdatum, austrittsdatum
- beschaeftigungsart: geringfuegig | teilzeit | vollzeit
- wochenstunden, bruttolohn_monatlich
- kollektivvertrag_stufe (Hausbetreuer-KV)
- status: aktiv | karenz | ausgeschieden
- created_at, updated_at

**`payroll_entries`** -- Monatliche Lohnabrechnungen
- id, employee_id, year, month
- bruttolohn, sv_dn (SV Dienstnehmeranteil), sv_dg (SV Dienstgeberanteil)
- lohnsteuer, db_beitrag (Dienstgeberbeitrag), dz_beitrag (Zuschlag zum DB)
- kommunalsteuer, mvk_beitrag (Mitarbeitervorsorgekasse)
- nettolohn, gesamtkosten_dg (Gesamtkosten Dienstgeber)
- auszahlungsdatum, status: entwurf | freigegeben | ausbezahlt
- created_at

**`elda_submissions`** -- ELDA-Meldungsprotokoll
- id, organization_id, employee_id
- meldungsart: anmeldung | abmeldung | aenderung | beitragsgrundlage
- zeitraum, xml_content, status: erstellt | uebermittelt | bestaetigt | fehler
- created_at

### Backend-Service: `eldaPayrollService.ts`

- `calculatePayroll(employeeId, year, month)` -- Berechnung nach oesterreichischen SV-Saetzen 2025/2026:
  - Geringfuegigkeitsgrenze: 518,44 EUR/Monat
  - SV-DN: 18,12% (KV 3,87% + PV 10,25% + AV 3,00% + AK 0,50% + WF 0,50%)
  - SV-DG: 21,23% (KV 3,78% + PV 12,55% + AV 3,00% + UV 1,10% + IESG 0,20% + WF 0,60%)
  - DB: 3,7%, DZ: je nach Bundesland (Wien 0,36%)
  - Kommunalsteuer: 3%
  - MVK: 1,53%
- `generateEldaXml(employeeId, meldungsart)` -- ELDA-konformes XML (Anmeldung/Abmeldung nach ASVG)
- `generateBeitragsgrundlage(organizationId, year, month)` -- Monatliche mBGM
- `calculateGeringfuegig(brutto)` -- Pruefung Geringfuegigkeitsgrenze

### API-Endpunkte (in `server/routes/payroll.ts`)

```text
GET    /api/employees                  -- Liste aller Hausbetreuer
POST   /api/employees                  -- Neuen Hausbetreuer anlegen
PUT    /api/employees/:id              -- Stammdaten aendern
DELETE /api/employees/:id              -- Soft-Delete

GET    /api/payroll/:employeeId/:year  -- Jahresuebersicht
POST   /api/payroll/calculate          -- Lohn berechnen
POST   /api/payroll/finalize           -- Freigeben

GET    /api/elda/generate/:employeeId  -- ELDA-XML generieren
GET    /api/elda/submissions           -- Meldungshistorie
POST   /api/elda/submit                -- Meldung erstellen
```

### Frontend

- Neuer Tab "Lohnverrechnung" in der Navigation (unter Buchhaltung oder als eigener Menue-Punkt)
- **Hausbetreuer-Verwaltung**: Tabelle mit Stammdaten, Status-Badge, Neu/Bearbeiten-Dialog
- **Lohnabrechnung**: Monatsauswahl, automatische Berechnung, Aufschluesselung SV/LSt/Nebenkosten
- **ELDA-Export**: Button fuer An-/Abmeldungs-XML, Beitragsgrundlagen-XML, Meldungshistorie mit Status

### Buchhaltungs-Integration

Jede freigegebene Lohnabrechnung erzeugt automatisch Journalbuchungen:
- Konto 6200 (Loehne) / Konto 3600 (Verbindlichkeiten AN)
- Konto 6500 (SV-DG) / Konto 3520 (Verbindlichkeiten SV)
- Konto 6560 (DB+DZ) / Konto 3540 (Verbindlichkeiten FA)
- Konto 6600 (Kommunalsteuer) / Konto 3560 (Verbindlichkeiten Gemeinde)

---

## Feature 2: E1a/E1b Steuerreporting (naechster Schritt)

Wird nach Fertigstellung der Lohnverrechnung umgesetzt:
- E1a-Beilage (Einkuenfte aus Vermietung und Verpachtung)
- E1b-Beilage (Einkuenfte aus Grundstuecksveraeusserungen)
- Aggregation aus bestehenden Buchhaltungsdaten
- FinanzOnline-XML-Export

---

## Technischer Umfang (Feature 1)

| Bereich | Dateien |
|---------|---------|
| DB-Migration | 3 neue Tabellen (property_employees, payroll_entries, elda_submissions) |
| Backend-Service | `server/services/eldaPayrollService.ts` |
| API-Routes | `server/routes/payroll.ts` + Registrierung in `server/routes.ts` |
| Schema | `shared/schema/payroll.ts` (Drizzle-Definitionen + Zod) |
| Frontend | Hausbetreuer-Seite, Lohnabrechnung-Komponente, ELDA-Export-View |
| Hooks | `src/hooks/usePayrollApi.ts` (SWR-Pattern wie bestehende Hooks) |
