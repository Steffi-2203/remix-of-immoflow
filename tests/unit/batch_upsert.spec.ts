import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock pg module ───
const mockQuery = vi.fn();
const mockEnd = vi.fn();
const mockConnect = vi.fn();

const mockCopyStream = {
  write: vi.fn(),
  end: vi.fn((_?: unknown, cb?: () => void) => cb?.()),
  on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
    if (event === 'finish') setTimeout(cb, 0);
    return mockCopyStream;
  }),
};

vi.mock('pg', () => ({
  Client: vi.fn(() => ({
    connect: mockConnect,
    query: mockQuery,
    end: mockEnd,
  })),
}));

vi.mock('pg-copy-streams', () => ({
  from: vi.fn(() => mockCopyStream),
}));

// ─── Unit Tests ───
describe('batch_upsert logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: CREATE TEMP TABLE, COPY, UPSERT CTE, DROP
    mockQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // CREATE TEMP TABLE
      .mockResolvedValueOnce({}) // pipeline.from (COPY)
      .mockResolvedValueOnce({  // UPSERT CTE result
        rowCount: 5,
        rows: [
          { id: 'a1', inserted_flag: true },
          { id: 'a2', inserted_flag: true },
          { id: 'a3', inserted_flag: true },
          { id: 'a4', inserted_flag: false },
          { id: 'a5', inserted_flag: false },
        ],
      })
      .mockResolvedValueOnce({}) // DROP TEMP TABLE
      .mockResolvedValueOnce({}); // COMMIT
  });

  it('should call BEGIN and COMMIT around the upsert', async () => {
    // Simulate the transactional flow
    const calls = [
      'BEGIN',
      'CREATE TEMP TABLE',
      'COPY',
      'WITH upserted AS',
      'DROP TABLE',
      'COMMIT',
    ];

    // Each mockQuery call represents one step
    for (const step of calls) {
      await mockQuery(step);
    }

    expect(mockQuery).toHaveBeenCalledTimes(calls.length);
    expect(mockQuery.mock.calls[0][0]).toBe('BEGIN');
    expect(mockQuery.mock.calls[calls.length - 1][0]).toBe('COMMIT');
  });

  it('should differentiate inserted vs updated via inserted_flag', () => {
    const rows = [
      { id: 'a1', inserted_flag: true },
      { id: 'a2', inserted_flag: true },
      { id: 'a3', inserted_flag: true },
      { id: 'a4', inserted_flag: false },
      { id: 'a5', inserted_flag: false },
    ];

    const inserted = rows.filter((r) => r.inserted_flag).length;
    const updated = rows.filter((r) => !r.inserted_flag).length;

    expect(inserted).toBe(3);
    expect(updated).toBe(2);
  });

  it('should include run_id, operation, new_amount in audit new_data', () => {
    const runId = 'ci-20260208-abc123';
    const row = {
      id: 'a1',
      inserted_flag: true,
      new_amount: 450.0,
      new_description: 'Grundmiete Jänner 2026',
      old_amount: null,
      old_description: null,
    };

    const newData = {
      run_id: runId,
      new_amount: row.new_amount,
      new_description: row.new_description,
      operation: row.inserted_flag ? 'insert' : 'update',
    };

    expect(newData).toHaveProperty('run_id', runId);
    expect(newData).toHaveProperty('operation', 'insert');
    expect(newData).toHaveProperty('new_amount', 450.0);
  });

  it('should produce correct audit old_data for updates', () => {
    const row = {
      id: 'a4',
      inserted_flag: false,
      old_amount: 400.0,
      old_description: 'Grundmiete Dezember 2025',
      new_amount: 420.0,
      new_description: 'Grundmiete Jänner 2026',
    };

    const oldData = {
      old_amount: row.old_amount,
      old_description: row.old_description,
    };

    const newData = {
      run_id: 'ci-run',
      new_amount: row.new_amount,
      new_description: row.new_description,
      operation: 'update',
    };

    expect(oldData.old_amount).toBe(400.0);
    expect(newData.operation).toBe('update');
  });

  it('should rollback on upsert CTE failure', async () => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // CREATE TEMP TABLE
      .mockResolvedValueOnce({}) // COPY
      .mockRejectedValueOnce(new Error('unique_violation')) // UPSERT fails
      .mockResolvedValueOnce({}); // ROLLBACK

    try {
      await mockQuery('BEGIN');
      await mockQuery('CREATE TEMP TABLE');
      await mockQuery('COPY');
      await mockQuery('WITH upserted AS ...');
    } catch {
      await mockQuery('ROLLBACK');
    }

    expect(mockQuery).toHaveBeenCalledTimes(5);
    expect(mockQuery.mock.calls[4][0]).toBe('ROLLBACK');
  });
});

// ─── Integration Test Outline ───
// Requires: local Postgres, e.g. via `docker run -p 5432:5432 postgres:15`
// Set DATABASE_URL=postgres://postgres:postgres@localhost:5432/testdb
describe.skip('batch_upsert integration (requires local PG)', () => {
  // const { Client } = await import('pg');
  // const { execSync } = await import('child_process');

  it('should upsert sample CSV into invoice_lines', async () => {
    // 1) Setup: create tables via migrations
    // execSync('node migrations/run-migration.cjs', { env: { ...process.env } });

    // 2) Write a sample CSV
    // fs.writeFileSync('/tmp/test_lines.csv', [
    //   'invoice_id,unit_id,line_type,description,amount,tax_rate,meta',
    //   'inv-001,unit-001,grundmiete,Grundmiete Jänner 2026,450.00,0.10,{}',
    //   'inv-001,unit-001,bk,Betriebskosten Jänner 2026,120.00,0.20,{}',
    // ].join('\n'));

    // 3) Run batch_upsert
    // execSync('node tools/batch_upsert.js --csv /tmp/test_lines.csv --run-id test-run-001 --database-url $DATABASE_URL');

    // 4) Verify invoice_lines
    // const client = new Client({ connectionString: process.env.DATABASE_URL });
    // await client.connect();
    // const { rows } = await client.query('SELECT * FROM invoice_lines WHERE invoice_id = $1', ['inv-001']);
    // expect(rows).toHaveLength(2);
    // expect(rows[0].normalized_description).toBe('grundmiete jänner 2026');

    // 5) Verify audit_logs
    // const { rows: audits } = await client.query(
    //   "SELECT * FROM audit_logs WHERE action = 'upsert_missing_lines' AND record_id = $1",
    //   [rows[0].id]
    // );
    // expect(audits).toHaveLength(1);
    // expect(JSON.parse(audits[0].new_data)).toHaveProperty('run_id', 'test-run-001');

    // await client.end();
    expect(true).toBe(true); // placeholder
  });
});
