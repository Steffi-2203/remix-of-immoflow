

## P2 – Strategische Umsetzung

### P2-7: Temp-Table COPY + Upsert CTE fuer Gross-Batches

**Ziel**: Bei grossen Portfolios (10.000+ Zeilen) ist das aktuelle Batch-Upsert (500er-Chunks mit parameterisierten VALUES) zu langsam. Ein Bulk-Pfad ueber temporaere Tabellen und einen einzelnen CTE reduziert die Roundtrips dramatisch.

**Betroffene Datei**: `server/services/billing.service.ts`

**Aenderungen**:

1. **Schwellwert-Konstante** hinzufuegen:
   - `BULK_THRESHOLD = 5000` – ab dieser Zeilenzahl wird der Bulk-Pfad gewaehlt
   - Unter dem Schwellwert bleibt der bisherige 500er-Chunk-Pfad bestehen (kein Regressionsrisiko)

2. **Neuer Bulk-Pfad** (`bulkUpsertLines`) als private Methode der `BillingService`-Klasse:
   ```text
   Schritt 1: CREATE TEMP TABLE _tmp_invoice_lines (LIKE invoice_lines INCLUDING DEFAULTS) ON COMMIT DROP
   Schritt 2: Multi-Row INSERT in die Temp-Table (grosse Batches, z.B. 5000er Chunks)
   Schritt 3: Single CTE:
     WITH upserted AS (
       INSERT INTO invoice_lines (...)
       SELECT ... FROM _tmp_invoice_lines
       ON CONFLICT (invoice_id, unit_id, line_type, normalized_description)
       DO UPDATE SET amount = EXCLUDED.amount, tax_rate = EXCLUDED.tax_rate, ...
       RETURNING id, invoice_id, unit_id, line_type, description, amount,
         (SELECT il2.amount FROM invoice_lines il2 WHERE il2.id = invoice_lines.id) AS old_amount
     )
     INSERT INTO audit_logs (user_id, table_name, record_id, action, new_data, created_at)
     SELECT ... FROM upserted
   ```
   - Die Audit-Zeilen werden direkt im gleichen CTE geschrieben – ein einziger DB-Roundtrip fuer Upsert + Audit
   - `normalizeDescription` wird vor dem Insert in die Temp-Table angewendet (in TypeScript, nicht in SQL)

3. **Dispatch-Logik** in `generateMonthlyInvoices`:
   - Nach dem Sammeln von `allLines`: `if (allLines.length >= BULK_THRESHOLD)` → `bulkUpsertLines(tx, allLines, ...)`, sonst bestehender Chunk-Pfad

4. **Metriken**: `METRIC.BATCH_SIZE` Histogram wird mit der tatsaechlichen Batch-Groesse befuellt, `METRIC.BULK_PATH_USED` Counter wird hinzugefuegt

**Risikominimierung**:
- Temp-Table wird mit `ON COMMIT DROP` erstellt – kein Cleanup noetig
- Bestehender Pfad bleibt als Fallback erhalten
- Feature kann per Env-Var `BILLING_BULK_THRESHOLD` ueberschrieben werden (z.B. auf 999999 zum Deaktivieren)

---

### P2-8: Enterprise Features (RBAC-Erweiterung, SSO, verschluesselte Artefakte)

**Status Quo**: Es existiert bereits ein einfaches Rollen-System:
- `app_role` Enum: `admin`, `property_manager`, `finance`, `viewer`, `tester`
- `user_roles` Tabelle mit `userId` + `role`
- Frontend-Hooks: `useUserRole`, `useIsAdmin`, `useHasFinanceAccess`

**Geplante Aenderungen** (mehrere Sprints, hier die Architektur):

#### 8a. RBAC-Erweiterung (feingranulare Berechtigungen)

**Neue Tabelle** `permissions`:
```text
permissions (
  id UUID PK,
  role app_role,
  resource TEXT,        -- z.B. 'invoices', 'settlements', 'billing_runs'
  action TEXT,          -- z.B. 'read', 'write', 'delete', 'approve'
  created_at TIMESTAMPTZ
)
```

