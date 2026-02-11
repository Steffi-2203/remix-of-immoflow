import crypto from "crypto";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  [key: string]: unknown;
}

const isProduction = process.env.NODE_ENV === "production";

function formatLog(entry: LogEntry): string {
  if (isProduction) {
    return JSON.stringify(entry);
  }
  const { timestamp, level, message, requestId, ...meta } = entry;
  const rid = requestId ? ` [${requestId.slice(0, 8)}]` : "";
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `${timestamp} [${level.toUpperCase()}]${rid} ${message}${metaStr}`;
}

function writeLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  const formatted = formatLog(entry);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "debug":
      if (!isProduction) console.log(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => writeLog("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => writeLog("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => writeLog("error", message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => writeLog("debug", message, meta),
};

export function createRequestLogger() {
  return (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
    req.requestId = crypto.randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    next();
  };
}
