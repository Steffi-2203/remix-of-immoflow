import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

/**
 * k6 Spike & Cost Simulation
 * Run: k6 run tests/load/k6-spike-and-cost.js
 *
 * Tests:
 * 1. Spike: 0 → 200 VUs in 10s, hold 30s, drop to 0
 * 2. Cost tracking: counts OpenAI-proxy calls to estimate cost
 */

// Custom metrics
const openaiCalls = new Counter('openai_proxy_calls');
const openaiLatency = new Trend('openai_proxy_latency', true);
const jobQueueDepth = new Trend('job_queue_depth');

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 200 },  // spike up
        { duration: '30s', target: 200 },  // hold
        { duration: '10s', target: 0 },    // drop
      ],
    },
    sustained: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m',
      startTime: '1m',  // start after spike
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],     // p95 < 2s even under spike
    http_req_failed: ['rate<0.05'],        // <5% errors during spike
    openai_proxy_latency: ['p(95)<5000'],  // OpenAI proxy p95 < 5s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const TOKEN = __ENV.TEST_TOKEN || '';
const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

// Estimated cost per OpenAI call (GPT-4o-mini, ~500 tokens)
const COST_PER_CALL_USD = 0.0015;

export default function () {
  // 1. Health (always)
  const health = http.get(`${BASE_URL}/api/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  // 2. API endpoints under load
  if (TOKEN) {
    const endpoints = [
      '/api/properties',
      '/api/tenants',
      '/api/payments',
      '/api/bank-accounts',
    ];
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const res = http.get(`${BASE_URL}${endpoint}`, { headers });
    check(res, {
      [`${endpoint} ok`]: (r) => r.status === 200 || r.status === 401,
    });

    // 3. Simulate OCR/OpenAI call (10% of requests)
    if (Math.random() < 0.1) {
      const start = Date.now();
      const ocrRes = http.post(
        `${BASE_URL}/api/documents/ocr-parse`,
        JSON.stringify({ text: 'Testbeleg Rechnung #12345', mode: 'dry_run' }),
        { headers: { ...headers, 'Content-Type': 'application/json' } }
      );
      const elapsed = Date.now() - start;
      openaiCalls.add(1);
      openaiLatency.add(elapsed);

      check(ocrRes, {
        'ocr responds': (r) => r.status === 200 || r.status === 401 || r.status === 404,
      });
    }

    // 4. Check JobQueue depth (5% of requests)
    if (Math.random() < 0.05) {
      const metrics = http.get(`${BASE_URL}/api/metrics`, { headers });
      if (metrics.status === 200) {
        try {
          const body = JSON.parse(metrics.body);
          jobQueueDepth.add(body.queue?.pending || 0);
        } catch (_) {}
      }
    }
  }

  sleep(0.2 + Math.random() * 0.3);
}

export function handleSummary(data) {
  const totalOcrCalls = data.metrics.openai_proxy_calls
    ? data.metrics.openai_proxy_calls.values.count
    : 0;
  const estimatedCost = (totalOcrCalls * COST_PER_CALL_USD).toFixed(4);

  const summary = {
    'spike_test_summary': {
      total_requests: data.metrics.http_reqs.values.count,
      failed_requests: data.metrics.http_req_failed.values.passes,
      p95_latency_ms: data.metrics.http_req_duration.values['p(95)'].toFixed(1),
      p99_latency_ms: data.metrics.http_req_duration.values['p(99)'].toFixed(1),
      openai_calls: totalOcrCalls,
      estimated_openai_cost_usd: estimatedCost,
      max_job_queue_depth: data.metrics.job_queue_depth
        ? data.metrics.job_queue_depth.values.max
        : 0,
    },
  };

  return {
    stdout: JSON.stringify(summary, null, 2) + '\n',
    'tests/load/spike-report.json': JSON.stringify(summary, null, 2),
  };
}
