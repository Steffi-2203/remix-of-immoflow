import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-TRIAL-EXPIRATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find all organizations where:
    // - subscription_status = 'trial'
    // - trial_ends_at < NOW()
    const { data: expiredTrials, error: selectError } = await supabaseClient
      .from('organizations')
      .select('id, name, trial_ends_at')
      .eq('subscription_status', 'trial')
      .lt('trial_ends_at', new Date().toISOString());

    if (selectError) {
      throw new Error(`Error fetching expired trials: ${selectError.message}`);
    }

    logStep("Found expired trials", { count: expiredTrials?.length || 0 });

    if (expiredTrials && expiredTrials.length > 0) {
      const orgIds = expiredTrials.map(org => org.id);
      
      // Update subscription_status to 'expired'
      const { error: updateError } = await supabaseClient
        .from('organizations')
        .update({ 
          subscription_status: 'expired',
          updated_at: new Date().toISOString()
        })
        .in('id', orgIds);

      if (updateError) {
        throw new Error(`Error updating organizations: ${updateError.message}`);
      }

      logStep("Updated organizations to expired", { orgIds });
    }

    return new Response(JSON.stringify({ 
      success: true,
      expired_count: expiredTrials?.length || 0,
      organizations: expiredTrials?.map(o => ({ id: o.id, name: o.name })) || []
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
