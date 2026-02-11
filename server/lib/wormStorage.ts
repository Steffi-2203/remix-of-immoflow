/**
 * WORM (Write Once Read Many) Storage Support
 * 
 * Implements S3 Object Lock for GoBD/BAO-compliant immutable archival:
 * - GOVERNANCE mode: Only users with s3:BypassGovernanceRetention can delete
 * - COMPLIANCE mode: Nobody can delete until retention expires (recommended for tax docs)
 * 
 * TLS is enforced via AWS SDK defaults (HTTPS only).
 */

import { billingLogger } from "./logger";
import { logBackupEvent } from "./backupAudit";

const logger = billingLogger.child({ module: "worm-storage" });

type WormMode = "GOVERNANCE" | "COMPLIANCE";

interface WormUploadOptions {
  bucket: string;
  key: string;
  body: Buffer | ReadableStream | string;
  retentionYears: number;
  mode?: WormMode;
  actor: string;
  runId?: string;
  serverSideEncryption?: "aws:kms" | "AES256";
  kmsKeyId?: string;
  checksumSHA256?: string;
}

interface WormUploadResult {
  bucket: string;
  key: string;
  versionId?: string;
  retentionUntil: string;
  mode: WormMode;
  encryption: string;
}

/**
 * Upload a file to S3 with Object Lock (WORM) retention.
 * 
 * Prerequisites:
 * - Bucket must have Object Lock enabled at creation time
 * - Bucket must have versioning enabled
 * - IAM role needs s3:PutObject, s3:PutObjectRetention permissions
 */
export async function uploadWithWormLock(options: WormUploadOptions): Promise<WormUploadResult> {
  const {
    bucket,
    key,
    body,
    retentionYears,
    mode = "COMPLIANCE",
    actor,
    runId,
    serverSideEncryption = "aws:kms",
    kmsKeyId,
    checksumSHA256,
  } = options;

  const retainUntil = new Date();
  retainUntil.setFullYear(retainUntil.getFullYear() + retentionYears);

  try {
    const { S3Client, PutObjectCommand, PutObjectRetentionCommand } = await import("@aws-sdk/client-s3");
    
    const region = process.env.AWS_REGION || "eu-central-1";
    const s3 = new S3Client({ region });

    // Step 1: Upload with server-side encryption
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body as any,
      ServerSideEncryption: serverSideEncryption,
      ...(kmsKeyId ? { SSEKMSKeyId: kmsKeyId } : {}),
      ...(checksumSHA256 ? { ChecksumSHA256: checksumSHA256 } : {}),
      ContentType: "application/zip",
      Metadata: {
        "retention-standard": retentionYears <= 7 ? "bao" : "gobd",
        "retention-until": retainUntil.toISOString(),
        "worm-mode": mode,
        "actor": actor,
        ...(runId ? { "run-id": runId } : {}),
      },
    });

    const putResult = await s3.send(putCommand);
    const versionId = putResult.VersionId;

    // Step 2: Set Object Lock retention
    const retentionCommand = new PutObjectRetentionCommand({
      Bucket: bucket,
      Key: key,
      ...(versionId ? { VersionId: versionId } : {}),
      Retention: {
        Mode: mode,
        RetainUntilDate: retainUntil,
      },
    });

    await s3.send(retentionCommand);

    const result: WormUploadResult = {
      bucket,
      key,
      versionId,
      retentionUntil: retainUntil.toISOString(),
      mode,
      encryption: serverSideEncryption,
    };

    // Step 3: Audit the WORM lock
    await logBackupEvent({
      eventType: "archive_worm_locked",
      actor,
      entityType: "archive_package",
      entityId: runId || key,
      details: {
        bucket,
        key,
        versionId,
        retentionUntil: retainUntil.toISOString(),
        mode,
        encryption: serverSideEncryption,
        retentionYears,
        standard: retentionYears <= 7 ? "bao" : "gobd",
      },
    });

    logger.info({ key, mode, retentionUntil: retainUntil.toISOString() }, "WORM lock applied");

    return result;
  } catch (error) {
    logger.error({ error, key, bucket }, "WORM upload failed");

    await logBackupEvent({
      eventType: "backup_failed",
      actor,
      entityType: "archive_package",
      entityId: runId || key,
      details: {
        bucket,
        key,
        error: error instanceof Error ? error.message : String(error),
        operation: "worm_upload",
      },
    });

    throw error;
  }
}

/**
 * Verify WORM retention status of an object.
 */
export async function verifyWormLock(bucket: string, key: string, actor: string): Promise<{
  locked: boolean;
  mode?: WormMode;
  retainUntilDate?: string;
  versionId?: string;
}> {
  try {
    const { S3Client, GetObjectRetentionCommand } = await import("@aws-sdk/client-s3");
    
    const region = process.env.AWS_REGION || "eu-central-1";
    const s3 = new S3Client({ region });

    const result = await s3.send(new GetObjectRetentionCommand({
      Bucket: bucket,
      Key: key,
    }));

    const locked = !!result.Retention?.Mode;
    const retainUntilDate = result.Retention?.RetainUntilDate?.toISOString();

    await logBackupEvent({
      eventType: "archive_worm_verified",
      actor,
      entityType: "archive_package",
      entityId: key,
      details: {
        bucket,
        key,
        locked,
        mode: result.Retention?.Mode,
        retainUntilDate,
      },
    });

    return {
      locked,
      mode: result.Retention?.Mode as WormMode | undefined,
      retainUntilDate,
    };
  } catch (error) {
    logger.warn({ error, bucket, key }, "WORM verification failed");
    return { locked: false };
  }
}

/**
 * Configuration template for creating an S3 bucket with Object Lock.
 * This is documentation — bucket creation must be done via AWS CLI/Console.
 */
export const WORM_BUCKET_SETUP_INSTRUCTIONS = `
# S3 Bucket mit Object Lock erstellen (einmalig via AWS CLI):

aws s3api create-bucket \\
  --bucket immoflow-gobd-archive \\
  --region eu-central-1 \\
  --create-bucket-configuration LocationConstraint=eu-central-1 \\
  --object-lock-enabled-for-bucket

# Default Retention setzen (optional):
aws s3api put-object-lock-configuration \\
  --bucket immoflow-gobd-archive \\
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "COMPLIANCE",
        "Years": 10
      }
    }
  }'

# Bucket Policy: TLS-Only erzwingen:
aws s3api put-bucket-policy \\
  --bucket immoflow-gobd-archive \\
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "DenyUnencryptedTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::immoflow-gobd-archive",
        "arn:aws:s3:::immoflow-gobd-archive/*"
      ],
      "Condition": {
        "Bool": { "aws:SecureTransport": "false" }
      }
    }]
  }'
`;
