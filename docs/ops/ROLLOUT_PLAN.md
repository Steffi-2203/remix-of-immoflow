# Observability & Reliability Rollout Plan — ImmoflowMe

> Phased rollout from quick wins to continuous improvement.  
> Each phase builds on the previous. Gate: phase N must be stable before starting N+1.

---

## Phase 0 — Quick Wins (1–3 days)

**Goal:** Baseline visibility and safety nets.

### Checklist

- [ ] **Image Digests in Deploys**
  - Pin container images to SHA digests (not `:latest`)
  - Update `k8s/deployment.yaml` — already using `imagePullPolicy: IfNotPresent`
  - CI pipeline outputs digest: `IMAGE=ghcr.io/org/app@sha256:abc...`

- [ ] **Health Checks & Readiness Tuning**
  - Liveness probe: `/health` — `initialDelaySeconds: 15`, `periodSeconds: 10`
  - Readiness probe: `/health/ready` — `initialDelaySeconds: 5`, `periodSeconds: 5`
  - Tune `failureThreshold` based on actual startup times
  - Already configured in `k8s/deployment.yaml`

- [ ] **Structured JSON Logging**
  - Pino already outputs structured JSON ✅
  - Verify all services use child loggers with `service` field
  - Add `x-request-id` correlation to all log entries
  - Suppress health check logs to reduce noise

- [ ] **Basic Grafana Dashboard**
  - Deploy `k8s/monitoring/grafana-dashboards.yaml`
  - Verify panels: p95 latency, error rate, request rate
  - Share dashboard URL with team

### Exit Criteria
- [ ] All pods start with digest-pinned images
- [ ] Health probes pass consistently (no false restarts)
- [ ] Grafana overview dashboard accessible
- [ ] Team can view request rate, error rate, p95 latency

---

## Phase 1 — Core Observability (1–2 weeks)

**Goal:** Full monitoring stack with alerting.

### Checklist

- [ ] **Prometheus + Grafana + Loki**
  - Deploy: `kubectl apply -f k8s/monitoring/`
  - Verify Prometheus scrapes `/metrics` endpoint
  - Verify Loki receives structured logs
  - Grafana data sources configured and tested

- [ ] **Sentry Integration**
  - Set `SENTRY_DSN` environment variable
  - Deploy `server/lib/sentry.ts` middleware
  - Verify exceptions appear in Sentry dashboard
  - Configure PII filtering (passwords, tokens, IBAN)

- [ ] **OpenTelemetry Instrumentation**
  - Set `OTEL_EXPORTER_OTLP_ENDPOINT` to Tempo
  - Deploy `server/lib/opentelemetry.ts`
  - Verify traces appear in Grafana Tempo
  - Add trace context to billing and payment flows

- [ ] **Initial Alert Rules**
  - Deploy alert rules from `k8s/monitoring/prometheus-alertmanager.yaml`
  - P0: ServiceDegraded, CriticalErrorRate, DbConnectionsCritical
  - P1: HighErrorRate, BackupMissing, security alerts
  - Test alert routing: PagerDuty receives P0, Slack receives P1/P2

- [ ] **PagerDuty + Slack Integration**
  - Configure PagerDuty routing keys in Alertmanager
  - Configure Slack webhook URLs per channel
  - Set up escalation policy in PagerDuty
  - Test end-to-end: trigger test alert → verify notification

### Exit Criteria
- [ ] Prometheus scraping all targets (app, node-exporter, k8s)
- [ ] Grafana dashboards show real data
- [ ] Loki captures all application logs
- [ ] Sentry captures exceptions with context
- [ ] At least one test alert successfully routed to PagerDuty + Slack
- [ ] On-call schedule established

---

## Phase 2 — Harden & SLOs (2–4 weeks)

**Goal:** Production-grade reliability with SLOs, tracing, and DR readiness.

### Checklist

- [ ] **Tracing for Critical Flows**
  - Instrument payment allocation flow (end-to-end trace)
  - Instrument BK settlement generation
  - Instrument billing run pipeline
  - Add trace IDs to audit log entries
  - Verify trace → log correlation in Grafana

