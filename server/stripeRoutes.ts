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

const USER_PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_USER_PRICE_STARTER || 'price_user_starter_monthly',
  pro: process.env.STRIPE_USER_PRICE_PRO || 'price_user_pro_monthly',
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

  app.post("/api/stripe/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const { planId } = req.body;
      const userId = req.session.userId;

      if (!planId || !['starter', 'pro'].includes(planId)) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const profile = await getProfileById(userId);
      if (!profile) {
        return res.status(400).json({ error: "Profile not found" });
      }

      const stripe = await getUncachableStripeClient();
      const priceId = USER_PRICE_IDS[planId];

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      let customerId = (profile as any).stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: profile.email,
          metadata: { userId: userId },
        });
        customerId = customer.id;
        
        await db.update(schema.profiles)
          .set({ stripeCustomerId: customer.id } as any)
          .where(eq(schema.profiles.id, userId));
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card', 'sepa_debit'],
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: {
          userId: userId,
          planId: planId,
          type: 'user_subscription',
        },
        success_url: `${baseUrl}/checkout?plan=${planId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("User checkout session error:", error.message);
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
    
    if (session.metadata?.type === 'user_subscription') {
      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId;
      const subscriptionId = session.subscription;
      
      if (userId && planId) {
        const subscriptionEndsAt = new Date();
        subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
        
        // Get the user's profile and current role to check if they're a tester/trial user
        const profile = await db.select().from(schema.profiles)
          .where(eq(schema.profiles.id, userId)).limit(1);
        
        // Check if user is a tester (trial user who should become admin after purchase)
        const existingRole = await db.select().from(schema.userRoles)
          .where(eq(schema.userRoles.userId, userId)).limit(1);
        
        const currentRole = existingRole[0]?.role || 'viewer';
        const isTesterOrTrial = currentRole === 'tester' || currentRole === 'viewer';
        
        if (profile[0] && profile[0].organizationId && isTesterOrTrial) {
          const orgId = profile[0].organizationId;
          
          // Find and demote the current admin(s) ONLY in this specific organization
          const currentAdmins = await db.select().from(schema.userRoles)
            .where(eq(schema.userRoles.role, 'admin'));
          
          for (const adminRole of currentAdmins) {
            // Get the profile of this admin
            const adminProfile = await db.select().from(schema.profiles)
              .where(eq(schema.profiles.id, adminRole.userId)).limit(1);
            
            // Only demote if they are in the SAME organization AND not the purchasing user
            if (adminProfile[0]?.organizationId === orgId && adminRole.userId !== userId) {
              // Demote to property_manager instead of removing
              await db.update(schema.userRoles)
                .set({ role: 'property_manager' })
                .where(eq(schema.userRoles.userId, adminRole.userId));
              
              console.log(`Demoted previous admin ${adminRole.userId} to property_manager in org ${orgId}`);
            }
          }
          
          // Promote the tester to admin
          if (existingRole[0]) {
            await db.update(schema.userRoles)
              .set({ role: 'admin' })
              .where(eq(schema.userRoles.userId, userId));
          } else {
            await db.insert(schema.userRoles).values({
              userId: userId,
              role: 'admin',
            });
          }
          
          // Map user plan to org subscription tier correctly
          const orgTier = planId === 'pro' ? 'professional' : 'starter';
          
          // Update organization subscription status
          await db.update(schema.organizations)
            .set({ 
              subscriptionStatus: 'active',
              subscriptionTier: orgTier as any,
              trialEndsAt: null,
            })
            .where(eq(schema.organizations.id, orgId));
          
          console.log(`Tester ${userId} promoted to admin after purchasing ${planId} plan (org tier: ${orgTier})`);
        }
        
        // Update user profile subscription
        await db.update(schema.profiles)
          .set({ 
            subscriptionTier: planId as any,
            stripeSubscriptionId: subscriptionId,
            subscriptionEndsAt: subscriptionEndsAt,
            trialEndsAt: null,
          } as any)
          .where(eq(schema.profiles.id, userId));
        
        console.log(`User subscription activated for user ${userId} with plan ${planId}`);
      }
    } else {
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

  if (type === 'invoice.paid') {
    const invoice = data.object;
    const subscriptionId = invoice.subscription;
    
    if (subscriptionId) {
      const subscriptionEndsAt = new Date();
      subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
      
      await db.update(schema.profiles)
        .set({ 
          subscriptionEndsAt: subscriptionEndsAt,
        } as any)
        .where(eq((schema.profiles as any).stripeSubscriptionId, subscriptionId));
    }
  }
}
