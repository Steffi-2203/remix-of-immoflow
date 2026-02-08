

# Tiefenanalyse: ImmoflowMe - "Herz und Nieren"-Pruefung

## Umsetzungsstatus

### ✅ Phase 1: Sicherheit (erledigt)
1. ✅ RLS-Policies ueberarbeitet:
   - 5 overpermissive `USING(true)` SELECT Policies entfernt (invoice_lines, property_budgets, rent_index_clauses, rent_adjustments, tenant_deposits)
   - audit_logs INSERT `WITH CHECK(true)` durch `auth.uid() IS NOT NULL` ersetzt
   - Linter-Warning "RLS Policy Always True" behoben
2. ⚠️ Leaked Password Protection -- nur ueber Supabase Dashboard aktivierbar (nicht ueber Migration)
3. ✅ Extensions: `uuid-ossp` und `pgcrypto` nach `extensions`-Schema verschoben. `pg_net` verbleibt in `public` (Supabase-intern, nicht verschiebbar)

### ✅ Phase 2: Frontend-Architektur (erledigt)
- Entscheidung: RLS + `.limit(500)` im Frontend
- Alle Haupt-Hooks gepatcht:
  - usePayments, usePaymentsByTenant
  - useInvoices, useInvoicesByTenant
  - useExpenses, useExpensesByCategory
  - useTransactions (5 Query-Hooks)
  - useProperties
  - useContractors
  - useUnits
  - useTenants

### ✅ Phase 3: Bugfixes (erledigt)
1. ✅ `Badge`-Komponente auf `React.forwardRef` umgestellt
2. ⏳ Wasserkosten im `InvoiceGenerator` -- offen

### ⏳ Phase 4: Job-Queue vervollstaendigen (offen)
1. Handler fuer SEPA-Export, Settlement, Dunning, Report-Generation registrieren
2. Job-Status-UI im Admin-Bereich einbauen

---

## Verbleibende Linter-Warnungen
| Warnung | Status | Anmerkung |
|---------|--------|-----------|
| Extension in Public (`pg_net`) | Nicht behebbar | Supabase-interne Extension |
| Leaked Password Protection | Manuell aktivieren | Supabase Dashboard > Auth > Password Protection |

