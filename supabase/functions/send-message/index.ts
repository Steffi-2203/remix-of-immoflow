import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MessageRequest {
  messageId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  messageBody: string;
  senderName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { messageId, recipientEmail, recipientName, subject, messageBody, senderName }: MessageRequest = await req.json();

    if (!recipientEmail || !subject || !messageBody) {
      return new Response(
        JSON.stringify({ error: "Empfänger, Betreff und Nachricht sind erforderlich" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create HTML email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #4f46e5;">${subject}</h2>
          </div>
          
          <p>Sehr geehrte/r ${recipientName || 'Empfänger'},</p>
          
          <div style="white-space: pre-wrap; line-height: 1.6;">
${messageBody}
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 12px;">
            Diese Nachricht wurde von ${senderName || 'Ihrer Hausverwaltung'} gesendet.
          </p>
        </body>
      </html>
    `;

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${senderName || 'Hausverwaltung'} <onboarding@resend.dev>`,
        to: [recipientEmail],
        subject: subject,
        html: htmlContent,
      }),
    });

    const emailData = await emailResponse.json();

    console.log("Email sent successfully:", emailData);

    // Update message record with sent timestamp
    if (messageId) {
      const { error: updateError } = await supabase
        .from("messages")
        .update({ 
          sent_at: new Date().toISOString(),
          status: 'sent'
        })
        .eq("id", messageId);

      if (updateError) {
        console.error("Error updating message status:", updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "E-Mail erfolgreich gesendet",
        emailId: emailData?.id 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-message function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Fehler beim Senden der E-Mail" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
