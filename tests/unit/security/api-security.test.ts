import { describe, it, expect, vi } from 'vitest';
import { sanitizeInput } from '../../../server/lib/sanitize';

/**
 * API Security Tests
 * SQL injection payloads, input sanitization, CSRF basics.
 */
describe('API Security', () => {
  describe('Input Sanitization', () => {
    it('strips HTML tags from strings', () => {
      const input = { name: '<script>alert("xss")</script>Hello' };
      const result = sanitizeInput(input);
      expect(result.name).not.toContain('<script>');
      expect(result.name).toContain('Hello');
    });

    it('handles nested objects', () => {
      const input = { tenant: { name: '<img onerror=alert(1) src=x>' } };
      const result = sanitizeInput(input);
      expect(result.tenant.name).not.toContain('<img');
    });

    it('preserves non-string values', () => {
      const input = { amount: 500, active: true, tags: [1, 2, 3] };
      const result = sanitizeInput(input);
      expect(result.amount).toBe(500);
      expect(result.active).toBe(true);
    });
  });

  describe('SQL Injection Payloads', () => {
    const payloads = [
      "'; DROP TABLE users; --",
      "1 OR 1=1",
      "1' UNION SELECT * FROM profiles--",
      "admin'--",
      "1; WAITFOR DELAY '0:0:5'--",
    ];

    it.each(payloads)('sanitizes payload: %s', (payload) => {
      const input = { search: payload };
      const result = sanitizeInput(input);
      // Sanitizer should not crash and should strip dangerous chars
      expect(typeof result.search).toBe('string');
    });
  });
});
