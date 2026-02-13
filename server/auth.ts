import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "./lib/resend";

const SALT_ROUNDS = 12;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "stephania.pfeffer@outlook.de";
const PASSWORD_RESET_EXPIRY_HOURS = 24;

declare module "express-session" {
  interface SessionData {
    userId: string;
    email: string;
  }
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

async function getProfileByEmail(email: string) {
  const result = await db.select().from(schema.profiles)
    .where(eq(schema.profiles.email, email.toLowerCase())).limit(1);
  return result[0];
}

async function getProfileById(id: string) {
  const result = await db.select().from(schema.profiles)
    .where(eq(schema.profiles.id, id)).limit(1);
  return result[0];
}

async function getUserRoles(userId: string) {
  return db.select().from(schema.userRoles)
    .where(eq(schema.userRoles.userId, userId));
}

async function getPendingInviteByEmail(email: string) {
  const result = await db.select().from(schema.organizationInvites)
    .where(and(
      eq(schema.organizationInvites.email, email.toLowerCase()),
      eq(schema.organizationInvites.status, 'pending')
    )).limit(1);
  return result[0];
}

export function setupAuth(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, fullName, token } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "E-Mail und Passwort sind erforderlich" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Passwort muss mindestens 8 Zeichen lang sein" });
      }

      const emailLower = email.toLowerCase();
      
      const existingProfile = await getProfileByEmail(emailLower);
      if (existingProfile?.passwordHash) {
        return res.status(400).json({ error: "Ein Konto mit dieser E-Mail existiert bereits" });
      }

      const isAdmin = emailLower === ADMIN_EMAIL.toLowerCase();
      let invite = null;
      
      if (!isAdmin) {
        if (token) {
          const result = await db.select().from(schema.organizationInvites)
            .where(and(
              eq(schema.organizationInvites.token, token),
              eq(schema.organizationInvites.status, 'pending')
            )).limit(1);
          invite = result[0];
          
          if (!invite) {
            return res.status(400).json({ error: "Ungültiger oder abgelaufener Einladungstoken" });
          }
          
          if (invite.email.toLowerCase() !== emailLower) {
            return res.status(400).json({ error: "Diese Einladung ist für eine andere E-Mail-Adresse" });
          }
          
          if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
            return res.status(400).json({ error: "Diese Einladung ist abgelaufen" });
          }
        } else {
          const pendingInvite = await getPendingInviteByEmail(emailLower);
          if (!pendingInvite) {
            return res.status(403).json({ 
              error: "Zugriff verweigert. Nur eingeladene Benutzer können sich registrieren.",
              code: "NOT_AUTHORIZED"
            });
          }
          invite = pendingInvite;
        }
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      
      let profile = existingProfile;
      
      if (profile) {
        const updated = await db.update(schema.profiles)
          .set({ passwordHash, fullName: fullName || profile.fullName, updatedAt: new Date() })
          .where(eq(schema.profiles.id, profile.id))
          .returning();
        profile = updated[0];
      } else {
        const created = await db.insert(schema.profiles).values({
          email: emailLower,
          passwordHash,
          fullName: fullName || emailLower,
        }).returning();
        profile = created[0];
      }

      if (isAdmin) {
        let adminOrg = await db.select().from(schema.organizations)
          .where(eq(schema.organizations.name, "ImmoflowMe Admin")).limit(1);
        
        if (!adminOrg[0]) {
          const newOrg = await db.insert(schema.organizations).values({
            name: "ImmoflowMe Admin",
            subscriptionStatus: 'active',
            subscriptionTier: 'enterprise',
          }).returning();
          adminOrg = newOrg;
        }
        
        await db.update(schema.profiles)
          .set({ organizationId: adminOrg[0].id })
          .where(eq(schema.profiles.id, profile.id));
        
        const existingRole = await db.select().from(schema.userRoles)
          .where(eq(schema.userRoles.userId, profile.id)).limit(1);
        
        if (!existingRole[0]) {
          await db.insert(schema.userRoles).values({
            userId: profile.id,
            role: 'admin',
          });
        }
      } else if (invite) {
        await db.update(schema.profiles)
          .set({ organizationId: invite.organizationId })
          .where(eq(schema.profiles.id, profile.id));
        
        const existingRole = await db.select().from(schema.userRoles)
          .where(eq(schema.userRoles.userId, profile.id)).limit(1);
        
        if (!existingRole[0]) {
          await db.insert(schema.userRoles).values({
            userId: profile.id,
            role: invite.role,
          });
        }
        
        await db.update(schema.organizationInvites)
          .set({ status: 'accepted', acceptedAt: new Date() })
          .where(eq(schema.organizationInvites.id, invite.id));
      }

      req.session.userId = profile.id;
      req.session.email = profile.email;

      const roles = await getUserRoles(profile.id);
      
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Session konnte nicht gespeichert werden" });
        }
        
        res.json({
          id: profile.id,
          email: profile.email,
          fullName: profile.fullName,
          organizationId: profile.organizationId,
          roles: roles.map(r => r.role),
        });
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "Registrierung fehlgeschlagen" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "E-Mail und Passwort sind erforderlich" });
      }

      const profile = await getProfileByEmail(email.toLowerCase());
      
      if (!profile || !profile.passwordHash) {
        return res.status(401).json({ error: "Ungültige E-Mail oder Passwort" });
      }

      const isValid = await bcrypt.compare(password, profile.passwordHash);
      
      if (!isValid) {
        return res.status(401).json({ error: "Ungültige E-Mail oder Passwort" });
      }

      req.session.userId = profile.id;
      req.session.email = profile.email;

      const roles = await getUserRoles(profile.id);
      
      // Ensure session is saved before sending response
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Session konnte nicht gespeichert werden" });
        }
        
        res.json({
          id: profile.id,
          email: profile.email,
          fullName: profile.fullName,
          organizationId: profile.organizationId,
          roles: roles.map(r => r.role),
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Anmeldung fehlgeschlagen" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Abmeldung fehlgeschlagen" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Erfolgreich abgemeldet" });
    });
  });

  app.get("/api/auth/user", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const profile = await getProfileById(req.session.userId);
      
      if (!profile) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "Unauthorized" });
      }

      const roles = await getUserRoles(profile.id);
      
      res.json({
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        organizationId: profile.organizationId,
        roles: roles.map(r => r.role),
        subscriptionTier: (profile as any).subscriptionTier,
        paymentStatus: (profile as any).paymentStatus,
        paymentFailedAt: (profile as any).paymentFailedAt,
        canceledAt: (profile as any).canceledAt,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "E-Mail ist erforderlich" });
      }

      const profile = await getProfileByEmail(email.toLowerCase());
      
      if (profile) {
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000);
        
        await db.insert(schema.passwordResetTokens).values({
          userId: profile.id,
          token,
          expiresAt,
        });

        const resetUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/reset-password?token=${token}`;
        
        await sendEmail({
          to: profile.email,
          subject: "Passwort zurücksetzen - ImmoflowMe",
          html: `
            <h2>Passwort zurücksetzen</h2>
            <p>Hallo ${profile.fullName || 'Nutzer'},</p>
            <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
            <p>Klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen:</p>
            <p><a href="${resetUrl}">Passwort zurücksetzen</a></p>
            <p>Dieser Link ist ${PASSWORD_RESET_EXPIRY_HOURS} Stunden gültig.</p>
            <p>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.</p>
            <p>Mit freundlichen Grüßen,<br>Ihr ImmoflowMe Team</p>
          `,
        });
      }

      res.json({ message: "Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail zum Zurücksetzen des Passworts gesendet." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Fehler beim Senden der E-Mail" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ error: "Token und Passwort sind erforderlich" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Passwort muss mindestens 8 Zeichen lang sein" });
      }

      const resetTokenResult = await db.select().from(schema.passwordResetTokens)
        .where(eq(schema.passwordResetTokens.token, token)).limit(1);
      
      const resetToken = resetTokenResult[0];
      
      if (!resetToken) {
        return res.status(400).json({ error: "Ungültiger Token" });
      }

      if (resetToken.usedAt) {
        return res.status(400).json({ error: "Dieser Token wurde bereits verwendet" });
      }

      if (new Date(resetToken.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Dieser Token ist abgelaufen" });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      await db.update(schema.profiles)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(schema.profiles.id, resetToken.userId));

      await db.update(schema.passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(schema.passwordResetTokens.id, resetToken.id));

      res.json({ message: "Passwort wurde erfolgreich zurückgesetzt" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Passwort zurücksetzen fehlgeschlagen" });
    }
  });
}
