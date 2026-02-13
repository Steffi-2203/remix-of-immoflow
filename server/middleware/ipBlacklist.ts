import type { Request, Response, NextFunction } from "express";

// ---------- Static blacklist (from ENV) ----------
const staticBlacklist: string[] = (process.env.IP_BLACKLIST || "")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

// ---------- Dynamic brute-force tracking ----------
interface AttemptRecord {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const attempts = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of attempts) {
    if (record.blockedUntil && record.blockedUntil < now) {
      attempts.delete(ip);
    } else if (now - record.firstAttempt > WINDOW_MS && !record.blockedUntil) {
      attempts.delete(ip);
    }
  }
}, 10 * 60 * 1000);

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}

function isStaticBlocked(ip: string): boolean {
  return staticBlacklist.some((entry) => {
    if (entry.includes("/")) {
      // Simple CIDR check for /24 and /32
      const [network, bits] = entry.split("/");
      const maskBits = parseInt(bits, 10);
      if (maskBits === 32) return ip === network;
      if (maskBits === 24) {
        const ipParts = ip.split(".");
        const netParts = network.split(".");
        return ipParts[0] === netParts[0] && ipParts[1] === netParts[1] && ipParts[2] === netParts[2];
      }
      return ip === network;
    }
    return ip === entry;
  });
}

function isDynamicBlocked(ip: string): { blocked: boolean; retryAfterSeconds?: number } {
  const record = attempts.get(ip);
  if (!record) return { blocked: false };

  const now = Date.now();
  if (record.blockedUntil) {
    if (record.blockedUntil > now) {
      return { blocked: true, retryAfterSeconds: Math.ceil((record.blockedUntil - now) / 1000) };
    }
    // Block expired
    attempts.delete(ip);
    return { blocked: false };
  }
  return { blocked: false };
}

// ---------- Public API ----------

/** Record a failed auth attempt. Returns true if the IP is now blocked. */
export function recordFailedAttempt(ip: string): boolean {
  const now = Date.now();
  let record = attempts.get(ip);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    record = { count: 1, firstAttempt: now };
    attempts.set(ip, record);
    return false;
  }

  record.count++;

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    console.warn(`[WAF] IP ${ip} blocked for ${BLOCK_DURATION_MS / 60000} min after ${record.count} failed attempts`);
    return true;
  }

  return false;
}

/** Clear failed attempts after successful login */
export function clearFailedAttempts(ip: string): void {
  attempts.delete(ip);
}

/** Express middleware */
export function ipBlacklistMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);

  // Static blocklist
  if (isStaticBlocked(ip)) {
    console.warn(`[WAF] Blocked request from statically blacklisted IP: ${ip}`);
    return res.status(403).json({ error: "Forbidden" });
  }

  // Dynamic brute-force block
  const dynamicCheck = isDynamicBlocked(ip);
  if (dynamicCheck.blocked) {
    res.setHeader("Retry-After", String(dynamicCheck.retryAfterSeconds || 1800));
    return res.status(403).json({
      error: "Zu viele fehlgeschlagene Anmeldeversuche. Bitte versuchen Sie es später erneut.",
      retryAfterSeconds: dynamicCheck.retryAfterSeconds,
    });
  }

  next();
}
