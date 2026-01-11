import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  inviteToken: string;
  organizationName: string;
  role: string;
  baseUrl: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  property_manager: "Hausverwalter",
  finance: "Buchhalter",
  viewer: "Betrachter",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read key at request-time so updated secrets work without a redeploy/cold start
    const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { email, inviteToken, organizationName, role, baseUrl }: InviteEmailRequest =
      await req.json();

    const registrationUrl = `${baseUrl}/register?invite=${inviteToken}`;
    const roleLabel = ROLE_LABELS[role] || role;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "ImmoflowMe <onboarding@resend.dev>",
        to: [email],
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
              
              <p style="color: #4b5563;">
                Klicken Sie auf den folgenden Button, um Ihr Konto zu erstellen und der Organisation beizutreten:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${registrationUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Einladung annehmen
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">
                Oder kopieren Sie diesen Link in Ihren Browser:<br>
                <a href="${registrationUrl}" style="color: #667eea; word-break: break-all;">${registrationUrl}</a>
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
                Diese Einladung ist 7 Tage gültig. Wenn Sie diese Einladung nicht angefordert haben, können Sie diese E-Mail ignorieren.
              </p>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
              © ${new Date().getFullYear()} ImmoflowMe. Alle Rechte vorbehalten.
            </p>
          </body>
          </html>
        `,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${res.status}`);
    }

    const data = await res.json();
    console.log("Invite email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in send-invite function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
