import { pgTable, text, uuid, timestamp, integer, numeric, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations, profiles } from "./organizations";
import { properties, units } from "./properties";

// ── Maintenance Contracts ────────────────────────────────────────────────
export const maintenanceContracts = pgTable("maintenance_contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  contractType: text("contract_type").default('wartung'),
  contractorName: text("contractor_name"),
  contractorContact: text("contractor_contact"),
  contractorEmail: text("contractor_email"),
  contractFee: numeric("contract_fee", { precision: 10, scale: 2 }),
  intervalMonths: integer("interval_months").default(12),
  nextDueDate: date("next_due_date").notNull(),
  lastMaintenanceDate: date("last_maintenance_date"),
  reminderDays: integer("reminder_days").default(14),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  documentUrl: text("document_url"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Maintenance Tasks ────────────────────────────────────────────────────
export const maintenanceTasks = pgTable("maintenance_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  unitId: uuid("unit_id").references(() => units.id),
  contractId: uuid("contract_id").references(() => maintenanceContracts.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").default('reparatur'),
  priority: text("priority").default('normal'),
  status: text("status").default('open'),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  contractorName: text("contractor_name"),
  contractorContact: text("contractor_contact"),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: numeric("actual_cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Contractors ──────────────────────────────────────────────────────────
export const contractors = pgTable("contractors", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  companyName: text("company_name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  mobile: text("mobile"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  iban: text("iban"),
  bic: text("bic"),
  specializations: text("specializations").array(),
  rating: integer("rating"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Schemas & Types ──────────────────────────────────────────────────────
export const insertMaintenanceContractSchema = createInsertSchema(maintenanceContracts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMaintenanceTaskSchema = createInsertSchema(maintenanceTasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContractorSchema = createInsertSchema(contractors).omit({ id: true, createdAt: true, updatedAt: true });

export type MaintenanceContract = typeof maintenanceContracts.$inferSelect;
export type InsertMaintenanceContract = z.infer<typeof insertMaintenanceContractSchema>;
export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;
export type InsertMaintenanceTask = z.infer<typeof insertMaintenanceTaskSchema>;
export type Contractor = typeof contractors.$inferSelect;
export type InsertContractor = z.infer<typeof insertContractorSchema>;
