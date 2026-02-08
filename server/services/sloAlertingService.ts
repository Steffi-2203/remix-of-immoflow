import { db } from "../db";
import { sql } from "drizzle-orm";
import { createAuditLog } from "../lib/auditLog";

/**
 * SLO definitions and alerting thresholds for billing runs.
 *
 * SLAs:
 *  - Duration: 100k rows < 30 min (1800s)
 *  - Lock wait: no single lock > 30s
 *  - Conflict rate: < 10%
 *  - Duplicates: 0 groups post-run
 *  - Rollback window: < 2h
 *
 * Alerting:
 *  - PagerDuty webhook on critical SLA breach
 *  - Slack/email for warnings
 */

export interface SLOThresholds {
  maxDurationSeconds: number;
  maxLockWaitMs: number;
  maxConflictRate: number;
  maxDuplicateGroups: number;
  rollbackWindowMinutes: number;
}

export const DEFAULT_SLO: SLOThresholds = {
  maxDurationSeconds: 1800,   // 30 min for 100k
  maxLockWaitMs: 30_000,      // 30s
  maxConflictRate: 0.10,      // 10%
  maxDuplicateGroups: 0,
  rollbackWindowMinutes: 120, // 2h
};

export interface SLOCheckResult {
  passed: boolean;
  breaches: SLOBreach[];
  warnings: string[];
}

export interface SLOBreach {
  slo: string;
  threshold: number;
  actual: number;
  severity: 'warning' | 'critical';
  message: string;
}

/**
 * Evaluate SLOs for a completed billing run.
 */
export async function evaluateRunSLO(
  runId: string,
  thresholds: SLOThresholds = DEFAULT_SLO
): Promise<SLOCheckResult> {
  const result = await db.execute(sql`
    SELECT
      run_id, status, expected_lines, inserted, updated, skipped,
      conflict_count, conflict_rate, rows_per_second,
      peak_chunk_duration_ms, avg_chunk_duration_ms,
      started_at, finished_at, scenario_tag
    FROM billing_runs
    WHERE run_id = ${runId}
    LIMIT 1
  `);

  if (!result.rows || result.rows.length === 0) {
    return { passed: false, breaches: [{ slo: 'existence', threshold: 0, actual: 0, severity: 'critical', message: `Run ${runId} not found` }], warnings: [] };
  }

  const run = result.rows[0] as any;
  const breaches: SLOBreach[] = [];
  const warnings: string[] = [];

  // Duration SLA
  if (run.started_at && run.finished_at) {
    const durationS = (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000;
    if (durationS > thresholds.maxDurationSeconds) {
      breaches.push({
        slo: 'duration',
        threshold: thresholds.maxDurationSeconds,
        actual: Math.round(durationS),
        severity: 'critical',
        message: `Run duration ${Math.round(durationS)}s exceeds SLA ${thresholds.maxDurationSeconds}s`,
      });
    } else if (durationS > thresholds.maxDurationSeconds * 0.8) {
      warnings.push(`Duration ${Math.round(durationS)}s approaching SLA (${thresholds.maxDurationSeconds}s)`);
    }
  }

  // Conflict rate
  const conflictRate = Number(run.conflict_rate || 0);
  if (conflictRate > thresholds.maxConflictRate) {
    breaches.push({
      slo: 'conflict_rate',
      threshold: thresholds.maxConflictRate,
      actual: conflictRate,
      severity: conflictRate > thresholds.maxConflictRate * 2 ? 'critical' : 'warning',
      message: `Conflict rate ${(conflictRate * 100).toFixed(1)}% exceeds threshold ${(thresholds.maxConflictRate * 100).toFixed(0)}%`,
    });
  }

  // Peak chunk duration (proxy for lock wait)
  const peakMs = Number(run.peak_chunk_duration_ms || 0);
  if (peakMs > thresholds.maxLockWaitMs) {
    breaches.push({
      slo: 'lock_wait',
      threshold: thresholds.maxLockWaitMs,
      actual: peakMs,
      severity: 'critical',
      message: `Peak chunk duration ${peakMs}ms exceeds lock SLA ${thresholds.maxLockWaitMs}ms`,
    });
  }

  // Check for duplicates post-run
  const dupeCheck = await db.execute(sql`
    SELECT count(*) as cnt FROM (
      SELECT invoice_id, unit_id, line_type, normalized_description
      FROM invoice_lines
      WHERE deleted_at IS NULL
      GROUP BY invoice_id, unit_id, line_type, normalized_description
      HAVING count(*) > 1
    ) sub
  `);
  const dupeCount = Number((dupeCheck.rows?.[0] as any)?.cnt || 0);
  if (dupeCount > thresholds.maxDuplicateGroups) {
    breaches.push({
      slo: 'duplicates',
      threshold: thresholds.maxDuplicateGroups,
      actual: dupeCount,
      severity: 'critical',
      message: `${dupeCount} duplicate group(s) found after run`,
    });
  }

  const passed = breaches.filter(b => b.severity === 'critical').length === 0;

  return { passed, breaches, warnings };
}

/**
 * Send PagerDuty alert via Events API v2.
 */
export async function sendPagerDutyAlert(
  breaches: SLOBreach[],
  runId: string
): Promise<void> {
  const routingKey = process.env.PAGERDUTY_ROUTING_KEY;
  if (!routingKey) {
    console.warn('[alerting] PAGERDUTY_ROUTING_KEY not configured, skipping alert');
    return;
  }

  const severity = breaches.some(b => b.severity === 'critical') ? 'critical' : 'warning';
  const summary = breaches.map(b => b.message).join('; ');

  try {
    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: routingKey,
        event_action: 'trigger',
        dedup_key: `billing-run-slo-${runId}`,
        payload: {
          summary: `[Billing SLO Breach] ${summary}`,
          source: 'immoflowme-billing',
          severity,
          component: 'billing-engine',
          group: 'reconciliation',
          class: 'slo_breach',
          custom_details: {
            run_id: runId,
            breaches,
            timestamp: new Date().toISOString(),
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('[alerting] PagerDuty response:', response.status, await response.text());
    } else {
      console.info(`[alerting] PagerDuty alert sent for run ${runId} (${severity})`);
    }
  } catch (err) {
    console.error('[alerting] PagerDuty send failed:', err);
  }
}

/**
 * Full post-run SLO evaluation + alerting pipeline.
 */
export async function runPostRunSLOCheck(runId: string): Promise<SLOCheckResult> {
  const result = await evaluateRunSLO(runId);

  // Log SLO result to audit
  await createAuditLog({
    tableName: 'billing_runs',
    recordId: runId,
    action: result.passed ? 'slo_pass' : 'slo_breach',
    newData: {
      passed: result.passed,
      breaches: result.breaches,
      warnings: result.warnings,
    },
  });

  // Alert on critical breaches
  if (result.breaches.some(b => b.severity === 'critical')) {
    await sendPagerDutyAlert(result.breaches, runId);
  }

  return result;
}
