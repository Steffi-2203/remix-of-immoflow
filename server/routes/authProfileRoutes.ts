import { Router } from "express";
import crypto from "crypto";
import { storage } from "../storage";
import { db } from "../db";
import * as schema from "@shared/schema";
import { isAuthenticated, requireAdminAccess, getUserRoles, getProfileFromSession, isTester, maskPersonalData, snakeToCamel, type AuthenticatedRequest } from "./helpers";
import { eq, and, desc, count } from "drizzle-orm";
import * as demoService from "../services/demoService";
import { runSimulation } from "../seed-2025-simulation";

const router = Router();

const ADMIN_EMAIL = "stephania.pfeffer@outlook.de";

router.get("/api/profile", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const profile = await storage.getProfileById(userId);
    
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    
    const roles = await storage.getUserRoles(profile.id);
    res.json({ ...profile, roles: roles.map(r => r.role) });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

router.get("/api/user/subscription", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const profile = await storage.getProfileById(userId);
    
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    
    const tier = (profile as any).subscriptionTier || 'trial';
    const trialEndsAt = (profile as any).trialEndsAt;
    const subscriptionEndsAt = (profile as any).subscriptionEndsAt;
    
    const now = new Date();
    const trialDaysRemaining = trialEndsAt 
      ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;
    
    const isTrialExpired = tier === 'trial' && trialEndsAt ? new Date(trialEndsAt) < now : false;
    const isSubscriptionExpired = subscriptionEndsAt ? new Date(subscriptionEndsAt) < now : false;
    
    res.json({
      tier,
      trialEndsAt,
      subscriptionEndsAt,
      trialDaysRemaining,
      isTrialExpired,
      isSubscriptionExpired,
    });
  } catch (error) {
    console.error("Subscription error:", error);
    res.status(500).json({ error: "Failed to get subscription" });
  }
});

router.get("/api/profile/organization", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.session?.userId;
    const profile = await storage.getProfileById(userId);
    
    if (!profile?.organizationId) {
      return res.json(null);
    }
    
    const org = await storage.getOrganization(profile.organizationId);
    res.json(org);
  } catch (error) {
    res.status(500).json({ error: "Failed to get organization" });
  }
});

router.post("/api/invites", isAuthenticated, requireAdminAccess(), async (req: AuthenticatedRequest, res) => {
  try {
    const userEmail = req.session?.email;
    const profile = await storage.getProfileByEmail(userEmail);
    
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization found" });
    }
    
    const roles = await storage.getUserRoles(profile.id);
    if (!roles.some(r => r.role === 'admin')) {
      return res.status(403).json({ error: "Only admins can send invites" });
    }
    
    const normalizedBody = snakeToCamel(req.body);
    const { email, role } = normalizedBody;
    
    if (!email || !role) {
      return res.status(400).json({ error: "Email and role are required" });
    }
    
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    const invite = await storage.createInvite({
      organizationId: profile.organizationId,
      email,
      role: role as any,
      token,
      expiresAt,
      invitedBy: profile.id,
    });
    
    const org = await storage.getOrganization(profile.organizationId);
    const inviteUrl = `${req.protocol}://${req.get('host')}/register?invite=${token}`;
    
    try {
      const { sendInviteEmail } = await import("../lib/resend");
      const emailResult = await sendInviteEmail({
        to: email,
        inviterName: profile.fullName || profile.email,
        organizationName: org?.name || 'ImmoFlowMe',
        role,
        inviteUrl,
      });
      console.log("Invite email sent successfully:", { to: email, inviteUrl, result: emailResult });
    } catch (emailError: any) {
      console.error("Email send error:", emailError?.message || emailError);
      console.error("Email error details:", JSON.stringify(emailError, null, 2));
    }
    
    res.json(invite);
  } catch (error) {
    console.error("Create invite error:", error);
    res.status(500).json({ error: "Failed to create invite" });
  }
});

router.get("/api/invites", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const userEmail = req.session?.email;
    const profile = await storage.getProfileByEmail(userEmail);
    
    if (!profile?.organizationId) {
      return res.json([]);
    }
    
    const invites = await storage.getInvitesByOrganization(profile.organizationId);
    res.json(invites);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invites" });
  }
});

