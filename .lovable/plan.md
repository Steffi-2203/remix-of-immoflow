

# Implementierungsplan: DMS, Rules Engine, Kommunikation, Enterprise & Compliance

## Uebersicht

8 Features in 3 Prioritaetsstufen. Geschaetzter Gesamtaufwand: ~1.500 Zeilen Code, 4 neue DB-Tabellen, 2 Edge Functions.

---

## Feature 1: DMS Versioning & Tagging

**Ist-Zustand:** Dokumente werden in 3 Tabellen gespeichert (`property_documents`, `unit_documents`, `tenant_documents`). Kein Versionsverlauf, keine Tags. Ueberschreiben loescht die alte Version.

**Umsetzung:**

1. **Neue DB-Tabelle `document_versions`:**
   - `id`, `document_type` (property/unit/tenant), `document_id`, `version_number`, `file_url`, `file_size`, `uploaded_by`, `comment`, `created_at`
   - Trigger: Bei Upload in eine der 3 Dokumenttabellen wird die alte `file_url` automatisch als Version archiviert

2. **Neue DB-Tabelle `document_tags`:**
   - `id`, `document_type`, `document_id`, `tag` (varchar), `created_at`
   - Index auf `(document_type, document_id)` und `tag`

3. **Frontend-Aenderungen:**
   - `DocumentList.tsx`: Neue Spalte "Tags" mit editierbaren Badge-Chips (Klick zum Hinzufuegen/Entfernen)
   - `DocumentList.tsx`: Versions-Icon pro Zeile, Klick oeffnet Versions-Dialog mit Liste aller Versionen (Datum, Kommentar, Download-Link)
   - `Documents.tsx`: Neuer Filter "Nach Tag filtern" im Suchbereich
   - Neuer Hook `useDocumentVersions.ts` und `useDocumentTags.ts`

---

## Feature 2: Rules Engine Dry-Run

**Ist-Zustand:** `canUseAutomation` existiert als Feature-Flag (Pro-Tier), aber keine Rules-Engine-UI oder Backend-Logik vorhanden. Nur ein `dryRun: true` Parameter in `SystemTest.tsx`.

**Umsetzung:**

1. **Neue DB-Tabelle `automation_rules`:**
   - `id`, `organization_id`, `name`, `description`, `trigger_type` (enum: zahlungseingang, mietende, faelligkeit, leerstand), `conditions` (jsonb), `actions` (jsonb: email_senden, mahnung_erstellen, status_aendern), `is_active`, `created_at`

2. **Edge Function `evaluate-rules`:**
   - Empfaengt Event-Typ + Kontext-Daten
   - Laedt aktive Regeln fuer die Organisation
   - Evaluiert Bedingungen gegen Kontext
   - `dry_run`-Parameter: Gibt nur zurueckm welche Aktionen ausgefuehrt wuerden, ohne sie tatsaechlich auszufuehren
   - Ergebnis: Array von `{ rule_name, would_trigger: boolean, actions: [...] }`

3. **Frontend:**
   - Neue Seite `/automatisierung` mit Regelliste (Name, Trigger, Status on/off)
   - Dialog zum Erstellen/Bearbeiten von Regeln (Trigger-Typ, Bedingungen als Formular, Aktionen als Checkboxen)
   - "Dry-Run testen" Button: Oeffnet Dialog, zeigt Simulationsergebnis als Tabelle (Regel, Wuerde ausloesen Ja/Nein, Geplante Aktionen)

---

## Feature 3: Kommunikationscenter - SMS-Fallback

**Ist-Zustand:** `Messages.tsx` hat SMS-UI (Radio-Button, Zeichenzaehler), aber kein Backend-Versand. E-Mail laeuft ueber Resend.

**Umsetzung:**

1. **Edge Function `send-sms`:**
   - Nutzt Lovable AI (kein externer SMS-Provider noetig) fuer Benachrichtigungslogik
   - Fallback-Kette: E-Mail zuerst via Resend, bei Fehler SMS-Hinweis in der Nachrichtentabelle
   - Status-Update in `messages`-Tabelle (`sent`, `failed`, `fallback_sms`)

2. **Frontend-Aenderung:**
   - `Messages.tsx`: Bei `message_type === 'sms'` oder `'both'`: Hinweisbanner "SMS-Versand erfordert einen externen SMS-Provider (z.B. Twilio). Aktuell wird eine E-Mail als Fallback gesendet."
   - Statusanzeige erweitern: Neuer Badge `Fallback` wenn SMS fehlschlug und E-Mail stattdessen gesendet wurde

---

## Feature 4: 2FA (TOTP-basiert)

**Ist-Zustand:** `input-otp.tsx` UI-Komponente existiert. Keine MFA-Logik im Auth-Flow.

**Umsetzung:**

1. **Lovable Cloud Auth-Konfiguration:**
   - MFA/TOTP ist als Funktion in der Authentifizierung verfuegbar
   - Aktivierung ueber `supabase.auth.mfa.enroll()`, `verify()`, `challenge()`

2. **Neue Komponente `TotpSetup.tsx`:**
   - QR-Code Anzeige (Base64 aus `enroll()`)
   - 6-stellige OTP-Eingabe mit `InputOTP`-Komponente
   - Backup-Codes Anzeige (einmalig bei Aktivierung)

3. **Neue Komponente `TotpChallenge.tsx`:**
   - Wird nach Login angezeigt wenn MFA aktiv
   - 6-stellige Code-Eingabe, Verifizierung ueber `supabase.auth.mfa.challengeAndVerify()`

4. **Integration:**
   - Settings-Seite: Neuer Abschnitt "Zwei-Faktor-Authentifizierung" mit Aktivieren/Deaktivieren
   - Login-Flow: Nach erfolgreichem Passwort-Login pruefen ob MFA aktiv, dann `TotpChallenge` anzeigen

