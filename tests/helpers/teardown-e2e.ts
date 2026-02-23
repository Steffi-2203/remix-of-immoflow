import { teardownTestDb } from './db';

async function main() {
  try {
    await teardownTestDb();
    console.log('E2E teardown complete.');
    process.exit(0);
  } catch (err) {
    console.error('E2E teardown failed:', err);
    process.exit(1);
  }
}

main();
