/**
 * server/lib/prometheus.ts
 *
 * Prometheus metrics exporter.
 * Bridges the existing MetricsCollector to Prometheus text format.
 * Exposes HTTP request metrics, billing metrics, and Node.js runtime metrics.
 *
 * Endpoint: GET /metrics (Prometheus scrape target)
 */

import type { Request, Response, NextFunction } from 'express';
import { metrics, METRIC } from './metrics';
import { logger } from './logger';

const promLog = logger.child({ service: 'prometheus' });

// ─── Prometheus Registry ───

interface PrometheusMetric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labels: string[];
  values: Map<string, { value: number; labels: Record<string, string>; buckets?: Map<number, number> }>;
}

class PrometheusRegistry {
  private metrics = new Map<string, PrometheusMetric>();
  private defaultBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

  register(name: string, help: string, type: PrometheusMetric['type'], labels: string[] = []): PrometheusMetric {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { name, help, type, labels, values: new Map() });
    }
    return this.metrics.get(name)!;
  }

  increment(name: string, labels: Record<string, string> = {}, delta = 1): void {
    const metric = this.metrics.get(name);
    if (!metric) return;
    const key = this.labelsKey(labels);
    const existing = metric.values.get(key);
    if (existing) {
      existing.value += delta;
    } else {
      metric.values.set(key, { value: delta, labels });
    }
  }

  set(name: string, labels: Record<string, string> = {}, value: number): void {
    const metric = this.metrics.get(name);
    if (!metric) return;
    const key = this.labelsKey(labels);
    metric.values.set(key, { value, labels });
  }

  observe(name: string, labels: Record<string, string> = {}, value: number): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram') return;
    const key = this.labelsKey(labels);
    const existing = metric.values.get(key);

    if (existing) {
      existing.value += 1; // count
      if (!existing.buckets) existing.buckets = new Map();
      for (const b of this.defaultBuckets) {
        existing.buckets.set(b, (existing.buckets.get(b) || 0) + (value <= b ? 1 : 0));
      }
      existing.buckets.set(Infinity, (existing.buckets.get(Infinity) || 0) + 1);
    } else {
      const buckets = new Map<number, number>();
      for (const b of this.defaultBuckets) {
        buckets.set(b, value <= b ? 1 : 0);
      }
      buckets.set(Infinity, 1);
      metric.values.set(key, { value: 1, labels, buckets });
    }
  }

  /** Render all metrics in Prometheus text exposition format */
  render(): string {
    const lines: string[] = [];

    for (const [, metric] of this.metrics) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      for (const [, entry] of metric.values) {
        const labelStr = this.formatLabels(entry.labels);

        if (metric.type === 'histogram' && entry.buckets) {
          let cumulative = 0;
          for (const b of this.defaultBuckets) {
            cumulative += entry.buckets.get(b) || 0;
            lines.push(`${metric.name}_bucket{${labelStr}${labelStr ? ',' : ''}le="${b}"} ${cumulative}`);
          }
          const total = entry.buckets.get(Infinity) || 0;
          cumulative += total - (entry.buckets.get(this.defaultBuckets[this.defaultBuckets.length - 1]) || 0);
          lines.push(`${metric.name}_bucket{${labelStr}${labelStr ? ',' : ''}le="+Inf"} ${entry.value}`);
          lines.push(`${metric.name}_count{${labelStr}} ${entry.value}`);
        } else {
          lines.push(`${metric.name}${labelStr ? `{${labelStr}}` : ''} ${entry.value}`);
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  private labelsKey(labels: Record<string, string>): string {
    return Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}="${v}"`).join(',');
  }

  private formatLabels(labels: Record<string, string>): string {
    return Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',');
  }
}

// ─── Singleton Registry ───

export const registry = new PrometheusRegistry();

// ─── Register Standard Metrics ───

// ════════════════════════════════════════════
// HTTP / App Request Metrics
// ════════════════════════════════════════════
registry.register('http_requests_total', 'Total HTTP requests', 'counter', ['method', 'route', 'status', 'org']);
registry.register('http_request_duration_seconds', 'HTTP request duration in seconds', 'histogram', ['method', 'route']);
registry.register('http_requests_in_flight', 'Currently in-flight HTTP requests', 'gauge');

// ════════════════════════════════════════════
// Billing / Business Metrics
// ════════════════════════════════════════════
registry.register('billing_invoices_generated_total', 'Total invoices generated', 'counter', ['status']);
registry.register('billing_lines_upserted_total', 'Total invoice lines upserted', 'counter');
registry.register('billing_conflicts_total', 'Total billing conflicts', 'counter');
registry.register('billing_run_duration_seconds', 'Billing run duration in seconds', 'histogram');
registry.register('billing_runs_total', 'Total billing runs', 'counter', ['status']);
registry.register('billing_last_successful_run_timestamp', 'Unix timestamp of last successful billing run', 'gauge');

// Payment & allocation
registry.register('payment_allocations_total', 'Total payment allocations (FIFO)', 'counter', ['status']);
registry.register('payment_amount_cents_total', 'Total payment amount in cents', 'counter');
registry.register('payments_failed_total', 'Total failed payments', 'counter', ['reason']);

// Settlements (BK)
registry.register('settlement_generated_total', 'Total BK settlements generated', 'counter', ['status']);
registry.register('settlement_warnings_total', 'Warnings during settlement generation', 'counter', ['type']);
registry.register('settlement_duration_seconds', 'Settlement generation duration', 'histogram');

// SEPA
registry.register('sepa_files_created_total', 'Total SEPA pain.001 files created', 'counter');
registry.register('sepa_collections_total', 'Total SEPA collections', 'counter', ['status']);
registry.register('sepa_amount_cents_total', 'Total SEPA collection amount in cents', 'counter');

// ════════════════════════════════════════════
// Job Queue Metrics
// ════════════════════════════════════════════
registry.register('job_queue_pending_total', 'Pending jobs in queue', 'gauge');
registry.register('job_queue_processing_total', 'Currently processing jobs', 'gauge');
registry.register('job_queue_failed_total', 'Total failed jobs', 'counter', ['job_type']);
registry.register('job_queue_completed_total', 'Total completed jobs', 'counter', ['job_type']);
registry.register('job_queue_duration_seconds', 'Job processing duration', 'histogram', ['job_type']);

// ════════════════════════════════════════════
// Database Metrics
// ════════════════════════════════════════════
registry.register('db_query_duration_seconds', 'Database query duration in seconds', 'histogram', ['operation']);
registry.register('db_query_slow_total', 'Slow queries (> 1s)', 'counter', ['operation']);
registry.register('db_connections_active', 'Active DB connections', 'gauge');
registry.register('db_connections_idle', 'Idle DB connections', 'gauge');
registry.register('db_connections_waiting', 'Waiting DB connections', 'gauge');
registry.register('db_replication_lag_seconds', 'Replication lag in seconds', 'gauge');

// ════════════════════════════════════════════
// Safety / Security Metrics
// ════════════════════════════════════════════
registry.register('csrf_failures_total', 'CSRF validation failures', 'counter', ['route']);
registry.register('period_lock_errors_total', 'Period lock enforcement rejections (409)', 'counter');
registry.register('idor_attempts_total', 'IDOR/ownership violation attempts', 'counter', ['table']);
registry.register('auth_failures_total', 'Authentication failures', 'counter', ['type']);
registry.register('rate_limit_hits_total', 'Rate limiter rejections (429)', 'counter', ['route']);
registry.register('input_sanitization_strips_total', 'Input sanitization HTML/control char strips', 'counter');
registry.register('retention_freeze_blocks_total', 'Deletion blocked by retention freeze (BAO/GoBD)', 'counter');
registry.register('security_events_total', 'Security events logged', 'counter', ['event_type']);
registry.register('csp_violations_total', 'CSP violation reports received', 'counter', ['directive', 'blocked_uri']);

// ════════════════════════════════════════════
// Backup / DR Metrics
// ════════════════════════════════════════════
registry.register('backup_success_total', 'Successful backups', 'counter');
registry.register('backup_failure_total', 'Failed backups', 'counter');
registry.register('backup_last_success_timestamp', 'Timestamp of last successful backup', 'gauge');
registry.register('backup_duration_seconds', 'Backup duration in seconds', 'histogram');
registry.register('backup_size_bytes', 'Last backup size in bytes', 'gauge');
registry.register('wal_archive_lag_seconds', 'WAL archive lag in seconds', 'gauge');
registry.register('wal_archive_last_success_timestamp', 'Timestamp of last successful WAL archive', 'gauge');

// ════════════════════════════════════════════
// Node.js Runtime Metrics
// ════════════════════════════════════════════
registry.register('nodejs_heap_used_bytes', 'Node.js heap used bytes', 'gauge');
registry.register('nodejs_heap_total_bytes', 'Node.js heap total bytes', 'gauge');
registry.register('nodejs_external_memory_bytes', 'Node.js external memory bytes', 'gauge');
registry.register('nodejs_eventloop_lag_seconds', 'Node.js event loop lag in seconds', 'gauge');
registry.register('process_cpu_seconds_total', 'Total CPU time in seconds', 'counter');
registry.register('process_resident_memory_bytes', 'Resident memory size in bytes', 'gauge');
registry.register('nodejs_active_handles', 'Active handles (sockets, timers)', 'gauge');
registry.register('nodejs_active_requests', 'Active libuv requests', 'gauge');

// ─── Collect Node.js Runtime Metrics ───

function collectRuntimeMetrics(): void {
  const mem = process.memoryUsage();
  registry.set('nodejs_heap_used_bytes', {}, mem.heapUsed);
  registry.set('nodejs_heap_total_bytes', {}, mem.heapTotal);
  registry.set('nodejs_external_memory_bytes', {}, mem.external);
  registry.set('process_resident_memory_bytes', {}, mem.rss);

  const cpuUsage = process.cpuUsage();
  registry.set('process_cpu_seconds_total', {}, (cpuUsage.user + cpuUsage.system) / 1e6);

  // Event loop lag estimation
  const lagStart = Date.now();
  setImmediate(() => {
    const lag = (Date.now() - lagStart) / 1000;
    registry.set('nodejs_eventloop_lag_seconds', {}, lag);
  });

  // Active handles/requests
  if (typeof (process as any)._getActiveHandles === 'function') {
    registry.set('nodejs_active_handles', {}, (process as any)._getActiveHandles().length);
  }
  if (typeof (process as any)._getActiveRequests === 'function') {
    registry.set('nodejs_active_requests', {}, (process as any)._getActiveRequests().length);
  }
}

// ─── Sync Billing Metrics from Existing Collector ───

function syncBillingMetrics(): void {
  const snap = metrics.snapshot();
  for (const [key, entry] of Object.entries(snap)) {
    switch (key) {
      case METRIC.INVOICES_INSERTED:
        registry.set('billing_invoices_generated_total', { status: 'success' }, entry.value);
        break;
      case METRIC.LINES_UPSERTED:
        registry.set('billing_lines_upserted_total', {}, entry.value);
        break;
      case METRIC.CONFLICT_COUNT:
        registry.set('billing_conflicts_total', {}, entry.value);
        break;
      case METRIC.RUN_DURATION_MS:
        if (entry.count) {
          registry.observe('billing_run_duration_seconds', {}, entry.value / 1000);
        }
        break;
    }
  }
}

// ─── HTTP Metrics Middleware ───

let inFlight = 0;

export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip metrics endpoint itself to avoid recursion
  if (req.path === '/metrics' || req.path === '/api/metrics') {
    next();
    return;
  }

  inFlight++;
  registry.set('http_requests_in_flight', {}, inFlight);

  const start = process.hrtime.bigint();

  const onFinish = () => {
    inFlight--;
    registry.set('http_requests_in_flight', {}, inFlight);

    const durationNs = Number(process.hrtime.bigint() - start);
    const durationSec = durationNs / 1e9;

    // Normalize route to avoid cardinality explosion
    const route = normalizeRoute(req.route?.path || req.path);
    const method = req.method;
    const status = String(res.statusCode);
    const org = (req as any).session?.orgId || '';

    registry.increment('http_requests_total', { method, route, status, org });
    registry.observe('http_request_duration_seconds', { method, route }, durationSec);

    res.removeListener('finish', onFinish);
    res.removeListener('close', onFinish);
  };

  res.on('finish', onFinish);
  res.on('close', onFinish);

  next();
}

function normalizeRoute(path: string): string {
  // Replace UUIDs with :id
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+/g, '/:num')
    .replace(/\/$/, '') || '/';
}

// ─── Prometheus Scrape Endpoint ───

export function prometheusEndpoint(_req: Request, res: Response): void {
  try {
    collectRuntimeMetrics();
    syncBillingMetrics();

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(registry.render());
  } catch (err) {
    promLog.error({ err }, 'Failed to render Prometheus metrics');
    res.status(500).send('# Error rendering metrics\n');
  }
}

// ════════════════════════════════════════════
// Instrumentation Helpers
// ════════════════════════════════════════════

/**
 * Record a security event metric.
 * Call from CSRF middleware, ownership checks, rate limiter, etc.
 */
export function recordSecurityEvent(eventType: 'csrf_failure' | 'idor_attempt' | 'auth_failure' | 'rate_limit' | 'period_lock' | 'sanitization_strip' | 'retention_freeze', extra?: { route?: string; table?: string; type?: string }): void {
  registry.increment('security_events_total', { event_type: eventType });

  switch (eventType) {
    case 'csrf_failure':
      registry.increment('csrf_failures_total', { route: extra?.route || 'unknown' });
      break;
    case 'idor_attempt':
      registry.increment('idor_attempts_total', { table: extra?.table || 'unknown' });
      break;
    case 'auth_failure':
      registry.increment('auth_failures_total', { type: extra?.type || 'unknown' });
      break;
    case 'rate_limit':
      registry.increment('rate_limit_hits_total', { route: extra?.route || 'unknown' });
      break;
    case 'period_lock':
      registry.increment('period_lock_errors_total');
      break;
    case 'sanitization_strip':
      registry.increment('input_sanitization_strips_total');
      break;
    case 'retention_freeze':
      registry.increment('retention_freeze_blocks_total');
      break;
  }
}

/**
 * Record a DB query metric. Call from query wrappers.
 */
export function recordDbQuery(operation: string, durationMs: number): void {
  const durationSec = durationMs / 1000;
  registry.observe('db_query_duration_seconds', { operation }, durationSec);
  if (durationMs > 1000) {
    registry.increment('db_query_slow_total', { operation });
  }
}

/**
 * Record payment allocation metrics.
 */
export function recordPaymentAllocation(status: 'success' | 'failed' | 'partial', amountCents: number): void {
  registry.increment('payment_allocations_total', { status });
  registry.increment('payment_amount_cents_total', {}, amountCents);
  if (status === 'failed') {
    registry.increment('payments_failed_total', { reason: 'allocation' });
  }
}

/**
 * Record settlement (BK) metrics.
 */
export function recordSettlement(status: 'draft' | 'finalized' | 'error', durationMs?: number, warnings?: number): void {
  registry.increment('settlement_generated_total', { status });
  if (durationMs !== undefined) {
    registry.observe('settlement_duration_seconds', {}, durationMs / 1000);
  }
  if (warnings && warnings > 0) {
    registry.increment('settlement_warnings_total', { type: 'general' }, warnings);
  }
}

/**
 * Record SEPA metrics.
 */
export function recordSepa(event: 'file_created' | 'collection_success' | 'collection_failed', amountCents?: number): void {
  switch (event) {
    case 'file_created':
      registry.increment('sepa_files_created_total');
      break;
    case 'collection_success':
      registry.increment('sepa_collections_total', { status: 'success' });
      if (amountCents) registry.increment('sepa_amount_cents_total', {}, amountCents);
      break;
    case 'collection_failed':
      registry.increment('sepa_collections_total', { status: 'failed' });
      break;
  }
}

/**
 * Record backup/DR metrics.
 */
export function recordBackup(success: boolean, durationMs?: number, sizeBytes?: number): void {
  if (success) {
    registry.increment('backup_success_total');
    registry.set('backup_last_success_timestamp', {}, Date.now() / 1000);
  } else {
    registry.increment('backup_failure_total');
  }
  if (durationMs !== undefined) {
    registry.observe('backup_duration_seconds', {}, durationMs / 1000);
  }
  if (sizeBytes !== undefined) {
    registry.set('backup_size_bytes', {}, sizeBytes);
  }
}

/**
 * Update DB connection pool metrics. Call periodically.
 */
export function updateDbPoolMetrics(active: number, idle: number, waiting: number): void {
  registry.set('db_connections_active', {}, active);
  registry.set('db_connections_idle', {}, idle);
  registry.set('db_connections_waiting', {}, waiting);
}

/**
 * Update WAL/replication metrics. Call from cron or health check.
 */
export function updateWalMetrics(archiveLagSeconds: number, replicationLagSeconds?: number): void {
  registry.set('wal_archive_lag_seconds', {}, archiveLagSeconds);
  if (archiveLagSeconds === 0) {
    registry.set('wal_archive_last_success_timestamp', {}, Date.now() / 1000);
  }
  if (replicationLagSeconds !== undefined) {
    registry.set('db_replication_lag_seconds', {}, replicationLagSeconds);
  }
}
