import { pgTable, text, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";
import { profiles } from "./organizations";

// ── Audit Logs (hash-chain) ──────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => profiles.id),
  runId: uuid("run_id"),
  tableName: text("table_name").notNull(),
  recordId: text("record_id"),
  action: text("action").notNull(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Audit Events (immutable) ─────────────────────────────────────────────
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

// ── Types ────────────────────────────────────────────────────────────────
export type AuditLog = typeof auditLogs.$inferSelect;
