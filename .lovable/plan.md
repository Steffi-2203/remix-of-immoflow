
# Pentest-Autorisierungstemplate anlegen

## Ziel
Neue Datei `docs/PENTEST_AUTHORIZATION.md` mit einem ausfuellbaren Markdown-Template fuer Penetration-Test-Autorisierungen. Passt in die bestehende `docs/`-Struktur neben `SECURITY_COMPLIANCE_CHECKLIST.md` und `RUNBOOK_PRODUCTION.md`.

## Inhalt der Datei

Das Template enthaelt folgende Sektionen mit Platzhaltern (`<...>`):

1. **Auftraggeber** -- Firma, Ansprechpartner, Kontaktdaten
2. **Auftragnehmer** -- Pentest-Provider, Ansprechpartner
3. **Scope (In-Scope)** -- vorausgefuellt mit ImmoflowMe-spezifischen Endpunkten:
   - Web-Frontend (Staging)
   - API (Staging)
   - Staging-DB
   - OCR-Endpunkte (`/api/ocr/*`)
   - Edge Functions (`/api/functions/*`)
   - Storage-Buckets (expense-receipts, tenant-documents)
   - Bank-Integration-Sandbox
   - CI/CD Pipeline (read-only)
4. **Out-of-Scope** -- Produktions-DB, Third-Party-Production (Stripe, OpenAI), Social Engineering, Physical Testing
5. **Testfenster** -- Start/Ende mit Zeitzone, Arbeitszeiten
6. **Erlaubte Techniken** -- Passive Recon, Authenticated Scans, Manual Exploitation (read-only PoC), keine destructive Tests
7. **Notfallkontakt** -- On-Call Name, Telefon, E-Mail
8. **Kill-Switch** -- Abbruchkriterien und Verfahren
9. **Reporting** -- Interim (kritische Findings sofort), Final Report (Executive Summary + Technical Appendix + PoC + Remediation), Retest-Fenster
10. **Genehmigung** -- Approver-Zeile mit Unterschrift/Datum
11. **Aenderungshistorie** -- Tabelle fuer Versionierung (Datum, Autor, Aenderung)

## Technische Details

### Neue Datei:
- `docs/PENTEST_AUTHORIZATION.md`

### Keine Aenderungen an:
- Bestehenden Dateien
- Produktivcode
- DB-Schema
