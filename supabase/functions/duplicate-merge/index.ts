import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UNDO_WINDOW_MINUTES = 120; // 2 hours for safe rollback within SLA

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return json({ error: "Unauthorized" }, 401);
  }
  const userId = claimsData.claims.sub;

  const url = new URL(req.url);
  const groupId = url.searchParams.get("groupId");
  const action = url.searchParams.get("action"); // "undo" | "pending-undos"

  try {
    if (action === "undo" && req.method === "POST") {
      return await handleUndo(supabase, await req.json(), userId);
    }
    if (action === "pending-undos" && req.method === "GET") {
      return await handleListPendingUndos(supabase);
    }
    if (req.method === "GET") {
      return await handleGet(supabase, groupId);
    }
    if (req.method === "POST") {
      return await handleMerge(supabase, groupId, await req.json(), userId);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("[duplicate-merge] Error:", err);
    return json({ error: "Internal server error", message: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── GET: list groups or single group ──

async function handleGet(
  supabase: ReturnType<typeof createClient>,
  groupId: string | null
) {
  if (!groupId) {
    // List all duplicate groups (only non-soft-deleted rows)
    const { data: lines, error: linesErr } = await supabase
      .from("invoice_lines")
      .select("id, invoice_id, unit_id, line_type, description, normalized_description, amount, tax_rate, meta, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (linesErr) return json({ error: linesErr.message }, 500);

    const groups = new Map<string, typeof lines>();
    for (const row of lines || []) {
      const key = `${row.invoice_id}|${row.unit_id}|${row.line_type}|${row.normalized_description}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    const duplicates = Array.from(groups.entries())
      .filter(([, rows]) => rows.length > 1)
      .map(([key, rows]) => {
        const [invoiceId, unitId, lineType, normalizedDescription] = key.split("|");
        const sorted = [...rows].sort(
          (a, b) =>
            Object.keys(b.meta || {}).length - Object.keys(a.meta || {}).length ||
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        return {
          groupId: key,
          invoiceId,
          unitId,
          lineType,
          normalizedDescription,
          rows: sorted,
          suggestedCanonicalId: sorted[0].id,
        };
      });

    return json({ groups: duplicates, total: duplicates.length });
  }

  // Single group
  const parts = groupId.split("|");
  if (parts.length !== 4) return json({ error: "Invalid groupId format" }, 400);

  const [invoiceId, unitId, lineType, normalizedDescription] = parts;

  const { data: rows, error } = await supabase
    .from("invoice_lines")
    .select("id, invoice_id, unit_id, line_type, description, normalized_description, amount, tax_rate, meta, created_at")
    .eq("invoice_id", invoiceId)
    .eq("unit_id", unitId)
    .eq("line_type", lineType)
    .eq("normalized_description", normalizedDescription)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) return json({ error: error.message }, 500);
  if (!rows || rows.length < 2) {
    return json({ error: "GROUP_NOT_FOUND", message: "No duplicate group found" }, 404);
  }

  const sorted = [...rows].sort(
    (a, b) =>
      Object.keys(b.meta || {}).length - Object.keys(a.meta || {}).length ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return json({
    groupId,
    invoiceId,
    unitId,
    lineType,
    normalizedDescription,
    rows: sorted,
    suggestedCanonicalId: sorted[0].id,
  });
}

// ── POST: soft-delete merge ──

async function handleMerge(
  supabase: ReturnType<typeof createClient>,
  groupId: string | null,
  body: {
    canonicalId: string;
    mergePolicy: string;
    mergedValues?: { amount?: number; taxRate?: number; meta?: Record<string, unknown> };
    auditComment: string;
    runId: string;
  },
  userId: string
) {
  // Validation
  const errors: { field: string; message: string }[] = [];
  if (!body.canonicalId) errors.push({ field: "canonicalId", message: "Required" });
  if (!["keep_latest", "sum_amounts", "manual"].includes(body.mergePolicy)) {
    errors.push({ field: "mergePolicy", message: "Invalid" });
  }
  if (!body.auditComment || body.auditComment.trim().length < 5) {
    errors.push({ field: "auditComment", message: "Min 5 chars" });
  }
  if (!body.runId) errors.push({ field: "runId", message: "Required" });
  if (errors.length > 0) return json({ error: "VALIDATION_ERROR", details: errors }, 422);
  if (!groupId) return json({ error: "groupId query param required" }, 400);

  const parts = groupId.split("|");
  if (parts.length !== 4) return json({ error: "Invalid groupId format" }, 400);
  const [invoiceId, unitId, lineType, normalizedDescription] = parts;

  // Fetch all active rows in the group
  const { data: rows, error: fetchErr } = await supabase
    .from("invoice_lines")
    .select("id, description, amount, tax_rate, meta, created_at")
    .eq("invoice_id", invoiceId)
    .eq("unit_id", unitId)
    .eq("line_type", lineType)
    .eq("normalized_description", normalizedDescription)
    .is("deleted_at", null);

  if (fetchErr || !rows || rows.length < 2) {
    return json({ error: "GROUP_NOT_FOUND", message: "No duplicate group found or already resolved" }, 404);
  }

  const canonical = rows.find((r) => r.id === body.canonicalId);
  if (!canonical) {
    return json({ error: "VALIDATION_ERROR", details: [{ field: "canonicalId", message: "Not a member of the group" }] }, 422);
  }

  const deleteIds = rows.filter((r) => r.id !== body.canonicalId).map((r) => r.id);
  const deletedRowsSnapshot = rows.filter((r) => r.id !== body.canonicalId);

  // Snapshot canonical BEFORE modification
  const canonicalBeforeSnapshot = { ...canonical };

  // Compute merged values
  let mergedAmount = canonical.amount;
  let mergedTaxRate = canonical.tax_rate;
  let mergedMeta: Record<string, unknown> = (canonical.meta as Record<string, unknown>) || {};

  if (body.mergePolicy === "sum_amounts") {
    mergedAmount = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
    for (const r of rows) {
      if (r.meta && typeof r.meta === "object") {
        mergedMeta = { ...mergedMeta, ...(r.meta as Record<string, unknown>) };
      }
    }
  } else if (body.mergePolicy === "manual" && body.mergedValues) {
    mergedAmount = body.mergedValues.amount ?? mergedAmount;
    mergedTaxRate = body.mergedValues.taxRate ?? mergedTaxRate;
    mergedMeta = body.mergedValues.meta ?? mergedMeta;
  }

  const earliestCreatedAt = rows.reduce(
    (min, r) => (r.created_at < min ? r.created_at : min),
    rows[0].created_at
  );

  // Update canonical row
  const { error: updateErr } = await supabase
    .from("invoice_lines")
    .update({
      amount: mergedAmount,
      tax_rate: mergedTaxRate,
      meta: { ...mergedMeta, merged: true, merge_policy: body.mergePolicy },
      created_at: earliestCreatedAt,
    })
    .eq("id", body.canonicalId);

  if (updateErr) {
    console.error("[duplicate-merge] Update error:", updateErr);
    return json({ error: updateErr.message }, 500);
  }

  // SOFT-DELETE non-canonical rows (set deleted_at instead of removing)
  const { error: softDeleteErr } = await supabase
    .from("invoice_lines")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", deleteIds);

  if (softDeleteErr) {
    console.error("[duplicate-merge] Soft-delete error:", softDeleteErr);
    return json({ error: softDeleteErr.message }, 500);
  }

  // Write audit log
  const { data: auditData, error: auditErr } = await supabase
    .from("audit_logs")
    .insert({
      user_id: userId,
      table_name: "invoice_lines",
      record_id: body.canonicalId,
      action: "duplicate_merge",
      old_data: { deleted_rows: deletedRowsSnapshot },
      new_data: {
        run_id: body.runId,
        merge_policy: body.mergePolicy,
        deleted_ids: deleteIds,
        audit_comment: body.auditComment,
        merged_amount: mergedAmount,
        soft_delete: true,
        undo_window_minutes: UNDO_WINDOW_MINUTES,
      },
    })
    .select("id")
    .single();

  if (auditErr) {
    console.error("[duplicate-merge] Audit error:", auditErr);
  }

  // Store tombstone for undo
  const { error: tombstoneErr } = await supabase
    .from("merge_tombstones")
    .insert({
      merge_audit_log_id: auditData?.id || "00000000-0000-0000-0000-000000000000",
      group_id: groupId,
      canonical_id: body.canonicalId,
      deleted_row_ids: deleteIds,
      deleted_rows_snapshot: deletedRowsSnapshot,
      canonical_before_snapshot: canonicalBeforeSnapshot,
      merge_policy: body.mergePolicy,
      merged_by: userId,
      expires_at: new Date(Date.now() + UNDO_WINDOW_MINUTES * 60 * 1000).toISOString(),
    });

  if (tombstoneErr) {
    console.error("[duplicate-merge] Tombstone error:", tombstoneErr);
  }

  console.log(
    `[duplicate-merge] Soft-merged group=${groupId} canonical=${body.canonicalId} soft-deleted=${deleteIds.length} policy=${body.mergePolicy} undo_window=${UNDO_WINDOW_MINUTES}min`
  );

  return json({
    status: "ok",
    canonicalId: body.canonicalId,
    mergedIds: deleteIds,
    deletedCount: deleteIds.length,
    auditLogId: auditData?.id || null,
    mergePolicy: body.mergePolicy,
    undoWindowMinutes: UNDO_WINDOW_MINUTES,
    undoExpiresAt: new Date(Date.now() + UNDO_WINDOW_MINUTES * 60 * 1000).toISOString(),
  });
}

// ── POST ?action=undo: revert a merge ──

async function handleUndo(
  supabase: ReturnType<typeof createClient>,
  body: { tombstoneId: string },
  userId: string
) {
  if (!body.tombstoneId) return json({ error: "tombstoneId required" }, 400);

  // Fetch tombstone
  const { data: tombstone, error: fetchErr } = await supabase
    .from("merge_tombstones")
    .select("*")
    .eq("id", body.tombstoneId)
    .is("undone_at", null)
    .is("purged_at", null)
    .single();

  if (fetchErr || !tombstone) {
    return json({ error: "TOMBSTONE_NOT_FOUND", message: "Undo record not found or already used" }, 404);
  }

  // Check undo window
  if (new Date(tombstone.expires_at) < new Date()) {
    return json({ error: "UNDO_EXPIRED", message: "Undo window has expired" }, 410);
  }

  // 1. Restore canonical row to before-snapshot
  const before = tombstone.canonical_before_snapshot as Record<string, unknown>;
  const { error: restoreCanonicalErr } = await supabase
    .from("invoice_lines")
    .update({
      amount: before.amount,
      tax_rate: before.tax_rate,
      meta: before.meta,
      created_at: before.created_at,
    })
    .eq("id", tombstone.canonical_id);

  if (restoreCanonicalErr) {
    console.error("[duplicate-merge] Undo restore canonical error:", restoreCanonicalErr);
    return json({ error: restoreCanonicalErr.message }, 500);
  }

  // 2. Un-soft-delete the removed rows
  const { error: undeleteErr } = await supabase
    .from("invoice_lines")
    .update({ deleted_at: null })
    .in("id", tombstone.deleted_row_ids);

  if (undeleteErr) {
    console.error("[duplicate-merge] Undo un-delete error:", undeleteErr);
    return json({ error: undeleteErr.message }, 500);
  }

  // 3. Mark tombstone as undone
  await supabase
    .from("merge_tombstones")
    .update({ undone_at: new Date().toISOString() })
    .eq("id", body.tombstoneId);

  // 4. Audit log for undo
  await supabase
    .from("audit_logs")
    .insert({
      user_id: userId,
      table_name: "invoice_lines",
      record_id: tombstone.canonical_id,
      action: "duplicate_merge_undo",
      old_data: { tombstone_id: body.tombstoneId, merge_audit_log_id: tombstone.merge_audit_log_id },
      new_data: { restored_ids: tombstone.deleted_row_ids, group_id: tombstone.group_id },
    });

  console.log(`[duplicate-merge] Undo merge tombstone=${body.tombstoneId} restored=${(tombstone.deleted_row_ids as string[]).length} rows`);

  return json({
    status: "undone",
    restoredCount: (tombstone.deleted_row_ids as string[]).length,
    canonicalId: tombstone.canonical_id,
    groupId: tombstone.group_id,
  });
}

// ── GET ?action=pending-undos: list active tombstones ──

async function handleListPendingUndos(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("merge_tombstones")
    .select("id, group_id, canonical_id, deleted_row_ids, merge_policy, merged_by, created_at, expires_at")
    .is("undone_at", null)
    .is("purged_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) return json({ error: error.message }, 500);
  return json({ tombstones: data || [] });
}
