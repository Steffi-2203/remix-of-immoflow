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

// HTTP request metrics
registry.register('http_requests_total', 'Total HTTP requests', 'counter', ['method', 'route', 'status']);
registry.register('http_request_duration_seconds', 'HTTP request duration in seconds', 'histogram', ['method', 'route']);
registry.register('http_requests_in_flight', 'Currently in-flight HTTP requests', 'gauge');

// Billing metrics
registry.register('billing_invoices_generated_total', 'Total invoices generated', 'counter', ['status']);
registry.register('billing_lines_upserted_total', 'Total invoice lines upserted', 'counter');
registry.register('billing_conflicts_total', 'Total billing conflicts', 'counter');
registry.register('billing_run_duration_seconds', 'Billing run duration in seconds', 'histogram');
registry.register('billing_runs_total', 'Total billing runs', 'counter', ['status']);

// Job queue metrics
registry.register('job_queue_pending_total', 'Pending jobs in queue', 'gauge');
registry.register('job_queue_processing_total', 'Currently processing jobs', 'gauge');
registry.register('job_queue_failed_total', 'Total failed jobs', 'counter', ['job_type']);
registry.register('job_queue_completed_total', 'Total completed jobs', 'counter', ['job_type']);

// Node.js runtime metrics
registry.register('nodejs_heap_used_bytes', 'Node.js heap used bytes', 'gauge');
registry.register('nodejs_heap_total_bytes', 'Node.js heap total bytes', 'gauge');
registry.register('nodejs_external_memory_bytes', 'Node.js external memory bytes', 'gauge');
registry.register('nodejs_eventloop_lag_seconds', 'Node.js event loop lag in seconds', 'gauge');
registry.register('process_cpu_seconds_total', 'Total CPU time in seconds', 'counter');
registry.register('process_resident_memory_bytes', 'Resident memory size in bytes', 'gauge');

// ─── Collect Node.js Runtime Metrics ───

function collectRuntimeMetrics(): void {
  const mem = process.memoryUsage();
  registry.set('nodejs_heap_used_bytes', {}, mem.heapUsed);
  registry.set('nodejs_heap_total_bytes', {}, mem.heapTotal);
  registry.set('nodejs_external_memory_bytes', {}, mem.external);
  registry.set('process_resident_memory_bytes', {}, mem.rss);

  const cpuUsage = process.cpuUsage();
  registry.set('process_cpu_seconds_total', {}, (cpuUsage.user + cpuUsage.system) / 1e6);
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

    registry.increment('http_requests_total', { method, route, status });
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
