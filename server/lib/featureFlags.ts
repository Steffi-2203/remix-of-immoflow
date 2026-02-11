/**
 * server/lib/featureFlags.ts
 *
 * Lightweight feature flag service that decouples deploy from release.
 * Supports: DB-backed flags, environment overrides, percentage rollouts, user targeting.
 *
 * Compatible with external providers (Unleash, LaunchDarkly) via the adapter pattern.
 * When no external provider is configured, flags are stored in the database.
 */

import { logger } from './logger';

// ─── Types ───

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  /** 0-100: percentage of users who see the feature */
  rollout_percentage: number;
  /** Specific user IDs that always see the feature */
  allowed_users: string[];
  /** Specific org IDs that always see the feature */
  allowed_orgs: string[];
  /** Optional metadata */
  description?: string;
  /** When the flag was last updated */
  updated_at?: string;
}

export interface FlagContext {
  userId?: string;
  orgId?: string;
  /** Additional attributes for targeting */
  attributes?: Record<string, string>;
}

export interface FeatureFlagProvider {
  isEnabled(key: string, context?: FlagContext): Promise<boolean>;
  getAllFlags(): Promise<FeatureFlag[]>;
  setFlag(flag: Partial<FeatureFlag> & { key: string }): Promise<void>;
}

// ─── In-Memory / DB Provider ───

const flagStore = new Map<string, FeatureFlag>();
const flagLog = logger.child({ service: 'feature-flags' });

/**
 * Deterministic hash for percentage rollout.
 * Uses a simple FNV-1a hash of `key:userId` to distribute users.
 */
function hashPercentage(key: string, userId: string): number {
  const input = `${key}:${userId}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash % 100;
}

class LocalFeatureFlagProvider implements FeatureFlagProvider {
  async isEnabled(key: string, context?: FlagContext): Promise<boolean> {
    // Environment override: FF_<KEY>=true|false
    const envKey = `FF_${key.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    const envVal = process.env[envKey];
    if (envVal !== undefined) {
      return envVal === 'true' || envVal === '1';
    }

    const flag = flagStore.get(key);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // User targeting
    if (context?.userId && flag.allowed_users.includes(context.userId)) {
      return true;
    }

    // Org targeting
    if (context?.orgId && flag.allowed_orgs.includes(context.orgId)) {
      return true;
    }

    // Percentage rollout
    if (flag.rollout_percentage >= 100) return true;
    if (flag.rollout_percentage <= 0) return false;

    if (context?.userId) {
      return hashPercentage(key, context.userId) < flag.rollout_percentage;
    }

    // No user context + partial rollout → default off
    return false;
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    return Array.from(flagStore.values());
  }

  async setFlag(flag: Partial<FeatureFlag> & { key: string }): Promise<void> {
    const existing = flagStore.get(flag.key);
    const merged: FeatureFlag = {
      key: flag.key,
      enabled: flag.enabled ?? existing?.enabled ?? false,
      rollout_percentage: flag.rollout_percentage ?? existing?.rollout_percentage ?? 0,
      allowed_users: flag.allowed_users ?? existing?.allowed_users ?? [],
      allowed_orgs: flag.allowed_orgs ?? existing?.allowed_orgs ?? [],
      description: flag.description ?? existing?.description,
      updated_at: new Date().toISOString(),
    };
    flagStore.set(flag.key, merged);
    flagLog.info({ flag: flag.key, enabled: merged.enabled, rollout: merged.rollout_percentage }, 'Flag updated');
  }
}

// ─── Singleton ───

let provider: FeatureFlagProvider = new LocalFeatureFlagProvider();

/**
 * Replace the default provider with an external one (Unleash, LaunchDarkly, etc.)
 */
export function setFeatureFlagProvider(p: FeatureFlagProvider): void {
  provider = p;
  flagLog.info('Feature flag provider replaced');
}

/**
 * Check if a feature is enabled for the given context.
 *
 * @example
 * if (await isFeatureEnabled('new-settlement-engine', { userId, orgId })) {
 *   // new code path
 * }
 */
export async function isFeatureEnabled(key: string, context?: FlagContext): Promise<boolean> {
  try {
    return await provider.isEnabled(key, context);
  } catch (err) {
    flagLog.error({ err, flag: key }, 'Flag evaluation failed — defaulting to false');
    return false;
  }
}

export async function getAllFlags(): Promise<FeatureFlag[]> {
  return provider.getAllFlags();
}

export async function setFlag(flag: Partial<FeatureFlag> & { key: string }): Promise<void> {
  return provider.setFlag(flag);
}

// ─── Express middleware ───

import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware that attaches `req.featureFlags` with a helper.
 *
 * @example
 * app.use(featureFlagMiddleware);
 * // In route handler:
 * if (await req.isFeatureEnabled('new-billing')) { ... }
 */
export function featureFlagMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const context: FlagContext = {
    userId: (req as any).session?.userId,
    orgId: (req as any).session?.orgId,
  };

  (req as any).isFeatureEnabled = (key: string) => isFeatureEnabled(key, context);
  next();
}

// ─── Pre-defined flags for the application ───

export const FLAGS = {
  NEW_SETTLEMENT_ENGINE: 'new-settlement-engine',
  SEPA_V2: 'sepa-v2',
  AI_DOCUMENT_PARSING: 'ai-document-parsing',
  ENHANCED_AUDIT_TRAIL: 'enhanced-audit-trail',
  BULK_INVOICE_GENERATION: 'bulk-invoice-generation',
} as const;
