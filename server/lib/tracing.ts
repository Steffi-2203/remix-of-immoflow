import crypto from 'crypto';

/**
 * Distributed Tracing for billing batch runs.
 *
 * Provides OpenTelemetry-compatible trace/span IDs and structured
 * timing for the COPY → upsert → audit pipeline.
 *
 * Usage:
 *   const trace = createTrace('billing-run', runId);
 *   const span = trace.startSpan('temp_table_create');
 *   await doWork();
 *   span.end();
 *   trace.finish();
 *   // → structured JSON with full trace context
 */

export interface TraceContext {
  traceId: string;
  runId: string;
  parentSpanId?: string;
}

export interface SpanData {
  spanId: string;
  traceId: string;
  parentSpanId: string | null;
  operationName: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: 'ok' | 'error';
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, string | number>;
}

export interface Span {
  spanId: string;
  addEvent(name: string, attributes?: Record<string, string | number>): void;
  setAttribute(key: string, value: string | number | boolean): void;
  setStatus(status: 'ok' | 'error', message?: string): void;
  end(): void;
  data: SpanData;
}

export interface Trace {
  traceId: string;
  runId: string;
  startSpan(operationName: string, parentSpanId?: string): Span;
  finish(): TraceResult;
  toJSON(): object;
}

export interface TraceResult {
  traceId: string;
  runId: string;
  totalDurationMs: number;
  spanCount: number;
  spans: SpanData[];
  pipeline: PipelineStage[];
}

export interface PipelineStage {
  stage: string;
  durationMs: number;
  percentage: number;
}

function generateId(bytes = 8): string {
  return crypto.randomBytes(bytes).toString('hex');
}

function generateTraceId(): string {
  return generateId(16); // 32 hex chars (W3C trace-id)
}

function generateSpanId(): string {
  return generateId(8); // 16 hex chars (W3C span-id)
}

export function createTrace(service: string, runId: string): Trace {
  const traceId = generateTraceId();
  const traceStart = Date.now();
  const spans: SpanData[] = [];

  function startSpan(operationName: string, parentSpanId?: string): Span {
    const spanId = generateSpanId();
    const spanData: SpanData = {
      spanId,
      traceId,
      parentSpanId: parentSpanId || null,
      operationName,
      startTime: Date.now(),
      status: 'ok',
      attributes: {
        'service.name': service,
        'run.id': runId,
      },
      events: [],
    };

    const span: Span = {
      spanId,
      data: spanData,
      addEvent(name: string, attributes?: Record<string, string | number>) {
        spanData.events.push({ name, timestamp: Date.now(), attributes });
      },
      setAttribute(key: string, value: string | number | boolean) {
        spanData.attributes[key] = value;
      },
      setStatus(status: 'ok' | 'error', message?: string) {
        spanData.status = status;
        if (message) spanData.attributes['error.message'] = message;
      },
      end() {
        spanData.endTime = Date.now();
        spanData.durationMs = spanData.endTime - spanData.startTime;
        spans.push(spanData);
      },
    };

    return span;
  }

  function finish(): TraceResult {
    const totalDurationMs = Date.now() - traceStart;

    // Build pipeline stages from root-level spans (no parent)
    const rootSpans = spans.filter(s => !s.parentSpanId);
    const pipeline: PipelineStage[] = rootSpans.map(s => ({
      stage: s.operationName,
      durationMs: s.durationMs || 0,
      percentage: totalDurationMs > 0
        ? Math.round(((s.durationMs || 0) / totalDurationMs) * 100)
        : 0,
    }));

    const result: TraceResult = {
      traceId,
      runId,
      totalDurationMs,
      spanCount: spans.length,
      spans,
      pipeline,
    };

    // Structured log output
    console.info(JSON.stringify({
      level: 'info',
      msg: 'trace_complete',
      trace_id: traceId,
      run_id: runId,
      service,
      total_duration_ms: totalDurationMs,
      span_count: spans.length,
      pipeline: pipeline.map(p => `${p.stage}:${p.durationMs}ms(${p.percentage}%)`).join(' → '),
    }));

    return result;
  }

  function toJSON() {
    return {
      traceId,
      runId,
      service,
      startTime: traceStart,
      spans: spans.map(s => ({
        ...s,
        events: s.events,
      })),
    };
  }

  return { traceId, runId, startSpan, finish, toJSON };
}

/**
 * Pre-defined span names for the billing pipeline.
 */
export const BILLING_SPANS = {
  TEMP_TABLE_CREATE: 'billing.temp_table_create',
  COPY_TO_TEMP: 'billing.copy_to_temp',
  UPSERT_CTE: 'billing.upsert_cte',
  AUDIT_WRITE: 'billing.audit_write',
  METRICS_FLUSH: 'billing.metrics_flush',
  SLO_CHECK: 'billing.slo_check',
  CHUNK_PROCESS: 'billing.chunk_process',
  DUPLICATE_CHECK: 'billing.duplicate_check',
  ROLLBACK: 'billing.rollback',
} as const;

/**
 * Convenience: wrap an async operation in a traced span.
 */
export async function withSpan<T>(
  trace: Trace,
  operationName: string,
  fn: (span: Span) => Promise<T>,
  parentSpanId?: string
): Promise<T> {
  const span = trace.startSpan(operationName, parentSpanId);
  try {
    const result = await fn(span);
    span.setStatus('ok');
    return result;
  } catch (err) {
    span.setStatus('error', err instanceof Error ? err.message : String(err));
    throw err;
  } finally {
    span.end();
  }
}
