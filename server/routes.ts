import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerFunctionRoutes } from "./functions";
import crypto from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/organizations", async (_req, res) => {
    try {
      const orgs = await storage.getOrganizations();
      res.json(orgs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });

  app.get("/api/properties", async (_req, res) => {
    try {
      const props = await storage.getProperties();
      res.json(props);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  app.get("/api/properties/:propertyId/units", async (req, res) => {
    try {
      const units = await storage.getUnitsByProperty(req.params.propertyId);
      res.json(units);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch units" });
    }
  });

  app.get("/api/units/:unitId/tenants", async (req, res) => {
    try {
      const tenants = await storage.getTenantsByUnit(req.params.unitId);
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  app.get("/api/tenants", async (_req, res) => {
    try {
      const tenants = await storage.getTenants();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  app.get("/api/tenants/:id", async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenant" });
    }
  });

  app.get("/api/invoices", async (req, res) => {
    try {
      const { year, month } = req.query;
      const invoices = await storage.getMonthlyInvoices(
        year ? parseInt(year as string) : undefined,
        month ? parseInt(month as string) : undefined
      );
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/tenants/:tenantId/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoicesByTenant(req.params.tenantId);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenant invoices" });
    }
  });

  app.get("/api/tenants/:tenantId/payments", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByTenant(req.params.tenantId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenant payments" });
    }
  });

  app.get("/api/properties/:propertyId/expenses", async (req, res) => {
    try {
      const { year } = req.query;
      const expenses = await storage.getExpensesByProperty(
        req.params.propertyId,
        year ? parseInt(year as string) : undefined
      );
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.get("/api/bank-accounts", async (_req, res) => {
    try {
      const accounts = await storage.getBankAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bank accounts" });
    }
  });

  app.get("/api/bank-accounts/:id/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByBankAccount(req.params.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/properties/:propertyId/settlements", async (req, res) => {
    try {
      const settlements = await storage.getSettlementsByProperty(req.params.propertyId);
      res.json(settlements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settlements" });
    }
  });

  app.get("/api/properties/:propertyId/maintenance-contracts", async (req, res) => {
    try {
      const contracts = await storage.getMaintenanceContractsByProperty(req.params.propertyId);
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch maintenance contracts" });
    }
  });

  app.get("/api/maintenance-tasks", async (req, res) => {
    try {
      const { status } = req.query;
      const tasks = await storage.getMaintenanceTasks(status as string | undefined);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch maintenance tasks" });
    }
  });

  app.get("/api/contractors", async (_req, res) => {
    try {
      const contractors = await storage.getContractors();
      res.json(contractors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contractors" });
    }
  });

  app.get("/api/distribution-keys", async (_req, res) => {
    try {
      const keys = await storage.getDistributionKeys();
      res.json(keys);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch distribution keys" });
    }
  });

  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user?.claims?.email;
      if (!userEmail) {
        return res.status(400).json({ error: "No email found" });
      }
      
      let profile = await storage.getProfileByEmail(userEmail);
      
      if (!profile) {
        const fullName = [req.user?.claims?.first_name, req.user?.claims?.last_name]
          .filter(Boolean).join(' ') || userEmail;
        profile = await storage.createProfile({
          email: userEmail,
          fullName,
        });
      }
      
      const roles = await storage.getUserRoles(profile.id);
      res.json({ ...profile, roles: roles.map(r => r.role) });
    } catch (error) {
      console.error("Profile error:", error);
      res.status(500).json({ error: "Failed to get profile" });
    }
  });

  app.get("/api/profile/organization", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user?.claims?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      
      if (!profile?.organizationId) {
        return res.json(null);
      }
      
      const org = await storage.getOrganization(profile.organizationId);
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Failed to get organization" });
    }
  });

  app.post("/api/invites", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user?.claims?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization found" });
      }
      
      const roles = await storage.getUserRoles(profile.id);
      if (!roles.some(r => r.role === 'admin')) {
        return res.status(403).json({ error: "Only admins can send invites" });
      }
      
      const { email, role } = req.body;
      
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
        const { sendInviteEmail } = await import("./lib/resend");
        await sendInviteEmail({
          to: email,
          inviterName: profile.fullName || profile.email,
          organizationName: org?.name || 'ImmoflowMe',
          role,
          inviteUrl,
        });
      } catch (emailError) {
        console.error("Email send error:", emailError);
      }
      
      res.json(invite);
    } catch (error) {
      console.error("Create invite error:", error);
      res.status(500).json({ error: "Failed to create invite" });
    }
  });

  app.get("/api/invites", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user?.claims?.email;
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

  app.get("/api/invites/:token", async (req, res) => {
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

  app.post("/api/invites/:token/accept", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user?.claims?.email;
      const invite = await storage.getInviteByToken(req.params.token);
      
      if (!invite || invite.status !== 'pending' || new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Invalid or expired invite" });
      }
      
      if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
        return res.status(403).json({ error: "This invite is for a different email address" });
      }
      
      let profile = await storage.getProfileByEmail(userEmail);
      
      if (!profile) {
        const fullName = [req.user?.claims?.first_name, req.user?.claims?.last_name]
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

  app.get("/api/organization/members", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user?.claims?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      
      if (!profile?.organizationId) {
        return res.json([]);
      }
      
      const members = await storage.getProfilesByOrganization(profile.organizationId);
      
      const membersWithRoles = await Promise.all(
        members.map(async (member) => {
          const roles = await storage.getUserRoles(member.id);
          return { ...member, roles: roles.map(r => r.role) };
        })
      );
      
      res.json(membersWithRoles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.post("/api/organization/members/:memberId/roles", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user?.claims?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      
      const roles = await storage.getUserRoles(profile!.id);
      if (!roles.some(r => r.role === 'admin')) {
        return res.status(403).json({ error: "Only admins can manage roles" });
      }
      
      const { role, action } = req.body;
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

  registerFunctionRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
