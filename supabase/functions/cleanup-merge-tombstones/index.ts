import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Compensating cleanup job: permanently deletes soft-deleted rows
// whose undo window has expired.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Find expired, non-undone, non-purged tombstones
    const { data: expired, error: fetchErr } = await supabase
      .from("merge_tombstones")
      .select("id, deleted_row_ids, canonical_id, group_id")
      .is("undone_at", null)
      .is("purged_at", null)
      .lt("expires_at", new Date().toISOString());

    if (fetchErr) {
      console.error("[cleanup-tombstones] Fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ status: "ok", purged: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalPurged = 0;

    for (const tombstone of expired) {
      const ids = tombstone.deleted_row_ids as string[];

      // Hard-delete the soft-deleted rows
      const { error: deleteErr } = await supabase
        .from("invoice_lines")
        .delete()
        .in("id", ids)
        .not("deleted_at", "is", null);

      if (deleteErr) {
        console.error(`[cleanup-tombstones] Delete error for tombstone ${tombstone.id}:`, deleteErr);
        continue;
      }

      // Mark tombstone as purged
      await supabase
        .from("merge_tombstones")
        .update({ purged_at: new Date().toISOString() })
        .eq("id", tombstone.id);

      totalPurged += ids.length;
      console.log(`[cleanup-tombstones] Purged tombstone=${tombstone.id} rows=${ids.length}`);
    }

    // Audit log for the cleanup
    await supabase
      .from("audit_logs")
      .insert({
        table_name: "invoice_lines",
        action: "merge_tombstone_cleanup",
        new_data: {
          purged_tombstones: expired.length,
          purged_rows: totalPurged,
        },
      });

    return new Response(
      JSON.stringify({ status: "ok", purged: totalPurged, tombstones: expired.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[cleanup-tombstones] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