---

## Feature 5: eIDAS-konforme elektronische Signaturen

**Ist-Zustand:** `audit_events` hat ein `signature`-Feld (nullable). Keine Signatur-Logik implementiert.

**Umsetzung:**

1. **Edge Function `sign-document`:**
   - Erzeugt SHA-256 Hash des Dokuments
   - Speichert Hash + Zeitstempel + Benutzer-ID als qualifizierte Signatur-Metadaten
   - Speichert in neuer DB-Tabelle `document_signatures` (id, document_type, document_id, hash, signer_id, signed_at, signature_level: 'simple' | 'advanced')

2. **Frontend:**
   - `DocumentList.tsx`: Neues Icon "Signieren" pro Dokument
   - Signatur-Dialog: Zeigt Dokumentname, Hash, Benutzer, bestaetigt mit Passwort
   - Signatur-Badge in der Dokumentliste (gruenes Haekchen wenn signiert)
   - Signatur-Verifizierung: Klick auf Badge zeigt Signaturdetails (Wer, Wann, Hash)

**Hinweis:** Fuer qualifizierte eIDAS-Signaturen (QES) waere ein externer Trust Service Provider noetig (z.B. Swisscom, A-Trust). Diese Implementierung deckt fortgeschrittene elektronische Signaturen (AdES) ab.

---

## Feature 6: Ad-hoc Reporting / Query Builder

**Ist-Zustand:** Feste Reports-Seite mit vordefinierten Charts. Kein dynamischer Query Builder.

**Umsetzung:**

1. **Frontend-Komponente `QueryBuilder.tsx`:**
   - Tabellen-Auswahl (Dropdown: Mieter, Einheiten, Zahlungen, Rechnungen, Ausgaben)
   - Spalten-Auswahl (Checkboxen basierend auf gewaehlter Tabelle)
   - Filter-Builder (Spalte + Operator + Wert, mehrere Filter kombinierbar)
   - Sortierung und Limit
   - "Ausfuehren" Button

2. **Edge Function `query-report`:**
   - Empfaengt strukturierte Query-Definition (Tabelle, Spalten, Filter)
   - Baut sichere Supabase-Query (KEIN rohes SQL - nur typisierte Client-API)
   - Erzwingt `organization_id`-Filter automatisch
   - Limit auf 500 Zeilen
   - Gibt Ergebnis als JSON zurueck

3. **Frontend-Ergebnis:**
   - Ergebnistabelle mit Sortierung
   - Export als CSV/Excel
   - "Als Bericht speichern" (Name + gespeicherte Query-Definition in `saved_reports` Tabelle)

---

## Feature 7: SCA Security Scanning Setup

**Ist-Zustand:** `SECURITY_COMPLIANCE_CHECKLIST.md` und `CICD_PIPELINE.md` existieren. Kein automatisiertes Dependency-Scanning konfiguriert.

**Umsetzung:**

1. **Dokumentation `docs/SCA_SECURITY_SCANNING.md`:**
   - npm audit Konfiguration und Schwellenwerte
   - GitHub Dependabot-Konfiguration (`.github/dependabot.yml`)
   - Snyk/Socket.dev Integration Guide
   - SBOM-Generierung (CycloneDX)

2. **Konfigurationsdateien:**
   - `.github/dependabot.yml`: Automatische PR-Erstellung fuer Dependency-Updates
   - Erweiterung `SECURITY_COMPLIANCE_CHECKLIST.md` um SCA-Abschnitt

---

## Feature 8: Backup & DR Dokumentation erweitern

**Ist-Zustand:** `docs/BACKUP_STRATEGY.md`, `docs/DR_RUNBOOK.md` existieren bereits mit pgBackRest, PITR, RTO/RPO-Zielen.

**Umsetzung:**

1. **Erweiterung `docs/BACKUP_STRATEGY.md`:**
   - Lovable Cloud spezifische Backup-Details (automatische taegliche Backups, PITR)
   - Retention-Policy Uebersicht (7 Jahre BAO, 10 Jahre GoBD)
   - Monitoring-Checkliste fuer Backup-Alerts

2. **Erweiterung `docs/DR_RUNBOOK.md`:**
   - Lovable Cloud Restore-Prozedur (statt Supabase Dashboard Referenzen)
   - Kommunikationsplan bei Ausfall
   - Eskalationsmatrix mit Kontakten

---

## Reihenfolge der Umsetzung

| Schritt | Feature | Abhaengigkeit |
|---------|---------|---------------|
| 1 | DMS Versioning & Tagging | Keine (DB-Migration + Frontend) |
| 2 | 2FA TOTP | Keine (Auth-Erweiterung) |
| 3 | Kommunikation SMS-Fallback | Keine (Edge Function + UI) |
| 4 | Rules Engine Dry-Run | Keine (DB + Edge Function + UI) |
| 5 | eIDAS Signaturen | Keine (DB + Edge Function + UI) |
| 6 | Query Builder | Keine (Edge Function + UI) |
| 7 | SCA Scanning | Keine (nur Dokumentation + Config) |
| 8 | Backup/DR Doku | Keine (nur Dokumentation) |

## Technische Details

**Neue DB-Tabellen:** `document_versions`, `document_tags`, `automation_rules`, `document_signatures`, `saved_reports`

**Neue Edge Functions:** `evaluate-rules`, `sign-document`, `query-report`, `send-sms`

**Neue Seiten:** `/automatisierung`

**Geaenderte Komponenten:** `DocumentList.tsx`, `Documents.tsx`, `Messages.tsx`, Settings-Seite (2FA-Abschnitt), Login-Flow (MFA-Challenge)

