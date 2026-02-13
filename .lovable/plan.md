
# Tiefenprüfung: ImmoflowMe
## Bewertung durch GF + IT-Leitung einer grossen Hausverwaltung

---

## 1. Fachliche Abdeckung (Geschaeftsfuehrung)

### Was die Software kann

| Bereich | Status | Bewertung |
|---------|--------|-----------|
| Objekt-/Einheiten-/Mieterverwaltung | Vollstaendig | Hierarchie Property - Unit - Tenant korrekt abgebildet |
| Vorschreibung (monatliche Rechnungen) | Vollstaendig | BK/HK/Miete mit korrekten USt-Saetzen (10%/20%) |
| BK-Abrechnung (§21 MRG) | Vollstaendig | 6 Verteilungsschluessel, Pro-Rata bei Mieterwechsel, Wasserkosten separat |
| SEPA-Export (Lastschrift + Ueberweisung) | Vollstaendig | pain.008.001.02 und pain.001.001.03 konform |
| Mahnwesen (3-stufig, §1333 ABGB) | Vollstaendig | Automatische Zinsberechnung, E-Mail-Versand |
| VPI-Wertsicherung | Vollstaendig | Schwellenwert 5%, automatische Anpassung |
| MieWeG-Indexierungsrechner | Vollstaendig | Haelfteregelung, 2026/2027-Caps korrekt |
| WEG §31 Ruecklage | Vollstaendig | Min. 0,90 EUR/qm/Monat, Compliance-Check |
| WEG §24 Eigentuemerversammlung | Vorhanden | Einladungsfristen |
| MRG §27b Kautionsrueckgabe | Vorhanden | 14-Tage-Deadline-Monitoring |
| FinanzOnline USt-VA (U30) | Vorhanden | XML-Generation mit Kennzahlen |
| BMD NTCS / DATEV Export | Vorhanden | Buchhaltungs-Schnittstellen |
| Leerstandsverwaltung | Vorhanden | Vacancy-Vorschreibung (BK+HK, Miete=0) |
| Doppelte Buchhaltung | Vorhanden | Einheitskontenrahmen Klassen 0-9 |
| OCR Dokumentenerfassung | Vorhanden | GPT-5.2 Vision fuer Mietvertraege/Rechnungen |
| Mieterportal | Vorhanden | Eigener Login fuer Mieter |
| Eigentuemer-Reporting | Vorhanden | Gesamtabrechnung PDF |

### Fehlende / Schwache Bereiche (fuer grosse HV relevant)

1. **Keine CAMT.053 / MT940 Bankimport-Schnittstelle** erkennbar - fuer eine grosse HV mit tausenden Zahlungen pro Monat ist automatischer Bankabgleich essenziell
2. **Kein Dokumenten-Management-System (DMS)** mit Versionierung - die `documentManagementService.ts` existiert, aber die Tiefe ist unklar
3. **Kein Eigentuemer-Umlagekreis** bei WEG (§34/38/39 nur in Memory erwaehnt, Code-Implementierung nicht vollstaendig sichtbar)
4. **Keine Heizkostenverordnung (HeizKG)** - 70/30-Split in Memory erwaehnt, aber kein dedizierter Service
5. **Keine Anbindung an Grundbuch oder GIS** fuer Liegenschaftsdaten
6. **Keine Multi-Mandanten-Trennung auf DB-Ebene** - Isolation nur ueber organizationId-Filter (fuer grosse HVs mit sensiblen Daten ein Risiko)

---

## 2. Technische Architektur (IT-Leitung)

### Staerken

**Sicherheitsarchitektur (Note: Sehr Gut)**
- Invite-Only-Registrierung (kein oeffentlicher Sign-up)
- bcrypt mit 12 Salt-Rounds fuer Passwoerter
- RBAC mit 7 Rollen (admin, property_manager, finance, viewer, tester, auditor, ops)
- Org-Ownership-Pruefung traversiert 16 Tabellen (tenant - unit - property - org)
- Ownership-Violations werden geloggt (`logOwnershipViolation`)
- Period-Lock verhindert Aenderungen in gesperrten Buchungsperioden
- Retention-Guard erzwingt BAO (7J) / GoBD (10J) Aufbewahrungsfristen
- CSP mit Nonce + strict-dynamic + Proxy-Stripping-Detection
- CSRF-Schutz vorhanden
- Rate-Limiting pro Organisation

**Audit-Trail (Note: Sehr Gut)**
- SHA-256 Hash-Chain auf `audit_logs`
- Immutability-Trigger (kein UPDATE/DELETE moeglich)
- Jede Zahlungsallokation wird atomisch geloggt
- CloudTrail-Style Artifact Access Logging
- Dual Audit: sowohl `audit_logs` als auch `audit_events` Tabelle

**Finanzlogik (Note: Gut)**
- FIFO-Zahlungsallokation mit Optimistic Locking (5 Retries)
- `roundMoney()` und `reconcileRounding()` fuer Cent-Genauigkeit
- Deterministische Rundungsverteilung (sortiert nach Betrag/LineType/UnitId)
- DB-Transaktionen fuer alle finanzkritischen Operationen
- Asynchrone Ledger-Synchronisation via Job-Queue

**Test-Infrastruktur (Note: Gut)**
- 50+ Unit-Tests fuer kritische Geschaeftslogik
- Integration-Tests gegen echte DB
- E2E-Tests mit Playwright
- k6 Load-Tests
- Spezialtests: SEPA-XSD-Validierung, Settlement-Rundung, Race-Conditions

