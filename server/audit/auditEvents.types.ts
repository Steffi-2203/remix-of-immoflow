export type AuditEvent = {
  runId?: string;
  actor: string;
  eventType: string;
  entity: string;
  entityId?: string;
  operation: "insert" | "update" | "delete" | "merge" | "allocate" | "reconcile";
  old?: any;
  new?: any;
};

export interface AuditEventRow {
  id: string;
  runId: string | null;
  actor: string;
  eventType: string;
  entity: string;
  entityId: string | null;
  operation: string;
  oldData: unknown;
  newData: unknown;
  createdAt: string;
}
