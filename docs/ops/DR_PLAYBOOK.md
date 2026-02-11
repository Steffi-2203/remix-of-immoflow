# Disaster Recovery Playbook — ImmoflowMe

> Complete step-by-step procedures for restoring service from backup,
> validating data integrity, and switching traffic back.

**RTO:** 2 hours | **RPO:** 1 hour (WAL archiving) / 5 minutes (streaming replication)  
**Last DR Drill:** _[DATE]_ | **Next Scheduled:** _[DATE]_

---

## 1. Emergency Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Primary On-Call | _[name]_ | _[phone]_ | @oncall-primary |
| Secondary On-Call | _[name]_ | _[phone]_ | @oncall-secondary |
| Engineering Manager | _[name]_ | _[phone]_ | @eng-manager |
| DBA | _[name]_ | _[phone]_ | @dba-oncall |
| Security Lead | _[name]_ | _[phone]_ | @security-lead |
| VP Engineering | _[name]_ | _[phone]_ | @vp-eng |

**Escalation Path:**
- 0–5 min: Primary on-call acknowledges
- 5–15 min: Secondary on-call paged
- 15+ min: Engineering manager paged
- 30+ min: VP Engineering notified

---

## 2. Decision Matrix

| Scenario | Action | Expected RTO |
|----------|--------|-------------|
| Single pod crash | Auto-heal (K8s) | < 2 min |
| All pods unhealthy | Rollback deployment | < 10 min |
| DB connection exhaustion | Kill queries + restart | < 15 min |
| DB corruption (single table) | Restore table from backup | < 30 min |
| DB corruption (full) | Point-in-time recovery | < 2 hours |
| Complete infrastructure loss | Full restore from backup | < 4 hours |
| Data center failure | Failover to standby region | < 1 hour |

---

## 3. Restore from Backup

### 3.1 Prerequisites

```bash
# Verify backup availability
export BACKUP_BUCKET="s3://immoflowme-backups"
aws s3 ls $BACKUP_BUCKET/daily/ --recursive | tail -5

# Verify restore tools
pg_restore --version
psql --version
```

### 3.2 Full Database Restore

```bash
# Step 1: Download latest backup
LATEST_BACKUP=$(aws s3 ls $BACKUP_BUCKET/daily/ --recursive | sort | tail -1 | awk '{print $4}')
aws s3 cp s3://immoflowme-backups/$LATEST_BACKUP /tmp/restore.dump

# Step 2: Create restore database
psql "$ADMIN_DATABASE_URL" -c "CREATE DATABASE immoflowme_restore;"

# Step 3: Restore
pg_restore -d "$RESTORE_DATABASE_URL" \
  --no-owner --no-acl \
  --jobs=4 \
  /tmp/restore.dump

# Step 4: Verify critical tables
psql "$RESTORE_DATABASE_URL" -c "
  SELECT 'invoice_lines' AS tbl, count(*) FROM invoice_lines
  UNION ALL
  SELECT 'audit_logs', count(*) FROM audit_logs
  UNION ALL
  SELECT 'billing_runs', count(*) FROM billing_runs
  UNION ALL
  SELECT 'tenants', count(*) FROM tenants
  UNION ALL
  SELECT 'payments', count(*) FROM payments;
"
```

### 3.3 Point-in-Time Recovery (PITR)

```bash
# Use Lovable Cloud dashboard for PITR
# Select recovery point BEFORE the incident timestamp
# This creates a new database instance

# After PITR completes, verify data:
psql "$PITR_DATABASE_URL" -c "
  SELECT max(created_at) AS latest_record FROM audit_logs;
  SELECT max(created_at) AS latest_billing FROM billing_runs;
"
```

---

## 4. Validate Ledger Integrity

After any restore, run full integrity checks:

```sql
-- 4.1 Audit log hash chain verification
WITH ordered AS (
  SELECT id, hash, previous_hash,
         LAG(hash) OVER (ORDER BY created_at, id) AS expected_prev
  FROM audit_logs
  WHERE hash IS NOT NULL
  ORDER BY created_at, id
)
SELECT count(*) AS broken_links
FROM ordered
WHERE expected_prev IS NOT NULL
  AND previous_hash != expected_prev
  AND previous_hash != 'GENESIS';
-- Expected: 0

-- 4.2 Billing run consistency
SELECT run_id, status, expected_lines, inserted + updated AS actual_lines,
       conflict_count, error_message
FROM billing_runs
WHERE status NOT IN ('completed', 'rolled_back')
ORDER BY created_at DESC LIMIT 10;

-- 4.3 Invoice line balance check (debit = credit per invoice)
SELECT i.id AS invoice_id,
       sum(CASE WHEN il.line_type = 'charge' THEN il.amount ELSE 0 END) AS charges,
       sum(CASE WHEN il.line_type = 'credit' THEN il.amount ELSE 0 END) AS credits
FROM monthly_invoices i
JOIN invoice_lines il ON il.invoice_id = i.id AND il.deleted_at IS NULL
GROUP BY i.id
HAVING abs(
  sum(CASE WHEN il.line_type = 'charge' THEN il.amount ELSE 0 END) -
  sum(CASE WHEN il.line_type = 'credit' THEN il.amount ELSE 0 END)
) > 0.01
LIMIT 20;

-- 4.4 Ledger entry consistency
SELECT t.id AS tenant_id,
       sum(CASE WHEN le.type = 'charge' THEN le.amount ELSE 0 END) AS total_charges,
       sum(CASE WHEN le.type = 'payment' THEN le.amount ELSE 0 END) AS total_payments
FROM tenants t
JOIN ledger_entries le ON le.tenant_id = t.id
GROUP BY t.id
HAVING abs(
  sum(CASE WHEN le.type = 'charge' THEN le.amount ELSE 0 END) -
  sum(CASE WHEN le.type = 'payment' THEN le.amount ELSE 0 END)
) > 10000 -- Flag large imbalances
LIMIT 20;

-- 4.5 Orphaned records check
SELECT 'orphaned_invoice_lines' AS check_type, count(*)
FROM invoice_lines il
WHERE il.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM monthly_invoices mi WHERE mi.id = il.invoice_id)
UNION ALL
SELECT 'orphaned_ledger_entries', count(*)
FROM ledger_entries le
WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = le.tenant_id);
```

---

## 5. Reindex Search & Caches

```bash
# Step 1: Reindex full-text search (if applicable)
psql "$DATABASE_URL" -c "REINDEX DATABASE immoflowme;"

# Step 2: Clear application caches
kubectl exec -n default deployment/immoflowme -- \
  curl -X POST http://localhost:3000/api/admin/cache/flush

# Step 3: Invalidate CDN cache (if applicable)
# aws cloudfront create-invalidation --distribution-id $CDN_ID --paths "/*"

# Step 4: Restart application pods to pick up fresh state
kubectl rollout restart deployment/immoflowme -n default
kubectl rollout status deployment/immoflowme -n default --timeout=300s
```

---

## 6. Switch Traffic

### 6.1 If Using Blue/Green

```bash
# Verify green environment is healthy
kubectl get pods -n default -l version=green -o wide
curl -s http://green.internal/health | jq .

# Switch Istio VirtualService
kubectl patch virtualservice immoflowme -n default --type merge -p '{
  "spec": {
    "http": [{
      "route": [{
        "destination": {"host": "immoflowme", "subset": "green"},
        "weight": 100
      }]
    }]
  }
}'

# Monitor for 15 minutes
watch -n 5 'curl -s http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total{status=~"5.."}[1m]))/sum(rate(http_requests_total[1m]))'
```

### 6.2 If Using DNS Failover

```bash
# Update DNS to point to recovered environment
# (provider-specific commands)

# Verify DNS propagation
dig +short app.immoflowme.com
nslookup app.immoflowme.com
```

### 6.3 Post-Switch Verification

```bash
# Smoke tests
curl -f https://app.immoflowme.com/health
curl -f https://app.immoflowme.com/api/health

# Run automated E2E smoke suite
npm run test:e2e:smoke

# Verify metrics are flowing
curl -s https://app.immoflowme.com/metrics | head -5
```

---

## 7. Post-Recovery Checklist

- [ ] All critical tables present and non-empty
- [ ] Audit log hash chain intact (0 broken links)
- [ ] RLS enabled on all protected tables
- [ ] User authentication working
- [ ] Billing pipeline operational (test with small batch)
- [ ] Payment processing functional
- [ ] Scheduled jobs running
- [ ] Monitoring and alerting restored
- [ ] Backup schedule resumed
- [ ] Incident timeline documented
- [ ] Stakeholders notified of recovery

---

## 8. DR Drill Schedule

| Drill | Frequency | Owner | Validation |
|-------|-----------|-------|------------|
| Full restore test | Monthly | Ops | `tools/dr_restore_test.sh` |
| Failover drill | Quarterly | Ops + Eng | Full traffic switch |
| Backup verification | Weekly | Automated | Integrity checks |
| Audit chain validation | Daily | Automated | Hash chain query |
| Communication drill | Bi-annually | All teams | Escalation exercise |