### Schwaechen und Risiken

**Architektur-Bedenken (Mittel-Hoch)**

1. **Dual-Backend-Problem**: Die Software nutzt GLEICHZEITIG:
   - Express.js Backend (server/) mit Session-Auth
   - Supabase/Lovable Cloud mit eigenem Auth
   - Frontend hat `useUserRole.ts` das direkt Supabase aufruft, waehrend Backend Session-basiert ist
   - Dies ist ein **architektonischer Widerspruch** der zu Inkonsistenzen fuehren kann

2. **Hardcoded Admin-Email** in `server/auth.ts`:
   ```
   const ADMIN_EMAIL = "stephania.pfeffer@outlook.de";
   ```
   Das ist ein Single-Point-of-Failure und sollte in einer Umgebungsvariable stehen

3. **SEPA Mandats-Datum hardcoded**: 
   ```
   <DtOfSgntr>2020-01-01</DtOfSgntr>
   ```
   In Produktion muss das tatsaechliche Mandats-Unterschriftsdatum pro Mieter verwendet werden

4. **Kein Connection-Pooling sichtbar** - bei einer grossen HV mit vielen gleichzeitigen Nutzern kritisch

5. **1000-Row Supabase-Limit** - bei grossen Portfolios (1000+ Einheiten) werden Abfragen abgeschnitten

**Skalierbarkeit (Mittel)**

6. **Billing-Run ist synchron-transaktional**: Bei 500+ Mietern wird die Vorschreibungsgenerierung sehr langsam (Single Transaction, kein Batching ueber Properties hinweg)

7. **Settlement-Berechnung N+1 Queries**: `calculateTenantSettlement` macht pro Mieter mehrere DB-Abfragen fuer Distribution-Keys - bei 200 Mietern sind das 600+ Queries

8. **Kein Redis/Cache-Layer** fuer haeufig abgefragte Daten (Properties, Units, Distribution Keys)

**Betriebliche Risiken (Hoch)**

9. **Kein Health-Endpoint sichtbar** fuer Monitoring (nur in Test-Script referenziert)

10. **Session-Store**: `express-session` ohne explizit konfigurierten Store laeuft im Memory - bei Neustart gehen alle Sessions verloren

11. **Keine Backup-Strategie** im Code erkennbar (abhaengig von Plattform)

---

## 3. Compliance-Bewertung

| Anforderung | Status | Anmerkung |
|-------------|--------|-----------|
| DSGVO Art. 15 (Auskunft) | Vorhanden | GDPR-Export mit HMAC-SHA256-Signierung |
| DSGVO Art. 17 (Loeschung) | Teilweise | Retention-Guard blockiert korrekt, Anonymisierung erwaehnt aber Code unklar |
| BAO §132 (7J Aufbewahrung) | Vorhanden | retentionGuard.ts implementiert |
| GoBD (10J Aufbewahrung) | Vorhanden | Fuer Settlements/Expenses |
| MRG §21 (BK-Abrechnung) | Vorhanden | Deadline-Warnungen, Verteilungsschluessel |
| §1333 ABGB (Verzugszinsen) | Vorhanden | 4% p.a., korrekt berechnet |
| WEG-Novelle 2022/2024 | Teilweise | §31 ja, §34/38/39 unklar |

---

## 4. Gesamtbewertung

### Fuer welche HV-Groesse geeignet?

| Groesse | Eignung | Begruendung |
|---------|---------|-------------|
| Klein (bis 200 Einheiten) | Gut geeignet | Alle Kernfunktionen vorhanden |
| Mittel (200-1000 Einheiten) | Bedingt geeignet | Performance-Optimierungen noetig, Bankimport fehlt |
| Gross (1000+ Einheiten) | Noch nicht geeignet | Skalierung, Multi-Mandant-Isolation, Bankanbindung fehlen |

### Top-5 Massnahmen vor Produktiveinsatz

1. **Bankimport (CAMT.053/MT940)** implementieren - ohne automatischen Zahlungsabgleich ist die Software fuer professionelle HVs nicht einsetzbar
2. **Dual-Auth bereinigen** - entweder Express-Session ODER Supabase-Auth, nicht beides
3. **SEPA Mandatsdatum** aus Mieterstammdaten lesen statt hardcoded
4. **Admin-Email** in Umgebungsvariable verschieben
5. **Performance-Optimierung** der Settlement-Berechnung (Batch-Queries statt N+1)

### Fazit

Die Software hat eine **beeindruckend vollstaendige oesterreichische Fachlogik** (MRG, WEG, ABGB, FinanzOnline) und eine **ueberdurchschnittlich gute Sicherheitsarchitektur** (Audit-Trail, RBAC, Retention-Guards, CSP). Die Test-Abdeckung ist fuer ein Projekt dieser Art sehr gut.

Fuer eine **kleine bis mittlere Hausverwaltung** (bis ca. 500 Einheiten) ist die Software nach Behebung der Top-5-Punkte produktiv einsetzbar. Fuer eine **grosse HV** (1000+ Einheiten) fehlen noch Skalierungs-Features und eine professionelle Bankanbindung.

Die groesste technische Schwachstelle ist das **Dual-Backend-Problem** (Express + Supabase parallel), das architektonisch bereinigt werden sollte bevor man in Produktion geht.
