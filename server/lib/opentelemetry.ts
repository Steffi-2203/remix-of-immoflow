/**
 * server/lib/opentelemetry.ts
 *
 * OpenTelemetry bridge: exports traces from the existing tracing system
 * to Jaeger/Tempo via OTLP.
 *
 * When OTEL_EXPORTER_OTLP_ENDPOINT is set, traces are forwarded automatically.
 * Otherwise, traces are only logged (existing behavior).
 */

import { logger } from './logger';
import type { TraceResult, SpanData } from './tracing';

const otelLog = logger.child({ service: 'opentelemetry' });

interface OTLPSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  durationMs: number;
  status: { code: number; message?: string };
  attributes: Array<{ key: string; value: { stringValue?: string; intValue?: string; boolValue?: boolean } }>;
  events: Array<{ name: string; timeUnixNano: string; attributes?: Array<{ key: string; value: { stringValue?: string } }> }>;
}

interface OTLPExportRequest {
  resourceSpans: Array<{
    resource: {
      attributes: Array<{ key: string; value: { stringValue: string } }>;
    };
    scopeSpans: Array<{
      scope: { name: string; version: string };
      spans: OTLPSpan[];
    }>;
  }>;
}

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'immoflowme';
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const OTLP_HEADERS: Record<string, string> = {};

// Parse OTEL_EXPORTER_OTLP_HEADERS (comma-separated key=value)
if (process.env.OTEL_EXPORTER_OTLP_HEADERS) {
  for (const pair of process.env.OTEL_EXPORTER_OTLP_HEADERS.split(',')) {
    const [key, ...rest] = pair.split('=');
    if (key && rest.length) {
      OTLP_HEADERS[key.trim()] = rest.join('=').trim();
    }
  }
}

/**
 * Convert internal SpanData to OTLP format
 */
function toOTLPSpan(span: SpanData): OTLPSpan {
  return {
    traceId: span.traceId,
    spanId: span.spanId,
    parentSpanId: span.parentSpanId || undefined,
    operationName: span.operationName,
    startTimeUnixNano: String(span.startTime * 1_000_000),
    endTimeUnixNano: String((span.endTime || span.startTime) * 1_000_000),
    durationMs: span.durationMs || 0,
    status: {
      code: span.status === 'ok' ? 1 : 2,
      message: span.status === 'error' ? String(span.attributes['error.message'] || '') : undefined,
    },
    attributes: Object.entries(span.attributes).map(([key, value]) => ({
      key,
      value: typeof value === 'number'
        ? { intValue: String(value) }
        : typeof value === 'boolean'
          ? { boolValue: value }
          : { stringValue: String(value) },
    })),
    events: span.events.map(e => ({
      name: e.name,
      timeUnixNano: String(e.timestamp * 1_000_000),
      attributes: e.attributes
        ? Object.entries(e.attributes).map(([k, v]) => ({ key: k, value: { stringValue: String(v) } }))
        : undefined,
    })),
  };
}

/**
 * Export a TraceResult to the configured OTLP endpoint.
 * Falls back to structured logging if no endpoint is configured.
 */
export async function exportTrace(result: TraceResult): Promise<void> {
  if (!OTLP_ENDPOINT) {
    otelLog.debug({ traceId: result.traceId, spans: result.spanCount }, 'OTLP endpoint not configured — trace logged only');
    return;
  }

  const payload: OTLPExportRequest = {
    resourceSpans: [{
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: SERVICE_NAME } },
          { key: 'service.version', value: { stringValue: process.env.npm_package_version || 'unknown' } },
          { key: 'deployment.environment', value: { stringValue: process.env.NODE_ENV || 'development' } },
        ],
      },
      scopeSpans: [{
        scope: { name: 'immoflowme-tracing', version: '1.0.0' },
        spans: result.spans.map(toOTLPSpan),
      }],
    }],
  };

  try {
    const url = `${OTLP_ENDPOINT}/v1/traces`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...OTLP_HEADERS,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      otelLog.warn({ status: response.status, traceId: result.traceId }, 'OTLP export failed');
    } else {
      otelLog.debug({ traceId: result.traceId, spans: result.spanCount }, 'Trace exported to OTLP');
    }
  } catch (err) {
    // Non-blocking: don't crash the app if tracing export fails
    otelLog.warn({ err, traceId: result.traceId }, 'OTLP export error (non-blocking)');
  }
}

/**
 * Middleware to inject trace context headers (W3C Trace Context)
 */
export function traceContextMiddleware(req: any, res: any, next: any): void {
  // Parse incoming traceparent header
  const traceparent = req.headers['traceparent'];
  if (traceparent) {
    const parts = traceparent.split('-');
    if (parts.length === 4) {
      req.traceContext = {
        traceId: parts[1],
        parentSpanId: parts[2],
        traceFlags: parts[3],
      };
    }
  }

  // Generate outgoing traceparent if none exists
  if (!req.traceContext) {
    const { randomBytes } = require('crypto');
    req.traceContext = {
      traceId: randomBytes(16).toString('hex'),
      parentSpanId: randomBytes(8).toString('hex'),
      traceFlags: '01',
    };
  }

  // Set response header for downstream correlation
  res.setHeader('traceparent',
    `00-${req.traceContext.traceId}-${req.traceContext.parentSpanId}-${req.traceContext.traceFlags}`
  );

  next();
}
