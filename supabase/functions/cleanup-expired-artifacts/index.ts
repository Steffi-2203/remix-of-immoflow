import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * P2-8c: Cron function to delete expired artifact metadata and associated storage files.
 * Schedule: daily at 03:00 UTC (configure via Supabase dashboard or cron extension).
 */
serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find expired artifacts
    const { data: expired, error: fetchError } = await supabase
      .from("artifact_metadata")
      .select("id, file_path, organization_id")
      .lt("expires_at", new Date().toISOString())
      .limit(500);

    if (fetchError) {
      console.error("Error fetching expired artifacts:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Delete storage objects
    const filePaths = expired.map((a: any) => a.file_path);
    const { error: storageError } = await supabase.storage
      .from("artifacts")
      .remove(filePaths);

    if (storageError) {
      console.warn("Storage deletion partially failed:", storageError);
    }

    // Delete metadata rows
    const ids = expired.map((a: any) => a.id);
    const { error: deleteError } = await supabase
      .from("artifact_metadata")
      .delete()
      .in("id", ids);

    if (deleteError) {
      console.error("Error deleting artifact metadata:", deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.info(`[cleanup-expired-artifacts] Deleted ${ids.length} expired artifacts`);

    return new Response(
      JSON.stringify({ deleted: ids.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Cleanup error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
