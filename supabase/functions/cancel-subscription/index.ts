import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's organization
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      throw new Error("Organization not found");
    }

    // Get organization's Stripe subscription ID
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('stripe_subscription_id, subscription_status')
      .eq('id', profile.organization_id)
      .single();

    if (orgError || !org) {
      throw new Error("Organization data not found");
    }

    if (!org.stripe_subscription_id) {
      throw new Error("No active subscription found");
    }

    if (org.subscription_status === 'cancelled') {
      throw new Error("Subscription is already cancelled");
    }

    logStep("Found subscription", { subscriptionId: org.stripe_subscription_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Cancel subscription at period end (user can still use until end of billing period)
    const subscription = await stripe.subscriptions.update(org.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    logStep("Subscription cancelled at period end", { 
      subscriptionId: subscription.id,
      cancelAt: subscription.cancel_at,
      currentPeriodEnd: subscription.current_period_end
    });

    // Update organization status to cancelled
    const { error: updateError } = await supabaseClient
      .from('organizations')
      .update({ 
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.organization_id);

    if (updateError) {
      logStep("Warning: Failed to update organization status", { error: updateError });
    }

    return new Response(JSON.stringify({ 
      success: true,
      cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
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