- [ ] **SLOs and Error Budgets**
  - Define SLOs:
    - Availability: 99.9% (43.8 min/month budget)
    - Latency: p99 < 2s for 99% of requests
    - Billing run: < 30 min for 99th percentile
  - Create SLO dashboard in Grafana (burn rate, remaining budget)
  - Set up error budget alerting (fast burn = P0, slow burn = P2)

- [ ] **Feature Flags**
  - Deploy `server/lib/featureFlags.ts`
  - Wrap new features behind flags
  - Test kill-switch for critical features
  - Document flag naming conventions

- [ ] **Runbooks**
  - Create per-alert runbooks from `docs/ops/RUNBOOK_TEMPLATE.md`
  - Verify each P0/P1 alert has a linked runbook
  - Conduct tabletop exercise with on-call team
  - Store runbooks in accessible location (wiki/repo)

- [ ] **DR Restore Test**
  - Run `tools/dr_restore_test.sh` against staging
  - Validate: backup restore, hash chain, RLS, row counts
  - Document actual RTO achieved
  - Schedule monthly automated DR test in CI

- [ ] **Security Dashboards**
  - Deploy security Grafana dashboard
  - Set baseline for CSRF, IDOR, auth failure rates
  - Tune alert thresholds based on baseline data (2 weeks)

### Exit Criteria
- [ ] All critical flows have end-to-end traces
- [ ] SLO dashboard shows current availability and burn rate
- [ ] Error budget alerts fire correctly
- [ ] Feature flags operational for at least 2 features
- [ ] All P0/P1 alerts have runbooks
- [ ] DR test completed successfully with documented RTO
- [ ] On-call team has completed tabletop exercise

---

## Phase 3 — Continuous Improvement (ongoing)

**Goal:** Proactive reliability through testing, chaos, and alert refinement.

### Checklist

- [ ] **Load Testing**
  - Create realistic load profiles (normal, peak, billing-day)
  - Run load tests against staging: `docs/LOAD_TEST_REPORT.md`
  - Identify bottlenecks and capacity limits
  - Set HPA thresholds based on load test data
  - Schedule monthly load tests

- [ ] **Chaos Experiments**
  - Pod kill: verify auto-restart and zero-downtime
  - Network partition: verify circuit breakers activate
  - DB connection exhaustion: verify graceful degradation
  - Full node drain: verify PDB prevents outage
  - Document results and improvements

- [ ] **Security Pen Tests**
  - Schedule quarterly pen tests
  - Focus areas: IDOR, CSRF, auth bypass, SQL injection
  - Integrate findings into alert rules
  - Track remediation via tickets

- [ ] **Alert Noise Reduction**
  - Review alert firing frequency monthly
  - Tune thresholds based on actual incidents vs. false positives
  - Add multi-signal conditions to noisy single-metric alerts
  - Archive or downgrade alerts that never lead to action
  - Track alert-to-incident ratio (goal: >50%)

- [ ] **Postmortem Practice**
  - Blameless postmortem for every P0/P1 incident
  - Track action items to completion
  - Share learnings in monthly reliability review
  - Update runbooks based on postmortem findings

### Metrics to Track

| Metric | Target | Review Cycle |
|--------|--------|-------------|
| MTTD (Mean Time to Detect) | < 5 min | Monthly |
| MTTR (Mean Time to Resolve) | < 30 min (P0), < 2h (P1) | Monthly |
| Alert-to-Incident ratio | > 50% | Monthly |
| False positive rate | < 20% | Monthly |
| SLO compliance | > 99.9% | Weekly |
| Error budget remaining | > 50% | Weekly |
| DR test success rate | 100% | Quarterly |
| Runbook coverage (P0/P1) | 100% | Sprint |

---

## CI Integration Points

| Phase | CI Gate | Script/Action |
|-------|---------|---------------|
| 0 | Image digest verification | `tools/verify_image_digest.sh` |
| 0 | Health check validation | Smoke test in deploy pipeline |
| 1 | Alert rule syntax check | `promtool check rules alerts.yml` |
| 1 | Dashboard JSON validation | `grafana-dashboard-lint` |
| 2 | DR restore test | `tools/dr_restore_test.sh` (monthly) |
| 2 | SLO definition validation | Custom check against thresholds |
| 3 | Load test regression | Compare against baseline metrics |
| 3 | Chaos test suite | Scheduled via CronJob |
