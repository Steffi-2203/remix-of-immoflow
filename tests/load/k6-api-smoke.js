import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * k6 API Smoke / Load Test
 * Run: k6 run tests/load/k6-api-smoke.js
 *
 * Requires: TEST_TOKEN env var for auth, BASE_URL (default localhost:5000)
 */
export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      startTime: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // p95 < 1s
    http_req_failed: ['rate<0.01'],     // <1% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const TOKEN = __ENV.TEST_TOKEN || '';

const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

export default function () {
  // Health check (no auth)
  const health = http.get(`${BASE_URL}/api/health`);
  check(health, {
    'health status 200': (r) => r.status === 200,
    'health has timestamp': (r) => JSON.parse(r.body).timestamp !== undefined,
  });

  // Authenticated endpoints
  if (TOKEN) {
    const properties = http.get(`${BASE_URL}/api/properties`, { headers });
    check(properties, {
      'properties status 200': (r) => r.status === 200,
    });

    const payments = http.get(`${BASE_URL}/api/payments`, { headers });
    check(payments, {
      'payments status 200 or 401': (r) => r.status === 200 || r.status === 401,
    });

    const tenants = http.get(`${BASE_URL}/api/tenants`, { headers });
    check(tenants, {
      'tenants status 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
  }

  sleep(0.5);
}
