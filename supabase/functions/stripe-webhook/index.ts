import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Map Stripe product IDs to subscription tiers
const PRODUCT_TO_TIER: Record<string, string> = {
  'prod_TjJF402Fz7UoVB': 'starter',
  'prod_TjJFK60F3qLg02': 'professional',
  'prod_TjJFbvPbDQsy3j': 'premium',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    
    logStep("Environment variables verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified", { eventType: event.type });
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      logStep("Webhook signature verification failed", { error: errMessage });
      return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout.session.completed", { 
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription,
          customerEmail: session.customer_email
        });

        if (session.mode === "subscription" && session.subscription) {
          // Get subscription details to determine the tier
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const productId = subscription.items.data[0]?.price?.product as string;
          const tier = PRODUCT_TO_TIER[productId] || 'starter';

          logStep("Subscription details retrieved", { productId, tier });

          // Find organization by customer email
          const customerEmail = session.customer_email || session.customer_details?.email;
          if (!customerEmail) {
            logStep("No customer email found in session");
            break;
          }

          // Get profile by email to find organization
          const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('organization_id')
            .eq('email', customerEmail)
            .single();

          if (profileError || !profile?.organization_id) {
            logStep("Profile not found", { email: customerEmail, error: profileError?.message });
            break;
          }

          // Update organization
          const { error: updateError } = await supabaseClient
            .from('organizations')
            .update({
              subscription_status: 'active',
              subscription_tier: tier,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              trial_ends_at: null,
            })
            .eq('id', profile.organization_id);

          if (updateError) {
            logStep("Failed to update organization", { error: updateError.message });
          } else {
            logStep("Organization updated successfully", { 
              organizationId: profile.organization_id, 
              tier, 
              status: 'active' 
            });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.updated", { 
          subscriptionId: subscription.id,
          status: subscription.status
        });

        // Map Stripe status to our status
        let subscriptionStatus: string;
        switch (subscription.status) {
          case 'active':
            subscriptionStatus = 'active';
            break;
          case 'past_due':
          case 'unpaid':
            subscriptionStatus = 'expired';
            break;
          case 'canceled':
            subscriptionStatus = 'cancelled';
            break;
          case 'trialing':
            subscriptionStatus = 'trial';
            break;
          default:
            subscriptionStatus = 'active';
        }

        // Get the new tier if product changed
        const productId = subscription.items.data[0]?.price?.product as string;
        const tier = PRODUCT_TO_TIER[productId] || 'starter';

        // Update organization by stripe_subscription_id
        const { error: updateError } = await supabaseClient
          .from('organizations')
          .update({
            subscription_status: subscriptionStatus,
            subscription_tier: tier,
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          logStep("Failed to update organization", { error: updateError.message });
        } else {
          logStep("Subscription updated", { status: subscriptionStatus, tier });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.deleted", { subscriptionId: subscription.id });

        // Update organization by stripe_subscription_id
        const { error: updateError } = await supabaseClient
          .from('organizations')
          .update({
            subscription_status: 'cancelled',
            stripe_subscription_id: null,
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          logStep("Failed to update organization", { error: updateError.message });
        } else {
          logStep("Subscription cancelled successfully");
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
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
