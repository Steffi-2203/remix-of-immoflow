

## P2 – Strategische Umsetzung

### P2-7: Temp-Table COPY + Upsert CTE fuer Gross-Batches ✅

**Status**: Implementiert
- `server/services/bulkUpsertLines.ts`: Neues Modul mit Temp-Table + CTE Bulk-Pfad
- `server/services/billing.service.ts`: Dispatch-Logik (≥ BULK_THRESHOLD → Bulk, sonst Legacy)
- `server/lib/metrics.ts`: `METRIC.BULK_PATH_USED` hinzugefuegt
- Schwellwert konfigurierbar via `BILLING_BULK_THRESHOLD` Env-Var (Default: 5000)

---

### P2-8: Enterprise Features

#### 8a. RBAC-Erweiterung ✅

**Status**: Schema + Middleware implementiert
- DB-Tabellen: `permissions` + `role_permissions_override` mit RLS
- Seed-Daten: Standard-Berechtigungen fuer admin, property_manager, finance, viewer
- `server/middleware/rbac.ts`: `hasPermission()` + `requirePermission()` Middleware
- Noch offen: Frontend-Hook Erweiterung, Route-Integration, FeatureGuard-Update

#### 8b. SSO (SAML/OIDC)

**Status**: Geplant (erfordert Produkt-Entscheidungen)
- Betroffene Dateien: Auth.tsx, server/auth.ts, sso-callback Edge Function
- Neue Spalten in organizations: sso_provider, sso_domain, sso_metadata_url

#### 8c. Verschluesselte Artefakte + Retention

**Status**: Geplant
- server/lib/artifactEncryption.ts (neu)
- artifact_metadata Tabelle
- cleanup-expired-artifacts Cron Edge Function
