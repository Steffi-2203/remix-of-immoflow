# UI Spec: Guided Duplicate Resolution Modal

> **Status**: Draft  
> **Author**: System  
> **Date**: 2026-02-08  
> **Component**: `DuplicateResolutionDialog`

---

## 1. Overview

A modal dialog that guides operators through resolving duplicate `invoice_lines` groups detected by the normalization precheck. The modal presents all rows in a collision group, suggests a canonical winner, previews the merge result, and commits the resolution with a mandatory audit comment.

---

## 2. Wireframe Description

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠ Duplikat auflösen — Gruppe #g-3a7f                  [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Normalisiert: "grundmiete jänner 2026"                     │
│  Invoice: INV-2026-01-042  │  Unit: Top 3  │  Typ: miete   │
│                                                             │
│  ┌─ Zeilen in dieser Gruppe ──────────────────────────────┐ │
│  │  ○  ID ...a1f2  │ 450.00 € │ 2026-01-01 │ meta: {}    │ │
│  │  ◉  ID ...b3c4  │ 450.00 € │ 2026-01-15 │ meta: {src} │ │  ← suggested
│  │  ○  ID ...d5e6  │ 448.50 € │ 2026-01-03 │ meta: {}    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Merge-Vorschau ──────────────────────────────────────┐  │
│  │  Canonical ID:    ...b3c4                             │  │
│  │  Betrag:          450.00 €       [✎ Edit]             │  │
│  │  Meta:            {"src":"ocr"} [✎ Edit]              │  │
│  │  Policy:  ● Neueste behalten  ○ Summe  ○ Manuell     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Audit-Kommentar *                                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Duplikat durch OCR-Reimport entstanden              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Zu löschende Zeilen: 2                                     │
│                                                             │
│         [ Abbrechen ]              [ Merge bestätigen ✓ ]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model

### 3.1 Duplicate Group (from API)

```json
{
  "groupId": "g-3a7f",
  "invoiceId": "inv-2026-01-042",
  "unitId": "unit-top3",
  "lineType": "miete",
  "normalizedDescription": "grundmiete jänner 2026",
  "rows": [
    {
      "id": "a1f2-...",
      "description": "Grundmiete Jänner 2026",
      "amount": 450.00,
      "taxRate": 0.10,
      "meta": {},
      "createdAt": "2026-01-01T08:00:00Z"
    },
    {
      "id": "b3c4-...",
      "description": "Grundmiete  Jänner   2026",
      "amount": 450.00,
      "taxRate": 0.10,
      "meta": { "src": "ocr" },
      "createdAt": "2026-01-15T14:30:00Z"
    },
    {
      "id": "d5e6-...",
      "description": "grundmiete jänner 2026",
      "amount": 448.50,
      "taxRate": 0.10,
      "meta": {},
      "createdAt": "2026-01-03T09:15:00Z"
    }
  ],
  "suggestedCanonicalId": "b3c4-..."
}
```

### 3.2 Merge Policies

| Policy          | Key             | Behavior                                          |
|-----------------|-----------------|---------------------------------------------------|
| Neueste behalten | `keep_latest`  | Use amount/meta from row with latest `created_at` |
| Summe           | `sum_amounts`   | Sum all amounts; merge all meta objects            |
| Manuell         | `manual`        | Operator edits amount and meta directly            |

---

## 4. Canonical Row Selection Logic

**Default suggestion** (computed client-side):

```typescript
const suggestCanonical = (rows: DuplicateRow[]): string => {
  // 1. Prefer row with richest meta (most keys)
  // 2. Break tie by latest created_at
  // 3. Break tie by highest amount
  return [...rows]
    .sort((a, b) => {
      const metaDiff = Object.keys(b.meta || {}).length - Object.keys(a.meta || {}).length;
      if (metaDiff !== 0) return metaDiff;
      const dateDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.amount - a.amount;
    })[0].id;
};
```

---

## 5. Merge Preview

The preview panel updates reactively based on selected canonical + policy:

| Field       | `keep_latest`                  | `sum_amounts`                         | `manual`           |
|-------------|--------------------------------|---------------------------------------|--------------------|
| `amount`    | canonical row amount           | `Σ row.amount` (all rows)             | user input         |
| `taxRate`   | canonical row tax rate         | canonical row tax rate                | user input         |
| `meta`      | canonical row meta             | deep merge all meta (`Object.assign`) | user input (JSON)  |
| `createdAt` | `MIN(all rows.createdAt)`      | `MIN(all rows.createdAt)`             | earliest           |

---

## 6. API Endpoints

### 6.1 `GET /api/duplicates/:groupId`

Returns the full duplicate group for resolution.

**Response `200`**:

```json
{
  "groupId": "g-3a7f",
  "invoiceId": "inv-2026-01-042",
  "unitId": "unit-top3",
  "lineType": "miete",
  "normalizedDescription": "grundmiete jänner 2026",
  "rows": [ /* ... see §3.1 */ ],
  "suggestedCanonicalId": "b3c4-..."
}
```

