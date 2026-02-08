import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub;

  const url = new URL(req.url);
  // Extract groupId from query param
  const groupId = url.searchParams.get("groupId");

  try {
    if (req.method === "GET") {
      return await handleGet(supabase, groupId, corsHeaders);
    } else if (req.method === "POST") {
      const body = await req.json();
      return await handleMerge(supabase, groupId, body, userId, corsHeaders);
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[duplicate-merge] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleGet(
  supabase: ReturnType<typeof createClient>,
  groupId: string | null,
  headers: Record<string, string>
) {
  if (!groupId) {
    // List all duplicate groups
    const { data, error } = await supabase.rpc("get_duplicate_groups");
    if (error) {
      // Fallback: query directly
      const { data: lines, error: linesErr } = await supabase
        .from("invoice_lines")
        .select("id, invoice_id, unit_id, line_type, description, normalized_description, amount, tax_rate, meta, created_at")
        .order("created_at", { ascending: false });

      if (linesErr) {
        return new Response(JSON.stringify({ error: linesErr.message }), {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      // Group by composite key client-side
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

      return new Response(JSON.stringify({ groups: duplicates, total: duplicates.length }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Specific group: decode the composite key
  const parts = groupId.split("|");
  if (parts.length !== 4) {
    return new Response(JSON.stringify({ error: "Invalid groupId format" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const [invoiceId, unitId, lineType, normalizedDescription] = parts;

  const { data: rows, error } = await supabase
    .from("invoice_lines")
    .select("id, invoice_id, unit_id, line_type, description, normalized_description, amount, tax_rate, meta, created_at")
    .eq("invoice_id", invoiceId)
    .eq("unit_id", unitId)
    .eq("line_type", lineType)
    .eq("normalized_description", normalizedDescription)
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  if (!rows || rows.length < 2) {
    return new Response(JSON.stringify({ error: "GROUP_NOT_FOUND", message: "No duplicate group found" }), {
      status: 404,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const sorted = [...rows].sort(
    (a, b) =>
      Object.keys(b.meta || {}).length - Object.keys(a.meta || {}).length ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return new Response(
    JSON.stringify({
      groupId,
      invoiceId,
      unitId,
      lineType,
      normalizedDescription,
      rows: sorted,
      suggestedCanonicalId: sorted[0].id,
    }),
    {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    }
  );
}

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
  userId: string,
  headers: Record<string, string>
) {
  // Validation
  const errors: { field: string; message: string }[] = [];

  if (!body.canonicalId) errors.push({ field: "canonicalId", message: "Canonical ID is required" });
  if (!["keep_latest", "sum_amounts", "manual"].includes(body.mergePolicy)) {
    errors.push({ field: "mergePolicy", message: "Invalid merge policy" });
  }
  if (!body.auditComment || body.auditComment.trim().length < 5) {
    errors.push({ field: "auditComment", message: "Audit comment is required (min 5 characters)" });
  }
  if (!body.runId) errors.push({ field: "runId", message: "Run ID is required" });

  if (errors.length > 0) {
    return new Response(JSON.stringify({ error: "VALIDATION_ERROR", details: errors }), {
      status: 422,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  if (!groupId) {
    return new Response(JSON.stringify({ error: "groupId query param required" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const parts = groupId.split("|");
  if (parts.length !== 4) {
    return new Response(JSON.stringify({ error: "Invalid groupId format" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const [invoiceId, unitId, lineType, normalizedDescription] = parts;

  // Fetch all rows in the group
  const { data: rows, error: fetchErr } = await supabase
    .from("invoice_lines")
    .select("id, description, amount, tax_rate, meta, created_at")
    .eq("invoice_id", invoiceId)
    .eq("unit_id", unitId)
    .eq("line_type", lineType)
    .eq("normalized_description", normalizedDescription);

  if (fetchErr || !rows || rows.length < 2) {
    return new Response(
      JSON.stringify({ error: "GROUP_NOT_FOUND", message: "No duplicate group found or already resolved" }),
      { status: 404, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  const canonical = rows.find((r) => r.id === body.canonicalId);
  if (!canonical) {
    return new Response(
      JSON.stringify({ error: "VALIDATION_ERROR", details: [{ field: "canonicalId", message: "Canonical ID must be a member of the group" }] }),
      { status: 422, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  const deleteIds = rows.filter((r) => r.id !== body.canonicalId).map((r) => r.id);

  // Compute merged values
  let mergedAmount = canonical.amount;
  let mergedTaxRate = canonical.tax_rate;
  let mergedMeta = canonical.meta || {};

  if (body.mergePolicy === "sum_amounts") {
    mergedAmount = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
    // Deep merge all meta
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
      meta: { ...(mergedMeta as Record<string, unknown>), merged: true, merge_policy: body.mergePolicy },
      created_at: earliestCreatedAt,
    })
    .eq("id", body.canonicalId);

  if (updateErr) {
    console.error("[duplicate-merge] Update error:", updateErr);
    return new Response(JSON.stringify({ error: updateErr.message }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Delete non-canonical rows
  const { error: deleteErr } = await supabase
    .from("invoice_lines")
    .delete()
    .in("id", deleteIds);

  if (deleteErr) {
    console.error("[duplicate-merge] Delete error:", deleteErr);
    return new Response(JSON.stringify({ error: deleteErr.message }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Write audit log
  const { data: auditData, error: auditErr } = await supabase
    .from("audit_logs")
    .insert({
      user_id: userId,
      table_name: "invoice_lines",
      record_id: body.canonicalId,
      action: "duplicate_merge",
      old_data: { deleted_rows: rows.filter((r) => r.id !== body.canonicalId) },
      new_data: {
        run_id: body.runId,
        merge_policy: body.mergePolicy,
        deleted_ids: deleteIds,
        audit_comment: body.auditComment,
        merged_amount: mergedAmount,
      },
    })
    .select("id")
    .single();

  if (auditErr) {
    console.error("[duplicate-merge] Audit error:", auditErr);
  }

  console.log(
    `[duplicate-merge] Merged group=${groupId} canonical=${body.canonicalId} deleted=${deleteIds.length} policy=${body.mergePolicy}`
  );

  return new Response(
    JSON.stringify({
      status: "ok",
      canonicalId: body.canonicalId,
      mergedIds: deleteIds,
      deletedCount: deleteIds.length,
      auditLogId: auditData?.id || null,
      mergePolicy: body.mergePolicy,
    }),
    {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    }
  );
}
