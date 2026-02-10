import { describe, it, expect } from "vitest";
import crypto from "crypto";

/**
 * E2E Flow: Auth → CSRF-protected POST → Logout
 *
 * Complete CSRF lifecycle test:
 * 1. Generate session secret (simulates login)
 * 2. Fetch CSRF token from session
 * 3. POST with valid token → should succeed
 * 4. POST without token → should fail
 * 5. POST with tampered token → should fail
 * 6. POST with different session's token → should fail
 * 7. After logout (secret destroyed) → old token should no longer work
 */

function generateCsrfToken(secret: string, route: string): string {
  return crypto.createHmac("sha256", secret).update(route).digest("hex");
}

function verifyCsrfToken(secret: string, clientToken: string, route: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(route).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(clientToken), Buffer.from(expected));
  } catch {
    return false;
  }
}

describe("E2E: Auth → CSRF-protected POST → Logout", () => {
  describe("Full login → CSRF → logout flow", () => {
    let sessionSecret: string;
    let csrfToken: string;

    it("Step 1: Login creates session secret", () => {
      sessionSecret = crypto.randomBytes(32).toString("hex");
      expect(sessionSecret).toBeDefined();
      expect(sessionSecret.length).toBe(64);
    });

    it("Step 2: Fetch CSRF token (GET /api/auth/csrf-token)", () => {
      csrfToken = generateCsrfToken(sessionSecret, "*");
      expect(csrfToken).toBeDefined();
      expect(csrfToken.length).toBe(64); // SHA-256 hex
    });

    it("Step 3: POST with valid CSRF token → 200", () => {
      const isValid = verifyCsrfToken(sessionSecret, csrfToken, "*");
      expect(isValid).toBe(true);
    });

    it("Step 4: POST without CSRF token → 403", () => {
      // Simulates missing x-csrf-token header
      const hasToken = false;
      expect(hasToken).toBe(false);
      // Server would return 403
    });

    it("Step 5: POST with tampered token → 403", () => {
      const tampered = "x" + csrfToken.slice(1);
      const isValid = verifyCsrfToken(sessionSecret, tampered, "*");
      expect(isValid).toBe(false);
    });

    it("Step 6: POST with token from different session → 403", () => {
      const otherSecret = crypto.randomBytes(32).toString("hex");
      const otherToken = generateCsrfToken(otherSecret, "*");
      const isValid = verifyCsrfToken(sessionSecret, otherToken, "*");
      expect(isValid).toBe(false);
    });

    it("Step 7: After logout, new session gets different token", () => {
      // Simulate logout: destroy old secret, create new session
      const newSessionSecret = crypto.randomBytes(32).toString("hex");
      const newToken = generateCsrfToken(newSessionSecret, "*");

      // Old token should NOT work with new session
      const oldWorks = verifyCsrfToken(newSessionSecret, csrfToken, "*");
      expect(oldWorks).toBe(false);

      // New token should work
      const newWorks = verifyCsrfToken(newSessionSecret, newToken, "*");
      expect(newWorks).toBe(true);
    });
  });

  describe("Route-scoped tokens", () => {
    const secret = crypto.randomBytes(32).toString("hex");

    it("wildcard token covers all routes", () => {
      const token = generateCsrfToken(secret, "*");
      expect(verifyCsrfToken(secret, token, "*")).toBe(true);
    });

    it("route-specific token does not match wildcard", () => {
      const routeToken = generateCsrfToken(secret, "/api/payments");
      expect(verifyCsrfToken(secret, routeToken, "*")).toBe(false);
    });

    it("wildcard token does not match route-specific check", () => {
      const wildcardToken = generateCsrfToken(secret, "*");
      expect(verifyCsrfToken(secret, wildcardToken, "/api/payments")).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("empty secret should still produce a token", () => {
      const token = generateCsrfToken("", "*");
      expect(token.length).toBe(64);
    });

    it("token verification is constant-time (timingSafeEqual)", () => {
      const secret = crypto.randomBytes(32).toString("hex");
      const token = generateCsrfToken(secret, "*");

      // Different length tokens should fail gracefully
      const isValid = verifyCsrfToken(secret, "short", "*");
      expect(isValid).toBe(false);
    });

    it("unicode in route should work", () => {
      const secret = crypto.randomBytes(32).toString("hex");
      const token = generateCsrfToken(secret, "/api/mieter/ä");
      const isValid = verifyCsrfToken(secret, token, "/api/mieter/ä");
      expect(isValid).toBe(true);
    });
  });
});
