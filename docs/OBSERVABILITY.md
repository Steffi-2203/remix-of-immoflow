# Observability Stack — ImmoflowMe

## Architektur

```
  ┌─────────────┐     ┌────────────┐     ┌──────────┐
  │  Application│────▶│ Prometheus │────▶│ Grafana  │
  │  /metrics   │     │  (Metrics) │     │(Dashboard│
  └──────┬──────┘     └─────┬──────┘     └──────────┘
         │                  │
         │ OTLP             │ Alerts
         ▼                  ▼
  ┌──────────────┐   ┌──────────────┐
  │ Tempo/Jaeger │   │ Alertmanager │
  │  (Traces)    │   │  → PagerDuty │
  └──────────────┘   │  → Slack     │
                     └──────────────┘
  ┌──────────────┐   ┌──────────────┐
  │  Loki        │   │   Sentry     │
  │ (Logs/Pino)  │   │ (Exceptions) │
  └──────────────┘   └──────────────┘
```

---

## Komponenten

### 1. Metrics — Prometheus

**Server Module**: `server/lib/prometheus.ts`

Bruecke zwischen dem bestehenden `MetricsCollector` und Prometheus Text Format.

| Metrik | Typ | Beschreibung |
|---|---|---|
| `http_requests_total` | Counter | Requests nach Method/Route/Status |
| `http_request_duration_seconds` | Histogram | Latenz-Verteilung |
| `http_requests_in_flight` | Gauge | Aktuelle parallele Requests |
| `billing_invoices_generated_total` | Counter | Erzeugte Rechnungen |
| `billing_run_duration_seconds` | Histogram | Laufzeit der Abrechnungslaeufe |
| `billing_conflicts_total` | Counter | Upsert-Konflikte |
| `job_queue_pending_total` | Gauge | Wartende Jobs |
| `nodejs_heap_used_bytes` | Gauge | Node.js Speicherverbrauch |

**Scrape Endpoint**: `GET /metrics` (Prometheus Text Format)

**Express Middleware**:
```typescript
import { httpMetricsMiddleware, prometheusEndpoint } from './lib/prometheus';
app.use(httpMetricsMiddleware);
app.get('/metrics', prometheusEndpoint);
```

### 2. Dashboards — Grafana

Vorkonfigurierte Dashboards in `k8s/monitoring/grafana-dashboards.yaml`:

**SLO Dashboard** (`immoflowme-slo`):
- Availability Gauge (Ziel: 99.9%)
- Error Budget (30d Rolling)
- p99/p95/p50 Latenz mit SLO-Linie
- Request Rate (total, 5xx, 4xx)
- Billing Run Duration mit 30min SLO-Linie

**Business KPI Dashboard** (`immoflowme-business`):
- Invoices Generated (24h)
- Lines Upserted (24h)
- Job Queue Status
- Memory/CPU Usage

### 3. Logs — Loki (Pino JSON)

Die App loggt bereits strukturiertes JSON via Pino. Loki aggregiert diese Logs.

**Konfiguration**: `k8s/monitoring/prometheus-alertmanager.yaml` (Loki-Section)

**Retention**: 90 Tage fuer App-Logs (konfigurierbar per Tenant)

**Query-Beispiele** (LogQL):
```logql
# Alle Errors
{app="immoflowme"} |= "error" | json

# Billing-spezifische Logs
{app="immoflowme"} | json | service="billing"

# Langsame Requests
{app="immoflowme"} | json | duration > 2000
```

### 4. Traces — Tempo (OpenTelemetry)

**Server Module**: `server/lib/opentelemetry.ts`

Bruecke zwischen dem bestehenden `tracing.ts` und OTLP Export.

**Konfiguration** (Environment):
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
OTEL_SERVICE_NAME=immoflowme
```

**Features**:
- W3C Trace Context Propagation (`traceparent` Header)
- Automatischer Export nach Trace-Abschluss
- Non-blocking (App laeuft weiter bei Trace-Fehler)
- Grafana Tempo Integration mit Loki Correlation

**Tempo Retention**: 14 Tage

### 5. Errors — Sentry

**Server Module**: `server/lib/sentry.ts`

**Konfiguration**:
```bash
SENTRY_DSN=https://key@sentry.io/project_id
```

**Features**:
- Automatische Exception-Erfassung via Express Error Handler
- Breadcrumbs fuer Request-Kontext
- PII-Filterung (Passwoerter, Tokens, IBAN werden redacted)
- User-Context aus Session
- Non-blocking Transport

**Express Integration**:
```typescript
import { initSentry, sentryRequestMiddleware, sentryErrorHandler } from './lib/sentry';

initSentry();
app.use(sentryRequestMiddleware);
// ... routes ...
app.use(sentryErrorHandler); // LAST error handler
```

---

## Alert-Regeln

| Alert | Schwelle | Severity | Team |
|---|---|---|---|
| HighErrorRate | > 1% 5xx (5min) | critical | backend |
| HighLatency | p99 > 2s (5min) | warning | backend |
| BillingRunSlow | p99 > 30min | critical | billing |
| PodCrashLooping | restarts > 0 (15min) | critical | ops |
| HighMemoryUsage | > 85% Limit | warning | ops |
| JobQueueBacklog | > 100 pending (10min) | warning | backend |
| BillingConflictSpike | rate > 0.1/s (5min) | warning | billing |

**Routing**:
- `critical` → PagerDuty + Slack
- `billing` → #billing-alerts Slack Channel
- `warning` → #ops-warnings Slack Channel

---

## Retention Policies

| Datentyp | Retention | Speicher | Compliance |
|---|---|---|---|
| Metrics | 30 Tage | Prometheus TSDB | — |
| App Logs | 90 Tage | Loki | — |
| Audit Logs | 7 Jahre | PostgreSQL (WORM) | BAO §132 |
| Traces | 14 Tage | Tempo | — |
| Error Events | 90 Tage | Sentry | — |
| Billing Records | 10 Jahre | PostgreSQL (WORM) | GoBD |
| SBOM/Scans | 90 Tage | GitHub Artifacts | — |

### WORM-Schutz (Audit + Billing)

1. DB-Trigger verhindern UPDATE/DELETE
2. SHA-256 Hash-Kette fuer Integritaet
3. Periodische Archiv-Exports mit Checksummen

---

## Kubernetes Manifests

| Datei | Inhalt |
|---|---|
| `k8s/monitoring/prometheus-alertmanager.yaml` | Prometheus Config, Alert Rules, Alertmanager, Loki, Retention Policies |
| `k8s/monitoring/grafana-dashboards.yaml` | Datasources + SLO/Business Dashboards |
| `k8s/monitoring/tempo.yaml` | Tempo Deployment + OTLP Receiver |

---

## Benoetigte Secrets/Environment

| Variable | Zweck | Erforderlich |
|---|---|---|
| `SENTRY_DSN` | Sentry Exception Tracking | Optional |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Tempo/Jaeger Trace Export | Optional |
| `OTEL_SERVICE_NAME` | Service-Name in Traces | Optional (default: immoflowme) |
| PagerDuty Routing Key | Alert Routing | Optional |
| Slack Webhook URL | Alert Notifications | Optional |
