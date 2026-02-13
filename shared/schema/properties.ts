import { pgTable, text, uuid, timestamp, integer, numeric, date, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { unitTypeEnum, tenantStatusEnum } from "./enums";
import { organizations } from "./organizations";
import { profiles } from "./organizations";

// ── Properties ───────────────────────────────────────────────────────────
export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  totalUnits: integer("total_units").default(0),
  totalArea: numeric("total_area", { precision: 10, scale: 2 }),
  constructionYear: integer("construction_year"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ── Property Managers (User ↔ Property) ──────────────────────────────────
export const propertyManagers = pgTable("property_managers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => profiles.id).notNull(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Units ────────────────────────────────────────────────────────────────
export const units = pgTable("units", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  topNummer: text("top_nummer").notNull(),
  type: unitTypeEnum("type").default('wohnung'),
  status: tenantStatusEnum("status").default('leerstand'),
  flaeche: numeric("flaeche", { precision: 10, scale: 2 }),
  zimmer: integer("zimmer"),
  nutzwert: numeric("nutzwert", { precision: 10, scale: 4 }),
  stockwerk: integer("stockwerk"),
  vsPersonen: integer("vs_personen").default(0),
  leerstandBk: numeric("leerstand_bk", { precision: 10, scale: 2 }).default('0'),
  leerstandHk: numeric("leerstand_hk", { precision: 10, scale: 2 }).default('0'),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("units_property_top_unique").on(table.propertyId, table.topNummer),
]);

// ── Owners ───────────────────────────────────────────────────────────────
export const owners = pgTable("owners", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  companyName: text("company_name"),
  email: text("email"),
  phone: text("phone"),
  mobilePhone: text("mobile_phone"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country").default('Österreich'),
  iban: text("iban"),
  bic: text("bic"),
  bankName: text("bank_name"),
  taxNumber: text("tax_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Property Owners (m:n with share) ─────────────────────────────────────
export const propertyOwners = pgTable("property_owners", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  ownerId: uuid("owner_id").references(() => owners.id).notNull(),
  ownershipShare: numeric("ownership_share", { precision: 5, scale: 2 }).default('100.00'),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Schemas & Types ──────────────────────────────────────────────────────
export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUnitSchema = createInsertSchema(units).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true }).partial({
  type: true,
  status: true,
  flaeche: true,
  zimmer: true,
  nutzwert: true,
  stockwerk: true,
  notes: true,
});
export const insertOwnerSchema = createInsertSchema(owners).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPropertyOwnerSchema = createInsertSchema(propertyOwners).omit({ id: true, createdAt: true });

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Unit = typeof units.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Owner = typeof owners.$inferSelect;
export type InsertOwner = z.infer<typeof insertOwnerSchema>;
export type PropertyOwner = typeof propertyOwners.$inferSelect;
export type InsertPropertyOwner = z.infer<typeof insertPropertyOwnerSchema>;
export type PropertyManager = typeof propertyManagers.$inferSelect;
