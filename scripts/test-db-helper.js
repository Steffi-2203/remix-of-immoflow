#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set');
  process.exit(1);
}

function runSQL(sql) {
  execSync(`psql "${DATABASE_URL}" -c "${sql}"`, { stdio: 'inherit' });
}

function restoreSnapshot(snapshotPath) {
  const resolved = path.resolve(snapshotPath);
  console.log(`Restoring snapshot from: ${resolved}`);
  execSync(`psql "${DATABASE_URL}" < "${resolved}"`, { stdio: 'inherit' });
  console.log('Snapshot restored.');
}

function seedFixtures(fixturesDir) {
  const resolved = path.resolve(fixturesDir || 'tests/fixtures');
  console.log(`Seeding from: ${resolved}`);
  execSync(`npx tsx ${path.join(__dirname, '..', 'tests', 'helpers', 'seed-e2e.ts')}`, {
    stdio: 'inherit',
    env: { ...process.env },
  });
  console.log('Seed complete.');
}

function teardown() {
  console.log('Tearing down E2E test data...');
  execSync(`npx tsx ${path.join(__dirname, '..', 'tests', 'helpers', 'teardown-e2e.ts')}`, {
    stdio: 'inherit',
    env: { ...process.env },
  });
  console.log('Teardown complete.');
}

function printUsage() {
  console.log(`
Usage:
  node scripts/test-db-helper.js --restore <snapshot.sql> [--seed <fixtures-dir>]
  node scripts/test-db-helper.js --seed [<fixtures-dir>]
  node scripts/test-db-helper.js --teardown

Options:
  --restore <path>   Restore a DB snapshot (SQL file)
  --seed [dir]       Seed E2E test data (default: tests/fixtures)
  --teardown         Remove E2E test data

Examples:
  node scripts/test-db-helper.js --restore snapshots/staging.sql --seed fixtures/e2e
  node scripts/test-db-helper.js --seed
  node scripts/test-db-helper.js --teardown
`);
}

if (args.length === 0) {
  printUsage();
  process.exit(0);
}

let i = 0;
while (i < args.length) {
  switch (args[i]) {
    case '--restore': {
      const snapshotPath = args[++i];
      if (!snapshotPath) {
        console.error('ERROR: --restore requires a file path');
        process.exit(1);
      }
      restoreSnapshot(snapshotPath);
      break;
    }
    case '--seed': {
      const nextArg = args[i + 1];
      const dir = nextArg && !nextArg.startsWith('--') ? args[++i] : undefined;
      seedFixtures(dir);
      break;
    }
    case '--teardown':
      teardown();
      break;
    case '--help':
      printUsage();
      break;
    default:
      console.error(`Unknown option: ${args[i]}`);
      printUsage();
      process.exit(1);
  }
  i++;
}
