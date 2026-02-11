# Alert Runbook Template — ImmoflowMe

> Copy this template for each new alert. Keep runbooks concise and actionable.

---

## [ALERT_NAME]

**Severity:** P0 / P1 / P2 / P3  
**Owner:** team-name-oncall  
**Last Updated:** YYYY-MM-DD  
**Runbook URL:** `https://docs.internal/runbooks/<alert-name>`

---

### 1. Symptoms

_What does the alert show? What does the operator see?_

- Alert expression: `<PromQL>`
- Threshold: `<value>` for `<duration>`
- Grafana panel: `<dashboard-name> → <panel-name>`

---

### 2. Impact

_What is the business effect if this goes unresolved?_

| Impact Area | Description |
|-------------|-------------|
| Users | _e.g. Tenants cannot view invoices_ |
| Revenue | _e.g. Billing runs stalled, payments delayed_ |
| Compliance | _e.g. Audit trail integrity at risk_ |
| Data | _e.g. Potential data loss if WAL lag grows_ |

---

### 3. Immediate Checks (first 5 minutes)

```bash
# 1. Check Grafana overview dashboard
# Open: https://grafana.internal/d/immoflowme-overview

# 2. Check recent deployments
kubectl rollout history deployment/immoflowme -n default
kubectl get pods -n default -o wide

# 3. Check pod health and logs
kubectl get pods -n default | grep -v Running
kubectl logs -n default -l app=immoflowme --tail=100 --since=5m

# 4. Check CI pipeline status
# Open: https://github.com/<org>/immoflowme/actions

# 5. DB health
# - Replication lag: check db_replication_lag_seconds metric
# - Connections: check db_connections_* metrics
# - Slow queries: check db_query_slow_total rate
```

---

### 4. Mitigation Steps

#### 4a. If caused by recent deployment

```bash
# Rollback canary to previous image
kubectl rollout undo deployment/immoflowme -n default

# Or rollback to specific revision
kubectl rollout undo deployment/immoflowme -n default --to-revision=<N>

# Verify rollback
kubectl rollout status deployment/immoflowme -n default
```

#### 4b. If caused by load/capacity

```bash
# Scale up replicas
kubectl scale deployment/immoflowme -n default --replicas=<N>

# Or trigger HPA
kubectl patch hpa immoflowme-hpa -n default -p '{"spec":{"minReplicas":<N>}}'
```

#### 4c. If caused by feature regression

```bash
# Disable feature flag (if using feature flag service)
curl -X POST http://immoflowme.default.svc/api/admin/feature-flags \
  -H 'Content-Type: application/json' \
  -d '{"flag": "<FLAG_NAME>", "enabled": false}'
```

#### 4d. If caused by DB issues

```sql
-- Kill long-running queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < now() - interval '5 minutes'
  AND query NOT LIKE '%pg_stat_activity%';

-- Check for lock contention
SELECT * FROM pg_locks WHERE NOT granted;
```

---

### 5. Resolution Verification

After mitigation, verify the alert condition has cleared:

```bash
# Check alert status
curl -s http://alertmanager:9093/api/v2/alerts | jq '.[] | select(.labels.alertname == "<ALERT_NAME>")'

# Verify metrics have recovered
curl -s http://prometheus:9090/api/v1/query?query=<ALERT_EXPR> | jq '.data.result'
```

- [ ] Alert has resolved (green in Alertmanager)
- [ ] Grafana dashboards show normal values
- [ ] No error spikes in application logs
- [ ] Affected users/services have recovered

---

### 6. Postmortem Tasks

After incident is resolved:

- [ ] **Collect**: Gather logs, metrics snapshots, and screenshots from the incident window
- [ ] **Timeline**: Document what happened, when, and what actions were taken
- [ ] **Root Cause**: Identify the underlying cause (not just the trigger)
- [ ] **Action Items**: Create tickets for preventive measures
- [ ] **Runbook Update**: Update this runbook if the steps were insufficient
- [ ] **Communicate**: Post incident summary in #incidents channel

**Postmortem Template:**

