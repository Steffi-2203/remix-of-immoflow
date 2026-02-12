

# Sicherheitsplan: Mieterportal Datenisolierung

## Problem

Aktuell laedt das Mieterportal **alle** Mieter, Rechnungen und Zahlungen ueber globale Hooks (`useTenants()`, `useInvoices()`, `usePayments()`) und filtert erst im Browser nach dem eingeloggten Mieter. Ein technisch versierter Nutzer koennte ueber die Browser-Konsole oder den Netzwerk-Tab die Daten anderer Mieter einsehen (z.B. Miethoehe des Nachbarn).

## Loesung

Statt globaler Abfragen wird ein dedizierter **Backend-Endpunkt** (Edge Function) erstellt, der nur die Daten des eingeloggten Mieters zurueckgibt. So verlassen fremde Daten nie den Server.

## Umsetzungsschritte

### 1. Edge Function: `tenant-portal-data`

Eine neue Backend-Funktion, die:
- Den eingeloggten Benutzer per JWT validiert
- In `tenant_portal_access` nachschlaegt, welcher Mieter dieser Benutzer ist
- Nur die Daten **dieses einen Mieters** abfragt (Rechnungen, Zahlungen, Einheit, Objekt)
- Ein einzelnes JSON-Objekt zurueckgibt

### 2. Neuer Frontend-Hook: `useTenantPortalData`

Ein neuer Hook, der:
- Die Edge Function aufruft statt einzelner Tabellen-Hooks
- Genau ein Datenobjekt mit den eigenen Mieterdaten liefert
- Keine globalen Daten mehr abfragt

### 3. Refactoring: `TenantPortal.tsx`

Die Mieter-Ansicht (Self-Service-View) wird umgebaut:
- Entfernen der globalen Hooks (`useTenants`, `useInvoices`, `usePayments`)
- Stattdessen nur `useTenantPortalData()` verwenden
- Die Admin-Ansicht (Zugangsverwaltung) bleibt unveraendert

### 4. RLS-Haertung auf `tenant_portal_access`

Sicherstellen, dass:
- Mieter nur ihren eigenen Datensatz in `tenant_portal_access` sehen koennen (bereits vorhanden)
- Die UPDATE-Policy eingeschraenkt wird, sodass nur `last_login_at` und `user_id` aktualisiert werden duerfen

---

## Technische Details

### Edge Function `tenant-portal-data`

```text
Eingabe: JWT Token (automatisch)
Ablauf:
  1. auth.getUser() -> user_id
  2. SELECT tenant_id FROM tenant_portal_access WHERE user_id = ? AND is_active = true
  3. SELECT * FROM tenants WHERE id = tenant_id
  4. SELECT * FROM units WHERE id = tenant.unit_id
  5. SELECT * FROM properties WHERE id = unit.property_id
  6. SELECT * FROM monthly_invoices WHERE tenant_id = ? ORDER BY year DESC, month DESC LIMIT 24
  7. SELECT * FROM payments WHERE tenant_id = ? ORDER BY eingangs_datum DESC LIMIT 24
Ausgabe: { tenant, unit, property, invoices, payments, balance }
```

Alle Abfragen nutzen den **Service Role Key** serverseitig -- der Client hat keinen direkten Tabellenzugriff.

### Dateien die erstellt/geaendert werden

| Datei | Aktion |
|-------|--------|
| `supabase/functions/tenant-portal-data/index.ts` | Neu erstellen |
| `supabase/config.toml` | Function registrieren |
| `src/hooks/useTenantPortalData.ts` | Neu erstellen |
| `src/pages/TenantPortal.tsx` | Mieter-View refactoren |

### Was sich fuer den Nutzer aendert

- Optisch: Nichts -- die Mieter-Ansicht sieht identisch aus
- Sicherheit: Mieter sehen ausschliesslich ihre eigenen Daten
- Performance: Schneller, da weniger Daten geladen werden

