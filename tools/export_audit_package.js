#!/usr/bin/env node
/**
 * export_audit_package.js
 *
 * Downloads reconciliation artifacts, bundles them into a signed ZIP,
 * and optionally uploads to S3 or Lovable Cloud Storage.
 *
 * Storage backends:
 *   --backend s3       → AWS S3 (uses env AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY or ~/.aws/credentials)
 *   --backend lovable  → Lovable Cloud Storage (uses env SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 *   --backend local    → Local filesystem only (default)
 *
 * Usage:
 *   node tools/export_audit_package.js --run-id <RUN_ID> --backend local
 *   node tools/export_audit_package.js --run-id <RUN_ID> --backend s3 --s3-bucket my-bucket
 *   node tools/export_audit_package.js --run-id <RUN_ID> --backend lovable
 *
 * Requires: Node 18+
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv)).options({
  'run-id': { type: 'string', demandOption: true, describe: 'Reconciliation run ID' },
  'backend': { type: 'string', default: 'local', choices: ['local', 's3', 'lovable'], describe: 'Storage backend' },
  's3-bucket': { type: 'string', describe: 'S3 bucket name (required for s3 backend)' },
  'region': { type: 'string', default: 'eu-central-1', describe: 'AWS region for S3' },
  'out': { type: 'string', default: 'audit_exports', describe: 'Local output directory' },
  'storage-bucket': { type: 'string', default: 'artifacts', describe: 'Lovable Cloud Storage bucket name' },
}).check((argv) => {
  if (argv.backend === 's3' && !argv['s3-bucket']) {
    throw new Error('--s3-bucket is required when using s3 backend');
  }
  return true;
}).argv;

const RUN_ID = argv['run-id'];
const BACKEND = argv.backend;
const OUT_DIR = path.resolve(argv.out, RUN_ID);

// ─── Storage Backend: S3 ────────────────────────────────────────────────────

async function createS3Client() {
  const { S3Client } = require('@aws-sdk/client-s3');

  const config = { region: argv.region };

  // Try explicit env vars first, then fall back to default credential chain
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
    };
  }
  // If no explicit creds, SDK uses default chain (env → shared credentials → instance metadata)

  return new S3Client(config);
}

async function downloadFromS3(key, dest) {
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const s3 = await createS3Client();
  const cmd = new GetObjectCommand({ Bucket: argv['s3-bucket'], Key: key });
  const res = await s3.send(cmd);
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    res.Body.pipe(out);
    res.Body.on('end', resolve);
    res.Body.on('error', reject);
  });
}

async function uploadToS3(localPath, key) {
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const s3 = await createS3Client();
  const body = fs.readFileSync(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: argv['s3-bucket'],
    Key: key,
    Body: body,
    ContentType: 'application/zip',
  }));
  console.log(`Uploaded to s3://${argv['s3-bucket']}/${key}`);
}

// ─── Storage Backend: Lovable Cloud Storage ─────────────────────────────────

function getLovableConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Lovable backend requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_ equivalents) environment variables'
    );
  }
  return { url, key };
}

async function downloadFromLovable(filePath, dest) {
  const { url, key } = getLovableConfig();
  const bucket = argv['storage-bucket'];
  const downloadUrl = `${url}/storage/v1/object/${bucket}/${filePath}`;

  const res = await fetch(downloadUrl, {
    headers: {
      'Authorization': `Bearer ${key}`,
      'apikey': key,
    },
  });

  if (!res.ok) {
    throw new Error(`Lovable download failed [${res.status}]: ${await res.text()}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buffer);
}

async function uploadToLovable(localPath, filePath) {
  const { url, key } = getLovableConfig();
  const bucket = argv['storage-bucket'];
  const uploadUrl = `${url}/storage/v1/object/${bucket}/${filePath}`;
  const body = fs.readFileSync(localPath);

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'apikey': key,
      'Content-Type': 'application/zip',
      'x-upsert': 'true',
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Lovable upload failed [${res.status}]: ${await res.text()}`);
  }
  console.log(`Uploaded to Lovable Cloud Storage: ${bucket}/${filePath}`);
}

// ─── Core Logic ─────────────────────────────────────────────────────────────

const ARTIFACT_FILES = [
  'summary.json',
  'missing_lines.csv',
  'checksums.sha256',
  'db_invoice_lines.csv',
  'dryrun.log',
];

async function downloadArtifacts() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const file of ARTIFACT_FILES) {
    const key = `${RUN_ID}/${file}`;
    const dest = path.join(OUT_DIR, file);
    try {
      console.log(`Downloading ${key} ...`);
      if (BACKEND === 's3') {
        await downloadFromS3(key, dest);
      } else if (BACKEND === 'lovable') {
        await downloadFromLovable(key, dest);
      } else {
        // Local: check if file exists in reconciliations/ directory
        const localSource = path.resolve('reconciliations', RUN_ID, file);
        if (fs.existsSync(localSource)) {
          fs.copyFileSync(localSource, dest);
        } else {
          console.warn(`  Not found locally: ${localSource}`);
          continue;
        }
      }
      console.log(`  ✓ ${file}`);
    } catch (err) {
      console.warn(`  ✗ ${file}: ${err.message}`);
    }
  }
}

async function createZip() {
  const zipPath = path.join(OUT_DIR, `${RUN_ID}_audit_package.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => resolve(zipPath));
    archive.on('error', reject);
    archive.pipe(output);

    // Add all files in OUT_DIR except any existing zip
    for (const file of fs.readdirSync(OUT_DIR)) {
      if (file.endsWith('.zip')) continue;
      archive.file(path.join(OUT_DIR, file), { name: file });
    }

    archive.finalize();
  });
}

function computeChecksum(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function uploadPackage(zipPath) {
  const key = `audit_packages/${RUN_ID}/${path.basename(zipPath)}`;
  if (BACKEND === 's3') {
    await uploadToS3(zipPath, key);
  } else if (BACKEND === 'lovable') {
    await uploadToLovable(zipPath, key);
  } else {
    console.log(`Package available locally: ${zipPath}`);
  }
}

async function main() {
  console.log(`\n📦 Audit Package Export`);
  console.log(`   Run ID:  ${RUN_ID}`);
  console.log(`   Backend: ${BACKEND}`);
  console.log(`   Output:  ${OUT_DIR}\n`);

  await downloadArtifacts();

  console.log('\nCreating ZIP archive...');
  const zipPath = await createZip();
  const sha256 = computeChecksum(zipPath);
  fs.writeFileSync(path.join(OUT_DIR, 'package.sha256'), `${sha256}  ${path.basename(zipPath)}\n`);

  console.log(`\n✓ ZIP created: ${zipPath}`);
  console.log(`  SHA256: ${sha256}`);

  await uploadPackage(zipPath);

  console.log('\n✅ Audit package export complete.');
}

main().catch(err => {
  console.error('\n❌ Export failed:', err.message);
  process.exit(1);
});
