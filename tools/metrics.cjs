// tools/metrics.cjs
// Prometheus metric emission for batch_upsert reconciliation runs.
// Usage: require('./metrics.cjs').reportMetrics({ inserted, updated, durationMs })
//
// Requires: npm install prom-client
// Optional: pushgateway URL via PUSHGATEWAY_URL env var

const client = require('prom-client');

// ── Metric Definitions ──
const insertedGauge = new client.Gauge({
  name: 'reconcile_inserted_lines',
  help: 'Number of invoice_lines inserted during reconciliation upsert',
  labelNames: ['run_id'],
});

const updatedGauge = new client.Gauge({
  name: 'reconcile_updated_lines',
  help: 'Number of invoice_lines updated during reconciliation upsert',
  labelNames: ['run_id'],
});

const durationHistogram = new client.Histogram({
  name: 'reconcile_duration_ms',
  help: 'Duration of reconciliation upsert in milliseconds',
  labelNames: ['run_id'],
  buckets: [100, 500, 1000, 5000, 10000, 30000, 60000],
});

/**
 * Report reconciliation metrics and optionally push to Pushgateway.
 *
 * @param {{ runId: string, inserted: number, updated: number, durationMs: number }} stats
 * @returns {Promise<void>}
 *
 * @example
 * const { reportMetrics } = require('./metrics.cjs');
 * await reportMetrics({
 *   runId: 'ci-20260208-abc123',
 *   inserted: 42,
 *   updated: 7,
 *   durationMs: 3200,
 * });
 */
async function reportMetrics({ runId, inserted, updated, durationMs }) {
  const labels = { run_id: runId };

  insertedGauge.set(labels, inserted);
  updatedGauge.set(labels, updated);
  durationHistogram.observe(labels, durationMs);

  console.log(`[metrics] run=${runId} inserted=${inserted} updated=${updated} duration=${durationMs}ms`);

  // ── Push to Pushgateway (optional) ──
  const gatewayUrl = process.env.PUSHGATEWAY_URL;
  if (gatewayUrl) {
    const gateway = new client.Pushgateway(gatewayUrl);
    try {
      await gateway.pushAdd({ jobName: 'batch_upsert', groupings: { run_id: runId } });
      console.log(`[metrics] pushed to ${gatewayUrl}`);
    } catch (err) {
      console.warn(`[metrics] pushgateway error: ${err.message}`);
    }
  }
}

module.exports = { reportMetrics, insertedGauge, updatedGauge, durationHistogram };
