import { createHash } from 'crypto';

/**
 * Deterministic JSON canonicalization for audit hash chains.
 * - Sorts object keys alphabetically
 * - Normalizes Unicode strings to NFC
 * - Handles null, number, boolean, string, array, object
 */
function canonicalize(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'string') return JSON.stringify(value.normalize('NFC'));
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  // object — sort keys for deterministic output
  const keys = Object.keys(value).sort();
  const parts = keys.map(k => JSON.stringify(k) + ':' + canonicalize(value[k]));
  return '{' + parts.join(',') + '}';
}

/**
 * Compute SHA-256 hex hash of a canonicalized value.
 * Used for audit_events.payload_hash and hash chain verification.
 */
export function hashCanonical(value: any): string {
  const canon = canonicalize(value);
  return createHash('sha256').update(canon, 'utf8').digest('hex');
}

export { canonicalize };
