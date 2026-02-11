import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';
import { logger } from '../lib/logger';
import { metrics } from '../lib/metrics';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redis = new Redis(redisUrl);

// load lua script and register SHA for EVALSHA
const luaPath = path.join(__dirname, '../../scripts/token_bucket.lua');
const luaScript = fs.readFileSync(luaPath, 'utf8');
let luaSha: string | null = null;
redis.script('LOAD', luaScript).then(sha => { luaSha = sha as string; }).catch(() => { luaSha = null; });

const log = logger.child({ service: 'rate-limit-per-org' });

type LimitConfig = {
  capacity: number;
  refillRate: number;
};

function resolveLimitConfig(orgId: string | undefined, routeKey: string): LimitConfig {
  const defaults: LimitConfig = { capacity: 1000, refillRate: 1000 / 60 };
  if (routeKey.includes('/api/payments')) return { capacity: 60, refillRate: 60 / 60 };
  if (orgId === 'enterprise') return { capacity: defaults.capacity * 5, refillRate: defaults.refillRate * 5 };
  return defaults;
}

export async function rateLimitPerOrg(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  try {
    const orgId = (req.header('x-org-id') || (req.body as any)?.orgId || (req.query?.orgId as string | undefined)) as string | undefined;
    const routeKey = (req.route?.path || req.path) as string;
    const key = `rate:org:${orgId || 'anon'}:${routeKey}`;
    const { capacity, refillRate } = resolveLimitConfig(orgId, routeKey);
    const now = Math.floor(Date.now() / 1000);
    const requested = 1;

    let result: any;
    if (luaSha) {
      try {
        result = await redis.evalsha(luaSha, 1, key, capacity, refillRate, now, requested);
      } catch {
        result = await redis.eval(luaScript, 1, key, capacity, refillRate, now, requested);
      }
    } else {
      result = await redis.eval(luaScript, 1, key, capacity, refillRate, now, requested);
    }

    const allowed = result[0] === 1;
    const tokensLeft = Math.floor(result[1]);

    // Metrics
    const latencyMs = Date.now() - start;
    metrics.histogram('rate_limit_latency_seconds', latencyMs / 1000);

    res.setHeader('X-RateLimit-Limit', String(Math.floor(capacity)));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, tokensLeft)));
    res.setHeader('X-RateLimit-Reset', String(now + Math.ceil(tokensLeft / Math.max(refillRate, 1e-6))));

    if (!allowed) {
      metrics.increment('rate_limit_blocked_total');
      log.warn({
        orgId: orgId || 'anon',
        route: routeKey,
        clientIp: req.ip,
        userId: (req as any).session?.userId,
        requestId: req.header('x-request-id'),
      }, 'Rate limit blocked request');

      res.setHeader('Retry-After', '60');
      return res.status(429).json({ code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded for organization' });
    }

    metrics.increment('rate_limit_allowed_total');
    return next();
  } catch (err) {
    metrics.increment('rate_limit_redis_errors_total');
    log.error({ err }, 'RateLimit middleware error — degrading gracefully');
    return next();
  }
}
