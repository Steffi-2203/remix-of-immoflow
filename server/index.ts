import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { requestLoggerMiddleware } from "./middleware/requestLogger";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log, logInfo, logError } from "./vite";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import { setupAuth } from "./auth";
import { pool } from "./db";
import { seedDistributionKeys } from "./seedDistributionKeys";
import { jobQueueService } from "./services/jobQueueService";
import { billingService } from "./billing/billing.service";
import SESSION_SECRET from "./config/session";
import { verifyCsrf, csrfTokenEndpoint } from "./middleware/csrf";

const app = express();

const PgSession = connectPgSimple(session);

app.set("trust proxy", 1);

// Security: Helmet for HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for development (Vite injects scripts)
  crossOriginEmbedderPolicy: false,
}));

// Security: Rate limiting - 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.path.startsWith('/api'), // Only limit API routes
});
app.use(apiLimiter);

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const isProduction = process.env.NODE_ENV === 'production';

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
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
  },
}));

// CSRF token endpoint (must be before verifyCsrf middleware)
app.get("/api/auth/csrf-token", csrfTokenEndpoint);

// CSRF protection for all mutating requests (POST/PUT/PATCH/DELETE)
app.use(verifyCsrf);

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

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Global input sanitization: strip HTML tags, control chars from all request bodies
import { sanitizeInput } from "./lib/sanitize";
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeInput(req.body);
  }
  next();
});

// Structured request logging (Pino-based, replaces manual onFinished block)
app.use(requestLoggerMiddleware);

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

  // Register job queue handlers
  jobQueueService.registerHandler('billing_run', async (payload) => {
    const result = await billingService.generateMonthlyInvoices({
      organizationId: payload.organizationId as string,
      userId: payload.userId as string,
      propertyIds: payload.propertyIds as string[],
      year: payload.year as number,
      month: payload.month as number,
      dryRun: false,
    });
    return { runId: result.runId, created: result.created };
  });

  // Register ledger sync handler
  const { handleLedgerSync } = await import("./workers/ledgerSyncHandler");
  jobQueueService.registerHandler('ledger_sync', handleLedgerSync);

  // Start job queue worker
  jobQueueService.start(5000);

  setupAuth(app);
  const server = await registerRoutes(app);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as { status?: number })?.status || (err as { statusCode?: number })?.statusCode || 500;
    const message = (err as { message?: string })?.message || "Internal Server Error";

    console.error('Error:', err);
    res.status(status).json({ message });
  });

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
    log(`serving on port ${port}`);
  });
})();
