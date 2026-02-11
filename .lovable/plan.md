

# CI/CD Pipeline Hardening Plan

## Uebersicht

Erweiterung der bestehenden CI/CD Pipeline (`.github/workflows/ci.yml`) um Container-Image-Management, Signaturen, ein Promotion-Modell (dev -> staging -> canary -> production), erweiterte Security-Scans und automatisches Rollback.

---

## Aenderungen

### 1. Neuer Workflow: `build-and-sign.yml`

Erstellt ein einziges immutable Container-Image pro Commit und signiert es.

- **Docker Build** mit `docker/build-push-action` und Digest-Pinning
- **Image Signing** via `sigstore/cosign-installer` -- signiert den Image-Digest
- **SBOM-Generierung** via `anchore/sbom-action` (SPDX/CycloneDX)
- **Trivy Scan** auf dem gebauten Image (`aquasecurity/trivy-action`)
- Outputs: `image_digest`, `image_tag`, `sbom_path`
- Artefakte: SBOM und Trivy-Report werden als GitHub Artifacts hochgeladen (90 Tage Retention)

### 2. Neuer Workflow: `promote.yml`

Promotion-Modell: Artifact-basiert, kein Rebuild.

- **Trigger**: `workflow_dispatch` mit Inputs `source_env` (dev/staging/canary) und `target_env` (staging/canary/production)
- **Cosign Verify** -- verifiziert die Signatur des Image-Digests vor Promotion
- **DB Migration Dry-Run** gegen Staging-Snapshot (bestehende `schema_compat_check.sh` wird wiederverwendet)
- **Integration Smoke Tests** -- fuehrt bestehende Billing Parity und Normalisation-Tests gegen die Zielumgebung aus
- **Re-Tag** -- taggt das verifizierte Image fuer die Zielumgebung (kein Rebuild)
- **Contract Tests** -- optional, fuehrt API-Contract-Tests aus falls vorhanden
- Gate: Promotion schlaegt fehl wenn Signaturverifikation, Migration Dry-Run oder Smoke Tests scheitern

### 3. Neuer Workflow: `canary-deploy.yml`

Canary-Deployment mit automatischem Rollback.

- **Trigger**: Erfolgreiche Promotion zu `canary`
- **Deploy** -- deployt das signierte Image auf die Canary-Umgebung
- **Health Check Loop** -- pollt `/api/health` fuer 5 Minuten (konfigurierbar)
- **Automatic Rollback** -- bei Health-Check-Fehler wird automatisch das vorherige Image (gespeichert als Output) deployed
- **Notification** -- GitHub Summary und optional Webhook-Benachrichtigung bei Rollback

### 4. Erweiterung bestehender `ci.yml`

Minimale Aenderungen am bestehenden Workflow:

- Neuer Step in `billing-parity` Job: **Trivy Filesystem Scan** (`aquasecurity/trivy-action` mit `fs` Modus auf dem Repository)
- Neuer Step in `billing-parity` Job: **SBOM Generation** fuer Dependency-Tracking
- Neuer Step in `billing-parity` Job: **npm audit** mit `--audit-level=critical` als harter Gate (statt nur Report)
- Bestehender `security_audit.sh` bleibt unveraendert

### 5. Neues Tool: `tools/verify-image.sh`

Shell-Script zur Verifizierung eines Container-Images vor Deployment:

- Cosign Signature Verification
- Digest-Vergleich gegen Build-Manifest
- Trivy Quick-Scan (Critical/High only)
- Exit 1 bei Fehler

### 6. Dokumentation: `docs/CICD_PIPELINE.md`

Dokumentiert das gesamte Pipeline-Modell:

- Architektur-Diagramm (ASCII): Build -> Sign -> Scan -> Promote -> Deploy
- Promotion-Regeln (wer darf von wo nach wo promoten)
- Rollback-Strategie und SLAs
- Secrets-Requirements (COSIGN_KEY, REGISTRY_URL, etc.)
- Runbook fuer manuelles Rollback

---

## Technische Details

### Benoetigte GitHub Secrets

| Secret | Zweck |
|---|---|
| `COSIGN_PRIVATE_KEY` | Image-Signierung |
| `COSIGN_PASSWORD` | Passphrase fuer Cosign Key |
| `REGISTRY_URL` | Container Registry (z.B. ghcr.io) |
| `REGISTRY_USERNAME` | Registry Login |
| `REGISTRY_PASSWORD` | Registry Token |
| `STAGING_DATABASE_URL` | Migration Dry-Run |
| `CANARY_DEPLOY_URL` | Canary Health-Check Endpoint |
| `ROLLBACK_WEBHOOK` | Optional: Slack/Teams Notification |

### Neues Dockerfile

Ein minimales Multi-Stage Dockerfile wird erstellt:

- Stage 1: `node:20-alpine` -- Build (npm ci, build)
- Stage 2: `node:20-alpine` -- Runtime (nur production deps + dist)
- Digest-pinned Base Images
- Non-root User
- Health-Check CMD

### Dateien die erstellt werden

| Datei | Zweck |
|---|---|
| `.github/workflows/build-and-sign.yml` | Immutable Build + Sign + Scan |
| `.github/workflows/promote.yml` | Promotion zwischen Environments |
| `.github/workflows/canary-deploy.yml` | Canary mit Auto-Rollback |
| `Dockerfile` | Multi-Stage Container Build |
| `tools/verify-image.sh` | Image-Verifikation vor Deploy |
| `docs/CICD_PIPELINE.md` | Pipeline-Dokumentation |

### Dateien die geaendert werden

| Datei | Aenderung |
|---|---|
| `.github/workflows/ci.yml` | +3 Steps: Trivy FS scan, SBOM, npm audit gate |

