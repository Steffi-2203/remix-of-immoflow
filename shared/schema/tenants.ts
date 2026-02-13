import { pgTable, text, uuid, timestamp, numeric, date, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { tenantStatusEnum, leaseStatusEnum } from "./enums";
import { units } from "./properties";

// ── Tenants ──────────────────────────────────────────────────────────────
export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  unitId: uuid("unit_id").references(() => units.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  mobilePhone: text("mobile_phone"),
  status: tenantStatusEnum("status").default('aktiv'),
  mietbeginn: date("mietbeginn"),
  mietende: date("mietende"),
  grundmiete: numeric("grundmiete", { precision: 10, scale: 2 }).default('0'),
  betriebskostenVorschuss: numeric("betriebskosten_vorschuss", { precision: 10, scale: 2 }).default('0'),
  heizkostenVorschuss: numeric("heizungskosten_vorschuss", { precision: 10, scale: 2 }).default('0'),
  wasserkostenVorschuss: numeric("wasserkosten_vorschuss", { precision: 10, scale: 2 }).default('0'),
  warmwasserkostenVorschuss: numeric("warmwasserkosten_vorschuss", { precision: 10, scale: 2 }).default('0'),
  sonstigeKosten: jsonb("sonstige_kosten").$type<Record<string, { betrag: number; ust: number; schluessel?: string }>>(),
  kaution: numeric("kaution", { precision: 10, scale: 2 }),
  kautionBezahlt: boolean("kaution_bezahlt").default(false),
  iban: text("iban"),
  bic: text("bic"),
  sepaMandat: boolean("sepa_mandat").default(false),
  sepaMandatDatum: date("sepa_mandat_datum"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ── Leases (Mietverträge) ────────────────────────────────────────────────
export const leases = pgTable("leases", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  unitId: uuid("unit_id").references(() => units.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  grundmiete: numeric("grundmiete", { precision: 10, scale: 2 }).notNull(),
  betriebskostenVorschuss: numeric("betriebskosten_vorschuss", { precision: 10, scale: 2 }).default('0'),
  heizkostenVorschuss: numeric("heizungskosten_vorschuss", { precision: 10, scale: 2 }).default('0'),
  wasserkostenVorschuss: numeric("wasserkosten_vorschuss", { precision: 10, scale: 2 }).default('0'),
  kaution: numeric("kaution", { precision: 10, scale: 2 }),
  kautionBezahlt: boolean("kaution_bezahlt").default(false),
  status: leaseStatusEnum("status").default('aktiv'),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex("leases_tenant_unit_start_unique").on(table.tenantId, table.unitId, table.startDate),
]);

// ── Rent History ─────────────────────────────────────────────────────────
export const rentHistory = pgTable("rent_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  validFrom: date("valid_from").notNull(),
  validUntil: date("valid_until"),
  grundmiete: numeric("grundmiete", { precision: 10, scale: 2 }).notNull(),
  betriebskostenVorschuss: numeric("betriebskosten_vorschuss", { precision: 10, scale: 2 }).notNull(),
  heizkostenVorschuss: numeric("heizungskosten_vorschuss", { precision: 10, scale: 2 }).notNull(),
  wasserkostenVorschuss: numeric("wasserkosten_vorschuss", { precision: 10, scale: 2 }).default('0'),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── VPI Index Adjustments ────────────────────────────────────────────────
export const vpiAdjustments = pgTable("vpi_adjustments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  adjustmentDate: date("adjustment_date").notNull(),
  previousRent: numeric("previous_rent", { precision: 10, scale: 2 }).notNull(),
  newRent: numeric("new_rent", { precision: 10, scale: 2 }).notNull(),
  vpiOld: numeric("vpi_old", { precision: 8, scale: 2 }),
  vpiNew: numeric("vpi_new", { precision: 8, scale: 2 }),
  percentageChange: numeric("percentage_change", { precision: 5, scale: 2 }),
  notificationSent: boolean("notification_sent").default(false),
  notificationDate: date("notification_date"),
  effectiveDate: date("effective_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Schemas & Types ──────────────────────────────────────────────────────
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLeaseSchema = createInsertSchema(leases).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRentHistorySchema = createInsertSchema(rentHistory).omit({ id: true, createdAt: true });
export const insertVpiAdjustmentSchema = createInsertSchema(vpiAdjustments).omit({ id: true, createdAt: true });

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Lease = typeof leases.$inferSelect;
export type InsertLease = typeof leases.$inferInsert;
export type RentHistory = typeof rentHistory.$inferSelect;
export type InsertRentHistory = typeof rentHistory.$inferInsert;
export type VpiAdjustment = typeof vpiAdjustments.$inferSelect;
export type InsertVpiAdjustment = z.infer<typeof insertVpiAdjustmentSchema>;
