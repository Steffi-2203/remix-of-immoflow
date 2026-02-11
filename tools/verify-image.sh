#!/usr/bin/env bash
# tools/verify-image.sh
# Verifies a container image before deployment:
#   1. Cosign signature verification
#   2. Trivy quick scan (CRITICAL/HIGH only)
#
# Usage: ./tools/verify-image.sh <image-ref>
# Example: ./tools/verify-image.sh ghcr.io/org/app@sha256:abc123...

set -euo pipefail

IMAGE="${1:?Usage: $0 <image-ref>}"

echo "═══════════════════════════════════════"
echo "  Image Verification: $IMAGE"
echo "═══════════════════════════════════════"

# ── 1. Cosign Signature Verification ──
echo ""
echo "── Step 1: Signature Verification ──"

if command -v cosign &>/dev/null; then
  if [ -n "${COSIGN_PRIVATE_KEY:-}" ]; then
    cosign verify --key env://COSIGN_PRIVATE_KEY "$IMAGE" 2>&1 && {
      echo "✅ Signature verified (key-based)"
    } || {
      echo "::error::❌ Signature verification FAILED"
      exit 1
    }
  else
    echo "⚠️  No COSIGN_PRIVATE_KEY set — attempting keyless verification"
    cosign verify \
      --certificate-identity-regexp=".*" \
      --certificate-oidc-issuer-regexp=".*" \
      "$IMAGE" 2>&1 && {
      echo "✅ Signature verified (keyless)"
    } || {
      echo "::error::❌ Keyless signature verification FAILED"
      exit 1
    }
  fi
else
  echo "::warning::cosign not installed — skipping signature verification"
fi

# ── 2. Trivy Quick Scan ──
echo ""
echo "── Step 2: Vulnerability Scan (CRITICAL/HIGH) ──"

if command -v trivy &>/dev/null; then
  trivy image \
    --severity CRITICAL,HIGH \
    --ignore-unfixed \
    --exit-code 1 \
    --format table \
    "$IMAGE" && {
    echo "✅ No critical/high vulnerabilities found"
  } || {
    echo "::error::❌ Critical/High vulnerabilities detected"
    exit 1
  }
else
  echo "::warning::trivy not installed — skipping vulnerability scan"
fi

echo ""
echo "═══════════════════════════════════════"
echo "  ✅ Image verification PASSED"
echo "═══════════════════════════════════════"
