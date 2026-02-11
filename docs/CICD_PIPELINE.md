# CI/CD Pipeline — ImmoflowMe

## Architektur

```
  ┌─────────┐    ┌──────┐    ┌──────┐    ┌────────────┐    ┌────────────┐
  │  Build  │───▶│ Sign │───▶│ Scan │───▶│  Promote   │───▶│   Deploy   │
  │ (once)  │    │cosign│    │trivy │    │ dev→stg→   │    │  canary→   │
  │         │    │      │    │ SBOM │    │ canary→prod │    │  prod      │
  └─────────┘    └──────┘    └──────┘    └────────────┘    └────────────┘
       │                                       │                  │
       ▼                                       ▼                  ▼
   Immutable                            Verify + Test       Health Check
   Digest                               Re-Tag Only         Auto Rollback
```

## Prinzipien

1. **Build once, deploy everywhere** — Ein einziges Container-Image wird gebaut und via Digest referenziert.
2. **Signed images** — Jedes Image wird mit Cosign signiert. Deployment verweigert unsignierte Images.
3. **No rebuild on promote** — Promotion taggt das verifizierte Image um, baut nicht neu.
4. **Automatic rollback** — Canary-Deploys werden via Health-Checks ueberwacht; bei Fehler wird automatisch zurueckgerollt.

---

## Workflows

### 1. `build-and-sign.yml`

**Trigger**: Push auf `main`, Tags (`v*`), manuell

| Schritt | Tool | Ergebnis |
|---|---|---|
| Docker Build | `docker/build-push-action` | Immutable image + digest |
| Sign | `cosign` | Signiertes Image |
| SBOM | `anchore/sbom-action` | SPDX JSON |
| Scan | `trivy` | Vulnerability report |

**Outputs**: `image_digest`, `image_tag`, `sbom_path`

### 2. `promote.yml`

**Trigger**: Manuell (`workflow_dispatch`)

| Input | Beschreibung |
|---|---|
| `image_digest` | Der zu promovierende Image-Digest |
| `source_env` | dev / staging / canary |
| `target_env` | staging / canary / production |

**Erlaubte Pfade**:
- `dev` → `staging`
- `staging` → `canary`
- `canary` → `production`

**Gates**:
1. Cosign Signatur-Verifikation
2. DB Migration Dry-Run (Schema-Kompatibilitaet)
3. Smoke Tests (Billing Parity, Normalisierung)
4. Contract Tests (optional)

### 3. `canary-deploy.yml`

**Trigger**: Manuell (`workflow_dispatch`)

| Phase | Verhalten |
|---|---|
| Deploy | Image wird als `:canary` getaggt |
| Health Check | Pollt `/api/health` fuer konfigurierbare Dauer |
| Rollback | Automatisch bei 3 konsekutiven Fehlernn |
| Notification | GitHub Summary + optionaler Webhook |

### 4. `ci.yml` (bestehend, erweitert)

Neue Steps im `billing-parity` Job:
- **Trivy FS Scan** — Scannt den Source-Code auf bekannte Schwachstellen
- **SBOM Generation** — Erzeugt Dependency-SBOM
- **npm audit Gate** — Blockiert bei kritischen Schwachstellen

---

## Promotion-Regeln

| Wer | Darf promoten von → nach |
|---|---|
| CI (automatisch) | Build → dev |
| Entwickler | dev → staging |
| Tech Lead | staging → canary |
| Tech Lead + Approval | canary → production |

> Tipp: Verwende GitHub Environments mit Required Reviewers fuer production.

---

## Rollback-Strategie

### Automatisch (Canary)
- Health-Check pollt alle 10s
- Nach 3 konsekutiven Fehlern wird automatisch auf den vorherigen Digest zurueckgerollt
- Webhook-Benachrichtigung an das Team

### Manuell
```bash
# 1. Aktuellen Digest identifizieren
docker manifest inspect ghcr.io/org/app:production

# 2. Zum vorherigen Digest zurueckkehren
docker pull ghcr.io/org/app@sha256:<previous_digest>
docker tag ghcr.io/org/app@sha256:<previous_digest> ghcr.io/org/app:production
docker push ghcr.io/org/app:production

# 3. Deployment triggern (infrastruktur-spezifisch)
# kubectl rollout undo deployment/app
# fly deploy --image ghcr.io/org/app@sha256:<previous_digest>
```

### SLAs
| Metrik | Ziel |
|---|---|
| Rollback-Zeit (automatisch) | < 2 Minuten |
| Rollback-Zeit (manuell) | < 10 Minuten |
| Health-Check-Intervall | 10 Sekunden |
| Max Consecutive Failures | 3 |

---

## Benoetigte Secrets

| Secret | Zweck | Erforderlich |
|---|---|---|
| `COSIGN_PRIVATE_KEY` | Image-Signierung | Ja (oder keyless) |
| `COSIGN_PASSWORD` | Cosign Key Passphrase | Ja (wenn Key-basiert) |
| `REGISTRY_URL` | Container Registry URL | Nein (default: ghcr.io) |
| `REGISTRY_USERNAME` | Registry Login | Nein (default: github.actor) |
| `REGISTRY_PASSWORD` | Registry Token | Nein (default: GITHUB_TOKEN) |
| `STAGING_DATABASE_URL` | Migration Dry-Run | Optional |
| `CANARY_DEPLOY_URL` | Health-Check Endpoint | Optional |
| `ROLLBACK_WEBHOOK` | Slack/Teams Notification | Optional |

---

## Dockerfile

