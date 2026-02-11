

## CSP Caching, Static Asset Hardening, and Proxy Safety

### Problem
HTML responses containing per-request nonces can be cached (by browsers, CDNs, or reverse proxies), causing stale nonces to be reused -- which breaks script execution or weakens CSP. Static assets currently lack SRI attributes and aggressive caching headers. No protection exists against proxies stripping the CSP header.

### Changes

#### 1. No-cache headers for HTML responses (`server/middleware/csp.ts`)
Add `Cache-Control: private, no-store` and `Pragma: no-cache` directly inside `cspNonceMiddleware`, so every HTML response carrying a nonce is never cached.

#### 2. Static asset caching headers (`server/vite.ts`)
In the `serveStatic` function, configure `express.static` with `maxAge: '1y'` and `immutable: true` for the Vite-built `dist/public` directory (Vite already fingerprints filenames with content hashes). The HTML fallback route will explicitly set `Cache-Control: private, no-store`.

#### 3. SRI helper utility (`server/lib/sri.ts`)
Create a small utility that reads manifest files produced by Vite's build (`dist/public/.vite/manifest.json`) and computes SHA-384 hashes for JS/CSS bundles. Export a function `getSriAttributes(assetPath)` returning `integrity` and `crossorigin` attributes. This can be used when rendering `<script>` or `<link>` tags server-side.

#### 4. Proxy-safe CSP guard (`server/middleware/csp.ts`)
After helmet sets the CSP header, add a response listener (`res.on('finish', ...)`) that logs a warning + increments a Prometheus counter if the `Content-Security-Policy` header is missing at send time -- indicating a downstream proxy stripped it.

---

### Technical Details

**File: `server/middleware/csp.ts`**
- Inside `cspNonceMiddleware`, before calling `helmet.contentSecurityPolicy(...)`, set:
  ```
  res.setHeader('Cache-Control', 'private, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  ```
- After the `helmet(...)(...)(req, res, next)` call, register a `res.on('finish')` listener that checks `res.getHeader('content-security-policy')`. If missing, log a warning via `cspLog.error(...)` and increment a new `csp_header_stripped_total` counter.

**File: `server/vite.ts`**
- In `serveStatic`, change the `express.static` call to:
  ```typescript
  app.use(express.static(distPath, {
    maxAge: '1y',
    immutable: true,
    index: false, // don't serve index.html from static
  }));
  ```
- In the HTML fallback `/{*splat}` handler, add:
  ```typescript
  res.set({
    'Cache-Control': 'private, no-store, must-revalidate',
    'Pragma': 'no-cache',
  });
  ```
- In `setupVite` (dev mode), also add `Cache-Control: private, no-store` on the HTML catch-all response.

**New file: `server/lib/sri.ts`**
- Reads `dist/public/.vite/manifest.json` at startup (cached in memory).
- For each entry, computes `sha384-<base64>` using `crypto.createHash('sha384')`.
- Exports `getSriMap(): Record<string, { integrity: string; crossorigin: string }>` for use in HTML template injection.
- Gracefully returns empty map if manifest doesn't exist (dev mode).

**File: `server/lib/prometheus.ts`**
- Register `csp_header_stripped_total` counter to track proxy interference.

### Files to modify
| File | Action |
|---|---|
| `server/middleware/csp.ts` | Add no-cache headers + proxy-strip detection |
| `server/vite.ts` | Aggressive static caching + no-cache for HTML fallback |
| `server/lib/sri.ts` | New -- SRI hash computation from Vite manifest |
| `server/lib/prometheus.ts` | Add `csp_header_stripped_total` counter |
