import { pgTable, text, uuid, timestamp, integer, numeric, date, boolean, serial, jsonb, varchar, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { invoiceStatusEnum, paymentTypeEnum } from "./enums";
import { profiles } from "./organizations";
import { organizations } from "./organizations";
import { units } from "./properties";
import { tenants } from "./tenants";

// ── Monthly Invoices (Vorschreibungen) ───────────────────────────────────
export const monthlyInvoices = pgTable("monthly_invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  unitId: uuid("unit_id").references(() => units.id).notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  grundmiete: numeric("grundmiete", { precision: 10, scale: 2 }).default('0'),
  betriebskosten: numeric("betriebskosten", { precision: 10, scale: 2 }).default('0'),
  heizungskosten: numeric("heizungskosten", { precision: 10, scale: 2 }).default('0'),
  wasserkosten: numeric("wasserkosten", { precision: 10, scale: 2 }).default('0'),
  ustSatzMiete: integer("ust_satz_miete").default(10),
  ustSatzBk: integer("ust_satz_bk").default(10),
  ustSatzHeizung: integer("ust_satz_heizung").default(20),
  ustSatzWasser: integer("ust_satz_wasser").default(10),
  ust: numeric("ust", { precision: 10, scale: 2 }).default('0'),
  gesamtbetrag: numeric("gesamtbetrag", { precision: 10, scale: 2 }).default('0'),
  status: invoiceStatusEnum("status").default('offen'),
  faelligAm: date("faellig_am"),
  pdfUrl: text("pdf_url"),
  isVacancy: boolean("is_vacancy").default(false),
  vortragMiete: numeric("vortrag_miete", { precision: 10, scale: 2 }).default('0'),
  vortragBk: numeric("vortrag_bk", { precision: 10, scale: 2 }).default('0'),
  vortragHk: numeric("vortrag_hk", { precision: 10, scale: 2 }).default('0'),
  vortragSonstige: numeric("vortrag_sonstige", { precision: 10, scale: 2 }).default('0'),
  runId: uuid("run_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_invoices_unit_status_year_month").on(table.unitId, table.status, table.year, table.month),
  index("idx_invoices_run_id").on(table.runId),
]);

// ── Invoice Lines ────────────────────────────────────────────────────────
export const invoiceLines = pgTable("invoice_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => monthlyInvoices.id),
  unitId: uuid("unit_id").references(() => units.id),
  lineType: varchar("line_type", { length: 50 }).notNull(),
  description: text("description"),
  /**
   * Auto-populated by DB trigger `trg_invoice_lines_normalize`.
   * Setting it explicitly in application code is redundant but harmless —
   * the trigger always overwrites with its own computation.
   */
  normalizedDescription: text("normalized_description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  taxRate: integer("tax_rate").default(0),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_invoice_lines_invoice").on(table.invoiceId),
  index("idx_invoice_lines_unit").on(table.unitId),
  uniqueIndex("idx_invoice_lines_unique").on(table.invoiceId, table.unitId, table.lineType, table.normalizedDescription),
]);

// ── Payments ─────────────────────────────────────────────────────────────
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  invoiceId: uuid("invoice_id").references(() => monthlyInvoices.id),
  betrag: numeric("betrag", { precision: 10, scale: 2 }).notNull(),
  buchungsDatum: date("buchungs_datum").notNull(),
  paymentType: paymentTypeEnum("payment_type").default('ueberweisung'),
  verwendungszweck: text("verwendungszweck"),
  transactionId: uuid("transaction_id"),
  notizen: text("notizen"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Payment Allocations (Zahlungszuordnungen) ────────────────────────────
export const paymentAllocations = pgTable("payment_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentId: uuid("payment_id").references(() => payments.id).notNull(),
  invoiceId: uuid("invoice_id").references(() => monthlyInvoices.id).notNull(),
  appliedAmount: numeric("applied_amount", { precision: 10, scale: 2 }).notNull(),
  allocationType: text("allocation_type").default('miete'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Ledger Entries (Kontobuch) ───────────────────────────────────────────
export const ledgerEntries = pgTable("ledger_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  invoiceId: uuid("invoice_id").references(() => monthlyInvoices.id),
  paymentId: uuid("payment_id").references(() => payments.id),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  bookingDate: date("booking_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── SEPA Collections ─────────────────────────────────────────────────────
export const sepaCollections = pgTable("sepa_collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).default('0'),
  tenantCount: integer("tenant_count").default(0),
  status: text("status").default('draft'),
  xmlContent: text("xml_content"),
  fileName: text("file_name"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Invoice Runs ─────────────────────────────────────────────────────────
export const invoiceRuns = pgTable("invoice_runs", {
  id: serial("id").primaryKey(),
  runId: uuid("run_id").notNull().unique(),
  period: text("period").notNull(),
  initiatedBy: uuid("initiated_by").references(() => profiles.id),
  status: text("status").notNull().default("started"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Billing Runs (Run-Level State Machine) ───────────────────────────────
export const billingRuns = pgTable("billing_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: text("run_id").notNull().unique(),
  status: text("status").notNull().default('pending'),
  description: text("description"),
  triggeredBy: uuid("triggered_by"),
  expectedLines: integer("expected_lines").notNull().default(0),
  totalChunks: integer("total_chunks").notNull().default(0),
  completedChunks: integer("completed_chunks").notNull().default(0),
  failedChunks: integer("failed_chunks").notNull().default(0),
  inserted: integer("inserted").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  artifacts: jsonb("artifacts").default([]),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Reconcile Runs (Chunk-Level Tracking) ────────────────────────────────
export const reconcileRuns = pgTable("reconcile_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: text("run_id").notNull(),
  chunkId: integer("chunk_id").notNull(),
  totalChunks: integer("total_chunks").notNull(),
  status: text("status").notNull().default('pending'),
  rowsInChunk: integer("rows_in_chunk").notNull().default(0),
  inserted: integer("inserted").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  errorMessage: text("error_message"),
  billingRunId: uuid("billing_run_id").references(() => billingRuns.id),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Schemas & Types ──────────────────────────────────────────────────────
export const insertMonthlyInvoiceSchema = createInsertSchema(monthlyInvoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceLineSchema = createInsertSchema(invoiceLines).omit({ id: true, createdAt: true, normalizedDescription: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertPaymentAllocationSchema = createInsertSchema(paymentAllocations).omit({ id: true, createdAt: true });

export type MonthlyInvoice = typeof monthlyInvoices.$inferSelect;
export type InsertMonthlyInvoice = z.infer<typeof insertMonthlyInvoiceSchema>;
export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type InsertInvoiceLine = typeof invoiceLines.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type PaymentAllocation = typeof paymentAllocations.$inferSelect;
export type InsertPaymentAllocation = typeof paymentAllocations.$inferInsert;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = typeof ledgerEntries.$inferInsert;
export type SepaCollection = typeof sepaCollections.$inferSelect;
export type InvoiceRun = typeof invoiceRuns.$inferSelect;
export type BillingRun = typeof billingRuns.$inferSelect;
export type InsertBillingRun = typeof billingRuns.$inferInsert;
export type ReconcileRun = typeof reconcileRuns.$inferSelect;
