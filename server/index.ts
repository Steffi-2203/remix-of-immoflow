import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import onFinished from "on-finished";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { registerDsgvoRoutes } from "./routes/dsgvoRoutes";
import { registerSecurityRoutes, trackSession } from "./routes/securityRoutes";
import { registerTicketRoutes } from "./routes/ticketRoutes";
import { registerEsgRoutes } from "./routes/esgRoutes";
import { registerDamageRoutes } from "./routes/damageRoutes";
import { registerTenantPortalRoutes } from "./routes/tenantPortalRoutes";
import { registerTenantAuthRoutes } from "./routes/tenantAuthRoutes";
import { registerOwnerPortalRoutes } from "./routes/ownerPortalRoutes";
import { registerOwnerAuthRoutes } from "./routes/ownerAuthRoutes";
import { setupVite, serveStatic, log, logInfo, logError } from "./vite";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import { setupAuth } from "./auth";
import { pool } from "./db";
import { seedDistributionKeys } from "./seedDistributionKeys";
import SESSION_SECRET from "./config/session";
import { csrfTokenMiddleware, csrfProtection, getCsrfToken } from "./middleware/csrf";
import { inputSanitizer } from "./middleware/sanitize";
import { logger, createRequestLogger } from "./lib/logger";
import { apiErrorHandler } from "./lib/apiErrors";
import { ensureIndexes } from "./lib/ensureIndexes";
import { setupRLS } from "./lib/rlsPolicies";
import { setupFullTextSearch } from "./lib/fullTextSearch";
import { rlsMiddleware } from "./middleware/rlsMiddleware";
import promClient from "prom-client";

promClient.collectDefaultMetrics();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

const PgSession = connectPgSimple(session);

app.set("trust proxy", 1);

app.use(createRequestLogger());

// Security: Helmet for HTTP headers with CSP (nonce-based in production)
import crypto from "crypto";

app.use((req: any, _res, next) => {
  req.cspNonce = crypto.randomBytes(16).toString("base64");
  next();
});

app.use((req: any, res, next) => {
  const nonce = req.cspNonce;
  helmet({
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", `'nonce-${nonce}'`],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https://api.stripe.com", "https://*.replit.dev", "https://*.replit.app"],
        frameSrc: ["'self'", "https://js.stripe.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'", "https://*.replit.dev", "https://*.replit.app"],
        upgradeInsecureRequests: [],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })(req, res, next);
});

app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)");
  next();
});

// Security: Rate limiting - general API (100 req / 15 min per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.path.startsWith('/api'),
});
app.use(apiLimiter);

// Security: Strict rate limiting for auth routes (20 req / min per IP)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Zu viele Anmeldeversuche. Bitte warten Sie eine Minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// Security: CORS with whitelist
const allowedOrigins = [
  process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : '',
  process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : '',
  process.env.REPLIT_DEPLOYMENT_ID ? `https://${process.env.REPL_SLUG}.replit.app` : '',
  'https://immoflowme.com',
  'https://www.immoflowme.com',
  'https://app.immoflowme.com',
  'https://immoflow.me',
  'https://www.immoflow.me',
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(cookieParser());

app.use(csrfTokenMiddleware);

app.use(session({
  name: isProduction ? '__Secure-immo_sid' : 'immo_sid',
  store: new PgSession({
    pool: pool as any,
    tableName: 'user_sessions',
    createTableIfMissing: false,
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  },
}));

// Stricter rate limit for Stripe webhooks
const webhookLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 5,
  message: { error: 'Too many webhook requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post(
  '/api/stripe/webhook',
  webhookLimiter,
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

app.get("/ready", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ ready: true });
  } catch {
    res.status(503).json({ ready: false, error: "db" });
  }
});

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

app.use(inputSanitizer);

app.get("/api/csrf-token", getCsrfToken);
app.use(csrfProtection);

// Sanitize sensitive data from logs
function sanitize(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;

  const clone = structuredClone(obj) as Record<string, unknown>;
  const sensitiveKeys = ["password", "token", "access_token", "refresh_token", "session", "secret", "apiKey", "api_key", "authorization"];

  for (const key of sensitiveKeys) {
    if (clone[key]) clone[key] = "***REDACTED***";
  }

  return clone;
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const isDev = !isProduction;
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  onFinished(res, () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const meta: Record<string, unknown> = {
        method: req.method,
        path,
        statusCode: res.statusCode,
        duration,
        requestId: req.requestId,
        ip: req.ip,
      };

      if (isDev && req.body && Object.keys(req.body).length > 0) {
        meta.body = sanitize(req.body);
      }

      const logLine = `${req.method} ${path} ${res.statusCode} ${duration}ms`;

      if (res.statusCode >= 500) {
        logger.error(logLine, meta);
      } else if (res.statusCode >= 400) {
        logger.warn(logLine, meta);
      } else {
        logger.info(logLine, meta);
      }
    }
  });

  next();
});

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('Skipping Stripe init: DATABASE_URL not set');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    let migrationSuccess = false;
    try {
      await runMigrations({ databaseUrl });
      console.log('Stripe schema ready');
      migrationSuccess = true;
    } catch (migrationError: any) {
      console.warn('Stripe migration skipped (schema may already exist or require manual setup)');
    }

    if (migrationSuccess) {
      const stripeSync = await getStripeSync();

      const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      if (webhookBaseUrl && webhookBaseUrl !== 'https://undefined') {
        console.log('Setting up Stripe webhook...');
        const { webhook } = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`
        );
        console.log(`Stripe webhook configured: ${webhook.url}`);
      }

      stripeSync.syncBackfill()
        .then(() => console.log('Stripe data synced'))
        .catch((err: any) => console.error('Stripe sync error:', err.message));
    } else {
      console.log('Stripe sync skipped - using existing integration');
    }
  } catch (error: any) {
    console.error('Stripe init error:', error.message);
  }
}

(async () => {
  await initStripe();
  await seedDistributionKeys();
  await ensureIndexes();
  await setupRLS();
  await setupFullTextSearch();
  setupAuth(app);
  app.use(trackSession);
  app.use(rlsMiddleware);
  registerDsgvoRoutes(app);
  registerSecurityRoutes(app);
  registerTicketRoutes(app);
  registerEsgRoutes(app);
  registerDamageRoutes(app);
  registerTenantAuthRoutes(app);
  registerTenantPortalRoutes(app);
  registerOwnerAuthRoutes(app);
  registerOwnerPortalRoutes(app);
  const server = await registerRoutes(app);

  app.use(apiErrorHandler);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    logger.info(`ImmoflowMe server started`, { port, env: app.get("env"), pid: process.pid });
    log(`serving on port ${port}`);
  });
})();
