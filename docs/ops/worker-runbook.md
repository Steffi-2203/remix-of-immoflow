# Worker Runbook

## Architektur

Das System nutzt eine **PostgreSQL-basierte Job-Queue** (`job_queue`-Tabelle) mit atomarem Claiming via `claim_next_job()` (`FOR UPDATE SKIP LOCKED`). Kein Redis erforderlich.

## Worker starten

1. Sicherstellen, dass DB-Migrationen angewendet sind
2. Der Worker startet automatisch mit dem Server (`server/index.ts`)
3. Poll-Intervall: 5 Sekunden, max. 5 Jobs pro Tick

## Job einreihen

Via `jobQueueService.enqueue()` im Code:

```typescript
import { jobQueueService } from "./services/jobQueueService";

await jobQueueService.enqueue({
  organizationId: "org-uuid",
  jobType: "sepa_export",
  payload: { batchId: "test-1" },
  createdBy: "user-uuid",
});
```

Oder direkt via SQL:

```sql
INSERT INTO job_queue (organization_id, job_type, payload, status)
VALUES ('org-uuid', 'sepa_export', '{"batchId":"test-1"}'::jsonb, 'pending');
```

## Verifizieren

- `job_queue`-Tabelle: Status prüfen (`pending` → `processing` → `completed`/`failed`)
- `job_runs`-Tabelle: Idempotenz-Status und Trace-ID prüfen
- `audit_logs`: Events `job_started`, `job_completed`, `job_failed` suchen

```sql
SELECT id, job_type, status, error, created_at FROM job_queue ORDER BY created_at DESC LIMIT 10;
SELECT job_id, status, last_error, trace_id FROM job_runs ORDER BY created_at DESC LIMIT 10;
```

## Fehlerbehandlung

1. **Job fehlgeschlagen:** `job_queue.error` und `job_runs.last_error` inspizieren
2. **Retry-Logik:** Automatisches exponentielles Backoff (30s × Versuch²), max. 3 Versuche
3. **Persistente Fehler:** Job manuell auf `failed` setzen, Ursache in Audit-Logs dokumentieren
4. **Rollback:** Siehe `docs/ROLLBACK_PLAYBOOK.md` für Abrechnungslauf-Rollbacks

## Registrierte Job-Typen

| Typ | Handler | Status |
|-----|---------|--------|
| `billing_run` | `server/billing/billing.service.ts` | ✅ Aktiv |
| `sepa_export` | — | ⏳ Offen |
| `settlement_calculation` | — | ⏳ Offen |
| `dunning_run` | — | ⏳ Offen |
| `report_generation` | — | ⏳ Offen |
| `bulk_invoice_upsert` | — | ⏳ Offen |