Multi-Stage Build:
1. **Builder** — `node:20-alpine`, installiert alle Deps, baut die App
2. **Runtime** — `node:20-alpine`, nur Production-Deps + Build-Artefakte
3. Non-root User (`appuser:1001`)
4. Health-Check CMD eingebaut

---

## Image-Verifikation

Vor jedem Deployment wird `tools/verify-image.sh` ausgefuehrt:

```bash
./tools/verify-image.sh ghcr.io/org/app@sha256:abc123...
```

Prueft:
1. ✅ Cosign-Signatur
2. ✅ Trivy CRITICAL/HIGH Scan

---

## Canary Traffic Splitting

Canary-Releases routen einen kleinen Prozentsatz (default 5%) des Traffics auf die neue Version.

### Workflow-Parameter

| Parameter | Default | Beschreibung |
|---|---|---|
| `traffic_percent` | 5 | Prozent des Traffics fuer Canary |
| `error_rate_threshold` | 5% | Max Fehlerrate vor Auto-Rollback |
| `latency_p99_threshold_ms` | 2000 | Max p99 Latenz vor Auto-Rollback |
| `health_timeout_minutes` | 5 | Monitoring-Dauer |

### Kubernetes (Istio)

Traffic-Splitting wird ueber `k8s/canary.yaml` konfiguriert:
- `VirtualService`: weighted routing (95/5 stable/canary)
- `DestinationRule`: subset definitions
- Alternative: Nginx Ingress `canary-weight` Annotation

### Monitoring waehrend Canary

1. Error-Rate vergleichen (canary vs stable)
2. p99 Latenz vergleichen
3. Bei Ueberschreitung: automatischer Rollback + Webhook-Notification

---

## Blue/Green Deployments

Fuer schema-safe Releases oder groessere Infrastruktur-Aenderungen.

### Workflow: `blue-green.yml`

| Phase | Beschreibung |
|---|---|
| Preflight | Signatur-Verifikation, Slot-Erkennung |
| Deploy Inactive | Image auf inaktiven Slot deployen |
| Migration Check | Schema-Kompatibilitaet pruefen |
| Smoke Tests | Billing Parity gegen neuen Slot |
| Switch Traffic | Production-Tag umhaengen |

### Rollback

```bash
# Einfach den alten Slot wieder als production taggen:
docker tag ghcr.io/org/app:blue ghcr.io/org/app:production
docker push ghcr.io/org/app:production
```

---

## Feature Flags

Deployment ist von Release entkoppelt via `server/lib/featureFlags.ts`.

### Verwendung

```typescript
import { isFeatureEnabled, FLAGS } from './lib/featureFlags';

if (await isFeatureEnabled(FLAGS.NEW_SETTLEMENT_ENGINE, { userId, orgId })) {
  // Neue Logik
} else {
  // Bestehende Logik
}
```

### Konfiguration

| Methode | Beispiel |
|---|---|
| Environment | `FF_NEW_SETTLEMENT_ENGINE=true` |
| API | `setFlag({ key: 'new-settlement-engine', enabled: true, rollout_percentage: 10 })` |
| User Targeting | `allowed_users: ['user-id-1']` |
| Org Targeting | `allowed_orgs: ['org-id-1']` |

### Externe Provider

Adapter-Pattern fuer Unleash/LaunchDarkly:
```typescript
import { setFeatureFlagProvider } from './lib/featureFlags';
setFeatureFlagProvider(new UnleashProvider(config));
```

---

## DB Migration Safety

### Regeln (tools/migration_safety_check.sh)

| Pattern | Bewertung | Empfehlung |
|---|---|---|
| DROP TABLE | ❌ Blockiert | Separater Deploy nach Code-Entfernung |
| DROP COLUMN | ❌ Blockiert | 2-Step: Code anpassen, dann droppen |
| NOT NULL ohne DEFAULT | ❌ Blockiert | DEFAULT hinzufuegen |
| RENAME COLUMN | ⚠️ Warnung | Transition mit altem + neuem Namen |
| CREATE INDEX (ohne CONCURRENTLY) | ⚠️ Warnung | CONCURRENTLY verwenden |
| TRUNCATE | ❌ Blockiert | Explizite Genehmigung erforderlich |

### Backward/Forward Compatible Pattern

```
Deploy 1: ADD COLUMN new_col DEFAULT 'x'     -- backward compatible
Deploy 2: Code liest/schreibt new_col         -- forward compatible
Deploy 3: Backfill old rows                   -- data migration
Deploy 4: DROP COLUMN old_col                 -- cleanup
```

---

## Runtime Hardening (Kubernetes)

### Manifests: `k8s/`

| Datei | Inhalt |
|---|---|
| `deployment.yaml` | Deployment, HPA, PDB, NetworkPolicy, ServiceAccount |
| `canary.yaml` | Canary Deployment + Istio VirtualService |
| `secrets.yaml` | ExternalSecret (Vault/KMS Integration) |

### Resource Limits

| Resource | Request | Limit |
|---|---|---|
| CPU | 250m | 1000m |
| Memory | 256Mi | 512Mi |

### HPA Metriken

- CPU Utilization > 70%
- Memory Utilization > 80%
- HTTP p99 Latenz > 1.5s (custom metric)
- Job Queue Laenge > 50 (custom metric)

### Security

- Non-root Container (UID 1001)
- Read-only Root Filesystem
- Alle Capabilities gedroppt
- NetworkPolicy: nur Ingress + PostgreSQL + HTTPS erlaubt
- ServiceAccount ohne Token-Mount
- Secrets via External Secrets Operator (Vault/KMS, 5min Rotation)
