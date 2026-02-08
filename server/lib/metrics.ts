/**
 * Lightweight in-process metrics collector for billing operations.
 *
 * Captures counters and histograms that can be:
 * - Logged as structured JSON (default)
 * - Exported to Prometheus/Datadog via future adapter
 *
 * Usage:
 *   metrics.increment('billing.invoices_created', 5);
 *   metrics.histogram('billing.run_duration_ms', 1234);
 *   metrics.flush();            // logs + resets
 *   metrics.snapshot();         // read without reset
 */

type MetricEntry = {
  type: 'counter' | 'histogram';
  value: number;
  /** histogram only: min/max/count for aggregation */
  min?: number;
  max?: number;
  count?: number;
  sum?: number;
};

class MetricsCollector {
  private data = new Map<string, MetricEntry>();

  /** Increment a counter by `delta` (default 1). */
  increment(name: string, delta = 1): void {
    const existing = this.data.get(name);
    if (existing && existing.type === 'counter') {
      existing.value += delta;
    } else {
      this.data.set(name, { type: 'counter', value: delta });
    }
  }

  /** Record a histogram observation (e.g. duration, batch size). */
  histogram(name: string, value: number): void {
    const existing = this.data.get(name);
    if (existing && existing.type === 'histogram') {
      existing.count = (existing.count || 0) + 1;
      existing.sum = (existing.sum || 0) + value;
      existing.min = Math.min(existing.min ?? value, value);
      existing.max = Math.max(existing.max ?? value, value);
      existing.value = (existing.sum) / existing.count; // avg
    } else {
      this.data.set(name, {
        type: 'histogram',
        value,
        min: value,
        max: value,
        count: 1,
        sum: value,
      });
    }
  }

  /** Return current state without resetting. */
  snapshot(): Record<string, MetricEntry> {
    const out: Record<string, MetricEntry> = {};
    for (const [k, v] of this.data) {
      out[k] = { ...v };
    }
    return out;
  }

  /** Log all metrics as structured JSON and reset. */
  flush(label = 'BillingMetrics'): void {
    if (this.data.size === 0) return;
    const snap = this.snapshot();
    console.info(`[${label}]`, JSON.stringify(snap));
    this.data.clear();
  }

  /** Reset all metrics. */
  reset(): void {
    this.data.clear();
  }
}

/** Singleton metrics instance for billing operations. */
export const metrics = new MetricsCollector();

// Well-known metric names as constants to avoid typos
export const METRIC = {
  INVOICES_EXPECTED: 'billing.invoices_expected',
  INVOICES_INSERTED: 'billing.invoices_inserted',
  LINES_EXPECTED: 'billing.lines_expected',
  LINES_UPSERTED: 'billing.lines_upserted',
  LINES_SKIPPED: 'billing.lines_skipped',
  CONFLICT_COUNT: 'billing.conflict_count',
  RUN_DURATION_MS: 'billing.run_duration_ms',
  BATCH_SIZE: 'billing.batch_size',
  BULK_PATH_USED: 'billing.bulk_path_used',
  ROUNDING_ADJUSTMENTS: 'billing.rounding_adjustments',
} as const;
