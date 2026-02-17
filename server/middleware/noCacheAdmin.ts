import { Request, Response, NextFunction } from 'express';

export function noCacheAdmin(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('X-Admin-Cache', 'disabled');
  next();
}

export default noCacheAdmin;
