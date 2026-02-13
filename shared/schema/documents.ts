import { pgTable, text, uuid, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { documentCategoryEnum } from "./enums";
import { organizations } from "./organizations";
import { properties } from "./properties";
import { tenants } from "./tenants";

// ── Property Documents ───────────────────────────────────────────────────
export const propertyDocuments = pgTable("property_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  category: documentCategoryEnum("category").default('sonstiges'),
  fileUrl: text("file_url"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Tenant Documents ─────────────────────────────────────────────────────
export const tenantDocuments = pgTable("tenant_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  category: documentCategoryEnum("category").default('sonstiges'),
  fileUrl: text("file_url"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Schemas & Types ──────────────────────────────────────────────────────
export const insertPropertyDocumentSchema = createInsertSchema(propertyDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantDocumentSchema = createInsertSchema(tenantDocuments).omit({ id: true, createdAt: true, updatedAt: true });

export type PropertyDocument = typeof propertyDocuments.$inferSelect;
export type InsertPropertyDocument = z.infer<typeof insertPropertyDocumentSchema>;
export type TenantDocument = typeof tenantDocuments.$inferSelect;
export type InsertTenantDocument = z.infer<typeof insertTenantDocumentSchema>;
