import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLEANUP-EXPIRED-TRIALS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find all organizations with expired trials (trial status and trial_ends_at < now)
    const { data: expiredOrgs, error: orgsError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, trial_ends_at")
      .eq("subscription_status", "trial")
      .lt("trial_ends_at", new Date().toISOString());

    if (orgsError) {
      throw new Error(`Failed to fetch expired orgs: ${orgsError.message}`);
    }

    logStep("Found expired organizations", { count: expiredOrgs?.length || 0 });

    if (!expiredOrgs || expiredOrgs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No expired trials found", deleted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    let totalDeleted = 0;

    for (const org of expiredOrgs) {
      logStep("Processing organization", { orgId: org.id, name: org.name });

      // Get all users (profiles) in this organization
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("organization_id", org.id);

      if (profilesError) {
        logStep("Error fetching profiles", { error: profilesError.message });
        continue;
      }

      const userIds = profiles?.map(p => p.id) || [];
      logStep("Found users in org", { userIds });

      if (userIds.length === 0) continue;

      // Get all properties managed by these users
      const { data: propertyManagers, error: pmError } = await supabaseAdmin
        .from("property_managers")
        .select("property_id")
        .in("user_id", userIds);

      if (pmError) {
        logStep("Error fetching property managers", { error: pmError.message });
        continue;
      }

      const propertyIds = propertyManagers?.map(pm => pm.property_id) || [];
      logStep("Found properties to delete", { count: propertyIds.length });

      if (propertyIds.length > 0) {
        // Get all units for these properties
        const { data: units } = await supabaseAdmin
          .from("units")
          .select("id")
          .in("property_id", propertyIds);

        const unitIds = units?.map(u => u.id) || [];

        // Get all tenants for these units
        const { data: tenants } = await supabaseAdmin
          .from("tenants")
          .select("id")
          .in("unit_id", unitIds);

        const tenantIds = tenants?.map(t => t.id) || [];

        // Get all settlements for these properties
        const { data: settlements } = await supabaseAdmin
          .from("operating_cost_settlements")
          .select("id")
          .in("property_id", propertyIds);

        const settlementIds = settlements?.map(s => s.id) || [];

        // Delete in order (respecting foreign keys)
        
        // 1. Delete settlement items
        if (settlementIds.length > 0) {
          await supabaseAdmin
            .from("settlement_items")
            .delete()
            .in("settlement_id", settlementIds);
          logStep("Deleted settlement items");
        }

        // 2. Delete operating cost settlements
        if (propertyIds.length > 0) {
          await supabaseAdmin
            .from("operating_cost_settlements")
            .delete()
            .in("property_id", propertyIds);
          logStep("Deleted operating cost settlements");
        }

        // 3. Delete payments (by tenant)
        if (tenantIds.length > 0) {
          await supabaseAdmin
            .from("payments")
            .delete()
            .in("tenant_id", tenantIds);
          logStep("Deleted payments");
        }

        // 4. Delete monthly invoices
        if (unitIds.length > 0) {
          await supabaseAdmin
            .from("monthly_invoices")
            .delete()
            .in("unit_id", unitIds);
          logStep("Deleted monthly invoices");
        }

        // 5. Delete tenants
        if (unitIds.length > 0) {
          // First, we need to bypass the deletion trigger temporarily
          // We'll update the status to allow deletion
          await supabaseAdmin
            .from("tenants")
            .delete()
            .in("unit_id", unitIds);
          logStep("Deleted tenants");
        }

        // 6. Delete unit documents
        if (unitIds.length > 0) {
          await supabaseAdmin
            .from("unit_documents")
            .delete()
            .in("unit_id", unitIds);
          logStep("Deleted unit documents");
        }

        // 7. Delete units
        if (propertyIds.length > 0) {
          await supabaseAdmin
            .from("units")
            .delete()
            .in("property_id", propertyIds);
          logStep("Deleted units");
        }

        // 8. Delete property documents
        if (propertyIds.length > 0) {
          await supabaseAdmin
            .from("property_documents")
            .delete()
            .in("property_id", propertyIds);
          logStep("Deleted property documents");
        }

        // 9. Delete expenses
        if (propertyIds.length > 0) {
          await supabaseAdmin
            .from("expenses")
            .delete()
            .in("property_id", propertyIds);
          logStep("Deleted expenses");
        }

        // 10. Delete property managers
        if (propertyIds.length > 0) {
          await supabaseAdmin
            .from("property_managers")
            .delete()
            .in("property_id", propertyIds);
          logStep("Deleted property managers");
        }

        // 11. Delete properties
        await supabaseAdmin
          .from("properties")
          .delete()
          .in("id", propertyIds);
        logStep("Deleted properties", { count: propertyIds.length });

        totalDeleted += propertyIds.length;
      }

      // Update organization status to expired
      await supabaseAdmin
        .from("organizations")
        .update({ subscription_status: "expired" })
        .eq("id", org.id);

      logStep("Updated organization status to expired", { orgId: org.id });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cleanup completed`, 
        orgsProcessed: expiredOrgs.length,
        propertiesDeleted: totalDeleted 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
