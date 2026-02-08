# Rollback Playbook — Billing Runs & Merge Recovery

> **Ziel**: Jeder fehlerhafte Run kann innerhalb von **< 2 Stunden** sicher rückgängig gemacht oder reprocessed werden.
> **Letzte Aktualisierung**: 2026-02-08

---

## Übersicht

| Szenario | Methode | SLA | Automatisiert? |
|----------|---------|-----|----------------|
| Fehlerhafter Billing Run | Rollback + Reprocess | < 30 min | ✅ Admin-UI |
| Fehlerhafte Duplikat-Zusammenführung | Undo via Tombstone | < 2h | ✅ Admin-UI |
| Tombstone abgelaufen | Manueller SQL-Restore | < 2h | ⚠️ SQL |
| Korrupte Daten nach Run | Soft-Delete + Reprocess | < 1h | ✅ Admin-UI |

---

## 1. Billing Run Rollback

### Wann?
- Run hat fehlerhafte Daten erzeugt (falsche Beträge, doppelte Zeilen)
- Run hat Status `completed`, `failed`, oder `in_progress`

### Schritte (Admin-UI)

1. Navigiere zu **Admin → Abstimmung → Runs**
2. Wähle den fehlerhaften Run
3. Klicke **Rollback** → Grund eingeben
4. System führt automatisch aus:
   - Soft-Delete aller vom Run erzeugten `invoice_lines` (via `deleted_at`)
   - Run-Status → `rolled_back`
   - Audit-Log-Eintrag `billing_run_rollback`
5. Verifiziere: Keine aktiven Zeilen mehr für diesen Run

### Schritte (SQL — Notfall)

```sql
-- 1. Identifiziere betroffene Zeilen
SELECT count(*) FROM audit_logs
WHERE (action = 'invoice_line_upsert' OR action = 'upsert_missing_lines')
  AND new_data->>'run_id' = '<RUN_ID>';

-- 2. Soft-Delete
UPDATE invoice_lines
SET deleted_at = now()
WHERE id::text IN (
  SELECT DISTINCT record_id FROM audit_logs
  WHERE (action = 'invoice_line_upsert' OR action = 'upsert_missing_lines')
    AND new_data->>'run_id' = '<RUN_ID>'
    AND record_id IS NOT NULL
)
AND deleted_at IS NULL;

-- 3. Run-Status aktualisieren
UPDATE billing_runs
SET status = 'rolled_back',
    error_message = 'Manual rollback: <GRUND>',
    finished_at = now(),
    updated_at = now()
WHERE run_id = '<RUN_ID>';

-- 4. Audit-Log
INSERT INTO audit_logs (user_id, table_name, record_id, action, new_data)
VALUES (
  '<ADMIN_USER_ID>',
  'billing_runs',
  (SELECT id::text FROM billing_runs WHERE run_id = '<RUN_ID>'),
  'billing_run_rollback',
  jsonb_build_object('run_id', '<RUN_ID>', 'reason', 'Manual rollback', 'method', 'sql')
);
```

---

## 2. Reprocess nach Rollback

### Wann?
- Nach erfolgreichem Rollback
- Run hat Status `rolled_back`, `failed`, oder `cancelled`

### Schritte (Admin-UI)

1. Navigiere zum gerollbackten Run
2. Klicke **Reprocess**
3. Run-Status → `pending_reprocess`
4. Nächster Billing-Zyklus verarbeitet automatisch

### Schritte (SQL)

```sql
UPDATE billing_runs
SET status = 'pending_reprocess',
    error_message = NULL,
    updated_at = now()
WHERE run_id = '<RUN_ID>'
  AND status IN ('failed', 'rolled_back', 'cancelled');
```

---

## 3. Duplikat-Merge Undo

### Wann?
- Merge war fehlerhaft (falscher Canonical, falsche Policy)
- Innerhalb des **2-Stunden-Undo-Fensters**

### Schritte (Admin-UI)

1. Navigiere zu **Admin → Abstimmung → Duplikate**
2. Im **Undo-Panel** oben den betroffenen Merge finden
3. Klicke **Undo** (Countdown zeigt verbleibende Zeit)
4. System führt automatisch aus:
   - Canonical-Row → Zustand vor Merge wiederherstellt
   - Soft-gelöschte Rows → `deleted_at = NULL`
   - Tombstone → `undone_at` gesetzt
   - Audit-Log `duplicate_merge_undo`

