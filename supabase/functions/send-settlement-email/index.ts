import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Authentication helper
async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid authorization header' };
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data.user) {
    return { user: null, error: 'Invalid or expired token' };
  }
  
  return { user: data.user, error: null };
}

interface SettlementEmailRequest {
  settlementItemId: string;
  propertyName: string;
  propertyAddress: string;
  unitTopNummer: string;
  tenantName: string;
  tenantEmail: string;
  year: number;
  bkAnteil: number;
  hkAnteil: number;
  bkVorschuss: number;
  hkVorschuss: number;
  bkSaldo: number;
  hkSaldo: number;
  gesamtSaldo: number;
  isLeerstandBK: boolean;
  isLeerstandHK: boolean;
}

function formatCurrency(amount: number): string {
  return `€ ${amount.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-settlement-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || 'Authentication required' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const data: SettlementEmailRequest = await req.json();
    console.log("Received data:", JSON.stringify(data));

    const {
      settlementItemId,
      propertyName,
      propertyAddress,
      unitTopNummer,
      tenantName,
      tenantEmail,
      year,
      bkAnteil,
      hkAnteil,
      bkVorschuss,
      hkVorschuss,
      bkSaldo,
      hkSaldo,
      gesamtSaldo,
      isLeerstandBK,
      isLeerstandHK,
    } = data;

    if (!tenantEmail) {
      console.log("No email provided, skipping");
      return new Response(
        JSON.stringify({ success: false, message: "No email provided" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build email content
    const saldoText = gesamtSaldo > 0 
      ? `eine <strong style="color: #dc2626;">Nachzahlung von ${formatCurrency(gesamtSaldo)}</strong>` 
      : gesamtSaldo < 0 
        ? `ein <strong style="color: #16a34a;">Guthaben von ${formatCurrency(Math.abs(gesamtSaldo))}</strong>`
        : "einen ausgeglichenen Saldo";

    const bkSection = !isLeerstandBK ? `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Betriebskosten - Ihr Anteil</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(bkAnteil)}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Betriebskosten - Vorauszahlungen</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">- ${formatCurrency(bkVorschuss)}</td>
      </tr>
      <tr style="background-color: #eff6ff;">
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Saldo Betriebskosten</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: ${bkSaldo > 0 ? '#dc2626' : bkSaldo < 0 ? '#16a34a' : '#000'};">
          ${bkSaldo >= 0 ? '' : '-'} ${formatCurrency(Math.abs(bkSaldo))}
        </td>
      </tr>
    ` : '';

    const hkSection = !isLeerstandHK ? `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Heizkosten - Ihr Anteil</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(hkAnteil)}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Heizkosten - Vorauszahlungen</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">- ${formatCurrency(hkVorschuss)}</td>
      </tr>
      <tr style="background-color: #fff7ed;">
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Saldo Heizkosten</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: ${hkSaldo > 0 ? '#dc2626' : hkSaldo < 0 ? '#16a34a' : '#000'};">
          ${hkSaldo >= 0 ? '' : '-'} ${formatCurrency(Math.abs(hkSaldo))}
        </td>
      </tr>
    ` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Betriebskostenabrechnung ${year}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">Betriebskostenabrechnung ${year}</h1>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p>Sehr geehrte/r ${tenantName},</p>
          
          <p>anbei erhalten Sie die Betriebskostenabrechnung für das Jahr ${year} für Ihre Einheit:</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 5px 0;"><strong>Liegenschaft:</strong> ${propertyName}</p>
            <p style="margin: 5px 0;"><strong>Adresse:</strong> ${propertyAddress}</p>
            <p style="margin: 5px 0;"><strong>Einheit:</strong> Top ${unitTopNummer}</p>
          </div>
          
          <h3 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 5px;">Ihre Abrechnung</h3>
          
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            ${bkSection}
            ${hkSection}
            <tr style="background-color: #1e3a5f; color: white;">
              <td style="padding: 12px; font-weight: bold; font-size: 16px;">GESAMTSALDO</td>
              <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px;">
                ${gesamtSaldo >= 0 ? '' : '-'} ${formatCurrency(Math.abs(gesamtSaldo))}
              </td>
            </tr>
          </table>
          
          <div style="background-color: ${gesamtSaldo > 0 ? '#fef2f2' : gesamtSaldo < 0 ? '#f0fdf4' : '#f3f4f6'}; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${gesamtSaldo > 0 ? '#dc2626' : gesamtSaldo < 0 ? '#16a34a' : '#6b7280'};">
            <p style="margin: 0;">
              Aus der Abrechnung ergibt sich für Sie ${saldoText}.
            </p>
            ${gesamtSaldo > 0 ? '<p style="margin: 10px 0 0 0;">Bitte überweisen Sie den Nachzahlungsbetrag innerhalb von 14 Tagen.</p>' : ''}
            ${gesamtSaldo < 0 ? '<p style="margin: 10px 0 0 0;">Das Guthaben wird Ihnen mit der nächsten Mietzahlung gutgeschrieben.</p>' : ''}
          </div>
          
          <p>Bei Fragen zur Abrechnung stehen wir Ihnen gerne zur Verfügung.</p>
          
          <p>Mit freundlichen Grüßen<br>Ihre Hausverwaltung</p>
        </div>
        
        <div style="background-color: #1e3a5f; color: #94a3b8; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px;">
          <p style="margin: 0;">Diese E-Mail wurde automatisch erstellt.<br>Betriebskostenabrechnung ${year} - ${propertyName}</p>
        </div>
      </body>
      </html>
    `;

    console.log(`Sending email to ${tenantEmail}`);

    const emailResponse = await resend.emails.send({
      from: "HausVerwalter <onboarding@resend.dev>",
      to: [tenantEmail],
      subject: `Betriebskostenabrechnung ${year} - ${propertyName} - Top ${unitTopNummer}`,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update settlement item with email status
    const { error: updateError } = await supabase
      .from('settlement_items')
      .update({
        email_sent_at: new Date().toISOString(),
        email_status: 'sent'
      })
      .eq('id', settlementItemId);

    if (updateError) {
      console.error("Error updating settlement item:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-settlement-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