**Response `404`**:

```json
{ "error": "GROUP_NOT_FOUND", "message": "No duplicate group with id g-xxxx" }
```

### 6.2 `POST /api/duplicates/:groupId/merge`

Executes the merge within a transaction.

**Request**:

```json
{
  "canonicalId": "b3c4-...",
  "mergePolicy": "keep_latest",
  "mergedValues": {
    "amount": 450.00,
    "taxRate": 0.10,
    "meta": { "src": "ocr", "merged": true }
  },
  "auditComment": "Duplikat durch OCR-Reimport entstanden",
  "runId": "manual-20260208-fix42"
}
```

**Response `200`**:

```json
{
  "canonicalId": "b3c4-...",
  "deletedIds": ["a1f2-...", "d5e6-..."],
  "deletedCount": 2,
  "auditLogId": "audit-9f8e-...",
  "mergePolicy": "keep_latest"
}
```

**Response `409` (already resolved)**:

```json
{
  "error": "ALREADY_RESOLVED",
  "message": "Group g-3a7f has already been merged",
  "resolvedAt": "2026-02-08T10:00:00Z"
}
```

**Response `422` (validation)**:

```json
{
  "error": "VALIDATION_ERROR",
  "details": [
    { "field": "auditComment", "message": "Audit comment is required" },
    { "field": "canonicalId", "message": "Canonical ID must be a member of the group" }
  ]
}
```

### 6.3 Server-Side Transaction (Pseudocode)

```sql
BEGIN;

-- 1. Update canonical row with merged values
UPDATE invoice_lines
SET amount = $amount,
    tax_rate = $taxRate,
    meta = $mergedMeta,
    created_at = LEAST(created_at, $earliestCreatedAt)
WHERE id = $canonicalId;

-- 2. Delete non-canonical rows
DELETE FROM invoice_lines
WHERE id = ANY($deletedIds);

-- 3. Audit log
INSERT INTO audit_logs (user_id, table_name, record_id, action, old_data, new_data)
VALUES (
  $userId,
  'invoice_lines',
  $canonicalId,
  'duplicate_merge',
  $oldDataJsonb,
  jsonb_build_object(
    'run_id', $runId,
    'merge_policy', $mergePolicy,
    'deleted_ids', $deletedIds,
    'audit_comment', $auditComment
  )
);

COMMIT;
```

---

## 7. Validation Rules

| Field            | Rule                                                    | Error Message                                  |
|------------------|---------------------------------------------------------|------------------------------------------------|
| `canonicalId`    | Must be UUID and member of the group's `rows[].id`      | "Canonical ID must be a member of the group"   |
| `mergePolicy`    | Must be one of `keep_latest`, `sum_amounts`, `manual`   | "Invalid merge policy"                         |
| `auditComment`   | Required, 5–500 characters, trimmed                     | "Audit comment is required (min 5 characters)" |
| `mergedValues.amount` | Required, number ≥ 0, max 2 decimal places         | "Amount must be a non-negative number"         |
| `mergedValues.taxRate` | 0.00–1.00                                          | "Tax rate must be between 0% and 100%"         |
| `mergedValues.meta`   | Valid JSON object, max 4 KB                         | "Meta must be valid JSON (max 4 KB)"           |
| `runId`          | Required, 1–100 characters, alphanumeric + hyphens      | "Run ID is required"                           |

---

## 8. Error States & UX

| State                        | Behavior                                                           |
|------------------------------|--------------------------------------------------------------------|
| Group already resolved       | Show info banner, disable merge button, link to audit log          |
| Network error on load        | Retry button with exponential backoff, toast with error            |
| Merge fails (500)            | Show error toast, keep modal open, no data lost                    |
| Conflict (409)               | Show "Already resolved" banner, auto-refresh group                 |
| Validation error (422)       | Highlight invalid fields with red border, show inline messages     |
| Canonical row deleted mid-edit | On submit → 404 → show "Row no longer exists", force refresh    |
| Empty audit comment          | Disable merge button, show helper text under textarea              |

---

## 9. Component Props

```typescript
interface DuplicateResolutionDialogProps {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved: (result: MergeResult) => void;
}

interface MergeResult {
  canonicalId: string;
  deletedIds: string[];
  deletedCount: number;
  auditLogId: string;
  mergePolicy: 'keep_latest' | 'sum_amounts' | 'manual';
}
```

---

## 10. Accessibility

- Radio group for canonical selection uses `role="radiogroup"` with `aria-label="Kanonische Zeile wählen"`
- Merge policy radio uses descriptive labels, not just icons
- Audit comment textarea has `aria-required="true"`
- Confirm button disabled state announced via `aria-disabled`
- Focus trapped within modal; `Escape` closes without action
- Deleted row count announced via `aria-live="polite"` region
