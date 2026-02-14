

# Plan: Journal-Nachbuchung (Backfill) der Bestandsdaten

## Ausgangslage

- **123 Rechnungen** (2025-2026), **65 Zahlungen**, **40 Ausgaben** existieren in der Datenbank
- **0 Journal-Eintraege** -- die DB-Trigger (`auto_book_invoice`, `auto_book_payment`, `auto_book_expense`) greifen nur bei neuen INSERT-Operationen, nicht rueckwirkend
- **53 Konten** im Kontenrahmen (Organisation `2f3536af...`)
- Die `booking_number_sequences`-Tabelle ist leer -- noch keine Buchungsnummern vergeben

## Loesung: Edge Function fuer einmaligen Backfill

Eine Edge Function `backfill-journal`, die alle bestehenden Rechnungen, Zahlungen und Ausgaben durchgeht und die gleiche Buchungslogik wie die DB-Trigger anwendet -- aber idempotent (ueberspringt bereits gebuchte Quellen).

### Ablauf

```text
1. Lade Organisation + Kontenrahmen (Konto-IDs fuer 4000, 4100, 4200, 3540, 2100, 2800, 2500, 5000-6300)
2. Fuer jede Rechnung (monthly_invoices):
   - Pruefen ob source_type='invoice' + source_id bereits in journal_entries existiert
   - Wenn nein: Buchungssatz erstellen (Forderung Soll / Mieterloes + BK + HK + USt Haben)
3. Fuer jede Zahlung (payments):
   - Pruefen ob source_type='payment' + source_id bereits existiert
   - Wenn nein: Buchungssatz erstellen (Bank Soll / Forderung Haben)
4. Fuer jede Ausgabe (expenses):
   - Pruefen ob source_type='expense' + source_id bereits existiert
   - Wenn nein: Buchungssatz erstellen (Aufwand + Vorsteuer Soll / Bank Haben)
5. Buchungsnummer-Sequenz hochzaehlen via next_booking_number()
```

### Idempotenz-Garantie

Vor jedem Insert wird geprueft:
```text
SELECT id FROM journal_entries
WHERE source_type = ? AND source_id = ?
LIMIT 1
```
Falls ein Eintrag gefunden wird, wird uebersprungen. Damit kann die Funktion beliebig oft aufgerufen werden.

### Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|-------------|
| `supabase/functions/backfill-journal/index.ts` | NEU | Edge Function: Iteriert ueber alle Rechnungen, Zahlungen, Ausgaben und erstellt fehlende Journal-Eintraege |

### Technische Details

Die Edge Function:
- Verwendet den `service_role` Key fuer vollen DB-Zugriff
- Ermittelt die Organisation aus der `chart_of_accounts`-Tabelle
- Mappt Ausgaben-Kategorien auf Kontonummern (gleiche Logik wie der `auto_book_expense`-Trigger)
- Gibt einen Statusbericht zurueck: `{ invoices_booked, payments_booked, expenses_booked, skipped }`
- Kann per HTTP-Call oder ueber die UI ausgeloest werden

### Konten-Mapping (aus bestehendem Trigger)

```text
Rechnungen:
  Soll 2100 (Forderungen Mieter) = Gesamtbetrag
  Haben 4000 (Mieterloes) = Grundmiete
  Haben 4100 (BK-Erloes) = Betriebskosten
  Haben 4200 (HK-Erloes) = Heizungskosten
  Haben 3540 (USt-Zahllast) = USt

Zahlungen:
  Soll 2800 (Bank) = Betrag
  Haben 2100 (Forderungen Mieter) = Betrag

Ausgaben:
  Soll 5000-6300 (Aufwandskonto) = Netto
  Soll 2500 (Vorsteuer) = VSt (20%)
  Haben 2800 (Bank) = Brutto
```

### Erwartetes Ergebnis

Nach Ausfuehrung:
- ~123 Journal-Eintraege fuer Rechnungen (mit je 3-5 Buchungszeilen)
- ~65 Journal-Eintraege fuer Zahlungen (mit je 2 Buchungszeilen)
- ~40 Journal-Eintraege fuer Ausgaben (mit je 3 Buchungszeilen)
- **Insgesamt ca. 228 Buchungssaetze** mit ca. 750+ Buchungszeilen
- Saldenliste, Bilanz und GuV zeigen ab sofort echte Daten

