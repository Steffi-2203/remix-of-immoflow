

## Complete CSP Implementation -- Remaining Items

### Status Summary

5 of 8 checklist items are fully done. Three need implementation:

### 1. Nonce Injection into Served HTML

**Problem**: `res.locals.cspNonce` is set but `index.html` is served as a static file (`res.sendFile` / `vite.transformIndexHtml`) without replacing script/style tags with the nonce.

**Solution** (`server/vite.ts`):
- In `serveStatic` (production): read `index.html` into a string, replace `<script` with `<script nonce="..."` and `<link rel="stylesheet"` with the nonce attribute, then `res.send()` instead of `res.sendFile()`.
- In `setupVite` (dev): after `vite.transformIndexHtml`, do the same string replacement before sending.
- Use a shared helper function `injectNonce(html: string, nonce: string): string` for both paths.

### 2. Report-Only Rollout Phase

**Problem**: CSP is enforced immediately. A `Content-Security-Policy-Report-Only` phase would catch violations without breaking the site.

**Solution** (`server/middleware/csp.ts`):
- Add an environment variable `CSP_REPORT_ONLY=true|false` (default `true` for initial rollout).
- When report-only mode is active, use `helmet.contentSecurityPolicy` but set the header name to `Content-Security-Policy-Report-Only` instead of `Content-Security-Policy`.
- Once violations are reviewed and resolved, flip to `false` to enforce.

### 3. Wire SRI into HTML Output

**Problem**: `server/lib/sri.ts` builds an SRI map but nothing consumes it.

**Solution** (`server/vite.ts`):
- In production (`serveStatic`), after reading `index.html`, parse script/link tags referencing assets in the SRI map and add `integrity="sha384-..."` and `crossorigin="anonymous"` attributes.
- Integrate this into the same `injectNonce` helper (or a separate `injectSri` step).

---

### Technical Details

**New helper: `server/lib/htmlTransform.ts`**

```text
injectNonce(html, nonce)
  - Regex replace: <script -> <script nonce="NONCE"
  - Regex replace: <link rel="stylesheet" -> add nonce="NONCE"
  - Regex replace: <style -> <style nonce="NONCE"

injectSri(html, sriMap)
  - For each <script src="/assets/xxx.js">, look up in sriMap
  - Add integrity="sha384-..." crossorigin="anonymous"
  - Same for <link href="/assets/xxx.css">
```

**File: `server/vite.ts`** (production path)
- Replace `res.sendFile(...)` with:
  ```text
  let html = fs.readFileSync(indexPath, 'utf-8');
  html = injectNonce(html, res.locals.cspNonce);
  html = injectSri(html, getSriMap());
  res.send(html);
  ```
- Dev path: after `vite.transformIndexHtml`, apply `injectNonce` only (SRI not needed in dev).

**File: `server/middleware/csp.ts`**
- Read `CSP_REPORT_ONLY` env var.
- When true, after helmet sets the header, rename it:
  ```text
  const cspValue = res.getHeader('content-security-policy');
  res.removeHeader('content-security-policy');
  res.setHeader('content-security-policy-report-only', cspValue);
  ```

**File: `tests/unit/csp-nonce.test.ts`**
- Add test for nonce appearing in HTML script/style tags from the actual serving path.
- Add test for Report-Only header when env var is set.
- Add test for SRI attributes on asset tags.

### Files to modify

| File | Action |
|---|---|
| `server/lib/htmlTransform.ts` | New -- nonce + SRI injection helpers |
| `server/vite.ts` | Use htmlTransform in both dev and prod HTML serving |
| `server/middleware/csp.ts` | Add Report-Only mode via env var |
| `tests/unit/csp-nonce.test.ts` | Add tests for nonce injection, Report-Only, and SRI |

