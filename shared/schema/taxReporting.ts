import { pgTable, text, uuid, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations } from "./organizations";
import { properties, propertyOwners } from "./properties";

// ── Tax Reports (E1a/E1b Steuerbeilagen) ─────────────────────────────────
export const taxReports = pgTable("tax_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  ownerId: uuid("owner_id").references(() => propertyOwners.id).notNull(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  reportType: text("report_type").notNull().default("E1a"),
  taxYear: integer("tax_year").notNull(),
  data: jsonb("data").notNull().default({}),
  xmlContent: text("xml_content"),
  status: text("status").notNull().default("entwurf"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Schemas & Types ──────────────────────────────────────────────────────
export const insertTaxReportSchema = createInsertSchema(taxReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TaxReport = typeof taxReports.$inferSelect;
export type InsertTaxReport = z.infer<typeof insertTaxReportSchema>;

// ── E1a Kennzahlen Interface ─────────────────────────────────────────────
export interface E1aKennzahlen {
  kz370: number; // Mieteinnahmen brutto
  kz371: number; // Betriebskosten-Einnahmen
  kz380: number; // Werbungskosten (Instandhaltung)
  kz381: number; // AfA
  kz382: number; // Zinsen Fremdkapital
  kz383: number; // Verwaltungskosten
  kz390: number; // Einkünfte aus V+V (Saldo)
}
