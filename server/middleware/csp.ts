/**
 * server/middleware/csp.ts
 *
 * Content-Security-Policy middleware with per-request nonce generation.
 *
 * - 24-byte cryptographic nonce (Base64) per request
 * - script-src with 'nonce-...' + 'strict-dynamic'
 * - style-src with 'nonce-...' + 'unsafe-inline' fallback
 * - Nonce available via res.locals.cspNonce for templates/SSR
 * - CSP violation report endpoint at /api/csp-report
 */

import crypto from 'crypto';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { registry } from '../lib/prometheus';

const cspLog = logger.child({ service: 'csp' });

/**
 * CSP nonce middleware.
 * Generates a per-request 24-byte random nonce, sets it on res.locals,
 * then delegates to helmet's contentSecurityPolicy for header generation.
 */
const CSP_REPORT_ONLY = process.env.CSP_REPORT_ONLY !== 'false'; // default true for safe rollout

export function cspNonceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const nonce = crypto.randomBytes(24).toString('base64');
  res.locals.cspNonce = nonce;

  // Prevent caching of HTML responses containing per-request nonces
  res.setHeader('Cache-Control', 'private, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  // Detect if a downstream proxy strips the CSP header
  res.on('finish', () => {
    const enforceHeader = res.getHeader('content-security-policy');
    const reportHeader = res.getHeader('content-security-policy-report-only');
    if (!enforceHeader && !reportHeader) {
      cspLog.error({ url: req.originalUrl }, 'CSP header was stripped by a downstream proxy');
      registry.increment('csp_header_stripped_total');
    }
  });

  helmet.contentSecurityPolicy({
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"],
      styleSrc: ["'self'", `'nonce-${nonce}'`, "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://api.stripe.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      reportUri: "/api/csp-report",
    },
  })(req, res, () => {
    // After helmet sets Content-Security-Policy, optionally switch to Report-Only
    if (CSP_REPORT_ONLY) {
      const cspValue = res.getHeader('content-security-policy');
      if (cspValue) {
        res.removeHeader('content-security-policy');
        res.setHeader('content-security-policy-report-only', cspValue);
      }
    }
    next();
  });
}

/**
 * CSP violation report endpoint.
 * Logs violations and tracks them in Prometheus.
 *
 * Mount: app.post('/api/csp-report', express.json({ type: 'application/csp-report' }), cspReportEndpoint)
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
    }, 'CSP violation report');

    registry.increment('csp_violations_total', {
      directive: String(report['violated-directive'] || report.violatedDirective || 'unknown').split(' ')[0],
      blocked_uri: String(report['blocked-uri'] || report.blockedURI || 'unknown').substring(0, 64),
    });
  }

  res.status(204).end();
}
