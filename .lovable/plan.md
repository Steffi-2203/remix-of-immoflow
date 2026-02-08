

## Fix: Add missing `test` script to `package.json`

### Problem
The CI `test` job (line 81) runs `npm test`, but `package.json` has no `"test"` script, causing the immediate failure.

### Solution
Add a `"test"` script to `package.json` that runs vitest, consistent with how the `billing-parity` job already invokes tests.

### Changes

**`package.json`** -- add to the `"scripts"` block:

```json
"test": "vitest run"
```

This will run all vitest test files matching the default include pattern. The billing-parity job already runs specific test files via `npx vitest run <file>`, so this keeps the approach consistent.

### Technical Notes
- `vitest run` executes tests once (no watch mode), which is correct for CI.
- The existing `vitest.config.ts` (if present) or vite config will control test discovery. The `billing-parity` job targets specific files, but the `test` job can run the full suite.
- No new dependencies are needed -- vitest is already used in the project.

