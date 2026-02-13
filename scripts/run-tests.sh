#!/usr/bin/env bash
set -euo pipefail

# ImmoflowMe Test Runner
# Usage: bash scripts/run-tests.sh [unit|integration|e2e|typecheck|all|load]

CMD="${1:-all}"

case "$CMD" in
  typecheck)
    echo "🔍 TypeCheck..."
    npx tsc --noEmit
    ;;
  unit)
    echo "🧪 Unit Tests..."
    npx vitest run --config vitest.config.server.ts tests/unit
    ;;
  integration)
    echo "🔗 Integration Tests..."
    npx vitest run --config vitest.config.server.ts tests/integration
    ;;
  e2e)
    echo "🎭 E2E Tests..."
    npx playwright test
    ;;
  load)
    echo "📊 Load Tests..."
    k6 run tests/load/k6-api-smoke.js
    ;;
  all)
    echo "🔍 TypeCheck..."
    npx tsc --noEmit
    echo "🧪 Unit Tests..."
    npx vitest run --config vitest.config.server.ts tests/unit
    echo "🔗 Integration Tests..."
    npx vitest run --config vitest.config.server.ts tests/integration
    echo "✅ All tests passed!"
    ;;
  *)
    echo "Usage: $0 [unit|integration|e2e|typecheck|all|load]"
    exit 1
    ;;
esac
