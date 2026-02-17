# ImmoFlowMe — Staged Production Rollout Checklist

## 1. Auth and Session Stability

**Acceptance Criteria:**
- A1: `tokenAuthMiddleware` (server/middleware/tokenAuth.ts) must set `req.session.userId`, `req.session.organizationId`, and call `session.save()` for every valid Bearer token. Token refresh (24h sliding window) fires asynchronously and must not block the request pipeline.
- A2: Session cookie flags must be `httpOnly: true`, `secure: true`, `sameSite: 'none'` (verified in server/index.ts session config). Expired or invalid tokens must allow `next()` without setting session fields — downstream route guards return 401.

**Verification:**
```bash
npx vitest run tests/unit/token-auth.test.ts
# Expected: 8 tests pass — covers valid token, expired token, no header, session.save error, DB failure
```

---

## 2. Rate Limiting and Caching

**Acceptance Criteria:**
- A1: No global rate limiter exists. Only targeted limiters in server/middleware/performanceSafety.ts: `bulkOperationsLimiter`, `exportLimiter`, `ocrLimiter`, `reportLimiter`. Login brute-force limiter is scoped to auth endpoints only. Admins and paying customers are never throttled on regular API endpoints.
- A2: Service worker (public/sw.js) deletes cached API entries on 429/5xx responses via `cache.delete()`. On network failure, API calls return `503 { error: "Offline" }` — no stale cache fallback.

**Verification:**
```bash
grep -c 'rateLimit(' server/middleware/performanceSafety.ts && grep -B1 -A2 'cache.delete' public/sw.js
# Expected: 4 targeted limiters; sw.js shows cache.delete on 429/5xx, catch returns 503 directly
```

---

## 3. Mailer Architecture

**Acceptance Criteria:**
- A1: All outbound emails use the centralized `server/lib/resend.ts` module via `sendEmail()` or `sendInviteEmail()`. Credentials resolve from `RESEND_API_KEY` env var or Replit connector — no hardcoded API keys in route handlers.
- A2: Broadcast email dispatch (server/routes/adminRoutes.ts) sends emails in a loop with per-recipient error counting. `failedCount` is incremented on the `broadcast_messages` row for each failed send.

**Verification:**
```bash
grep -rn 'sendEmail\|sendInviteEmail' server/routes/ server/services/ --include='*.ts' | grep -v 'import' | wc -l && grep -c 'RESEND_API_KEY' server/lib/resend.ts
# Expected: multiple call sites all routing through lib/resend.ts; exactly 1 env var reference
```

---

## 4. DB Migrations and Backups

**Acceptance Criteria:**
- A1: Marketing tables (`promo_codes`, `marketing_invitations`, `broadcast_messages`) and trial fields (`is_trial` boolean DEFAULT true, `trial_ends_at` timestamptz, `converted_at` timestamptz on `organizations`) exist with correct types, defaults, and indexes. `promo_codes.code` has both a UNIQUE constraint and a case-insensitive unique index on `UPPER(code)`.
- A2: Migration file (drizzle/migrations/0003_marketing_tables.sql) includes documented rollback SQL and the exact `pg_dump` command to run before applying.

**Verification:**
```bash
psql "$DATABASE_URL" -c "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='organizations' AND column_name IN ('is_trial','trial_ends_at','converted_at');" -c "SELECT indexname FROM pg_indexes WHERE tablename='promo_codes';"
# Expected: 3 columns with correct types; indexes include promo_codes_code_unique and idx_promo_codes_code_upper
```

---

## 5. RBAC and Security

**Acceptance Criteria:**
- A1: All `/api/admin/*` routes call `requireAdmin()` before processing. Non-admin users receive 403. RLS policies enforce `organization_id` isolation on 8 tables: properties, units, tenants, monthly_invoices, payments, leases, settlements, journal_entries, payment_allocations.
- A2: Password hashing uses bcrypt (server/auth.ts). Account lockout and TOTP 2FA are implemented. All admin endpoints require authenticated session with admin role verified via the `profiles` + `user_roles` tables.

**Verification:**
```bash
grep -c 'requireAdmin' server/routes/adminRoutes.ts && psql "$DATABASE_URL" -c "SELECT tablename, policyname FROM pg_policies WHERE policyname LIKE 'org_isolation%';"
# Expected: requireAdmin called on every admin handler (20+); 8+ org_isolation policies listed
```

---

## 6. Observability and Tests

**Acceptance Criteria:**
- A1: Server logs use `[INFO]`, `[WARN]`, `[ERROR]` prefix tags (server/index.ts, middleware). `GET /api/admin/health` returns JSON with `db_latency_ms`, `memory`, org/trial/invitation counts, and `uptime_seconds`.
- A2: Unit test suite passes with >= 48 tests (8 token-auth + 40 marketing logic). All tests use mocked DB — no test touches the production database.

**Verification:**
```bash
npx vitest run 2>&1 | tail -5
# Expected: "Tests: 48 passed (48)" or higher; 0 failures
```

---

## 7. Frontend Error Handling

**Acceptance Criteria:**
- A1: The default `queryFn` in `src/lib/queryClient.ts` returns `null` on 401 responses (not throwing), preventing blank skeletons. The global `window.fetch` override attaches `Authorization: Bearer <token>` to all `/api/*` requests automatically.
- A2: Custom `queryFn` implementations in hooks (e.g. `src/hooks/useAdmin.ts`) use `credentials: 'include'` for cookie-based auth. The global fetch override ensures Bearer tokens are attached even when hooks define their own `queryFn`.

**Verification:**
```bash
grep -c 'status === 401' src/lib/queryClient.ts && grep -c "Authorization.*Bearer" src/lib/queryClient.ts
# Expected: >=1 null-return on 401; >=2 Bearer header injection points (global override + apiRequest)
```
