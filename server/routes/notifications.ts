import type { Express } from "express";
import { isAuthenticated } from "./helpers";
import { sendEmail } from "../lib/resend";
import { ROLE_LABELS } from "../lib/invoiceUtils";

export function registerNotificationRoutes(app: Express) {
  // Send invite email
  app.post("/api/functions/send-invite", isAuthenticated, async (req: any, res) => {
    try {
      const { email, inviteToken, organizationName, role, baseUrl } = req.body;

      const registrationUrl = `${baseUrl}/register?invite=${inviteToken}`;
      const roleLabel = ROLE_LABELS[role] || role;

      const result = await sendEmail({
        to: email,
        subject: `Einladung zu ${organizationName}`,
        html: `
          <!DOCTYPE html>
          <html lang="de">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">ImmoflowMe</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">Sie wurden eingeladen!</h2>
              <p style="color: #4b5563;">
                Sie wurden eingeladen, der Organisation <strong>${organizationName}</strong> als <strong>${roleLabel}</strong> beizutreten.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${registrationUrl}"
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Einladung annehmen
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
                Diese Einladung ist 7 Tage gültig.
              </p>
            </div>
          </body>
          </html>
        `,
      });

      res.json(result);
    } catch (error) {
      console.error("Error in send-invite:", error);
      res.status(500).json({ error: "Ein Fehler ist aufgetreten." });
    }
  });

  // Send generic message
  app.post("/api/functions/send-message", isAuthenticated, async (req: any, res) => {
    try {
      const { recipientEmail, subject, messageBody } = req.body;

      const emailResponse = await sendEmail({
        to: recipientEmail,
        subject: subject,
        html: `<div style="font-family: Arial, sans-serif;">${messageBody}</div>`,
      });

      res.json({ success: true, emailId: (emailResponse as any).data?.id });
    } catch (error) {
      console.error("Error in send-message:", error);
      res.status(500).json({ error: "Ein Fehler ist aufgetreten." });
    }
  });
}
