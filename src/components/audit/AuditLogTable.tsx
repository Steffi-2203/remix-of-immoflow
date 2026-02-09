import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AuditEvent {
  id: string;
  createdAt: string;
  actor: string;
  eventType: string;
  entity: string;
  operation: string;
}

interface AuditLogTableProps {
  events: AuditEvent[];
}

export function AuditLogTable({ events }: AuditLogTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Operation</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="text-muted-foreground">
              {new Date(e.createdAt).toLocaleString()}
            </TableCell>
            <TableCell>{e.actor}</TableCell>
            <TableCell>{e.eventType}</TableCell>
            <TableCell>{e.entity}</TableCell>
            <TableCell>{e.operation}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
