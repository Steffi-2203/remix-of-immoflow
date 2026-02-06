
# Umfassende Qualitaetspruefung: ImmoflowMe

## Zusammenfassung

Nach systematischer Pruefung aller Seiten, Hooks, Datenfluesse und Rollen-Logik habe ich **23 Probleme** identifiziert, sortiert nach Schweregrad. Ich empfehle, diese Schritt fuer Schritt abzuarbeiten.

---

## PRIORITAET 1: Build-Fehler und Kritische Bugs

### 1.1 Build-Fehler in useProperties.ts (BLOCKIERT ALLES)
**Datei:** `src/hooks/useProperties.ts` Zeile 94
**Problem:** `addProperty` erwartet die neuen Felder `baubewilligung_nach_1945`, `baubewilligung_nach_1953`, `baujahr_mrg`, `foerderung_erhalten`, `richtwert_bundesland`, `stichtag_mrg` - diese werden beim Erstellen nicht mitgegeben.
**Loesung:** Felder als optionale Defaults (null) in den `addProperty`-Aufruf aufnehmen.

### 1.2 Feldname-Fehler in Demo-Daten
**Datei:** `src/data/mockData.ts`
**Problem:** Mock-Mieter verwenden `heizkosten_vorschuss`, aber die gesamte App und die Datenbank verwenden `heizungskosten_vorschuss`. Im Demo-Modus wuerden alle Heizkosten als 0 angezeigt.
**Loesung:** In `DemoTenant` und allen Mock-Mieterdaten `heizkosten_vorschuss` zu `heizungskosten_vorschuss` umbenennen.

### 1.3 Demo-Modus nur in Properties implementiert
**Problem:** Nur `useProperties` hat den Demo-Fallback. Alle anderen Hooks (`useUnits`, `useTenants`, `useTransactions`, `useExpenses`, `usePayments`, `useBankAccounts`, `useMaintenanceTasks`, `useInvoices`) greifen weiterhin auf die echte Datenbank zu. Tester sehen entweder echte Daten oder leere Seiten.
**Betroffene Hooks:**

| Hook | Status | Auswirkung |
|------|--------|------------|
| useUnits | Kein Demo | Leere Einheiten-Liste |
| useTenants | Kein Demo | Leere Mieter-Liste |
| useTransactions | Kein Demo | Leeres Banking |
| useExpenses | Kein Demo | Leere Kostenliste |
| usePayments | Kein Demo | Leere Zahlungsliste |
| useBankAccounts | Kein Demo | Keine Bankkonten |
| useMaintenanceTasks | Kein Demo | Keine Wartungen |
| useInvoices | Kein Demo | Keine Vorschreibungen |

**Loesung:** Alle Hooks mit isDemoMode-Fallback ausstatten (wie bei useProperties).

### 1.4 Dashboard blockiert fuer Tester
**Datei:** `src/pages/SimpleDashboard.tsx`
**Problem:** Dashboard zeigt "Organisation nicht gefunden" wenn `useOrganization()` null zurueckgibt. Tester haben keine Organisation, daher sehen sie nur eine Fehlermeldung statt der Demo-Daten.
**Loesung:** `useOrganization` mit Demo-Fallback versehen, der eine virtuelle Demo-Organisation zurueckgibt.

---

## PRIORITAET 2: Logik-Fehler und Tote Links

### 2.1 Toter Link: "Plan upgraden"
**Datei:** `src/pages/PropertyDetail.tsx` Zeile 364
**Problem:** Button verlinkt auf `/upgrade` - diese Route existiert nicht. Fuehrt zu 404-Seite.
**Loesung:** Link entfernen oder auf Einstellungen verweisen.

### 2.2 window.location.href statt React Router
**Datei:** `src/pages/UnitList.tsx` Zeile 341
**Problem:** `window.location.href = ...` verursacht einen kompletten Seitenreload statt client-seitiger Navigation. Alle States gehen verloren, Filter werden zurueckgesetzt.
**Loesung:** `useNavigate()` verwenden: `navigate(\`/einheiten/...\`)`.

