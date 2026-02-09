import { auditEvents } from "./auditEvents.schema";
import type { AuditEvent } from "./auditEvents.types";

/**
 * Insert a structured audit event into the audit_events table.
 * Accepts either the main `db` instance or a transaction handle.
 */
export async function logAuditEvent(
  db: { insert: Function },
  event: AuditEvent
): Promise<void> {
  await db.insert(auditEvents).values({
    runId: event.runId,
    actor: event.actor,
    eventType: event.eventType,
    entity: event.entity,
    entityId: event.entityId,
    operation: event.operation,
    oldData: event.old,
    newData: event.new,
  });
}

/**
 * Log multiple audit events in a single insert (batch).
 */
export async function logAuditEventsBatch(
  db: { insert: Function },
  events: AuditEvent[]
): Promise<void> {
  if (events.length === 0) return;
  await db.insert(auditEvents).values(
    events.map((event) => ({
      runId: event.runId,
      actor: event.actor,
      eventType: event.eventType,
      entity: event.entity,
      entityId: event.entityId,
      operation: event.operation,
      oldData: event.old,
      newData: event.new,
    }))
  );
}
