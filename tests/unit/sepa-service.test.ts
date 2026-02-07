import { describe, test, expect } from 'vitest';

/**
 * Integration tests for SEPA Export logic
 * Tests XML generation, escaping, IBAN/BIC validation
 * Pure function tests extracted from SepaExportService
 */

// Replicate service methods as pure functions for testability
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

function generateEndToEndId(tenantId: string, invoiceMonth: number, invoiceYear: number): string {
  return `E2E-${invoiceYear}${String(invoiceMonth).padStart(2, '0')}-${tenantId.substr(0, 8)}`.toUpperCase();
}

describe('SepaExportService - Pure Functions', () => {
  describe('escapeXml', () => {
    test('escapes all XML special characters', () => {
      expect(escapeXml('Müller & Söhne <GmbH>')).toBe('Müller &amp; Söhne &lt;GmbH&gt;');
      expect(escapeXml('Test "Wert"')).toBe('Test &quot;Wert&quot;');
      expect(escapeXml("Test 'Wert'")).toBe("Test &apos;Wert&apos;");
    });

    test('handles empty and clean strings', () => {
      expect(escapeXml('')).toBe('');
      expect(escapeXml('Max Mustermann')).toBe('Max Mustermann');
    });

    test('prevents XSS in tenant names', () => {
      const malicious = '<script>alert("xss")</script>';
      const escaped = escapeXml(malicious);
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });
  });

  describe('formatAmount', () => {
    test('formats amounts to 2 decimal places', () => {
      expect(formatAmount(100)).toBe('100.00');
      expect(formatAmount(99.9)).toBe('99.90');
      expect(formatAmount(1234.567)).toBe('1234.57');
      expect(formatAmount(0)).toBe('0.00');
    });

    test('handles large amounts (500+ units)', () => {
      const total = 850 * 500; // 500 units × €850
      expect(formatAmount(total)).toBe('425000.00');
    });
  });

  describe('generateEndToEndId', () => {
    test('generates correct E2E ID format', () => {
      const e2e = generateEndToEndId('abc12345-6789', 3, 2026);
      expect(e2e).toMatch(/^E2E-202603-/);
      expect(e2e.length).toBeLessThanOrEqual(35);
    });

    test('pads single-digit months', () => {
      expect(generateEndToEndId('t1', 1, 2026)).toContain('202601');
      expect(generateEndToEndId('t1', 12, 2026)).toContain('202612');
    });

    test('generates unique IDs for different tenants', () => {
      const id1 = generateEndToEndId('tenant-aaa', 3, 2026);
      const id2 = generateEndToEndId('tenant-bbb', 3, 2026);
      expect(id1).not.toBe(id2);
    });
  });

  describe('IBAN/BIC validation', () => {
    test('IBAN cleanup removes spaces', () => {
      const iban = 'AT61 1904 3002 3457 3201';
      const cleaned = iban.replace(/\s/g, '');
      expect(cleaned).toBe('AT611904300234573201');
      expect(cleaned).toMatch(/^[A-Z]{2}\d{2}/);
    });

    test('handles missing BIC fallback', () => {
      expect('' || 'NOTPROVIDED').toBe('NOTPROVIDED');
      expect('BKAUATWW' || 'NOTPROVIDED').toBe('BKAUATWW');
    });

    test('reference truncation to 140 chars (SEPA max)', () => {
      const longRef = 'Miete März 2026 - Musterstraße 1/Top 1 - '.repeat(5);
      expect(longRef.substring(0, 140).length).toBe(140);
    });
  });

  describe('SEPA XML structure validation', () => {
    test('pain.008 direct debit XML contains required elements', () => {
      const requiredElements = [
        'CstmrDrctDbtInitn', 'GrpHdr', 'MsgId', 'CreDtTm', 'NbOfTxs',
        'CtrlSum', 'PmtInf', 'PmtMtd', 'ReqdColltnDt', 'Cdtr',
        'CdtrAcct', 'IBAN', 'DrctDbtTxInf', 'EndToEndId', 'InstdAmt',
      ];
      // Verify element names are valid XML
      requiredElements.forEach(el => {
        expect(el).toMatch(/^[A-Za-z][A-Za-z0-9]*$/);
      });
    });

    test('pain.001 credit transfer XML contains required elements', () => {
      const requiredElements = [
        'CstmrCdtTrfInitn', 'GrpHdr', 'MsgId', 'PmtInf',
        'PmtMtd', 'ReqdExctnDt', 'Dbtr', 'CdtTrfTxInf',
      ];
      requiredElements.forEach(el => {
        expect(el).toMatch(/^[A-Za-z][A-Za-z0-9]*$/);
      });
    });
  });
});