router.get("/api/invites/:token", async (req, res) => {
  try {
    const invite = await storage.getInviteByToken(req.params.token);
    
    if (!invite) {
      return res.status(404).json({ error: "Invite not found" });
    }
    
    if (invite.status !== 'pending') {
      return res.status(400).json({ error: "Invite is no longer valid" });
    }
    
    if (new Date(invite.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Invite has expired" });
    }
    
    const org = await storage.getOrganization(invite.organizationId);
    res.json({ ...invite, organizationName: org?.name });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invite" });
  }
});

router.post("/api/invites/:token/accept", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
      const fullName = []
        .filter(Boolean).join(' ') || userEmail;
      profile = await storage.createProfile({
        email: userEmail,
        fullName,
        organizationId: invite.organizationId,
      });
    } else {
      await storage.updateProfile(profile.id, {
        organizationId: invite.organizationId,
      });
      profile = await storage.getProfileById(profile.id);
    }
    
    await storage.addUserRole(profile!.id, invite.role);
    
    await storage.updateInvite(invite.id, {
      status: 'accepted' as any,
      acceptedAt: new Date(),
    });
    
    res.json({ success: true, profile });
  } catch (error) {
    console.error("Accept invite error:", error);
    res.status(500).json({ error: "Failed to accept invite" });
  }
});

router.delete("/api/invites/:id", isAuthenticated, requireAdminAccess(), async (req: AuthenticatedRequest, res) => {
  try {
    const userEmail = req.session?.email;
    const profile = await storage.getProfileByEmail(userEmail);
    
    if (!profile?.organizationId) {
      return res.status(403).json({ error: "No organization found" });
    }
    
    const roles = await storage.getUserRoles(profile.id);
    if (!roles.some(r => r.role === 'admin')) {
      return res.status(403).json({ error: "Only admins can delete invites" });
    }
    
    await storage.deleteInvite(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete invite error:", error);
    res.status(500).json({ error: "Failed to delete invite" });
  }
});

router.get("/api/invites/token/:token", async (req, res) => {
  try {
    const invite = await storage.getInviteByToken(req.params.token);
    
    if (!invite) {
      return res.status(404).json({ error: "Invite not found" });
    }
    
    if (invite.status !== 'pending') {
      return res.status(400).json({ error: "Invite is no longer valid" });
    }
    
    if (new Date(invite.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Invite has expired" });
    }
    
    const org = await storage.getOrganization(invite.organizationId);
    res.json({ ...invite, organizationName: org?.name });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invite" });
  }
});

router.get("/api/organization/members", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const userEmail = req.session?.email;
    const profile = await storage.getProfileByEmail(userEmail);
    
    if (!profile?.organizationId) {
      return res.json([]);
    }
    
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

router.post("/api/organization/members/:memberId/roles", isAuthenticated, requireAdminAccess(), async (req: AuthenticatedRequest, res) => {
  try {
    const userEmail = req.session?.email;
    const profile = await storage.getProfileByEmail(userEmail);
    
    const roles = await storage.getUserRoles(profile!.id);
    if (!roles.some(r => r.role === 'admin')) {
      return res.status(403).json({ error: "Only admins can manage roles" });
    }
    
    const normalizedBody = snakeToCamel(req.body);
    const { role, action } = normalizedBody;
    const memberId = req.params.memberId;
    
    if (action === 'add') {
      await storage.addUserRole(memberId, role);
    } else if (action === 'remove') {
      await storage.removeUserRole(memberId, role);
    }
    
    const updatedRoles = await storage.getUserRoles(memberId);
    res.json({ roles: updatedRoles.map(r => r.role) });
  } catch (error) {
    res.status(500).json({ error: "Failed to update roles" });
  }
});

router.post("/api/admin/run-simulation", isAuthenticated, requireAdminAccess(), async (req, res) => {
  try {
    const result = await runSimulation();
    res.json({ 
      success: true, 
      message: 'Simulation 2025 erfolgreich erstellt',
      data: result 
    });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Simulation fehlgeschlagen' 
    });
  }
});

export default router;
