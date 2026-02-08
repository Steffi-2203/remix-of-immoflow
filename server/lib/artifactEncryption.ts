import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * P2-8c: AES-256-GCM encryption/decryption for billing artifacts.
 *
 * Key is read from ARTIFACT_ENCRYPTION_KEY env var (hex-encoded 32-byte key).
 * If not set, encryption is skipped and data is stored as-is (dev mode).
 */

function getKey(): Buffer | null {
  const hex = process.env.ARTIFACT_ENCRYPTION_KEY;
  if (!hex) return null;
  const buf = Buffer.from(hex, 'hex');
  if (buf.length !== 32) {
    throw new Error('ARTIFACT_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  }
  return buf;
}

export interface EncryptedPayload {
  /** base64-encoded ciphertext */
  ciphertext: string;
  /** base64-encoded IV */
  iv: string;
  /** base64-encoded auth tag */
  authTag: string;
}

/**
 * Encrypt a buffer. Returns null if no key is configured (dev passthrough).
 */
export function encryptArtifact(data: Buffer): EncryptedPayload | null {
  const key = getKey();
  if (!key) return null;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt an encrypted payload back to a Buffer.
 */
export function decryptArtifact(payload: EncryptedPayload): Buffer {
  const key = getKey();
  if (!key) throw new Error('ARTIFACT_ENCRYPTION_KEY not configured');

  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Check if encryption is enabled (key is configured).
 */
export function isEncryptionEnabled(): boolean {
  return !!process.env.ARTIFACT_ENCRYPTION_KEY;
}
