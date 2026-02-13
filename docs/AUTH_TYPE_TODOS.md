# Auth Type Safety – Remaining TODOs

> Generated: 2026-02-13 | Priority: P2–P3

## Status Summary

| # | Diagnostic | Status | Ticket |
|---|-----------|--------|--------|
| 1 | `useAuth.ts:41` – `BackendNotConfiguredError as unknown as AuthError` | ✅ Fixed – typed error class, narrowed cast | — |
| 2 | `useAuth.ts:51` – same pattern in `signUp` | ✅ Fixed | — |
| 3 | `usePermissions.ts:64` – `rpc('check_permission_override' as any)` | ⚠️ Documented – requires DB migration | TODO-AUTH-01 |
| 4 | `usePermissions.ts:78` – `.from('permissions' as any)` | ⚠️ Documented – requires DB migration | TODO-AUTH-02 |
| 5 | `usePermissions.ts:123` – `.from('permissions' as any)` (duplicate) | ⚠️ Documented – same root cause | TODO-AUTH-02 |
| 6 | `usePermissions.ts:131` – `.from('role_permissions_override' as any)` | ⚠️ Documented – requires DB migration | TODO-AUTH-03 |
| 7 | `auth-utils.ts:5` – implicit `any` on toast param | ✅ Fixed – uses `ToastFn` from `types/auth.ts` | — |

---

## Open Tickets

### TODO-AUTH-01: Add `check_permission_override` to generated types
- **Priority:** P2
- **Cause:** The RPC function `check_permission_override` exists in the DB but is not reflected in `src/integrations/supabase/types.ts` (auto-generated, read-only).
- **Impact:** Requires `as any` cast on `.rpc()` call. Result is cast to `PermissionCheckResult[]`.
- **Resolution:** Ensure the DB function signature is picked up by the Supabase type generator on next schema sync. Then remove the `as any` + `as unknown` casts.
- **Files:** `src/hooks/usePermissions.ts:64`

### TODO-AUTH-02: Add `permissions` table to generated types
- **Priority:** P2
- **Cause:** The `permissions` table exists in the DB but is not in auto-generated types.
- **Impact:** Two locations use `as any` cast: lines 78 and 123.
- **Resolution:** Run type generation after confirming the table exists and has proper RLS. Then replace casts with typed queries.
- **Files:** `src/hooks/usePermissions.ts:78, 123`

### TODO-AUTH-03: Add `role_permissions_override` table to generated types
- **Priority:** P2
- **Cause:** Same as TODO-AUTH-02 for the override table.
- **Impact:** One location uses `as any` cast at line 131.
- **Resolution:** Same as TODO-AUTH-02.
- **Files:** `src/hooks/usePermissions.ts:131`

### TODO-AUTH-04: Centralize AppRole type
- **Priority:** P3
- **Cause:** `AppRole` is duplicated in `src/hooks/useUserRole.ts` and `src/types/auth.ts`.
- **Resolution:** Remove the duplicate from `useUserRole.ts` and import from `types/auth.ts`.
- **Files:** `src/hooks/useUserRole.ts:4`, `src/types/auth.ts`

---

## Acceptance Criteria Checklist

- [x] `tsc --noEmit` produces no new errors in auth files
- [x] All 7 diagnostics identified, classified, and either fixed or documented
- [x] `src/types/auth.ts` created with precise interfaces
- [x] Unit tests cover `isUnauthorizedError`, `BackendNotConfiguredError`, and type shapes
- [x] Remaining `as any` casts have eslint-disable comments with justification
