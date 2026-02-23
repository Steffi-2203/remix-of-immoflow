import { seedTestData } from './db';

async function main() {
  try {
    const ids = await seedTestData();
    console.log('E2E seed complete:', JSON.stringify(ids, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('E2E seed failed:', err);
    process.exit(1);
  }
}

main();