### 2.3 Filter "Aktiv" / "Mit Leerstand" funktionslos
**Datei:** `src/pages/PropertyList.tsx` Zeilen 73-83
**Problem:** Der Filter-Dropdown hat Optionen (Alle, Aktiv, Mit Leerstand), aber kein `onValueChange` das den Filter tatsaechlich anwendet. Der Wert wird ignoriert.
**Loesung:** State-Variable fuer Filter einfuehren und `filteredProperties` entsprechend filtern.

### 2.4 Export-Buttons ohne Funktion
**Betroffene Seiten:**
- `PropertyList.tsx`: "Export" Button (Zeile 90-93) - tut nichts
- `TenantList.tsx`: "Export" Button (Zeile 120-123) - tut nichts
**Problem:** Buttons sehen funktional aus, loesen aber keine Aktion aus. Benutzer erwarten eine CSV/Excel-Datei.
**Loesung:** Entweder Export implementieren (CSV-Download) oder Buttons entfernen/deaktivieren mit Tooltip "Kommt bald".

### 2.5 PropertyDetail Mieten-Berechnung inkonsistent
**Datei:** `src/pages/PropertyDetail.tsx` Zeile 154
**Problem:** Verwendet `heizungskosten_vorschuss`, aber die tenants kommen als verschachtelte Relation aus der `units`-Query. Der Feldname stimmt, aber `unit.tenants` ist ein Array das als `any[]` gecastet wird - fehleranfaellig.
**Loesung:** Typsichere Tenant-Verarbeitung statt `as any[]`.

### 2.6 UnitList: Kein "Neue Einheit" Button
**Datei:** `src/pages/UnitList.tsx`
**Problem:** Anders als PropertyList und TenantList hat UnitList keinen direkten "Neue Einheit" Button. Einheiten koennen nur ueber CSV-Import oder ueber PropertyDetail erstellt werden. Das ist fuer Benutzer verwirrend.
**Loesung:** Button "Neue Einheit" hinzufuegen der zur PropertyDetail-Seite navigiert oder einen Property-Auswahl-Dialog oeffnet.

---

## PRIORITAET 3: Strukturelle Probleme

### 3.1 Dashboard dupliziert PropertyList
**Datei:** `src/pages/SimpleDashboard.tsx`
**Problem:** Das Dashboard hat eine eigene Liegenschafts-Erstellung und Unit-Verwaltung eingebaut (Zeilen 119-363). Das dupliziert die Funktionalitaet von PropertyList und PropertyDetail. Aenderungen muessen an zwei Stellen gepflegt werden.
**Empfehlung:** Dashboard als Uebersicht belassen mit Statistiken und Widgets, aber die Liegenschafts-CRUD-Funktionen nur ueber die dedizierte PropertyList/PropertyDetail anbieten.

### 3.2 TenantList: Klick oeffnet Bearbeitungsformular
**Datei:** `src/pages/TenantList.tsx` Zeile 196
**Problem:** Ein Klick auf einen Mieter navigiert direkt zu `/mieter/${tenant.id}/bearbeiten` (Bearbeitungsmodus). Es gibt keine Mieter-Detail-Ansicht (Read-Only). Benutzer koennten versehentlich Daten aendern.
**Empfehlung:** Zuerst eine Detail-Ansicht zeigen mit einem separaten "Bearbeiten" Button.

### 3.3 Settings: Property Manager sieht keine Bankkonten
**Datei:** `src/pages/Settings.tsx` Zeile 54
**Problem:** `canViewFinancials = userRole === 'admin' || userRole === 'finance'` schliesst Property Manager aus. Diese brauchen aber Zugang zu Bankkontoverwaltung.
**Loesung:** Property Manager in die Bedingung aufnehmen.

### 3.4 ComingSoon.tsx wird nie verwendet
**Datei:** `src/pages/ComingSoon.tsx`
**Problem:** Die Komponente existiert, wird aber nirgends eingebunden. Keine Route verweist darauf.
**Empfehlung:** Entweder fuer Features verwenden die noch nicht fertig sind, oder Datei entfernen.

