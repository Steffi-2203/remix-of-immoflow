# Disaster Recovery Runbook

## 1. Overview

This runbook covers procedures for recovering the ImmoflowMe billing system
from data corruption, accidental deletion, or infrastructure failure.

**RTO (Recovery Time Objective):** 2 hours  
**RPO (Recovery Point Objective):** 1 hour (Supabase PITR)  
**Last Drill:** _[date of last execution]_

---

## 2. Automated Restore Test

Run the automated DR test script:

```bash
bash tools/dr_restore_test.sh "$DATABASE_URL"
```

This validates:
- pg_dump creates a valid backup
- pg_restore succeeds without critical errors
- All critical tables are present
- Audit log hash chain integrity
- RLS is enabled on security tables
- Row counts are non-zero

**Schedule:** Monthly via CI or manual trigger.

---

## 3. Recovery Scenarios

### 3.1 Billing Run Data Corruption

**Symptoms:** Wrong amounts, duplicate lines, SLO breaches.

1. **Identify** the run:
   ```sql
   SELECT run_id, status, inserted, updated, conflict_count
   FROM billing_runs
   WHERE status != 'rolled_back'
   ORDER BY created_at DESC LIMIT 10;
   ```

2. **Rollback** via API:
   ```bash
   curl -X POST /api/admin/billing-runs/<runId>/rollback \
     -H 'Content-Type: application/json' \
     -d '{"reason": "Data corruption detected"}'
   ```

3. **Verify** rollback:
   ```sql
   SELECT count(*) FROM invoice_lines WHERE deleted_at IS NOT NULL;
   ```

4. **Reprocess** if needed:
   ```bash
   curl -X POST /api/admin/billing-runs/<runId>/reprocess
   ```

### 3.2 Accidental Table Drop / Schema Corruption

1. **Assess** damage:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   ```

2. **Restore from PITR** (Supabase Dashboard > Database > Backups)
   - Select point-in-time before the incident
   - This creates a new project — migrate data back

3. **Alternative:** Restore from CI schema:
   ```bash
   psql "$DATABASE_URL" -f ci/schema.sql
   node migrations/run-migration.cjs
   ```

### 3.3 Audit Log Tampering

1. **Verify** hash chain:
   ```sql
   WITH ordered AS (
     SELECT id, hash, previous_hash,
            LAG(hash) OVER (ORDER BY created_at, id) AS expected
     FROM audit_logs WHERE hash IS NOT NULL
   )
   SELECT * FROM ordered
   WHERE expected IS NOT NULL AND previous_hash != expected
     AND previous_hash != 'GENESIS';
   ```

2. If broken: **do NOT modify** — preserve for forensics
3. Alert security team and document the incident

### 3.4 Full Infrastructure Failure

1. Supabase manages infrastructure recovery
2. Verify data after recovery:
   ```bash
   bash tools/dr_restore_test.sh
   bash tools/security_audit.sh
   ```

---

## 4. Verification Checklist

After any recovery:

- [ ] All critical tables exist (`tools/schema_compat_check.sh`)
- [ ] RLS enabled on security tables
- [ ] Audit log hash chain intact
- [ ] User roles and RBAC functional
- [ ] Billing pipeline operational (test with small batch)
- [ ] SLO check passes on latest run
- [ ] Artifact storage accessible

---

## 5. Contacts & Escalation

| Level | Condition | Action |
|-------|-----------|--------|
| P1 | Data loss / audit tampering | PagerDuty → Ops + Security |
| P2 | SLO breach / billing error | Slack #ops → Admin team |
| P3 | Schema warning | Jira ticket → next sprint |

---

## 6. Drill Schedule

| Drill | Frequency | Owner | Script |
|-------|-----------|-------|--------|
| Restore test | Monthly | Ops | `tools/dr_restore_test.sh` |
| Security audit | Bi-weekly | Security | `tools/security_audit.sh` |
| Schema compat | Every PR | CI | `tools/schema_compat_check.sh` |
| SLO validation | Post-run | Automated | `/api/admin/billing-runs/:id/slo` |
| Rollback drill | Quarterly | Ops | Manual via API |

---

## 7. Lovable Cloud Restore-Prozedur

### 7.1 PITR-Restore
1. Lovable Cloud Backend öffnen (Cloud View)
2. "Run SQL" → Live-Umgebung auswählen
3. Restore-Zeitpunkt bestimmen (vor dem Vorfall)
4. Support kontaktieren für PITR-Restore (aktuell manueller Prozess)

### 7.2 Kommunikationsplan bei Ausfall

| Phase | Zeitrahmen | Aktion | Verantwortlich |
|-------|-----------|--------|----------------|
| Erkennung | 0–5 Min | Monitoring-Alert → Incident Channel | Ops |
| Eskalation | 5–15 Min | Team informieren, Status-Page updaten | Ops Lead |
| Diagnose | 15–30 Min | Root Cause identifizieren | SRE + App Team |
| Recovery | 30–120 Min | Restore oder Failover | SRE |
| Post-Mortem | +24h | Incident-Report erstellen | Team Lead |

### 7.3 Eskalationsmatrix

| Stufe | Rolle | Verantwortung |
|-------|-------|---------------|
| L1 | Ops / SRE | Ersterkennung, erste Diagnose |
| L2 | App Team Lead | Datenintegrität, Business-Logik |
| L3 | CTO / Geschäftsführung | Entscheidung bei Datenverlust |

### 7.4 Kontakte
- **Ops-Team**: ops@immoflow.me
- **Security**: security@immoflow.me
- **Lovable Cloud Support**: Über Dashboard → Support
