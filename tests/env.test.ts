/**
 * Central test environment defaults.
 * Import this file in test setup or beforeAll() to ensure
 * consistent env across all test suites.
 */
export function applyTestEnv() {
  const defaults: Record<string, string> = {
    NODE_ENV: 'test',
    DATABASE_URL: process.env.DATABASE_URL || 'postgres://test:testpass@localhost:5433/immoflow_test',
    SESSION_SECRET: 'test-session-secret-minimum-32-chars-long',
    WORKER_ENABLED: 'false',
    JOB_QUEUE_MODE: 'polling',

    // Mock keys – never hit real services in tests
    SENTRY_DSN: '',
    OPENAI_API_KEY: 'sk-test-mock-key',
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_mock',
    RESEND_API_KEY: 're_test_mock',

    // Disable rate limiting in tests
    RATE_LIMIT_DISABLED: 'true',
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Auto-apply when imported
applyTestEnv();
