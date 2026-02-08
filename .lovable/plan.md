

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

**Status**: Vollstaendig implementiert
- DB-Tabellen: `permissions` + `role_permissions_override` mit RLS + Seed-Daten
- `server/middleware/rbac.ts`: `hasPermission()` + `requirePermission()` Middleware
- `src/hooks/usePermissions.ts`: Erweitert mit `useHasPermission(resource, action)` Hook + resource-basierte Permission-Aufloesung
- `src/components/subscription/FeatureGuard.tsx`: Erweitert mit `resource`/`action` Props fuer RBAC-Pruefung
- `server/routes.ts`: `requirePermission` importiert + auf `DELETE /api/properties/:id` angewendet

#### 8b. SSO (SAML/OIDC) ⏳

**Status**: Geplant (erfordert Produkt-Entscheidungen)
- Betroffene Dateien: Auth.tsx, server/auth.ts, sso-callback Edge Function
- Neue Spalten in organizations: sso_provider, sso_domain, sso_metadata_url

#### 8c. Verschluesselte Artefakte + Retention ✅

**Status**: Implementiert
- `server/lib/artifactEncryption.ts`: AES-256-GCM Verschluesselung (aktiviert via `ARTIFACT_ENCRYPTION_KEY` Env-Var)
- DB-Tabelle: `artifact_metadata` mit RLS, Retention-Index, Org-Zugehoerigkeit
- `supabase/functions/cleanup-expired-artifacts/index.ts`: Cron-Funktion fuer automatische Bereinigung
