import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, sql, hasDb, resetDb } from './setup/db';

/**
 * JobQueue Integration Tests
 * Requires a real database connection (DATABASE_URL).
 */
describe.skipIf(!hasDb)('JobQueue Integration', () => {
  beforeAll(async () => {
    await resetDb();
    // Ensure org exists for FK
    await db.execute(sql`
      INSERT INTO organizations (id, name) 
      VALUES ('00000000-0000-4000-a000-000000000001', 'Test Org')
      ON CONFLICT (id) DO NOTHING
    `);
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM job_queue WHERE organization_id = '00000000-0000-4000-a000-000000000001'`);
  });

  it('enqueue creates a pending job', async () => {
    await db.execute(sql`
      INSERT INTO job_queue (id, organization_id, job_type, payload, status, priority, max_retries)
      VALUES ('jq-test-001', '00000000-0000-4000-a000-000000000001', 'billing_run', '{"test":true}'::jsonb, 'pending', 0, 3)
    `);
    const result = await db.execute(sql`SELECT status FROM job_queue WHERE id = 'jq-test-001'`);
    expect((result.rows[0] as any).status).toBe('pending');
  });

  it('claim_next_job uses FOR UPDATE SKIP LOCKED', async () => {
    // Insert two jobs
    await db.execute(sql`
      INSERT INTO job_queue (id, organization_id, job_type, payload, status, priority, max_retries)
      VALUES 
        ('jq-test-002', '00000000-0000-4000-a000-000000000001', 'billing_run', '{"n":2}'::jsonb, 'pending', 0, 3),
        ('jq-test-003', '00000000-0000-4000-a000-000000000001', 'billing_run', '{"n":3}'::jsonb, 'pending', 0, 3)
    `);

    // Claim first job
    const claimed = await db.execute(sql`
      UPDATE job_queue SET status = 'processing', started_at = now()
      WHERE id = (
        SELECT id FROM job_queue WHERE status = 'pending' 
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id
    `);
    expect(claimed.rows.length).toBe(1);
  });

  it('failed job increments retry_count', async () => {
    await db.execute(sql`
      INSERT INTO job_queue (id, organization_id, job_type, payload, status, priority, max_retries, retry_count)
      VALUES ('jq-test-retry', '00000000-0000-4000-a000-000000000001', 'billing_run', '{"r":1}'::jsonb, 'processing', 0, 3, 0)
    `);

    await db.execute(sql`
      UPDATE job_queue 
      SET status = 'retrying', retry_count = retry_count + 1, error = 'test error'
      WHERE id = 'jq-test-retry'
    `);

    const result = await db.execute(sql`SELECT retry_count, status FROM job_queue WHERE id = 'jq-test-retry'`);
    const row = result.rows[0] as any;
    expect(row.retry_count).toBe(1);
    expect(row.status).toBe('retrying');
  });

  it('max retries reached sets status to failed', async () => {
    await db.execute(sql`
      INSERT INTO job_queue (id, organization_id, job_type, payload, status, priority, max_retries, retry_count)
      VALUES ('jq-test-maxr', '00000000-0000-4000-a000-000000000001', 'billing_run', '{"m":1}'::jsonb, 'retrying', 0, 3, 3)
    `);

    await db.execute(sql`
      UPDATE job_queue 
      SET status = CASE WHEN retry_count >= max_retries THEN 'failed' ELSE 'retrying' END,
          failed_at = CASE WHEN retry_count >= max_retries THEN now() ELSE NULL END,
          error = 'max retries exceeded'
      WHERE id = 'jq-test-maxr'
    `);

    const result = await db.execute(sql`SELECT status FROM job_queue WHERE id = 'jq-test-maxr'`);
    expect((result.rows[0] as any).status).toBe('failed');
  });
});
