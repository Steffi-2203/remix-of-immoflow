
# Pruefbericht: ImmoflowMe - Ist-Zustand und Verbesserungen

## Status: App laeuft, Server startet

Der im Bericht gemeldete Syntax-Fehler in `routes.ts` existiert **nicht mehr** -- die Datei ist sauber (51 Zeilen, modulares Import-Pattern). Die App laeuft, alle Seiten laden fehlerfrei.

---

## TEIL 1: Was funktioniert (verifiziert durch Live-Test)

| Bereich | Status | Details |
|---------|--------|---------|
| Landing Page | OK | Laedt, Cookie-Consent funktioniert |
| Dashboard | OK | Laedt (Skeleton-Loading, Daten abhaengig von Auth) |
| Finanzbuchhaltung | OK | Alle 8 Tabs vorhanden: Journal, Kontenplan, Saldenliste, Bilanz, GuV, Anlagen (AfA), UVA, BMD/DATEV |
| EBICS Live-Banking | OK | 4 Tabs: Verbindungen, Kontoauszuege, Zahlungen, Protokoll |
| Journal-Backfill | OK | **228 Buchungssaetze** mit **841 Buchungszeilen** erfolgreich erstellt |
| Routing | OK | `routes.ts` sauber modularisiert (18 Domain-Module) |
| Accounting-Komponenten | OK | 9 Dateien in `src/components/accounting/` |
| Hooks | OK | `useJournalEntries.ts`, `useChartOfAccounts.ts`, `useDemoAccounting.ts` vorhanden |
| EBICS-Service | OK | `server/services/ebicsService.ts` (749 Zeilen, inkl. Retry-Logik) |
| Tax Reports | OK | Service + Routes + Frontend-Tab vorhanden |

---

## TEIL 2: Gefundene Probleme (zu fixen)

### Problem 1: `/demo` Route fehlt (404)

**Schwere: Hoch** -- Landing Page und Login verlinken auf `/demo`, aber die Route ist in keiner Route-Datei registriert.

- `Landing.tsx` Zeile 64/87: `<Link to="/demo">`
- `Login.tsx` Zeile 158: `<Link to="/demo">`
- Seiten existieren: `src/pages/demo-request.tsx` und `src/pages/demo-activate.tsx`
- **Aber**: Weder in `publicRoutes.tsx` noch in `protectedRoutes.tsx` registriert

**Fix**: Demo-Seiten in `publicRoutes.tsx` registrieren:
```
/demo --> demo-request.tsx
/demo/activate --> demo-activate.tsx
```

### Problem 2: `property_owners` hat nur 1 Eintrag

**Schwere: Mittel** -- Der E1a Steuer-Export braucht Eigentuemer-Daten. Aktuell existiert nur 1 Eigentuemer-Eintrag. Ohne vollstaendige Zuordnung von Eigentuemern zu Liegenschaften kann keine E1a-Berechnung durchgefuehrt werden.

**Fix**: Eigentuemer-Verwaltung in der UI zugaenglich machen (z.B. in den Liegenschafts-Details) und Demo-Daten auffuellen.

### Problem 3: Dashboard zeigt kaum Daten

**Schwere: Niedrig** -- Das Dashboard (`SimpleDashboard`) zeigt nur eine Skeleton-Box und dann leeren Bereich. Es fehlt die Anbindung an die echten Daten (Journal-Eintraege, offene Rechnungen, etc.).

---

## TEIL 3: Verbesserungsvorschlaege

### Prioritaet 1 (Sofort)
1. `/demo` und `/demo/activate` Routen registrieren
2. Dashboard mit echten KPIs befuellen (offene Forderungen, letzte Buchungen, Kontostand)

### Prioritaet 2 (Kurzfristig)
3. Eigentuemer-Daten auffuellen fuer E1a-Funktionalitaet
4. E1a PDF-Export (aktuell nur XML)
5. EBICS automatischer Abruf-Scheduler (Cron-Job)

### Prioritaet 3 (Mittelfristig)
6. E1b Steuer-Modul (Grundstuecksveraeusserungen)
7. Accounting: Automatischer Jahresabschluss mit Eroeffnungsbilanz
8. Bank-Reconciliation AI-Matching verbessern

---

## Technischer Umfang fuer sofortige Fixes

| Datei | Aenderung |
|-------|-----------|
| `src/routes/publicRoutes.tsx` | 2 neue Route-Eintraege fuer `/demo` und `/demo/activate` |
| `src/pages/SimpleDashboard.tsx` | KPI-Cards mit echten Daten (Journal-Summen, offene Rechnungen) |

Geschaetzter Aufwand: Klein (beide Fixes zusammen < 50 Zeilen Code-Aenderung)
