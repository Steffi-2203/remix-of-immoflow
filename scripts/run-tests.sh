#!/usr/bin/env bash
set -euo pipefail

# ImmoflowMe Test Runner
# Usage: bash scripts/run-tests.sh [unit|integration|e2e|typecheck|all|load]
# Optional env:
#  START_SERVER_FOR_E2E=true  -> starts `npm run start` in background for e2e
#  DB_WAIT_TIMEOUT=60         -> seconds to wait for DB readiness
#  SERVER_WAIT_TIMEOUT=20     -> seconds to wait for server readiness

CMD="${1:-all}"
DB_WAIT_TIMEOUT="${DB_WAIT_TIMEOUT:-60}"
SERVER_WAIT_TIMEOUT="${SERVER_WAIT_TIMEOUT:-20}"
START_SERVER="${START_SERVER_FOR_E2E:-false}"

# Colors
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m"

function info { echo -e "${BLUE}==>${NC} $*"; }
function ok { echo -e "${GREEN}✔${NC} $*"; }
function warn { echo -e "${YELLOW}⚠${NC} $*"; }
function err { echo -e "${RED}✖${NC} $*"; }

function usage {
  cat <<EOF
Usage: $0 [unit|integration|e2e|typecheck|all|load]

Commands:
  typecheck     Run TypeScript type check (tsc --noEmit)
  unit          Run unit tests (vitest)
  integration   Run integration tests (vitest against test DB)
  e2e           Run Playwright E2E tests (optionally starts server)
  load          Run k6 load test
  all           Run typecheck, unit and integration tests

Environment:
  START_SERVER_FOR_E2E=true   Start app server in background for e2e
  DB_WAIT_TIMEOUT=60         Seconds to wait for DB readiness
  SERVER_WAIT_TIMEOUT=20     Seconds to wait for server readiness
EOF
}

# cleanup background server if started
BG_PID=""
function cleanup {
  if [[ -n "$BG_PID" ]]; then
    warn "Stopping background server (pid $BG_PID)"
    kill "$BG_PID" 2>/dev/null || true
    wait "$BG_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

function wait_for_postgres {
  local url="${DATABASE_URL:-postgres://test:test@localhost:5433/immoflow_test}"
  info "Warte auf Postgres (${url}) bis ${DB_WAIT_TIMEOUT}s..."
  local start ts
  start=$(date +%s)
  while true; do
    if pg_isready -q -d "$url" 2>/dev/null || psql "$url" -c '\q' >/dev/null 2>&1; then
      ok "Postgres erreichbar"
      return 0
    fi
    ts=$(( $(date +%s) - start ))
    if (( ts >= DB_WAIT_TIMEOUT )); then
      err "Postgres nicht erreichbar nach ${DB_WAIT_TIMEOUT}s"
      return 1
    fi
    sleep 1
  done
}

function wait_for_server {
  local url="${PLAYWRIGHT_BASE_URL:-http://localhost:5000}"
  info "Warte auf Server ${url} bis ${SERVER_WAIT_TIMEOUT}s..."
  local start ts
  start=$(date +%s)
  while true; do
    if curl -sSf "${url}/health" >/dev/null 2>&1; then
      ok "Server antwortet auf /health"
      return 0
    fi
    ts=$(( $(date +%s) - start ))
    if (( ts >= SERVER_WAIT_TIMEOUT )); then
      err "Server nicht erreichbar nach ${SERVER_WAIT_TIMEOUT}s"
      return 1
    fi
    sleep 1
  done
}

case "$CMD" in
  help|-h|--help)
    usage
    exit 0
    ;;
  typecheck)
    info "🔍 TypeCheck..."
    npx tsc --noEmit
    ok "TypeCheck erfolgreich"
    ;;
  unit)
    info "🧪 Unit Tests..."
    npx vitest run --config vitest.config.server.ts tests/unit
    ok "Unit Tests abgeschlossen"
    ;;
  integration)
    info "🔗 Integration Tests..."
    wait_for_postgres
    npx vitest run --config vitest.config.server.ts tests/integration
    ok "Integration Tests abgeschlossen"
    ;;
  e2e)
    info "🎭 E2E Tests..."
    if [[ "$START_SERVER" == "true" ]]; then
      info "Starte App Server im Hintergrund..."
      npm run start &>/dev/null &
      BG_PID=$!
      info "Server PID: $BG_PID"
      wait_for_server || { err "Serverstart fehlgeschlagen"; exit 2; }
    else
      info "START_SERVER_FOR_E2E nicht gesetzt. Erwartet, dass Server bereits läuft."
    fi
    npx playwright test
    ok "E2E Tests abgeschlossen"
    ;;
  load)
    info "📊 Load Tests..."
    if ! command -v k6 >/dev/null 2>&1; then
      warn "k6 nicht gefunden. Bitte installieren oder CI-Job verwenden."
    fi
    k6 run tests/load/k6-api-smoke.js
    ok "Load Test abgeschlossen"
    ;;
  all)
    info "🔍 TypeCheck..."
    npx tsc --noEmit
    ok "TypeCheck erfolgreich"

    info "🧪 Unit Tests..."
    npx vitest run --config vitest.config.server.ts tests/unit
    ok "Unit Tests abgeschlossen"

    info "🔗 Integration Tests..."
    wait_for_postgres
    npx vitest run --config vitest.config.server.ts tests/integration
    ok "Integration Tests abgeschlossen"

    ok "✅ All tests passed!"
    ;;
  *)
    usage
    exit 1
    ;;
esac
