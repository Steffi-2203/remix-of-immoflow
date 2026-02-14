import { Request, Response, NextFunction } from "express";
import { pool } from "../db";

declare global {
  namespace Express {
    interface Request {
      dbClient?: import("pg").PoolClient;
    }
  }
}

export function rlsMiddleware(req: Request, res: Response, next: NextFunction) {
  const organizationId = (req.session as any)?.organizationId;

  if (!organizationId) {
    return next();
  }

  pool.connect().then((client) => {
    client.query("BEGIN").then(() => {
      return client.query(`SET LOCAL app.current_org = '${organizationId.replace(/'/g, "''")}'`);
    }).then(() => {
      req.dbClient = client;

      const cleanup = () => {
        client.query("COMMIT").catch(() => {}).finally(() => {
          client.release();
        });
      };

      res.on("finish", cleanup);
      res.on("close", cleanup);
      next();
    }).catch((err) => {
      client.query("ROLLBACK").catch(() => {}).finally(() => {
        client.release();
      });
      next(err);
    });
  }).catch((err) => {
    next(err);
  });
}
