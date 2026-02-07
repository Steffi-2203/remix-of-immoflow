

# WEG-Wirtschaftsplan und Eigentuemerwechsel

## Uebersicht

Zwei grosse Features werden implementiert:
1. **WEG-Wirtschaftsplan** (Jahresbudget mit automatischer Vorschreibungsgenerierung)
2. **Eigentuemerwechsel-Workflow** (nach Paragraph 38-39 WEG)

---

## Teil 1: WEG-Wirtschaftsplan

### Was wird gebaut?

Ein Wirtschaftsplan ist das jaehrliche Budget einer WEG-Liegenschaft. Er legt fest, wie viel jeder Eigentuemer monatlich an Vorschuss (Akonto) bezahlen muss. Die Betraege werden nach Nutzwerten (MEA) verteilt.

**Funktionen:**
- Wirtschaftsplan erstellen mit Positionen (BK, Verwaltung, Ruecklage, Heizung etc.)
- Automatische Aufteilung nach MEA auf alle Einheiten/Eigentuemer
- Stichtag waehlbar (Default: 01.01. des Folgejahres)
- Automatische Generierung der monatlichen Vorschreibungen ab Stichtag
- PDF-Export des Wirtschaftsplans und der Vorschreibungen
- Mindest-Ruecklagendotierung pruefen (0,90 Euro/qm/Monat, WEG-Novelle 2022)

### Datenbank-Aenderungen

**Neue Tabelle: `weg_business_plans`**
- id, organization_id, property_id
- year (Wirtschaftsjahr)
- title (z.B. "Wirtschaftsplan 2027")
- status: entwurf / beschlossen / aktiv
- effective_date (Stichtag, ab wann die Vorschreibungen gelten)
- total_amount (Gesamtjahreskosten)
- notes
- approved_at, approved_in_assembly_id (Verknuepfung zur Versammlung)
- created_at, updated_at

**Neue Tabelle: `weg_business_plan_items`**
- id, business_plan_id
- category (betriebskosten, verwaltung, ruecklage, heizung, wasser, sonstiges)
- description (z.B. "Liftkosten", "Rauchfangkehrer")
- annual_amount (Jahresbetrag netto)
- tax_rate (0, 10 oder 20 Prozent)
- distribution_key (mea, qm, personen, gleich)
- created_at

**Neue Tabelle: `weg_owner_invoices`**
- id, business_plan_id, owner_id (FK property_owners), unit_id
- year, month
- amount_net, amount_tax, amount_gross
- reserve_contribution (Ruecklage-Anteil separat)
- status: offen / bezahlt / teilbezahlt / ueberfaellig
- due_date
- is_prorated (aliquot bei Eigentuemerwechsel)
- prorated_days, total_days
- pdf_url
- created_at

### Frontend-Aenderungen

**Neuer Tab "Wirtschaftsplan" in WegManagement.tsx:**
- Liste aller Wirtschaftsplaene pro Liegenschaft
- "Neuen Wirtschaftsplan erstellen"-Dialog mit:
  - Jahr, Stichtag, Positionen (Kategorie, Beschreibung, Jahresbetrag, USt-Satz)
  - Live-Vorschau der monatlichen Betraege pro Eigentuemer/Einheit
  - Ruecklage-Warnung wenn unter 0,90 Euro/qm/Monat
- "Vorschreibungen generieren"-Button: erzeugt alle Monatszeilen in weg_owner_invoices
- PDF-Export: Wirtschaftsplan-Uebersicht und einzelne Vorschreibungen

**Neuer Hook: `useWegBusinessPlan.ts`**
- CRUD fuer Wirtschaftsplaene und Positionen
- Berechnung: Jahresbetrag je Position / 12 Monate x (MEA Einheit / MEA gesamt)
- Vorschreibungs-Generierung

**Neue Utility: `wegVorschreibungPdfExport.ts`**
- PDF im gleichen Stil wie bestehende Vorschreibungen, aber fuer WEG-Eigentuemer
- Positionen: BK-Akonto, Verwaltung, Ruecklage, Heizung etc.

---

## Teil 2: Eigentuemerwechsel

### Was wird gebaut?

Ein Wizard-basierter Workflow fuer den Wechsel eines WEG-Eigentuemers, der alle rechtlichen Anforderungen nach Paragraph 38-39 WEG automatisch abbildet.

**Funktionen:**
- Eigentuemerwechsel erfassen (alter/neuer Eigentuemer, Uebergabedatum, Grundbuchdaten)
- Aliquote Vorschreibungen fuer Uebergangsmonat
- Ruecklage-Uebertrag (automatisch, keine Auszahlung)
- Solidarhaftungs-Warnung bei Rueckstaenden (bis 3 Jahre)
- Abschlussrechnung fuer alten Eigentuemer (PDF)
- Neue Vorschreibungen fuer neuen Eigentuemer ab Stichtag
- Audit-Trail ueber bestehendes audit_logs-System

