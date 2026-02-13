import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

// ── Messages ─────────────────────────────────────────────────────────────
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  recipientType: text("recipient_type").default('internal'),
  recipientEmail: text("recipient_email"),
  messageType: text("message_type"),
  subject: text("subject"),
  messageBody: text("message_body"),
  status: text("status").default('draft'),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Types ────────────────────────────────────────────────────────────────
export type Message = typeof messages.$inferSelect;