```markdown
## Incident: [TITLE]
**Date:** YYYY-MM-DD HH:MM – HH:MM UTC
**Severity:** P0/P1/P2/P3
**Duration:** X minutes
**Impact:** [description]

### Timeline
- HH:MM — Alert fired
- HH:MM — On-call acknowledged
- HH:MM — Root cause identified
- HH:MM — Mitigation applied
- HH:MM — Alert resolved

### Root Cause
[description]

### Action Items
- [ ] [action] — owner — deadline
```

---

# Per-Alert Runbooks

Below are specific runbooks for each configured alert.

---

## ServiceDegraded (P0)

**Severity:** P0 | **Owner:** backend-oncall

### Symptoms
- Error rate >5% AND p95 latency >2s simultaneously
- Multi-signal alert — indicates systemic issue, not isolated failure

### Impact
- Users experiencing errors and slow responses across the application
- Billing operations may be failing

### Immediate Checks
1. Open Grafana Overview dashboard — check if all routes are affected or just some
2. `kubectl get pods -n default` — check for crash-looping or pending pods
3. Check if a deployment happened in the last 15 minutes
4. Check downstream dependencies (DB, external APIs)

### Mitigation
1. **If recent deploy**: `kubectl rollout undo deployment/immoflowme -n default`
2. **If DB**: Kill long-running queries, check connection pool
3. **If external dependency**: Enable circuit breaker / disable affected feature flag

---

## CriticalErrorRate (P0)

**Severity:** P0 | **Owner:** backend-oncall

### Symptoms
- >5% of all HTTP requests returning 5xx for 2+ minutes
- May fire alongside ServiceDegraded (which takes priority via inhibition)

### Immediate Checks
1. Check error distribution: which routes are failing?
2. Check application logs: `{app="immoflowme"} |= "error" | json | status >= 500`
3. Check for OOM kills: `kubectl describe pod <name> | grep -A5 "Last State"`

### Mitigation
1. Rollback if deploy-related
2. Scale up if capacity-related
3. Check and restart unhealthy pods

---

## DbConnectionsCritical (P0)

**Severity:** P0 | **Owner:** backend-oncall

### Symptoms
- Connection pool >90% utilized OR >10 queries waiting for connections
- Application requests will start timing out

### Immediate Checks
```sql
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 10;
```

### Mitigation
1. Kill long-running idle-in-transaction connections
2. Check for connection leaks in application code
3. Temporarily increase pool size if possible

---

## WalArchiveLagCritical (P0)

**Severity:** P0 | **Owner:** dba-oncall

### Symptoms
- WAL archive lag >5 minutes — RPO at risk
- If lag continues to grow, data loss risk increases

### Immediate Checks
1. Check archive_command exit status
2. Verify archive storage has free space
3. Check network connectivity to archive target

### Mitigation
1. Fix archive_command issues
2. Free storage space if full
3. Consider temporary WAL retention increase

---

## BackupMissing / BackupFailed (P1)

**Severity:** P1 | **Owner:** dba-oncall

### Symptoms
- No successful backup in 24h, or explicit backup failure detected
- DR capability compromised

### Immediate Checks
1. Check backup job logs
2. Verify storage credentials haven't expired
3. Check available disk space on backup target

### Mitigation
1. Fix credential/access issues
2. Run manual backup immediately
3. Verify backup integrity after completion

---

## PaymentAllocationFailures (P2)

**Severity:** P2 | **Owner:** billing-team

### Symptoms
- >1% of payment allocations failing for 10+ minutes
- Tenants may see unallocated payments

### Immediate Checks
1. Check `payments_failed_total` by reason label
2. Review recent tenant data changes
3. Check for missing invoice records

### Mitigation
1. Investigate and fix data inconsistencies
2. Reprocess failed allocations
3. Notify affected property managers if needed

---

## LowDiskSpace (P3)

**Severity:** P3 | **Owner:** platform-team

### Symptoms
- <10% disk space remaining on node

### Immediate Checks
```bash
df -h /
du -sh /var/log/* | sort -rh | head -20
```

### Mitigation
1. Rotate/compress old logs
2. Clean up unused container images: `docker system prune`
3. Expand volume if persistent