### Nach Ablauf des Undo-Fensters (SQL)

```sql
-- 1. Tombstone-Snapshot lesen
SELECT canonical_before_snapshot, deleted_rows_snapshot, deleted_row_ids
FROM merge_tombstones
WHERE id = '<TOMBSTONE_ID>';

-- 2. Canonical manuell wiederherstellen
UPDATE invoice_lines
SET amount = <ORIGINAL_AMOUNT>,
    tax_rate = <ORIGINAL_TAX_RATE>,
    meta = '<ORIGINAL_META>'::jsonb,
    created_at = '<ORIGINAL_CREATED_AT>'
WHERE id = '<CANONICAL_ID>';

-- 3. Soft-gelöschte Rows wiederherstellen
UPDATE invoice_lines
SET deleted_at = NULL
WHERE id = ANY(ARRAY['<ID1>', '<ID2>']::uuid[]);

-- 4. Tombstone als undone markieren
UPDATE merge_tombstones
SET undone_at = now()
WHERE id = '<TOMBSTONE_ID>';

-- 5. Audit-Log
INSERT INTO audit_logs (user_id, table_name, record_id, action, new_data)
VALUES ('<ADMIN_USER_ID>', 'invoice_lines', '<CANONICAL_ID>',
        'duplicate_merge_undo', '{"method": "manual_sql", "tombstone_id": "<TOMBSTONE_ID>"}'::jsonb);
```

---

## 4. Tombstone Cleanup (Kompensierender Job)

Die Edge Function `cleanup-merge-tombstones` läuft periodisch und:
- Findet abgelaufene, nicht-undone Tombstones
- Hard-Deletes die soft-gelöschten Rows
- Markiert Tombstones als `purged_at`

### Manuell auslösen

```bash
curl -X POST \
  'https://<PROJECT_REF>.supabase.co/functions/v1/cleanup-merge-tombstones' \
  -H 'Authorization: Bearer <SERVICE_ROLE_KEY>'
```

---

## 5. Verifizierungs-Checkliste

Nach jedem Rollback/Undo diese Checks durchführen:

```sql
-- ✅ Keine aktiven Duplikate
SELECT count(*) FROM (
  SELECT invoice_id, unit_id, line_type, normalized_description
  FROM invoice_lines
  WHERE deleted_at IS NULL
  GROUP BY 1, 2, 3, 4
  HAVING count(*) > 1
) sub;
-- Erwartung: 0

-- ✅ Audit-Trail vollständig
SELECT action, count(*) FROM audit_logs
WHERE created_at >= now() - interval '2 hours'
  AND action IN ('billing_run_rollback', 'duplicate_merge_undo', 'billing_run_reprocess')
GROUP BY 1;

-- ✅ Keine verwaisten soft-deleted Rows ohne Tombstone
SELECT count(*) FROM invoice_lines il
WHERE il.deleted_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM merge_tombstones mt
    WHERE il.id::text = ANY(mt.deleted_row_ids::text[])
  )
  AND NOT EXISTS (
    SELECT 1 FROM audit_logs al
    WHERE al.record_id = il.id::text
      AND al.action = 'billing_run_rollback'
  );
-- Erwartung: 0
```

---

## 6. Eskalationsmatrix

| Eskalationsstufe | Situation | Aktion |
|------------------|-----------|--------|
| L1 — Self-Service | Run fehlgeschlagen, < 2h alt | Admin-UI: Rollback + Reprocess |
| L2 — DBA | Tombstone abgelaufen, Daten nötig | SQL-Restore aus Snapshot |
| L3 — Engineering | Korruption über mehrere Runs | Point-in-Time Recovery aus Backup |

---

## 7. Akzeptanzkriterien

- [x] Fehlerhafter Run kann innerhalb **< 2h** gerollt werden (UI oder SQL)
- [x] Rollback ist **audit-geloggt** und **idempotent** (wiederholbar ohne Fehler)
- [x] Merge-Undo hat **2h-Fenster** mit Countdown in der UI
- [x] Kompensierender Cleanup-Job purged abgelaufene Tombstones
- [x] Verifizierungs-Checkliste bestätigt Datenintegrität nach Recovery
