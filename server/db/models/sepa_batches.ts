import { pgTable, text, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";

export const sepaBatches = pgTable("sepa_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  batchId: text("batch_id").notNull(),
  organizationId: uuid("organization_id"),
  propertyId: uuid("property_id"),
  status: text("status").notNull().default("created"),
  xml: text("xml"),
  pspResponse: jsonb("psp_response"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
