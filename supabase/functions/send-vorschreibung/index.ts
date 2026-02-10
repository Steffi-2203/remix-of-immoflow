import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifyAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "Missing or invalid authorization header" };
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { user: null, error: "Invalid token" };
  return { user: data.user, error: null };
}

interface VorschreibungEmailRequest {
  invoiceId: string;
  tenantEmail: string;
  tenantName: string;
  propertyName: string;
  propertyAddress: string;
  unitNumber: string;
  month: number;
  year: number;
  grundmiete: number;
  betriebskosten: number;
  heizungskosten: number;
  ustSatzMiete: number;
  ustSatzBk: number;
  ustSatzHeizung: number;
  ust: number;
  gesamtbetrag: number;
  faelligAm: string;
  iban?: string;
  bic?: string;
  pdfBase64?: string;
  pdfFilename?: string;
}

function formatCurrency(amount: number): string {
  return `€ ${amount.toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const monthNames = [
  "Jänner", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: authError || "Auth required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data: VorschreibungEmailRequest = await req.json();
    const {
      invoiceId, tenantEmail, tenantName, propertyName, propertyAddress,
      unitNumber, month, year, grundmiete, betriebskosten, heizungskosten,
      ustSatzMiete, ustSatzBk, ustSatzHeizung, ust, gesamtbetrag, faelligAm,
      iban, bic, pdfBase64, pdfFilename,
    } = data;

    if (!tenantEmail) {
      return new Response(JSON.stringify({ error: "Keine E-Mail-Adresse hinterlegt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const monthName = monthNames[month - 1];
    const formattedDueDate = new Date(faelligAm).toLocaleDateString("de-AT");

    // Calculate gross amounts
    const ustMiete = (grundmiete * ustSatzMiete) / 100;
    const ustBk = (betriebskosten * ustSatzBk) / 100;
    const ustHk = (heizungskosten * ustSatzHeizung) / 100;

    const rows = [];
    if (grundmiete > 0) {
      rows.push({ label: "Grundmiete", netto: grundmiete, ustSatz: ustSatzMiete, ustBetrag: ustMiete, brutto: grundmiete + ustMiete });
    }
    if (betriebskosten > 0) {
      rows.push({ label: "Betriebskostenvorschuss", netto: betriebskosten, ustSatz: ustSatzBk, ustBetrag: ustBk, brutto: betriebskosten + ustBk });
    }
    if (heizungskosten > 0) {
      rows.push({ label: "Heizungskostenvorschuss", netto: heizungskosten, ustSatz: ustSatzHeizung, ustBetrag: ustHk, brutto: heizungskosten + ustHk });
    }

    const tableRows = rows.map(r => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${r.label}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(r.netto)}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${r.ustSatz > 0 ? `${r.ustSatz}%` : "–"}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${formatCurrency(r.brutto)}</td>
      </tr>
    `).join("");

    const bankInfo = iban ? `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 4px 0;font-weight:600;">Bankverbindung</p>
        <p style="margin:0;">IBAN: ${iban}${bic ? ` · BIC: ${bic}` : ""}</p>
        <p style="margin:4px 0 0 0;">Verwendungszweck: <strong>Miete ${monthName} ${year} – Top ${unitNumber}</strong></p>
      </div>
    ` : "";

    const htmlContent = `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#3b82f6;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:20px;">Monatliche Vorschreibung</h1>
        <p style="margin:4px 0 0;opacity:0.9;">${monthName} ${year}</p>
      </div>
      <div style="background:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-top:none;">
        <p>Sehr geehrte/r ${tenantName},</p>
        <p>anbei erhalten Sie Ihre monatliche Vorschreibung für <strong>${monthName} ${year}</strong>.</p>
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:12px 0;">
          <p style="margin:4px 0;"><strong>Liegenschaft:</strong> ${propertyName}</p>
          <p style="margin:4px 0;"><strong>Adresse:</strong> ${propertyAddress}</p>
          <p style="margin:4px 0;"><strong>Einheit:</strong> Top ${unitNumber}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead>
            <tr style="background:#3b82f6;color:#fff;">
              <th style="padding:10px;text-align:left;">Position</th>
              <th style="padding:10px;text-align:right;">Netto</th>
              <th style="padding:10px;text-align:right;">USt.</th>
              <th style="padding:10px;text-align:right;">Brutto</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
          <tfoot>
            <tr style="background:#1e3a5f;color:#fff;">
              <td style="padding:12px;font-weight:700;">Gesamtbetrag</td>
              <td style="padding:12px;text-align:right;">${formatCurrency(grundmiete + betriebskosten + heizungskosten)}</td>
              <td style="padding:12px;text-align:right;">${formatCurrency(ust)}</td>
              <td style="padding:12px;text-align:right;font-weight:700;font-size:16px;">${formatCurrency(gesamtbetrag)}</td>
            </tr>
          </tfoot>
        </table>
        <div style="background:#eff6ff;border:2px solid #3b82f6;border-radius:8px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:14px;color:#1e40af;">Fällig am <strong>${formattedDueDate}</strong></p>
          <p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#1e3a5f;">${formatCurrency(gesamtbetrag)}</p>
        </div>
        ${bankInfo}
        <p>Bei Fragen zu dieser Vorschreibung stehen wir Ihnen gerne zur Verfügung.</p>
        <p>Mit freundlichen Grüßen<br>Ihre Hausverwaltung</p>
      </div>
      <div style="background:#1e3a5f;color:#94a3b8;padding:12px;text-align:center;border-radius:0 0 8px 8px;font-size:12px;">
        <p style="margin:0;">Vorschreibung ${monthName} ${year} – ${propertyName} – Top ${unitNumber}</p>
      </div>
    </body></html>`;

    console.log(`Sending Vorschreibung email to ${tenantEmail} for ${monthName} ${year}`);

    const emailPayload: Record<string, unknown> = {
      from: "Hausverwaltung <onboarding@resend.dev>",
      to: [tenantEmail],
      subject: `Vorschreibung ${monthName} ${year} – ${propertyName} – Top ${unitNumber}`,
      html: htmlContent,
    };

    // Attach PDF if provided
    if (pdfBase64) {
      emailPayload.attachments = [
        {
          filename: pdfFilename || `Vorschreibung_${monthName}_${year}_Top${unitNumber}.pdf`,
          content: pdfBase64,
        },
      ];
    }

    const emailResponse = await resend.emails.send(emailPayload as any);

    console.log("Email sent:", emailResponse);

    // Update invoice email_sent_at
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase
      .from("monthly_invoices")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", invoiceId);

    return new Response(
      JSON.stringify({ success: true, message: "Vorschreibung per E-Mail versendet", emailId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-vorschreibung:", error);
    return new Response(
      JSON.stringify({ error: "Ein Fehler ist aufgetreten. Bitte kontaktieren Sie den Support." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
