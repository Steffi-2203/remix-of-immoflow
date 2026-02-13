import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";
import { isAuthenticated, snakeToCamel, getProfileFromSession, getUserRoles, isTester, maskPersonalData } from "./helpers";
import crypto from "crypto";

export function registerOrganizationRoutes(app: Express) {
  app.get("/api/organizations", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.json([]);
      const org = await storage.getOrganization(profile.organizationId);
      res.json(org ? [org] : []);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });

  app.patch("/api/organizations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const profile = await getProfileFromSession(req);
      if (profile?.organizationId !== id) return res.status(403).json({ error: "Not authorized" });
      const roles = await getUserRoles(req);
      if (!roles.some((r: any) => r.role === 'admin')) return res.status(403).json({ error: "Admin required" });
      const { name, iban, bic, sepa_creditor_id, brandName, logoUrl, primaryColor, supportEmail } = req.body;
      const updated = await db.update(schema.organizations)
        .set({
          ...(name !== undefined && { name }),
          ...(iban !== undefined && { iban }),
          ...(bic !== undefined && { bic }),
          ...(sepa_creditor_id !== undefined && { sepaCreditorId: sepa_creditor_id }),
          ...(brandName !== undefined && { brandName }),
          ...(logoUrl !== undefined && { logoUrl }),
          ...(primaryColor !== undefined && { primaryColor }),
          ...(supportEmail !== undefined && { supportEmail }),
          updatedAt: new Date(),
        })
        .where(eq(schema.organizations.id, id))
        .returning();
      res.json(updated[0]);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ error: "Failed to update organization" });
    }
  });

  // Profile
  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const profile = await storage.getProfileById(userId);
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      const roles = await storage.getUserRoles(profile.id);
      res.json({ ...profile, roles: roles.map(r => r.role) });
    } catch (error) {
      console.error("Profile error:", error);
      res.status(500).json({ error: "Failed to get profile" });
    }
  });

  app.get("/api/user/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const profile = await storage.getProfileById(userId);
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      const tier = (profile as any).subscriptionTier || 'trial';
      const trialEndsAt = (profile as any).trialEndsAt;
      const subscriptionEndsAt = (profile as any).subscriptionEndsAt;
      const now = new Date();
      const trialDaysRemaining = trialEndsAt
        ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null;
      const isTrialExpired = tier === 'trial' && trialEndsAt ? new Date(trialEndsAt) < now : false;
      const isSubscriptionExpired = subscriptionEndsAt ? new Date(subscriptionEndsAt) < now : false;
      res.json({ tier, trialEndsAt, subscriptionEndsAt, trialDaysRemaining, isTrialExpired, isSubscriptionExpired });
    } catch (error) {
      console.error("Subscription error:", error);
      res.status(500).json({ error: "Failed to get subscription" });
    }
  });

  app.get("/api/profile/organization", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const profile = await storage.getProfileById(userId);
      if (!profile?.organizationId) return res.json(null);
      const org = await storage.getOrganization(profile.organizationId);
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Failed to get organization" });
    }
  });

  // Invites
  app.post("/api/invites", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization found" });
      const roles = await storage.getUserRoles(profile.id);
      if (!roles.some(r => r.role === 'admin')) return res.status(403).json({ error: "Only admins can send invites" });
      const normalizedBody = snakeToCamel(req.body);
      const { email, role } = normalizedBody;
      if (!email || !role) return res.status(400).json({ error: "Email and role are required" });
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const invite = await storage.createInvite({
        organizationId: profile.organizationId, email, role: role as any, token, expiresAt, invitedBy: profile.id,
      });
      const org = await storage.getOrganization(profile.organizationId);
      const inviteUrl = `${req.protocol}://${req.get('host')}/register?invite=${token}`;
      try {
        const { sendInviteEmail } = await import("../lib/resend");
        await sendInviteEmail({ to: email, inviterName: profile.fullName || profile.email, organizationName: org?.name || 'ImmoflowMe', role, inviteUrl });
      } catch (emailError: any) {
        console.error("Email send error:", emailError?.message || emailError);
      }
      res.json(invite);
    } catch (error) {
      console.error("Create invite error:", error);
      res.status(500).json({ error: "Failed to create invite" });
    }
  });

  app.get("/api/invites", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      if (!profile?.organizationId) return res.json([]);
      const invites = await storage.getInvitesByOrganization(profile.organizationId);
      res.json(invites);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invites" });
    }
  });

  app.get("/api/invites/:token", async (req, res) => {
    try {
      const invite = await storage.getInviteByToken(req.params.token);
      if (!invite) return res.status(404).json({ error: "Invite not found" });
      if (invite.status !== 'pending') return res.status(400).json({ error: "Invite is no longer valid" });
      if (new Date(invite.expiresAt) < new Date()) return res.status(400).json({ error: "Invite has expired" });
      const org = await storage.getOrganization(invite.organizationId);
      res.json({ ...invite, organizationName: org?.name });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invite" });
    }
  });

  app.post("/api/invites/:token/accept", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const invite = await storage.getInviteByToken(req.params.token);
      if (!invite || invite.status !== 'pending' || new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Invalid or expired invite" });
      }
      if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
        return res.status(403).json({ error: "This invite is for a different email address" });
      }
      let profile = await storage.getProfileByEmail(userEmail);
      if (!profile) {
        const fullName = [].filter(Boolean).join(' ') || userEmail;
        profile = await storage.createProfile({ email: userEmail, fullName, organizationId: invite.organizationId });
      } else {
        await storage.updateProfile(profile.id, { organizationId: invite.organizationId });
        profile = await storage.getProfileById(profile.id);
      }
      await storage.addUserRole(profile!.id, invite.role);
      await storage.updateInvite(invite.id, { status: 'accepted' as any, acceptedAt: new Date() });
      res.json({ success: true, profile });
    } catch (error) {
      console.error("Accept invite error:", error);
      res.status(500).json({ error: "Failed to accept invite" });
    }
  });

  app.delete("/api/invites/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization found" });
      const roles = await storage.getUserRoles(profile.id);
      if (!roles.some(r => r.role === 'admin')) return res.status(403).json({ error: "Only admins can delete invites" });
      await storage.deleteInvite(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete invite error:", error);
      res.status(500).json({ error: "Failed to delete invite" });
    }
  });

  app.get("/api/invites/token/:token", async (req, res) => {
    try {
      const invite = await storage.getInviteByToken(req.params.token);
      if (!invite) return res.status(404).json({ error: "Invite not found" });
      if (invite.status !== 'pending') return res.status(400).json({ error: "Invite is no longer valid" });
      if (new Date(invite.expiresAt) < new Date()) return res.status(400).json({ error: "Invite has expired" });
      const org = await storage.getOrganization(invite.organizationId);
      res.json({ ...invite, organizationName: org?.name });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invite" });
    }
  });

  // Team members
  app.get("/api/organization/members", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      if (!profile?.organizationId) return res.json([]);
      const members = await storage.getProfilesByOrganization(profile.organizationId);
      const membersWithRoles = await Promise.all(
        members.map(async (member) => {
          const memberRoles = await storage.getUserRoles(member.id);
          return { ...member, roles: memberRoles.map(r => r.role) };
        })
      );
      const userRoles = await getUserRoles(req);
      res.json(isTester(userRoles) ? maskPersonalData(membersWithRoles) : membersWithRoles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.post("/api/organization/members/:memberId/roles", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      const roles = await storage.getUserRoles(profile!.id);
      if (!roles.some(r => r.role === 'admin')) return res.status(403).json({ error: "Only admins can manage roles" });
      const normalizedBody = snakeToCamel(req.body);
      const { role, action } = normalizedBody;
      const memberId = req.params.memberId;
      if (action === 'add') await storage.addUserRole(memberId, role);
      else if (action === 'remove') await storage.removeUserRole(memberId, role);
      const updatedRoles = await storage.getUserRoles(memberId);
      res.json({ roles: updatedRoles.map(r => r.role) });
    } catch (error) {
      res.status(500).json({ error: "Failed to update roles" });
    }
  });
}
