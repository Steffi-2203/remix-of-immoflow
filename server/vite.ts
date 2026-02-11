import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { injectNonce, injectSri } from "./lib/htmlTransform";
import { getSriMap } from "./lib/sri";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";

const viteLogger = {
  info: (msg: string) => {
    if (!msg.includes("page reload")) {
      console.log(msg);
    }
  },
  warn: (msg: string) => console.warn(msg),
  error: (msg: string) => console.error(msg),
  warnOnce: (msg: string) => console.warn(msg),
  hasWarned: false,
  clearScreen: () => {},
  hasErrorLogged: () => false,
};

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    configFile: path.resolve(__dirname, "..", "vite.config.ts"),
    customLogger: viteLogger,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("/{*splat}", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(__dirname, "..", "index.html");

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = await vite.transformIndexHtml(url, template);
      // Inject CSP nonce into script/style/link tags (dev mode, no SRI)
      const nonce = res.locals.cspNonce;
      if (nonce) {
        template = injectNonce(template, nonce);
      }
      res.status(200).set({
        "Content-Type": "text/html",
        "Cache-Control": "private, no-store, must-revalidate",
        "Pragma": "no-cache",
      }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, {
    maxAge: '1y',
    immutable: true,
    index: false,
  }));

  app.use("/{*splat}", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    let html = fs.readFileSync(indexPath, 'utf-8');

    // Inject CSP nonce
    const nonce = res.locals.cspNonce;
    if (nonce) {
      html = injectNonce(html, nonce);
    }

    // Inject SRI attributes for production assets
    html = injectSri(html, getSriMap(distPath));

    res.set({
      'Content-Type': 'text/html',
      'Cache-Control': 'private, no-store, must-revalidate',
      'Pragma': 'no-cache',
    });
    res.send(html);
  });
}

function formatTime() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function log(message: string) {
  console.log(`${formatTime()} [express] ${message}`);
}

export function logInfo(message: string) {
  console.log(`${formatTime()} [express] ${message}`);
}

export function logError(message: string) {
  console.error(`${formatTime()} [express] ERROR: ${message}`);
}
