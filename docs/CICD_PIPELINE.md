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
