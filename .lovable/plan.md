

# Tiefenanalyse: ImmoflowMe - "Herz und Nieren"-Pruefung

## Gesamtbewertung

Die Software hat eine solide Grundstruktur mit beeindruckender Fachtiefe (MRG, ABGB, HeizKG). Es gibt jedoch **kritische architektonische Probleme**, die vor einem produktiven Einsatz behoben werden muessen.

---

## 1. KRITISCH: Duale Datenarchitektur (Frontend vs. Backend)

**Problem:** Die Frontend-Hooks (z.B. `useUnits`, `useTenants`, `usePayments`, `useInvoices`) greifen **direkt auf die Datenbank** via Supabase-Client zu. Gleichzeitig existieren Backend-Routen (`/api/units`, `/api/tenants` etc.) in `server/routes.ts` mit Pagination, Masking und RBAC -- die aber **nie aufgerufen werden**.

**Auswirkung:**
- Die serverseitige Pagination (`parsePagination`/`paginateArray`) wird von **keinem einzigen Frontend-Hook** verwendet
- Das Daten-Masking fuer Tester-Rollen greift im Frontend nicht
- RBAC-Middleware (`requirePermission`) wird umgangen
- Bei 500+ Einheiten laedt der Client **alle Daten in den Speicher**

**Betroffene Hooks (62 Dateien!):** `useUnits`, `useTenants`, `usePayments`, `useInvoices`, `useExpenses`, `useContractors`, `useCalendarEvents`, `useJournalEntries`, und viele mehr -- alle nutzen `supabase.from()` direkt.

**Loesung:** Entweder alle Hooks auf die `/api/*`-Endpunkte umstellen, oder die RLS-Policies so absichern, dass der direkte Zugriff sicher ist UND Pagination clientseitig oder via Supabase `.range()` implementieren.

---

## 2. KRITISCH: Sicherheitsluecken

### 2a. Overpermissive RLS-Policies
Der Linter meldet **"RLS Policy Always True"** -- es gibt Policies mit `USING (true)` fuer INSERT/UPDATE/DELETE. Das bedeutet: **Jeder authentifizierte Nutzer kann Daten anderer Organisationen aendern/loeschen.**

### 2b. Leaked Password Protection deaktiviert
Supabase's Schutz gegen kompromittierte Passwoerter ist ausgeschaltet.

### 2c. Extensions im Public-Schema
Sicherheitskritische Extensions liegen im `public`-Schema statt in einem dedizierten Schema.

---

## 3. HOCH: Console-Fehler auf dem Dashboard

Zwei React-Warnings auf `/dashboard`:
- **`OffenePostenWidget`**: `Badge`-Komponente bekommt eine `ref`, obwohl sie kein `forwardRef` nutzt
- **`CalendarWidget`**: `Popover`-Komponente hat dasselbe Problem

Diese Warnings deuten auf potenzielle Rendering-Probleme hin und koennen in zukuenftigen React-Versionen zu Fehlern werden.

**Loesung:** Die `Badge`-Komponente in `src/components/ui/badge.tsx` muss `React.forwardRef` verwenden.

---

## 4. HOCH: Pagination nur serverseitig -- Frontend ignoriert sie

Die Pagination-Infrastruktur (`server/lib/pagination.ts`) ist korrekt implementiert mit:
- `parsePagination()` -- Query-Parameter parsen
- `paginateArray()` -- In-Memory-Slice mit Metadaten
- `paginatedResponse()` -- Standardisiertes Envelope

**Aber:** Alle Frontend-Hooks greifen direkt auf Supabase zu und laden **alle Datensaetze ohne Limit**. Die `.order()`-Aufrufe ohne `.range()` liefern bis zu 1000 Zeilen (Supabase-Default), was bei grossen Bestaenden zu Problemen fuehrt.

---

## 5. MITTEL: Job-Queue-Infrastruktur vorhanden, aber unvollstaendig

**Positiv:**
- `jobQueueService.ts` ist implementiert mit `FOR UPDATE SKIP LOCKED`
- Worker startet in `server/index.ts` (Zeile 241)
- `process-job-queue` Edge Function ist registriert

**Luecken:**
- Nur der `billing_run` Handler ist registriert -- `sepa_export`, `settlement_calculation`, `dunning_run` etc. haben **keine Handler**
- Keine UI-Komponente zeigt den Job-Status an
- Die Edge Function und der Server-Worker koennten sich gegenseitig Jobs wegnehmen (kein Lock-Koordination zwischen beiden)

---

## 6. MITTEL: Billing Engine -- Generalisierung korrekt

**Positiv:**
- `vatConfig.ts` ist sauber aufgebaut mit `VatProfile`, `BillingRules`, `LineTypeConfig`
- `resolveVatProfile()` unterscheidet korrekt zwischen Wohnung (10%) und Gewerbe (20%)
- `InvoiceGenerator` nutzt die konfigurierbaren Rules
- Das hardcodierte `create-settlement-2025.ts` wurde entfernt

**Luecken:**
- Keine Wasserkosten in `InvoiceGenerator.buildInvoiceData()` obwohl in `lineTypes` konfiguriert
- Kein Per-Organization Override in der Praxis implementiert (Parameter existiert, wird aber nie uebergeben)

---

## 7. NIEDRIG: Load-Test-Infrastruktur solide

`tools/load_test_bulk.sh` ist gut aufgebaut mit:
- Realistischer Datengenerierung (Property/Unit/Invoice-Hierarchie)
- Lock-Profiling waehrend des Laufs
- WAL-Analyse und Checkpoint-Delta
- Acceptance-Gates (SLA, Lock-Timeout, Zero-Dupes)

Kein unmittelbarer Handlungsbedarf.

---

## Zusammenfassung der Prioritaeten

| # | Schwere | Problem | Aufwand |
|---|---------|---------|---------|
| 1 | KRITISCH | Frontend umgeht Backend-Routen (Pagination, RBAC, Masking wirkungslos) | Hoch |
| 2 | KRITISCH | RLS-Policies mit `USING(true)` -- Daten anderer Orgs zugreifbar | Mittel |
| 3 | HOCH | Console-Errors: Badge/Popover forwardRef | Niedrig |
| 4 | HOCH | Keine clientseitige Pagination (alle Daten geladen) | Mittel |
| 5 | MITTEL | Job-Queue Handler fehlen fuer 5 von 6 Job-Typen | Mittel |
| 6 | MITTEL | Wasserkosten nicht im Invoice-Generator verarbeitet | Niedrig |

---

## Empfohlener Umsetzungsplan

### Phase 1: Sicherheit (sofort)
1. RLS-Policies ueberarbeiten -- `organization_id`-basierte Isolation erzwingen
2. Leaked Password Protection aktivieren
3. Extensions aus Public-Schema verschieben

### Phase 2: Architektur-Entscheidung (Frontend-Routing)
Entscheidung treffen: Entweder
- **Option A:** Alle Hooks auf `/api/*`-Endpunkte umstellen (dann greifen Pagination, RBAC, Masking)
- **Option B:** RLS als primaere Sicherheit nutzen + `.range()` in Supabase-Queries einbauen

### Phase 3: Bugfixes
1. `Badge`-Komponente auf `React.forwardRef` umstellen
2. Wasserkosten im `InvoiceGenerator` verarbeiten

### Phase 4: Job-Queue vervollstaendigen
1. Handler fuer SEPA-Export, Settlement, Dunning, Report-Generation registrieren
2. Job-Status-UI im Admin-Bereich einbauen

