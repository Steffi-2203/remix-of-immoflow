import { auditEvents } from "@shared/schema";

interface AuditEvent {
  runId?: string;
  actor: string;
  type: string;
  entity: string;
  entityId?: string;
  operation: string;
  old?: unknown;
  new?: unknown;
}

/**
 * Insert a structured audit event into the audit_events table.
 * Accepts either the main `db` instance or a transaction handle.
 */
export async function logAuditEvent(
  db: { insert: Function },
  event: AuditEvent
) {
  await db.insert(auditEvents).values({
    runId: event.runId,
    actor: event.actor,
    eventType: event.type,
    entity: event.entity,
    entityId: event.entityId,
    operation: event.operation,
    oldData: event.old,
    newData: event.new,
  });
}
