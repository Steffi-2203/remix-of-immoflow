// tools/export_audit_package.js
// Usage: node tools/export_audit_package.js --run-id <RUN_ID> --out <outdir> --storage s3|lovable|local
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('run-id', { type: 'string', demandOption: true })
  .option('out', { type: 'string', default: 'audit_exports' })
  .option('storage', { type: 'string', choices: ['s3','lovable','local'], default: 's3' })
  .option('s3-bucket', { type: 'string' })
  .argv;

const RUN_ID = argv['run-id'];
const OUT_DIR = path.resolve(argv.out, RUN_ID);
fs.mkdirSync(OUT_DIR, { recursive: true });

async function createZipAndSha(filesDir, zipPath) {
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(output);
  archive.directory(filesDir, false);
  await archive.finalize();
  // compute sha256
  const buf = fs.readFileSync(zipPath);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  fs.writeFileSync(path.join(filesDir, 'package.sha256'), sha);
  return { zipPath, sha };
}

async function uploadToS3(zipPath, bucket, keyPrefix) {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const region = process.env.AWS_REGION || 'eu-central-1';
  const s3 = new S3Client({ region });
  const key = `${keyPrefix}/${path.basename(zipPath)}`;
  const body = fs.createReadStream(zipPath);
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ServerSideEncryption: 'aws:kms',
    // Optionally: SSEKMSKeyId: process.env.KMS_KEY_ID
  }));
  return { bucket, key };
}

async function uploadToLovable(zipPath, apiUrl, token, runId) {
  // Lovable: simple HTTP POST multipart/form-data (adjust to actual API)
  const fetch = globalThis.fetch || (await import('node-fetch')).default;
  const form = new FormData();
  form.append('file', fs.createReadStream(zipPath));
  form.append('runId', runId);
  const res = await fetch(`${apiUrl.replace(/\/$/,'')}/api/v1/audit-uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  if (!res.ok) throw new Error(`Lovable upload failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

async function main() {
  // collect expected files from S3 path or local reconciliations dir
  const keys = [
    `${RUN_ID}/summary.json`,
    `${RUN_ID}/missing_lines.csv`,
    `${RUN_ID}/checksums.sha256`
  ];
  // Try to copy from local reconciliations/<RUN_ID> if exists
  const localRunDir = path.resolve('reconciliations', RUN_ID);
  for (const k of keys) {
    const src = path.join(localRunDir, path.basename(k));
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(OUT_DIR, path.basename(k)));
    }
  }

  // create zip + sha
  const zipPath = path.join(OUT_DIR, `${RUN_ID}_audit_package.zip`);
  const { sha } = await createZipAndSha(OUT_DIR, zipPath);
  console.log('Created package', zipPath, 'sha256', sha);

  if (argv.storage === 's3') {
    const bucket = argv['s3-bucket'] || process.env.S3_BUCKET;
    if (!bucket) throw new Error('S3 bucket not provided (arg --s3-bucket or env S3_BUCKET)');
    const keyPrefix = RUN_ID;
    const res = await uploadToS3(zipPath, bucket, keyPrefix);
    console.log('Uploaded to S3:', res);
  } else if (argv.storage === 'lovable') {
    const apiUrl = process.env.LOVABLE_API_URL;
    const token = process.env.LOVABLE_API_TOKEN;
    if (!apiUrl || !token) throw new Error('LOVABLE_API_URL and LOVABLE_API_TOKEN must be set for lovable storage');
    const res = await uploadToLovable(zipPath, apiUrl, token, RUN_ID);
    console.log('Uploaded to Lovable:', res);
  } else {
    console.log('Storage=local, package left at', zipPath);
  }
}

main().catch(err => {
  console.error('Export failed', err);
  process.exit(1);
});
