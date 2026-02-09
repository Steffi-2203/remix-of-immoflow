

# Audit Service: Feldname `type` → `eventType` angleichen

## Zusammenfassung
Der Import wird auf `./auditEvents.schema` geändert und das Feld `type` im `AuditEvent`-Interface wird zu `eventType` umbenannt, damit es konsistent mit dem DB-Spaltennamen ist.

## Änderungen

### 1. `server/audit/auditEvents.types.ts`
- Feld `type` umbenennen zu `eventType`

### 2. `server/audit/auditEvents.service.ts`
- Import von `@shared/schema` auf `./auditEvents.schema` ändern
- `event.type` → `event.eventType` in beiden Funktionen (`logAuditEvent` und `logAuditEventsBatch`)

### 3. Alle Aufrufstellen aktualisieren (`type:` → `eventType:`)
- `server/billing/paymentService.ts` — `type: 'payment_allocated'` → `eventType: 'payment_allocated'`
- `server/billing/invoiceService.ts` — `type: 'invoice_bulk_create'` → `eventType: 'invoice_bulk_create'`
- `server/billing/settlementService.ts` — `type: 'settlement_create'` → `eventType: 'settlement_create'`
- `server/billing/bulkUpsertLines.ts` — `type: 'invoice_line_bulk_upsert'` → `eventType: 'invoice_line_bulk_upsert'`

## Technische Details
- Rein mechanisches Rename, keine Logikänderung
- 6 Dateien betroffen, jeweils 1-2 Zeilen
