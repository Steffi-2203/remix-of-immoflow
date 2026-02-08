import { pgTable, uuid, date, numeric, timestamp } from "drizzle-orm/pg-core";

export const waterReadings = pgTable("water_readings", {
  id: uuid("id").defaultRandom().primaryKey(),
  unitId: uuid("unit_id").notNull(),
  organizationId: uuid("organization_id"),
  readingDate: date("reading_date").notNull(),
  consumption: numeric("consumption", { precision: 12, scale: 3 }).notNull().default("0"),
  coefficient: numeric("coefficient", { precision: 8, scale: 4 }).default("1.0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
