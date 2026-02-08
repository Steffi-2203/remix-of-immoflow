

## Enterprise-Readiness Checkliste

### P0 – Vor Enterprise-Einsatz ✅

| Item | Status | Details |
|------|--------|---------|
| Artifact Governance | ✅ | Pre-commit blockt CSVs + reconciliation dirs; nur summary.json + SHA256 in Git |
| Centralized Normalizer | ✅ | Single source: `server/lib/normalizeDescription.ts` + CJS-Wrapper; alle Tools importieren daraus |
| Normalizer Parity Tests | ✅ | 16 Tests inkl. DB-Trigger-Parity (pgTriggerNormalize vs TS-Funktion) |
| Audit Enrichment | ✅ | Standardisiertes Schema: `run_id, actor, operation, normalized_description, old_amount, new_amount` |
| Secrets & Pre-commit | ✅ | git-secrets Scan + Fallback-Pattern-Matching; CSV-Blockierung; reconciliation-Dir-Blockierung |

### P1 – Short Term ✅

| Item | Status | Details |
|------|--------|---------|
| Batch Ingestion Pipeline | ✅ | P2-7: Temp-Table + CTE Bulk-Pfad (≥5000 Zeilen), Legacy-Fallback |
| Duplicate Resolution | ✅ | CI Duplicate-Precheck + tools/find_missing_lines.js + tools/upsert_missing_lines.js |
| Observability & Alerts | ✅ | Metrics-Collector mit Counters + Histogramme; Alerts bei missing/conflict lines |

### P2 – Strategic

| Item | Status | Details |
|------|--------|---------|
| RBAC | ✅ | `permissions` + `role_permissions_override` Tabellen; `requirePermission()` Middleware; `useHasPermission()` Hook |
| Encrypted Artifacts | ✅ | AES-256-GCM via `ARTIFACT_ENCRYPTION_KEY`; `artifact_metadata` Tabelle; Cleanup-Cron |
| SSO | ✅ | `sso_providers` Tabelle (SAML/OIDC); `ssoService` mit Provider-Abstraction; Domain-basiertes Enforcement; Stubs für SAML-Validation + OIDC-Exchange |
| Multi-Tenant Isolation | ✅ | `user_org_id()`, `owns_property()`, `owns_tenant()` Helper-Funktionen; 9 permissive RLS-Policies gehärtet auf org-scope; nur audit_logs INSERT bleibt `true` (gewollt) |
| Job Queue / Horizontal Scaling | ✅ | `job_queue` Tabelle mit `FOR UPDATE SKIP LOCKED`; `jobQueueService` mit Handler-Registry, Exponential-Backoff-Retries, Priority-Queue; Billing-Handler registriert |
