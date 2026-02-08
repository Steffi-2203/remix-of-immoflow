import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "./lib/resend";
import { createAuditLog, getClientInfo } from "./lib/auditLog";

const SALT_ROUNDS = 12;
const ADMIN_EMAIL = "stephania.pfeffer@outlook.de";
const PASSWORD_RESET_EXPIRY_HOURS = 24;
const MIN_PASSWORD_LENGTH = 10;

function validatePasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein`;
  }
  let categories = 0;
  if (/[a-z]/.test(password)) categories++;
  if (/[A-Z]/.test(password)) categories++;
  if (/[0-9]/.test(password)) categories++;
  if (/[^a-zA-Z0-9]/.test(password)) categories++;
  if (categories < 3) {
    return "Passwort muss mindestens 3 der folgenden enthalten: Kleinbuchstaben, Großbuchstaben, Ziffern, Sonderzeichen";
  }
  return null;
}

async function logAuthEvent(req: Request, action: string, email: string, userId: string | null, success: boolean, details?: Record<string, any>) {
  const { ipAddress, userAgent } = getClientInfo(req);
  await createAuditLog({
    userId: userId || undefined,
    tableName: 'auth',
    recordId: userId || email,
    action: action as any,
    newData: { email, success, ...details },
    ipAddress,
    userAgent,
  });
}

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

      const passwordError = validatePasswordStrength(password);
      if (passwordError) {
        await logAuthEvent(req, 'register_failed', email, null, false, { reason: 'weak_password' });
        return res.status(400).json({ error: passwordError });
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
      
      await logAuthEvent(req, 'register', emailLower, profile.id, true);

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
        await logAuthEvent(req, 'login_failed', email.toLowerCase(), null, false, { reason: 'unknown_email' });
        return res.status(401).json({ error: "Ungültige E-Mail oder Passwort" });
      }

      const isValid = await bcrypt.compare(password, profile.passwordHash);
      
      if (!isValid) {
        await logAuthEvent(req, 'login_failed', email.toLowerCase(), profile.id, false, { reason: 'wrong_password' });
        return res.status(401).json({ error: "Ungültige E-Mail oder Passwort" });
      }

      req.session.userId = profile.id;
      req.session.email = profile.email;

      const roles = await getUserRoles(profile.id);
      
      await logAuthEvent(req, 'login', profile.email, profile.id, true);

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

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    const userId = req.session?.userId || null;
    const email = req.session?.email || 'unknown';
    
    await logAuthEvent(req, 'logout', email, userId, true);
    
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName = isProduction ? '__Secure-immo_sid' : 'immo_sid';
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Abmeldung fehlgeschlagen" });
      }
      res.clearCookie(cookieName, {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
      });
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

      const passwordError = validatePasswordStrength(password);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
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
