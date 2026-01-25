import { Express, Request, Response } from "express";
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

const PRICE_IDS: Record<string, { monthly: string; yearly: string }> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || 'price_starter_yearly',
  },
  professional: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly',
    yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || 'price_enterprise_yearly',
  },
};

function isAuthenticated(req: Request, res: Response, next: () => void) {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

async function getProfileById(id: string) {
  const result = await db.select().from(schema.profiles)
    .where(eq(schema.profiles.id, id)).limit(1);
  return result[0];
}

export function registerStripeRoutes(app: Express) {
  app.get("/api/stripe/config", async (_req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      console.error("Stripe config error:", error.message);
      res.status(500).json({ error: "Stripe not configured" });
    }
  });

  app.post("/api/stripe/create-checkout-session", isAuthenticated, async (req: any, res) => {
    try {
      const { tier, interval = 'monthly' } = req.body;
      const userId = req.session.userId;

      if (!tier || !['starter', 'professional', 'enterprise'].includes(tier)) {
        return res.status(400).json({ error: "Invalid tier" });
      }

      if (!['monthly', 'yearly'].includes(interval)) {
        return res.status(400).json({ error: "Invalid interval" });
      }

      const profile = await getProfileById(userId);
      if (!profile || !profile.organizationId) {
        return res.status(400).json({ error: "No organization found" });
      }

      const org = await db.select().from(schema.organizations)
        .where(eq(schema.organizations.id, profile.organizationId)).limit(1);

      if (!org[0]) {
        return res.status(400).json({ error: "Organization not found" });
      }

      const stripe = await getUncachableStripeClient();
      const priceId = PRICE_IDS[tier][interval as 'monthly' | 'yearly'];

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card', 'sepa_debit'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        customer_email: profile.email,
        metadata: {
          organizationId: profile.organizationId,
          userId: userId,
          tier: tier,
        },
        success_url: `${baseUrl}/einstellungen?tab=subscription&success=true`,
        cancel_url: `${baseUrl}/einstellungen?tab=subscription&cancelled=true`,
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      console.error("Checkout session error:", error.message);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/stripe/create-portal-session", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const profile = await getProfileById(userId);

      if (!profile || !profile.organizationId) {
        return res.status(400).json({ error: "No organization found" });
      }

      const org = await db.select().from(schema.organizations)
        .where(eq(schema.organizations.id, profile.organizationId)).limit(1);

      if (!org[0]) {
        return res.status(400).json({ error: "Organization not found" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      const customers = await stripe.customers.list({
        email: profile.email,
        limit: 1,
      });

      if (!customers.data[0]) {
        return res.status(400).json({ error: "No Stripe customer found" });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customers.data[0].id,
        return_url: `${baseUrl}/einstellungen?tab=subscription`,
      });

      res.json({ url: portalSession.url });
    } catch (error: any) {
      console.error("Portal session error:", error.message);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  app.get("/api/subscription/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const profile = await getProfileById(userId);

      if (!profile || !profile.organizationId) {
        return res.json({ 
          status: 'inactive',
          tier: 'starter',
          trialEndsAt: null,
        });
      }

      const org = await db.select().from(schema.organizations)
        .where(eq(schema.organizations.id, profile.organizationId)).limit(1);

      if (!org[0]) {
        return res.json({ 
          status: 'inactive',
          tier: 'starter',
          trialEndsAt: null,
        });
      }

      res.json({
        status: org[0].subscriptionStatus,
        tier: org[0].subscriptionTier,
        trialEndsAt: org[0].trialEndsAt,
      });
    } catch (error: any) {
      console.error("Subscription status error:", error.message);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });
}

export async function handleSubscriptionWebhook(event: any) {
  const { type, data } = event;

  if (type === 'checkout.session.completed') {
    const session = data.object;
    const organizationId = session.metadata?.organizationId;
    const tier = session.metadata?.tier || 'starter';

    if (organizationId) {
      await db.update(schema.organizations)
        .set({ 
          subscriptionStatus: 'active',
          subscriptionTier: tier as any,
          trialEndsAt: null,
        })
        .where(eq(schema.organizations.id, organizationId));
      
      console.log(`Subscription activated for organization ${organizationId}`);
    }
  }

  if (type === 'customer.subscription.updated') {
    const subscription = data.object;
    const status = subscription.status;
    
    if (status === 'canceled' || status === 'unpaid') {
      console.log('Subscription cancelled or unpaid');
    }
  }

  if (type === 'customer.subscription.deleted') {
    console.log('Subscription deleted');
  }
}
