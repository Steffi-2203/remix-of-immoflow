# Runbook: ImmoflowMe Production

## Kontakte

| Rolle | Name | Erreichbarkeit |
|-------|------|----------------|
| **SRE Lead** | TBD | Slack #sre-oncall |
| **App Team Lead** | TBD | Slack #immoflow-dev |
| **DB Admin** | TBD | Slack #db-ops |
| **Security** | TBD | security@immoflow.me |

---

## 1. Start / Neustart

```bash
# Produktion (PM2)
pm2 restart immoflow --update-env

# Oder direkt
NODE_ENV=production node dist/server/index.js

# Health-Check nach Start
curl -sf http://localhost:5000/api/health | jq .
# Erwartung: {"status":"ok","timestamp":"..."}
```

**Checkliste nach Start:**
- [ ] `/api/health` → 200
- [ ] `/api/metrics` → uptime > 0
- [ ] Login mit Test-Account möglich
- [ ] JobQueue verarbeitet (pending = 0 oder sinkend)
- [ ] Sentry: keine neuen Errors in 5 Min

---

## 2. Graceful Stop

```bash
# PM2
pm2 stop immoflow

# Direkt: SIGTERM senden (wartet auf laufende Requests)
kill -TERM $(pgrep -f "server/index")

# Verify
curl -sf http://localhost:5000/api/health || echo "Server stopped"
```

**Wichtig:** JobQueue-Worker beendet laufende Jobs vor dem Shutdown. Warte bis `processing = 0`:
```sql
SELECT COUNT(*) FROM job_queue WHERE status = 'processing';
```

---

## 3. Rollback

### 3.1 Code-Rollback (Canary/Blue-Green)

```bash
# Letztes stabiles Release finden
git tag -l 'v*' --sort=-v:refname | head -5

# Rollback auf vorheriges Tag
git checkout v1.x.y
npm ci && npm run build
pm2 restart immoflow --update-env
```

### 3.2 Canary-Rollback (Istio)

```bash
# Traffic sofort auf stable zurück
kubectl apply -f k8s/virtualservice-stable.yaml
# Canary pods entfernen
kubectl scale deployment immoflow-canary --replicas=0
```

### 3.3 DB-Migration-Rollback

```bash
# Migration-Status prüfen
node scripts/migrate-status.ts

# Manuelles Rollback (nach 2-Person-Approval!)
psql $DATABASE_URL -f drizzle/rollback/<migration_name>.sql
```

**⚠️ Destruktive Migrations (DROP COLUMN etc.) werden vom Safety-Check blockiert.**

---

## 4. Incident-Response

### Severity Levels

| Level | Beschreibung | Response Time | Eskalation |
|-------|-------------|---------------|------------|
| **P0** | System down, Datenverlust | < 15 Min | SRE + App Lead + DB Admin |
| **P1** | Feature kritisch defekt (Billing, Auth) | < 1 Std | SRE + App Lead |
| **P2** | Feature eingeschränkt | < 4 Std | App Team |
| **P3** | Kosmetisch, Minor Bug | Nächster Sprint | App Team |

### Erste Schritte bei Incident

1. **Sentry prüfen:** Neue Errors, Breadcrumbs, betroffene User
2. **Metrics prüfen:** Grafana Dashboard → Error Rate, Latenz, DB Connections
3. **Logs prüfen:** `journalctl -u immoflow --since "10 min ago"` oder Loki
4. **DB prüfen:**
   ```sql
   -- Aktive Connections
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'immoflow';
   -- Locks
   SELECT * FROM pg_locks WHERE NOT granted;
   -- Stuck Jobs
   SELECT * FROM job_queue WHERE status = 'processing' AND started_at < now() - interval '10 min';
   ```

---

## 5. Circuit Breaker

Bei externen Service-Ausfällen (OpenAI, Stripe, Resend):

```bash
# OpenAI Circuit Breaker Status
curl http://localhost:5000/api/metrics | jq '.circuitBreaker'

# Manuell deaktivieren (Env-Var)
OPENAI_CIRCUIT_OPEN=true pm2 restart immoflow
```

**Fallback-Verhalten:**
- **OpenAI down:** OCR-Jobs queuen, Retry nach 5 Min
- **Stripe down:** Webhook-Retry (Stripe-seitig), keine neuen Subscriptions
- **Resend down:** E-Mails queuen in job_queue, Retry

---

## 6. Backup & Restore

```bash
# Backup-Status prüfen
pgbackrest info --stanza=immoflow

# Point-in-Time Recovery (2-Person-Approval erforderlich!)
pgbackrest restore --stanza=immoflow --target="2024-01-15 14:30:00+01"
```

---

## 7. Nützliche Queries

```sql
-- Top 10 langsamste Queries
SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

-- JobQueue Übersicht
SELECT status, count(*) FROM job_queue GROUP BY status;

-- Billing Run Status
SELECT id, status, inserted, skipped, error_message FROM billing_runs ORDER BY created_at DESC LIMIT 5;

-- Aktive Sessions
SELECT count(*) FROM user_sessions WHERE expire > now();
```
