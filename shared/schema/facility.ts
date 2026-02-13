import { pgTable, text, uuid, timestamp, integer, numeric, date, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { meterTypeEnum, keyTypeEnum, keyStatusEnum } from "./enums";
import { properties, units } from "./properties";
import { tenants } from "./tenants";

// ── Meters (Zähler) ──────────────────────────────────────────────────────
export const meters = pgTable("meters", {
  id: uuid("id").defaultRandom().primaryKey(),
  unitId: uuid("unit_id").references(() => units.id).notNull(),
  propertyId: uuid("property_id").references(() => properties.id),
  meterNumber: text("meter_number").notNull(),
  meterType: meterTypeEnum("meter_type").notNull(),
  location: text("location"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Meter Readings (Zählerstände) ────────────────────────────────────────
export const meterReadings = pgTable("meter_readings", {
  id: uuid("id").defaultRandom().primaryKey(),
  meterId: uuid("meter_id").references(() => meters.id).notNull(),
  readingDate: date("reading_date").notNull(),
  readingValue: numeric("reading_value", { precision: 12, scale: 3 }).notNull(),
  isEstimated: boolean("is_estimated").default(false),
  readBy: text("read_by"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_meter_readings_date").on(table.meterId, table.readingDate),
]);

// ── Key Inventory (Schlüsselverwaltung) ──────────────────────────────────
export const keyInventory = pgTable("key_inventory", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  unitId: uuid("unit_id").references(() => units.id),
  keyType: keyTypeEnum("key_type").notNull(),
  keyNumber: text("key_number"),
  description: text("description"),
  totalCount: integer("total_count").default(1),
  availableCount: integer("available_count").default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Key Handovers (Schlüsselübergaben) ───────────────────────────────────
export const keyHandovers = pgTable("key_handovers", {
  id: uuid("id").defaultRandom().primaryKey(),
  keyInventoryId: uuid("key_inventory_id").references(() => keyInventory.id).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  recipientName: text("recipient_name"),
  handoverDate: date("handover_date").notNull(),
  returnDate: date("return_date"),
  quantity: integer("quantity").default(1),
  status: keyStatusEnum("status").default('ausgegeben'),
  handoverProtocol: text("handover_protocol"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Schemas & Types ──────────────────────────────────────────────────────
export const insertMeterSchema = createInsertSchema(meters).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMeterReadingSchema = createInsertSchema(meterReadings).omit({ id: true, createdAt: true });
export const insertKeyInventorySchema = createInsertSchema(keyInventory).omit({ id: true, createdAt: true, updatedAt: true });
export const insertKeyHandoverSchema = createInsertSchema(keyHandovers).omit({ id: true, createdAt: true });

export type Meter = typeof meters.$inferSelect;
export type InsertMeter = z.infer<typeof insertMeterSchema>;
export type MeterReading = typeof meterReadings.$inferSelect;
export type InsertMeterReading = z.infer<typeof insertMeterReadingSchema>;
export type KeyInventory = typeof keyInventory.$inferSelect;
export type InsertKeyInventory = z.infer<typeof insertKeyInventorySchema>;
export type KeyHandover = typeof keyHandovers.$inferSelect;
export type InsertKeyHandover = z.infer<typeof insertKeyHandoverSchema>;
