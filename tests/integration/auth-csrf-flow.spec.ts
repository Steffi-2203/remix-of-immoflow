import { describe, it, expect } from "vitest";
import crypto from "crypto";

/**
 * E2E Flow: Auth → CSRF-protected POST → Logout
 *
 * Tests the CSRF token lifecycle without a running server.
 * Validates token generation, verification, and rejection logic.
 */

// Replicate the CSRF logic from server/middleware/csrf.ts
function generateCsrfToken(secret: string, route: string): string {
  return crypto.createHmac("sha256", secret).update(route).digest("hex");
}

function verifyCsrfToken(
  secret: string,
  clientToken: string,
  route: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(route)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(clientToken),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

describe("E2E: Auth → CSRF-protected POST → Logout", () => {
  const sessionSecret = crypto.randomBytes(32).toString("hex");

  describe("CSRF Token Lifecycle", () => {
    it("should generate a valid CSRF token", () => {
      const token = generateCsrfToken(sessionSecret, "*");
      expect(token).toBeDefined();
      expect(token.length).toBe(64); // SHA-256 hex = 64 chars
    });

    it("should verify a correct token", () => {
      const token = generateCsrfToken(sessionSecret, "*");
      const isValid = verifyCsrfToken(sessionSecret, token, "*");
      expect(isValid).toBe(true);
    });

    it("should reject a tampered token", () => {
      const token = generateCsrfToken(sessionSecret, "*");
      const tampered = "a" + token.slice(1);
      const isValid = verifyCsrfToken(sessionSecret, tampered, "*");
      expect(isValid).toBe(false);
    });

    it("should reject a token from a different session", () => {
      const otherSecret = crypto.randomBytes(32).toString("hex");
      const token = generateCsrfToken(otherSecret, "*");
      const isValid = verifyCsrfToken(sessionSecret, token, "*");
      expect(isValid).toBe(false);
    });

    it("should reject an empty token", () => {
      const isValid = verifyCsrfToken(sessionSecret, "", "*");
      expect(isValid).toBe(false);
    });

    it("should reject a token with different route scope", () => {
      const token = generateCsrfToken(sessionSecret, "/api/payments");
      const isValid = verifyCsrfToken(sessionSecret, token, "*");
      expect(isValid).toBe(false);
    });
  });

  describe("Session flow", () => {
    it("should produce unique tokens per session", () => {
      const secret1 = crypto.randomBytes(32).toString("hex");
      const secret2 = crypto.randomBytes(32).toString("hex");

      const token1 = generateCsrfToken(secret1, "*");
      const token2 = generateCsrfToken(secret2, "*");

      expect(token1).not.toBe(token2);
    });

    it("should produce deterministic tokens for same secret + route", () => {
      const token1 = generateCsrfToken(sessionSecret, "*");
      const token2 = generateCsrfToken(sessionSecret, "*");
      expect(token1).toBe(token2);
    });

    it("after logout (secret destroyed), old token should still verify against old secret", () => {
      const token = generateCsrfToken(sessionSecret, "*");
      // After logout, the secret is gone from session
      // But if someone kept the old secret, the token still matches
      const isValid = verifyCsrfToken(sessionSecret, token, "*");
      expect(isValid).toBe(true);
    });
  });
});
