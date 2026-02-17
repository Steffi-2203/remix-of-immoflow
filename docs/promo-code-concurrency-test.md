# Promo Code: Atomic Redemption & Concurrency Test Plan

## Atomic SQL for USE_PROMO Operation

The redemption uses a single atomic UPDATE with WHERE guards. No SELECT-then-UPDATE
race condition is possible because the increment and the guard check happen in one
statement under PostgreSQL's row-level locking:

```sql
-- Atomic USE_PROMO: increments used_count only if max_uses is not exceeded.
-- Returns the updated row if successful, empty result set if rejected.
UPDATE promo_codes
SET current_uses = current_uses + 1
WHERE code = $1
  AND is_active = true
  AND (valid_until IS NULL OR valid_until > NOW())
  AND (max_uses IS NULL OR current_uses < max_uses)
RETURNING id, code, current_uses, max_uses, is_active;
```

**Why this is safe:** PostgreSQL acquires a row-level exclusive lock on the
matching row during UPDATE. Concurrent UPDATEs on the same row serialize
automatically. The WHERE clause `current_uses < max_uses` is evaluated under
the lock, so two concurrent requests cannot both see `current_uses = 9` when
`max_uses = 10` — the second request will see the already-incremented value
of 10 and the WHERE clause will fail, returning zero rows.

## Concurrency Test Plan: 100 Simultaneous Redemptions

### Setup

```sql
-- Create a promo code with max_uses = 50
INSERT INTO promo_codes (code, max_uses, is_active, current_uses)
VALUES ('CONCURRENT-TEST', 50, true, 0);
```

### Test Script (Node.js)

```typescript
// tests/concurrency/promo-redeem.ts
import { pool } from '../../server/db';

const CODE = 'CONCURRENT-TEST';
const CONCURRENT_REQUESTS = 100;

async function redeemOnce(): Promise<boolean> {
  const result = await pool.query(
    `UPDATE promo_codes
     SET current_uses = current_uses + 1
     WHERE code = $1
       AND is_active = true
       AND (max_uses IS NULL OR current_uses < max_uses)
     RETURNING current_uses`,
    [CODE]
  );
  return result.rows.length > 0;
}

async function main() {
  // Reset
  await pool.query(
    "UPDATE promo_codes SET current_uses = 0 WHERE code = $1",
    [CODE]
  );

  // Fire 100 concurrent redemptions
  const promises = Array.from({ length: CONCURRENT_REQUESTS }, () => redeemOnce());
  const results = await Promise.all(promises);

  const successes = results.filter(Boolean).length;
  const failures = results.filter((r) => !r).length;

  // Verify final state
  const { rows } = await pool.query(
    "SELECT current_uses, max_uses FROM promo_codes WHERE code = $1",
    [CODE]
  );

  const finalUses = rows[0].current_uses;
  const maxUses = rows[0].max_uses;

  console.log(`Results: ${successes} succeeded, ${failures} rejected`);
  console.log(`Final current_uses: ${finalUses}, max_uses: ${maxUses}`);

  // Assertions
  const passed =
    successes === 50 &&
    failures === 50 &&
    finalUses === 50 &&
    finalUses <= maxUses;

  console.log(passed ? 'PASS: No overuse detected' : 'FAIL: Overuse or incorrect count');

  // Cleanup
  await pool.query("DELETE FROM promo_codes WHERE code = $1", [CODE]);

  process.exit(passed ? 0 : 1);
}

main().catch(console.error);
```

### Expected Results

| Metric | Expected Value |
|--------|---------------|
| Successful redemptions | Exactly 50 |
| Rejected redemptions | Exactly 50 |
| Final `current_uses` | 50 |
| `current_uses > max_uses` | Never (invariant) |

### Verification Command

```bash
npx tsx tests/concurrency/promo-redeem.ts
# Expected output:
# Results: 50 succeeded, 50 rejected
# Final current_uses: 50, max_uses: 50
# PASS: No overuse detected
```

### Why No Advisory Locks or Serializable Isolation Needed

PostgreSQL's default `READ COMMITTED` isolation is sufficient here because:
1. The UPDATE acquires a row-level exclusive lock
2. The WHERE clause is re-evaluated after acquiring the lock
3. Only one transaction can increment at a time for the same row
4. This is the standard pattern for inventory/counter decrements in PostgreSQL