### Datenbank-Aenderungen

**Neue Tabelle: `weg_ownership_transfers`**
- id, organization_id, property_id, unit_id
- old_owner_id, new_owner_id (FK property_owners)
- transfer_date (Uebergabedatum)
- land_registry_date (Grundbucheintragung)
- land_registry_ref (TZ-Nummer)
- legal_reason: kauf / schenkung / erbschaft / zwangsversteigerung / einbringung
- status: entwurf / grundbuch_eingetragen / abgeschlossen
- outstanding_amount (offene Forderungen des alten Eigentuemers)
- reserve_balance_transferred (uebertragener Ruecklage-Anteil)
- notes
- created_by, created_at, completed_at

### Frontend-Aenderungen

**Neuer Dialog: `OwnershipTransferWizard.tsx`**
- 6-Schritte-Wizard:
  1. Einheit und bisherigen Eigentuemer anzeigen
  2. Neuen Eigentuemer eingeben oder aus bestehenden waehlen
  3. Uebergabedatum, Grundbuchdaten, Rechtsgrund
  4. Automatische Vorschau: Aliquotierung, offene Forderungen, Ruecklage
  5. Warnungen (Solidarhaftung, Mindest-Ruecklage)
  6. Bestaetigung und Durchfuehrung

**Automatische Aktionen bei Durchfuehrung:**
- property_owners: neuer Eigentuemer wird angelegt, alter bekommt ownership_share = 0
- weg_owner_invoices: offene Vorschreibungen des alten Eigentuemers ab Transfer storniert
- Neue aliquote Vorschreibung fuer Uebergangsmonat generiert
- Neue Vorschreibungen ab Folgemonat generiert (basierend auf aktivem Wirtschaftsplan)
- weg_reserve_fund: Uebertrag-Buchung dokumentiert

**Neuer Hook: `useOwnershipTransfer.ts`**
- Transfer erstellen, Vorschau berechnen, durchfuehren
- Aliquotierungslogik: (Tage neuer Eigentuemer / Tage Monat) x Monatsbetrag

**Neue Utility: `ownerTransferPdfExport.ts`**
- Abschlussrechnung PDF fuer alten Eigentuemer
- Uebergabe-Bestaetigung PDF

---

## Technische Details

### Berechnungslogik Wirtschaftsplan

```text
Monatlicher Vorschuss pro Eigentuemer:
+----------------------------------------------+
| Fuer jede Position im Wirtschaftsplan:       |
| Monatsanteil = Jahresbetrag / 12             |
| MEA-Anteil = Einheit-MEA / Gesamt-MEA       |
| Netto = Monatsanteil x MEA-Anteil            |
| USt = Netto x USt-Satz                       |
| Brutto = Netto + USt                         |
+----------------------------------------------+
| Ruecklage: separat, nicht USt-pflichtig      |
| Mindestpruefung: >= 0,90 EUR/qm/Monat       |
+----------------------------------------------+
```

### Aliquotierungslogik Eigentuemerwechsel

```text
Uebergabe am 15. Maerz (Monat hat 31 Tage):
+------------------------------------------+
| Alter Eigentuemer: 14/31 x Monatsbetrag  |
| Neuer Eigentuemer: 17/31 x Monatsbetrag  |
+------------------------------------------+
| Folgemonat (April+): voller Monatsbetrag |
+------------------------------------------+
```

### Dateien die erstellt/geaendert werden

| Aktion | Datei |
|--------|-------|
| Neu | src/hooks/useWegBusinessPlan.ts |
| Neu | src/hooks/useOwnershipTransfer.ts |
| Neu | src/components/weg/BusinessPlanDialog.tsx |
| Neu | src/components/weg/BusinessPlanPreview.tsx |
| Neu | src/components/weg/OwnershipTransferWizard.tsx |
| Neu | src/utils/wegVorschreibungPdfExport.ts |
| Neu | src/utils/ownerTransferPdfExport.ts |
| Aendern | src/pages/WegManagement.tsx (neuer Tab "Wirtschaftsplan", Transfer-Button) |
| Aendern | src/components/property/PropertyOwnersCard.tsx (Transfer-Button) |
| DB-Migration | weg_business_plans, weg_business_plan_items, weg_owner_invoices, weg_ownership_transfers |

### RLS-Policies

Alle neuen Tabellen erhalten RLS-Policies basierend auf organization_id, analog zu den bestehenden weg_assemblies und weg_reserve_fund Tabellen.

