/**
 * server/middleware/csp.ts
 *
 * Content-Security-Policy middleware with per-request nonce generation.
 *
 * - Generates a cryptographically random nonce for each request
 * - Attaches nonce to res.locals.cspNonce for use in templates/SSR
 * - Sets CSP header with 'strict-dynamic' for modern browsers
 * - Provides CSP violation report endpoint
 */

import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { registry } from '../lib/prometheus';

const cspLog = logger.child({ service: 'csp' });

/**
 * Generate a cryptographically secure base64 nonce (128-bit).
 */
function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * CSP nonce middleware.
 * Generates a per-request nonce and sets the Content-Security-Policy header.
 *
 * Usage:
 *   app.use(cspNonceMiddleware);
 *   // In templates: <script nonce="<%= res.locals.cspNonce %>">
 */
export function cspNonceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const nonce = generateNonce();

  // Make nonce available to downstream handlers and templates
  res.locals.cspNonce = nonce;

  // Build CSP directives
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: https:`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' https://*.supabase.co https://api.stripe.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `report-uri /api/csp-report`,
    `report-to csp-endpoint`,
  ];

  const cspHeader = directives.join('; ');

  // Set CSP header (enforcing)
  res.setHeader('Content-Security-Policy', cspHeader);

  // Set Report-To header for Reporting API v1
  res.setHeader('Report-To', JSON.stringify({
    group: 'csp-endpoint',
    max_age: 86400,
    endpoints: [{ url: '/api/csp-report' }],
  }));

  next();
}

/**
 * CSP violation report endpoint.
 *
 * Receives violation reports from browsers and logs them.
 * Mount as: app.post('/api/csp-report', express.json({ type: 'application/csp-report' }), cspReportEndpoint);
 */
export function cspReportEndpoint(req: Request, res: Response): void {
  const report = req.body?.['csp-report'] || req.body;

  if (report) {
    cspLog.warn({
      violatedDirective: report['violated-directive'] || report.violatedDirective,
      blockedUri: report['blocked-uri'] || report.blockedURI,
      documentUri: report['document-uri'] || report.documentURI,
      sourceFile: report['source-file'] || report.sourceFile,
      lineNumber: report['line-number'] || report.lineNumber,
      columnNumber: report['column-number'] || report.columnNumber,
      originalPolicy: report['original-policy'] || report.originalPolicy,
    }, 'CSP violation report');

    // Track in Prometheus
    registry.increment('csp_violations_total', {
      directive: String(report['violated-directive'] || report.violatedDirective || 'unknown').split(' ')[0],
      blocked_uri: String(report['blocked-uri'] || report.blockedURI || 'unknown').substring(0, 64),
    });
  }

  // Always return 204 — browsers expect no content
  res.status(204).end();
}
