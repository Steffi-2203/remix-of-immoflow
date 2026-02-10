import pino from "pino";

/**
 * Structured JSON logger (Pino).
 *
 * - Level controlled via LOG_LEVEL env (default: "info")
 * - Use child loggers for service scoping: logger.child({ service: 'billing' })
 * - Correlation via requestId injected by requestLogger middleware
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  // Pretty print in development only
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino/file",
      options: { destination: 1 }, // stdout
    },
  }),
});

// Pre-built child loggers for critical services
export const billingLogger = logger.child({ service: "billing" });
export const authLogger = logger.child({ service: "auth" });
export const paymentLogger = logger.child({ service: "payments" });
export const securityLogger = logger.child({ service: "security" });
