import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id"),
  actor: text("actor").notNull(),
  eventType: text("event_type").notNull(),
  entity: text("entity").notNull(),
  entityId: uuid("entity_id"),
  operation: text("operation").notNull(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
