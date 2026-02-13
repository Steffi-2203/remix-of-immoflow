import type { Express } from "express";
import { registerPaymentRoutes } from "./payments";
import { registerInvoiceRoutes } from "./invoices";
import { registerExpenseRoutes } from "./expenses";

export function registerFinanceRoutes(app: Express) {
  registerPaymentRoutes(app);
  registerInvoiceRoutes(app);
  registerExpenseRoutes(app);
}
