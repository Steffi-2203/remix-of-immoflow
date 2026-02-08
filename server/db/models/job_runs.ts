import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const jobRuns = pgTable("job_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: text("job_id").notNull(),
  jobType: text("job_type").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  traceId: text("trace_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
