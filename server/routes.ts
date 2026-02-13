import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerStripeRoutes } from "./stripeRoutes";
import readonlyRoutes from "./routes/readonly";

// Domain routers
import { registerCoreRoutes } from "./routes/core";
import { registerOrganizationRoutes } from "./routes/organizations";
import { registerPropertyRoutes } from "./routes/properties/index";
import { registerUnitRoutes } from "./routes/units";
import { registerTenantRoutes } from "./routes/tenants";
import { registerFinanceRoutes } from "./routes/finance/index";
import { registerBankingRoutes } from "./routes/banking";
import { registerSettlementRoutes } from "./routes/settlements";
import { registerComplianceRoutes } from "./routes/compliance";
import { registerExportRoutes } from "./routes/exports";
import { registerJobRoutes } from "./routes/jobs";
import { registerNotificationRoutes } from "./routes/notifications";
import { registerOcrRoutes } from "./routes/ocr";

export async function registerRoutes(app: Express): Promise<Server> {
  // Readonly API
  app.use("/api/readonly", readonlyRoutes);

  // Domain routers (order matters for overlapping paths)
  registerCoreRoutes(app);
  registerOrganizationRoutes(app);
  registerPropertyRoutes(app);
  registerUnitRoutes(app);
  registerTenantRoutes(app);
  registerFinanceRoutes(app);
  registerBankingRoutes(app);
  registerSettlementRoutes(app);
  registerComplianceRoutes(app);
  registerExportRoutes(app);
  registerJobRoutes(app);
  registerNotificationRoutes(app);
  registerOcrRoutes(app);

  // External integrations
  registerStripeRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
