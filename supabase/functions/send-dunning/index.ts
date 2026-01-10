import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

interface DunningRequest {
  invoiceId: string;
  dunningLevel: 1 | 2; // 1 = Zahlungserinnerung, 2 = Mahnung
  tenantEmail: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  amount: number;
  dueDate: string;
  invoiceMonth: number;
  invoiceYear: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      invoiceId, 
      dunningLevel, 
      tenantEmail, 
      tenantName, 
      propertyName,
      unitNumber,
      amount, 
      dueDate,
      invoiceMonth,
      invoiceYear
    }: DunningRequest = await req.json();

    console.log(`Processing dunning level ${dunningLevel} for invoice ${invoiceId}`);

    if (!tenantEmail) {
      return new Response(
        JSON.stringify({ error: "Keine E-Mail-Adresse für den Mieter hinterlegt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const monthNames = [
      'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    const monthName = monthNames[invoiceMonth - 1];
    const formattedAmount = amount.toLocaleString('de-AT', { minimumFractionDigits: 2 });
    const formattedDueDate = new Date(dueDate).toLocaleDateString('de-AT');

    let subject: string;
    let htmlContent: string;

    if (dunningLevel === 1) {
      // Zahlungserinnerung
      subject = `Zahlungserinnerung - Miete ${monthName} ${invoiceYear}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Freundliche Zahlungserinnerung</h2>
          
          <p>Sehr geehrte/r ${tenantName},</p>
          
          <p>bei Durchsicht unserer Buchhaltung ist uns aufgefallen, dass die nachstehende Forderung noch offen ist:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Objekt</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${propertyName} - Top ${unitNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Abrechnungsmonat</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${monthName} ${invoiceYear}</td>
            </tr>
            <tr style="background: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Fällig seit</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${formattedDueDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Offener Betrag</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; color: #c00; font-weight: bold;">€ ${formattedAmount}</td>
            </tr>
          </table>
          
          <p>Wir bitten Sie, den offenen Betrag innerhalb der nächsten <strong>7 Tage</strong> zu überweisen.</p>
          
          <p>Sollte sich diese Erinnerung mit Ihrer Zahlung überschnitten haben, bitten wir Sie, dieses Schreiben als gegenstandslos zu betrachten.</p>
          
          <p>Mit freundlichen Grüßen,<br>Ihre Hausverwaltung</p>
        </div>
      `;
    } else {
      // Mahnung
      subject = `MAHNUNG - Miete ${monthName} ${invoiceYear}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #c00;">Mahnung</h2>
          
          <p>Sehr geehrte/r ${tenantName},</p>
          
          <p>trotz unserer Zahlungserinnerung ist die nachstehende Forderung weiterhin offen:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Objekt</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${propertyName} - Top ${unitNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Abrechnungsmonat</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${monthName} ${invoiceYear}</td>
            </tr>
            <tr style="background: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Fällig seit</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${formattedDueDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Offener Betrag</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; color: #c00; font-weight: bold;">€ ${formattedAmount}</td>
            </tr>
          </table>
          
          <p style="color: #c00; font-weight: bold;">
            Wir fordern Sie hiermit letztmalig auf, den offenen Betrag innerhalb von <strong>5 Tagen</strong> zu überweisen.
          </p>
          
          <p>Sollte der Betrag nicht fristgerecht bei uns eingehen, behalten wir uns rechtliche Schritte vor, deren Kosten zu Ihren Lasten gehen.</p>
          
          <p>Mit freundlichen Grüßen,<br>Ihre Hausverwaltung</p>
        </div>
      `;
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Hausverwaltung <onboarding@resend.dev>",
      to: [tenantEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent:", emailResponse);

    // Update invoice with dunning information
    const updateData: Record<string, unknown> = {
      mahnstufe: dunningLevel,
    };

    if (dunningLevel === 1) {
      updateData.zahlungserinnerung_am = new Date().toISOString();
    } else {
      updateData.mahnung_am = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('monthly_invoices')
      .update(updateData)
      .eq('id', invoiceId);

    if (updateError) {
      console.error("Error updating invoice:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: dunningLevel === 1 ? 'Zahlungserinnerung versendet' : 'Mahnung versendet',
        emailId: emailResponse.data?.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-dunning:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
