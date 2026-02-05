import type { Request, Response, NextFunction } from "express";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] || req.query.api_key;
  const expectedKey = process.env.READONLY_API_KEY;

  if (!expectedKey) {
    console.error("READONLY_API_KEY not configured");
    return res.status(500).json({ error: "API key not configured" });
  }

  if (!apiKey) {
    return res.status(401).json({ error: "API key required (X-API-Key header or api_key query param)" });
  }

  if (apiKey !== expectedKey) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
}