**Neue Tabelle** `role_permissions_override` (organisationsspezifische Ueberschreibungen):
```text
role_permissions_override (
  id UUID PK,
  organization_id UUID FK → organizations,
  role app_role,
  resource TEXT,
  action TEXT,
  allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
)
```

**Betroffene Dateien**:
- `shared/schema.ts`: Neue Tabellen-Definitionen
- `server/middleware/rbac.ts` (neu): Middleware die `checkPermission(userId, resource, action)` exportiert
- `server/routes.ts` + `server/routes/readonly.ts`: Middleware in Routen einhaengen
- `src/hooks/usePermissions.ts`: Erweitern um ressourcen-basierte Berechtigungspruefung
- `src/components/subscription/FeatureGuard.tsx`: Erweitern um Permission-basierte Pruefung
- Migration: Seed-Daten fuer Standard-Berechtigungen je Rolle

#### 8b. SSO (SAML/OIDC)

**Ansatz**: Lovable Cloud unterstuetzt Google + Apple OAuth. Fuer Enterprise-SSO (SAML mit Azure AD, Okta etc.) muss ein Custom-Provider oder ein SAML-Proxy eingerichtet werden.

**Betroffene Dateien**:
- `src/pages/Auth.tsx`: SSO-Login-Button mit Domain-basiertem Routing
- `server/auth.ts`: SAML-Callback-Handler
- Neue Edge Function `sso-callback/index.ts`: Token-Austausch
- `organizations` Tabelle: Neue Spalten `sso_provider`, `sso_domain`, `sso_metadata_url`

**Hinweis**: SSO erfordert Produkt-Entscheidungen (welche Provider, Pricing-Tier) und kann nicht vollstaendig in Code geplant werden.

#### 8c. Verschluesselte Artefakte + Retention

**Ziel**: Billing-Artefakte (PDFs, CSVs, Summaries) verschluesselt speichern und nach Ablauf automatisch loeschen.

**Betroffene Dateien**:
- `server/lib/artifactEncryption.ts` (neu): AES-256-GCM Verschluesselung/Entschluesselung mit Key aus Env-Var
- `server/services/billing.service.ts`: Artefakte vor dem Speichern verschluesseln
- `src/utils/storageUtils.ts`: Entschluesselung beim Download
- Neue Tabelle `artifact_metadata`:
  ```text
  artifact_metadata (
    id UUID PK,
    organization_id UUID FK,
    run_id UUID,
    file_path TEXT,
    encryption_key_id TEXT,
    retention_days INTEGER DEFAULT 365,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
  )
  ```
- Cron Edge Function `cleanup-expired-artifacts/index.ts`: Loescht abgelaufene Artefakte

---

### Empfohlene Reihenfolge

```text
Sprint 1-2: P2-7 (Bulk Upsert) – eine Datei, klarer Scope, messbare Performance-Verbesserung
Sprint 3-4: P2-8a (RBAC) – Schema + Middleware + Frontend-Hooks
Sprint 5+:  P2-8b (SSO) + P2-8c (Encrypted Artifacts) – erfordern Infrastruktur-Entscheidungen
```

### Zusammenfassung der neuen Dateien

| Datei | Typ | Beschreibung |
|-------|-----|-------------|
| `server/middleware/rbac.ts` | Neu | Permission-Check Middleware |
| `server/lib/artifactEncryption.ts` | Neu | AES-256-GCM Verschluesselung |
| `supabase/functions/cleanup-expired-artifacts/index.ts` | Neu | Cron fuer Artefakt-Bereinigung |
| `supabase/functions/sso-callback/index.ts` | Neu | SAML Token-Exchange |

### Zusammenfassung der Schema-Aenderungen

| Tabelle | Aenderung |
|---------|-----------|
| `permissions` | Neue Tabelle (Rolle → Ressource → Aktion) |
| `role_permissions_override` | Neue Tabelle (Org-spezifische Ueberschreibungen) |
| `organizations` | Neue Spalten: `sso_provider`, `sso_domain`, `sso_metadata_url` |
| `artifact_metadata` | Neue Tabelle (Verschluesselung + Retention) |

