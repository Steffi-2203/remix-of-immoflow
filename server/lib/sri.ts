/**
 * server/lib/sri.ts
 *
 * Subresource Integrity (SRI) helper.
 * Reads the Vite build manifest and computes SHA-384 hashes for JS/CSS bundles.
 * Results are cached in memory at startup.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from './logger';

const sriLog = logger.child({ service: 'sri' });

export interface SriEntry {
  integrity: string;
  crossorigin: string;
}

let sriCache: Record<string, SriEntry> | null = null;

/**
 * Compute SHA-384 integrity hash for a file buffer.
 */
function computeIntegrity(buffer: Buffer): string {
  const hash = crypto.createHash('sha384').update(buffer).digest('base64');
  return `sha384-${hash}`;
}

/**
 * Build the SRI map from the Vite manifest.
 * Reads `dist/public/.vite/manifest.json` and hashes each referenced asset file.
 * Returns an empty map if the manifest doesn't exist (e.g. dev mode).
 */
function buildSriMap(distPath: string): Record<string, SriEntry> {
  const manifestPath = path.join(distPath, '.vite', 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    sriLog.info('No Vite manifest found — SRI map is empty (dev mode?)');
    return {};
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Record<
      string,
      { file: string; css?: string[] }
    >;

    const result: Record<string, SriEntry> = {};

    for (const [, entry] of Object.entries(manifest)) {
      const files = [entry.file, ...(entry.css || [])];

      for (const file of files) {
        if (result[file]) continue;

        const filePath = path.join(distPath, file);
        if (!fs.existsSync(filePath)) continue;

        const buffer = fs.readFileSync(filePath);
        result[file] = {
          integrity: computeIntegrity(buffer),
          crossorigin: 'anonymous',
        };
      }
    }

    sriLog.info({ count: Object.keys(result).length }, 'SRI map built');
    return result;
  } catch (err) {
    sriLog.error({ err }, 'Failed to build SRI map');
    return {};
  }
}

/**
 * Get the SRI map (cached after first call).
 * Pass the dist/public path. Safe to call in dev — returns empty map.
 */
export function getSriMap(distPath?: string): Record<string, SriEntry> {
  if (sriCache) return sriCache;

  const resolved = distPath || path.resolve(__dirname, '..', '..', 'dist', 'public');
  sriCache = buildSriMap(resolved);
  return sriCache;
}