---

## PRIORITAET 4: Demo-Modus Luecken

### 4.1 Sidebar-Navigation fuer Tester nicht eingeschraenkt
**Problem:** Tester sehen die volle Navigation inklusive Budgetplanung, Mahnwesen, Rechnungsfreigabe. Diese Seiten laden aber im Demo-Modus keine Daten (leere Seiten).
**Loesung:** Entweder alle diese Hooks mit Demo-Daten versehen ODER nicht-implementierte Seiten fuer Tester ausblenden.

### 4.2 Onboarding-Wizard fuer Tester stoerend
**Datei:** `src/pages/SimpleDashboard.tsx` Zeile 124
**Problem:** Tester ohne Demo-Properties (falls Demo-Fallback nicht greift) sehen den Onboarding-Wizard. Das ist verwirrend fuer einen Tester der die App testen will.
**Loesung:** Onboarding-Wizard fuer Tester deaktivieren.

### 4.3 Dokumenten-Upload im Demo-Modus
**Problem:** Dokument-Upload (PropertyDetail, UnitDetail, Documents) ruft Supabase Storage auf. Im Demo-Modus wuerde das entweder fehlschlagen oder echte Dateien hochladen.
**Loesung:** Upload im Demo-Modus abfangen und virtuell simulieren.

### 4.4 SEPA-Export und Mahnversand im Demo-Modus
**Problem:** Funktionen wie SEPA-Export und Mahnungsversand (Edge Functions) wuerden im Demo-Modus echte E-Mails senden oder fehlschlagen.
**Loesung:** Im Demo-Modus mit Toast-Nachricht "Im Demo-Modus nicht verfuegbar" abfangen.

---

## PRIORITAET 5: UX-Verbesserungen

### 5.1 Keine Breadcrumb-Navigation
**Problem:** Es fehlt eine durchgaengige Breadcrumb-Navigation. Benutzer koennen z.B. von UnitDetail nicht direkt zur PropertyDetail zurueck (nur "Zurueck zur Uebersicht").

### 5.2 Inkonsistente Status-Bezeichnungen
**Problem:** Einheiten-Status wird teils als `vermietet` teils als `aktiv` bezeichnet:
- `mockUnits` verwenden `status: 'vermietet'`  
- Datenbank verwendet `status: 'aktiv'`  
- Das fuehrt zu falschen Badge-Anzeigen im Demo-Modus

### 5.3 Keine Bestaetigung bei Loeschaktionen auf Dashboard
**Datei:** `src/pages/SimpleDashboard.tsx` Zeile 346
**Problem:** `confirm()` (Browser-nativ) wird verwendet statt AlertDialog. Inkonsistent mit dem Rest der App (PropertyDetail verwendet AlertDialog korrekt).

---

## Empfohlene Reihenfolge der Umsetzung

| Schritt | Aufgabe | Geschaetzter Aufwand |
|---------|---------|---------------------|
| 1 | Build-Fehler beheben (1.1 + 1.2) | Klein |
| 2 | Demo-Hooks implementieren (1.3 + 1.4) | Gross |
| 3 | Tote Links und kaputte Buttons (2.1-2.4) | Mittel |
| 4 | Status-Bezeichnung vereinheitlichen (5.2) | Klein |
| 5 | window.location.href fix (2.2) | Klein |
| 6 | Demo-Modus Absicherung (4.1-4.4) | Mittel |
| 7 | Settings Property Manager (3.3) | Klein |
| 8 | UX-Verbesserungen (5.1, 5.3) | Mittel |
| 9 | Strukturelle Bereinigung (3.1, 3.2, 3.4) | Gross |

---

## Naechster Schritt

Ich empfehle, mit **Schritt 1 und 2** zu beginnen: Zuerst den Build-Fehler beheben, dann alle Demo-Hooks implementieren. Damit hat der Tester eine funktionierende virtuelle Umgebung. Soll ich mit Schritt 1 starten?
