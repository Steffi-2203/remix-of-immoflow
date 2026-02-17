#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@immoflowme.at}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
REDIS_URL="${REDIS_URL:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0
SKIPPED=0

pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; ((PASSED++)); }
fail() { echo -e "${RED}✗ FAIL${NC}: $1 — $2"; ((FAILED++)); }
skip() { echo -e "${YELLOW}⊘ SKIP${NC}: $1 — $2"; ((SKIPPED++)); }

echo "========================================"
echo " ImmoFlowMe E2E Smoke Test"
echo " Base URL: $BASE_URL"
echo " Timestamp: $(date -Iseconds)"
echo "========================================"
echo ""

echo "--- 1. Health Check ---"
HTTP_CODE=$(curl -s -o /tmp/smoke_health.json -w "%{http_code}" "$BASE_URL/api/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  pass "GET /api/health → 200"
else
  fail "GET /api/health" "Expected 200, got $HTTP_CODE"
fi

echo ""
echo "--- 2. Login (obtain session) ---"
LOGIN_RESP=$(curl -s -c /tmp/smoke_cookies.txt -w "\n%{http_code}" \
  -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null || echo -e "\n000")
LOGIN_CODE=$(echo "$LOGIN_RESP" | tail -1)
LOGIN_BODY=$(echo "$LOGIN_RESP" | head -n -1)

if [ "$LOGIN_CODE" = "200" ]; then
  pass "POST /api/auth/login → 200"
  TOKEN=$(echo "$LOGIN_BODY" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
  if [ -n "$TOKEN" ]; then
    echo "  Token obtained: ${TOKEN:0:12}..."
    AUTH_HEADER="Authorization: Bearer $TOKEN"
  else
    AUTH_HEADER=""
    echo "  No token in response, using cookie auth"
  fi
else
  fail "POST /api/auth/login" "Expected 200, got $LOGIN_CODE"
  TOKEN=""
  AUTH_HEADER=""
fi

echo ""
echo "--- 3. Cache-Control Headers on Admin API ---"
HEADERS=$(curl -sI -b /tmp/smoke_cookies.txt ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
  "$BASE_URL/api/admin/marketing/trials" 2>/dev/null || echo "")
if echo "$HEADERS" | grep -qi "cache-control.*no-store"; then
  pass "Cache-Control: no-store present on admin API"
else
  fail "Cache-Control header" "no-store not found in response headers"
fi
if echo "$HEADERS" | grep -qi "x-admin-cache.*disabled"; then
  pass "X-Admin-Cache: disabled header present"
else
  fail "X-Admin-Cache header" "not found in response headers"
fi

echo ""
echo "--- 4. GET /api/admin/marketing/trials ---"
TRIALS_CODE=$(curl -s -o /tmp/smoke_trials.json -w "%{http_code}" \
  -b /tmp/smoke_cookies.txt ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
  "$BASE_URL/api/admin/marketing/trials" 2>/dev/null || echo "000")
if [ "$TRIALS_CODE" = "200" ]; then
  TRIAL_COUNT=$(cat /tmp/smoke_trials.json | grep -o '"id"' | wc -l || echo "0")
  pass "GET /api/admin/marketing/trials → 200 ($TRIAL_COUNT trials)"
elif [ "$TRIALS_CODE" = "401" ] || [ "$TRIALS_CODE" = "403" ]; then
  skip "GET /api/admin/marketing/trials" "Auth failed ($TRIALS_CODE) — check credentials"
else
  fail "GET /api/admin/marketing/trials" "Expected 200, got $TRIALS_CODE"
fi

echo ""
echo "--- 5. POST /api/admin/marketing/invitation (enqueue) ---"
INVITE_EMAIL="smoke-test-$(date +%s)@example.com"
INVITE_CODE=$(curl -s -o /tmp/smoke_invite.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/admin/marketing/invitation" \
  -b /tmp/smoke_cookies.txt ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$INVITE_EMAIL\",\"name\":\"Smoke Test\",\"customMessage\":\"E2E smoke test\"}" 2>/dev/null || echo "000")
if [ "$INVITE_CODE" = "200" ] || [ "$INVITE_CODE" = "201" ]; then
  EMAIL_SENT=$(cat /tmp/smoke_invite.json | grep -o '"email_sent":[a-z]*' | cut -d: -f2 || echo "unknown")
  pass "POST /api/admin/marketing/invitation → $INVITE_CODE (email_sent=$EMAIL_SENT)"
elif [ "$INVITE_CODE" = "401" ] || [ "$INVITE_CODE" = "403" ]; then
  skip "POST /api/admin/marketing/invitation" "Auth failed ($INVITE_CODE)"
else
  fail "POST /api/admin/marketing/invitation" "Expected 200/201, got $INVITE_CODE"
fi

echo ""
echo "--- 6. Queue Status (Admin Health) ---"
HEALTH_CODE=$(curl -s -o /tmp/smoke_admin_health.json -w "%{http_code}" \
  -b /tmp/smoke_cookies.txt ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
  "$BASE_URL/api/admin/health" 2>/dev/null || echo "000")
if [ "$HEALTH_CODE" = "200" ]; then
  QUEUE_MODE=$(cat /tmp/smoke_admin_health.json | grep -o '"mode":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
  pass "GET /api/admin/health → 200 (queue_mode=$QUEUE_MODE)"
  if [ "$QUEUE_MODE" = "queue" ]; then
    WAITING=$(cat /tmp/smoke_admin_health.json | grep -o '"waiting":[0-9]*' | cut -d: -f2 || echo "?")
    echo "  Queue stats: waiting=$WAITING"
  else
    echo "  Running in inline mode (no Redis)"
  fi
elif [ "$HEALTH_CODE" = "401" ] || [ "$HEALTH_CODE" = "403" ]; then
  skip "GET /api/admin/health" "Auth failed ($HEALTH_CODE)"
else
  fail "GET /api/admin/health" "Expected 200, got $HEALTH_CODE"
fi

echo ""
echo "--- 7. Redis Queue Length (optional) ---"
if [ -n "$REDIS_URL" ]; then
  if command -v redis-cli &>/dev/null; then
    QLEN=$(redis-cli -u "$REDIS_URL" LLEN "bull:emailQueue:wait" 2>/dev/null || echo "error")
    if [ "$QLEN" != "error" ]; then
      pass "Redis queue length: $QLEN"
    else
      fail "Redis LLEN" "Could not query Redis"
    fi
  else
    skip "Redis queue length" "redis-cli not installed"
  fi
else
  skip "Redis queue length" "REDIS_URL not set"
fi

echo ""
echo "========================================"
echo -e " Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}, ${YELLOW}$SKIPPED skipped${NC}"
echo "========================================"

rm -f /tmp/smoke_health.json /tmp/smoke_trials.json /tmp/smoke_invite.json /tmp/smoke_admin_health.json /tmp/smoke_cookies.txt

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
exit 0
