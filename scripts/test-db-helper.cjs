#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set');
  process.exit(1);
}

function runSQLFile(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }
  console.log(`Executing SQL: ${resolved}`);
  execSync(`psql "${DATABASE_URL}" -f "${resolved}"`, { stdio: 'inherit' });
}

function restoreSnapshot(snapshotPath) {
  const resolved = path.resolve(snapshotPath);
  if (!fs.existsSync(resolved)) {
    console.error(`Snapshot not found: ${resolved}`);
    process.exit(1);
  }
  console.log(`Restoring snapshot from: ${resolved}`);
  execSync(`psql "${DATABASE_URL}" -f "${resolved}"`, { stdio: 'inherit' });
  console.log('Snapshot restored.');
}

function seedFixtures(fixturesDir) {
  const resolved = path.resolve(fixturesDir || 'fixtures/e2e');
  const seedSql = path.join(resolved, 'seed.sql');

  if (fs.existsSync(seedSql)) {
    console.log(`Seeding from SQL: ${seedSql}`);
    execSync(`psql "${DATABASE_URL}" -f "${seedSql}"`, { stdio: 'inherit' });
    console.log('SQL seed complete.');
  } else {
    console.log(`No seed.sql found in ${resolved}, using TypeScript seeder...`);
    execSync(`npx tsx ${path.join(__dirname, '..', 'tests', 'helpers', 'seed-e2e.ts')}`, {
      stdio: 'inherit',
      env: { ...process.env },
    });
    console.log('TypeScript seed complete.');
  }
}

function teardown(fixturesDir) {
  const resolved = path.resolve(fixturesDir || 'fixtures/e2e');
  const teardownSql = path.join(resolved, 'teardown.sql');

  if (fs.existsSync(teardownSql)) {
    console.log(`Tearing down from SQL: ${teardownSql}`);
    execSync(`psql "${DATABASE_URL}" -f "${teardownSql}"`, { stdio: 'inherit' });
    console.log('SQL teardown complete.');
  } else {
    console.log('Using TypeScript teardown...');
    execSync(`npx tsx ${path.join(__dirname, '..', 'tests', 'helpers', 'teardown-e2e.ts')}`, {
      stdio: 'inherit',
      env: { ...process.env },
    });
    console.log('TypeScript teardown complete.');
  }
}

function printUsage() {
  console.log(`
Usage:
  node scripts/test-db-helper.js --restore <snapshot.sql> [--seed <fixtures-dir>]
  node scripts/test-db-helper.js --seed [<fixtures-dir>]
  node scripts/test-db-helper.js --teardown [<fixtures-dir>]

Options:
  --restore <path>   Restore a DB snapshot (SQL file)
  --seed [dir]       Seed E2E test data (default: fixtures/e2e)
  --teardown [dir]   Remove E2E test data (default: fixtures/e2e)

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
    case '--teardown': {
      const nextArg = args[i + 1];
      const dir = nextArg && !nextArg.startsWith('--') ? args[++i] : undefined;
      teardown(dir);
      break;
    }
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
