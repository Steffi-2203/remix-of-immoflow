# Finance Acceptance Sign-off

## Reconciliation Report

**Datum**: 2026-02-24
**Erstellt von**: Dev-Team (automatisiert)
**CSV**: `reconcile-finance-signoff-2026-02-24.csv`

### Ergebnis

| Metrik | Wert |
|---|---|
| Gepruefte Rechnungen | 998 |
| Varianzen (paid_amount vs. allocation_sum) | **0** |
| Status-Inkonsistenzen | **0** |
| Gesamtbetrag paid_amount | 307.914,03 EUR |
| Gesamtbetrag allocation_sum | 307.914,03 EUR |
| Delta | 0,00 EUR |

### Status-Verteilung

| Status | Anzahl | Betrag |
|---|---|---|
| bezahlt | 517 | 307.238,03 EUR |
| offen | 479 | 260.926,40 EUR |
| teilbezahlt | 2 | 1.886,00 EUR |

### Source-Aufschluesselung (Payments)

| Source | Anzahl | Betrag |
|---|---|---|
| seed | 649 | 315.514,03 EUR |

### Integritaetspruefung

| Check | Ergebnis |
|---|---|
| Verwaiste Allocations (invoice_id IS NULL) | 0 |
| Seed-Payments ohne Allocation | 0 |
| Status-Konsistenz (paid_amount passt zu status) | 998/998 konsistent |

---

## Sign-off

> Ich bestaetige, dass die Reconciliation-Daten geprueft wurden und keine Varianzen zwischen `monthly_invoices.paid_amount` und der Summe aus `payment_allocations.applied_amount` bestehen.
>
> Ausnahmen: Keine
>
> **Name**: ________________________
>
> **Rolle**: Finance / Buchhaltung
>
> **Datum**: ________________________
>
> **Unterschrift**: ________________________

---

## Hinweise
- CSV-Datei mit Detaildaten liegt bei: `reconcile-finance-signoff-2026-02-24.csv`
- Source-Breakdown CSV: `reconcile-source-breakdown-2026-02-24.csv`
- Bei Fragen: @dev-team oder @finance-team
- Naechste regulaere Pruefung: Nightly Reconciliation (automatisch)
