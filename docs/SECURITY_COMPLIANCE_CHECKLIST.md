# Security & Compliance Checklist

## Last Audit: _[date]_

---

## 1. Authentication & Authorization

- [x] Invite-only registration (no public sign-up)
- [x] Email verification required before login
- [x] Session-based auth with `express-session`
- [x] JWT validation in Edge Functions
- [x] Role-based access control (RBAC) via `user_roles` table
- [x] Roles separated from profiles (no privilege escalation)
- [x] `has_role()` SECURITY DEFINER function for RLS
- [x] Artifact downloads restricted to `admin`, `auditor`, `ops`

## 2. Row Level Security (RLS)

- [x] RLS enabled on all security-critical tables
- [x] `audit_logs` — immutable (UPDATE/DELETE triggers prevent modification)
- [x] `artifact_metadata` — restricted to privileged roles
- [x] `artifact_access_log` — restricted to privileged roles
- [x] `user_roles` — protected from self-escalation
- [ ] Review: All `USING (true)` policies for appropriateness

## 3. Audit & Compliance

- [x] SHA-256 hash chain on audit logs
- [x] Immutability triggers (prevent UPDATE/DELETE)
- [x] Structured audit trail for all CRUD operations
- [x] CloudTrail-style artifact access logging
- [x] Billing run actions logged (accept/decline/rollback/reprocess)
- [x] Duplicate resolution with mandatory audit comments (min 5 chars)
- [x] Bulk operations logged with policy and actor info

## 4. Data Protection

- [x] Sensitive data masking in API responses
- [x] AES-256-GCM encryption for billing artifacts
- [x] KMS-encrypted S3 storage for audit packages
- [x] Artifact storage bucket is private (not public)
- [x] Signed URLs for document access (1-hour expiry)
- [x] Personal data fields redacted in audit logs

## 5. Input Validation

- [x] Zod schemas for API request validation
- [x] Parameterized SQL queries (no raw string interpolation)
- [ ] Review: All `req.body` usage validated before DB operations
- [x] No `dangerouslySetInnerHTML` with user content
- [x] Rate limiting on API endpoints (`express-rate-limit`)
- [x] Helmet.js security headers

## 6. Infrastructure

- [x] Database in EU region (eu-central-1)
- [x] HTTPS-only (enforced by platform)
- [x] Environment secrets stored in Supabase Vault
- [x] No hardcoded credentials in codebase
- [x] `.env` excluded from version control

## 7. Monitoring & Alerting

- [x] SLO definitions for billing runs
- [x] PagerDuty integration for critical SLA breaches
- [x] Structured metrics logging (counters, histograms)
- [x] Distributed tracing for batch pipeline
- [x] Schema compatibility gate in CI

## 8. Disaster Recovery

- [x] Automated DR restore test script
- [x] Rollback playbook for billing runs
- [x] Merge undo window (2 hours)
- [x] CI schema baseline for clean rebuilds
- [x] DR runbook documented

## 9. Penetration Test Scope

### Recommended Test Areas:
1. **Auth bypass:** Token manipulation, session fixation, invite token replay
2. **RBAC escalation:** Role self-assignment, cross-org data access
3. **SQL injection:** All API endpoints accepting user input
4. **XSS:** Search inputs, tenant names, document descriptions
5. **IDOR:** Direct object reference in `/api/admin/*` routes
6. **Rate limiting:** Brute force login, API flood
7. **File upload:** MIME type validation, path traversal
8. **Audit tamper:** Attempt to modify/delete audit logs

### Out of Scope:
- Supabase infrastructure (managed by vendor)
- DNS/network layer (platform-managed)

---

## Automated Scans

```bash
# Run security audit
bash tools/security_audit.sh

# Run DR restore test
bash tools/dr_restore_test.sh

# Run schema compatibility check
bash tools/schema_compat_check.sh
```
