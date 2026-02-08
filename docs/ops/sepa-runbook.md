# SEPA Runbook

## Zweck

Verwaltung von SEPA-Batch-Erstellung, -Einreichung und Fehlerbehebung.

## Architektur

Der SEPA-Export nutzt die **PostgreSQL-basierte Job-Queue** (`job_queue`-Tabelle). Kein Redis erforderlich. Der Worker wird über `registerSepaWorker()` beim Server-Start registriert.

## Job einreihen

Via `jobQueueService.enqueue()`:

```typescript
import { jobQueueService } from "./services/jobQueueService";

await jobQueueService.enqueue({
  organizationId: "org-uuid",
  jobType: "sepa_export",
  payload: {
    batchId: "BATCH-2026-02-001",
    organizationId: "org-uuid",
    invoiceIds: ["inv-1", "inv-2"],
    creditorName: "Meine Hausverwaltung GmbH",
    creditorIban: "AT611904300234573201",
    creditorBic: "BKAUATWW",
    creditorId: "AT12ZZZ00000000001",
  },
  createdBy: "user-uuid",
});
```

Oder direkt via SQL:

```sql
INSERT INTO job_queue (organization_id, job_type, payload, status)
VALUES (
  'org-uuid',
  'sepa_export',
  '{"batchId":"BATCH-2026-02-001","organizationId":"org-uuid","invoiceIds":["inv-1"],"creditorName":"Test","creditorIban":"AT61...","creditorBic":"BKAUATWW","creditorId":"AT12ZZZ..."}'::jsonb,
  'pending'
);
```

## Verifizieren

```sql
-- Batch-Status prüfen
SELECT batch_id, status, psp_response, submitted_at FROM sepa_batches ORDER BY created_at DESC LIMIT 10;

-- Audit-Trail prüfen
SELECT record_id, action, new_data FROM audit_logs
WHERE table_name = 'sepa_batches' ORDER BY created_at DESC LIMIT 10;

-- Job-Queue-Status
SELECT id, job_type, status, error FROM job_queue
WHERE job_type = 'sepa_export' ORDER BY created_at DESC LIMIT 10;
```

## Batch-Lifecycle

| Status | Beschreibung |
|--------|-------------|
| `created` | Batch angelegt, noch nicht verarbeitet |
| `prepared` | XML generiert, bereit zur Einreichung |
| `submitted` | Erfolgreich an PSP übermittelt |
| `settled` | PSP bestätigt Ausführung |
| `failed` | Fehler bei Generierung oder Einreichung |

## Fehlerbehebung

1. **Status `failed`:** `sepa_batches.psp_response` und `job_queue.error` inspizieren
2. **Transiente PSP-Fehler (502/503):** Worker wiederholt automatisch (exponentielles Backoff, max. 3 Versuche)
3. **Persistente Fehler:** Ursache in Audit-Logs prüfen, ggf. Batch manuell zurücksetzen:

```sql
UPDATE sepa_batches SET status = 'created', psp_response = NULL WHERE batch_id = 'BATCH-XXX';
```

4. **XML-Validierung:** Das generierte XML (`sepa_batches.xml`) ist ISO 20022-konform (`pain.008.001.02` für Lastschriften, `pain.001.001.03` für Überweisungen)

## PSP-Adapter

- **Sandbox:** `server/adapters/sepa/psp-sandbox.ts` (95% Erfolgsrate, simulierte Latenz)
- **Produktion:** Eigenen PSP-Adapter implementieren und in `sepa-worker.ts` austauschen
