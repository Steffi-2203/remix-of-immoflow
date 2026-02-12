import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Keine Nachrichten" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tenant context via service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: access } = await adminClient
      .from("tenant_portal_access")
      .select("tenant_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (!access) {
      return new Response(
        JSON.stringify({ error: "Kein Mieter-Zugang" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tenantId = access.tenant_id;

    // Fetch tenant data for context
    const [tenantRes, invoicesRes, paymentsRes] = await Promise.all([
      adminClient.from("tenants").select("first_name, last_name, grundmiete, betriebskosten_vorschuss, heizungskosten_vorschuss, mietbeginn, mietende, status").eq("id", tenantId).single(),
      adminClient.from("monthly_invoices").select("month, year, gesamtbetrag, status, faellig_am").eq("tenant_id", tenantId).order("year", { ascending: false }).order("month", { ascending: false }).limit(12),
      adminClient.from("payments").select("betrag, eingangs_datum, zahlungsart").eq("tenant_id", tenantId).order("eingangs_datum", { ascending: false }).limit(12),
    ]);

    const tenant = tenantRes.data;
    const invoices = invoicesRes.data || [];
    const payments = paymentsRes.data || [];

    const openBalance = invoices
      .filter((i: any) => i.status !== "bezahlt")
      .reduce((sum: number, i: any) => sum + (i.gesamtbetrag || 0), 0);

    // Build system prompt with tenant context
    const systemPrompt = `Du bist ein freundlicher KI-Assistent im Mieterportal einer österreichischen Hausverwaltung.
Du beantwortest Fragen des Mieters basierend auf den folgenden Daten. Antworte stets auf Deutsch, höflich und präzise.
Gib keine Informationen preis, die über die bereitgestellten Daten hinausgehen. Wenn du etwas nicht weißt, verweise an die Hausverwaltung.

MIETERDATEN:
- Name: ${tenant?.first_name} ${tenant?.last_name}
- Grundmiete: €${tenant?.grundmiete || 0}
- BK-Vorschuss: €${tenant?.betriebskosten_vorschuss || 0}
- HK-Vorschuss: €${tenant?.heizungskosten_vorschuss || 0}
- Mietbeginn: ${tenant?.mietbeginn || 'unbekannt'}
- Mietende: ${tenant?.mietende || 'unbefristet'}
- Status: ${tenant?.status || 'unbekannt'}
- Offener Saldo: €${openBalance.toFixed(2)}

LETZTE VORSCHREIBUNGEN (max 12):
${invoices.map((i: any) => `- ${i.month}/${i.year}: €${i.gesamtbetrag} (${i.status}) fällig am ${i.faellig_am}`).join('\n')}

LETZTE ZAHLUNGEN (max 12):
${payments.map((p: any) => `- ${p.eingangs_datum}: €${p.betrag} (${p.zahlungsart})`).join('\n')}

REGELN:
- Beantworte nur Fragen zu den obigen Mieterdaten.
- Gib keine IBAN, BIC oder andere sensible Bankdaten preis.
- Bei Reparaturanfragen, Beschwerden oder Vertragsänderungen verweise an die Hausverwaltung.
- Halte Antworten kurz und hilfreich.`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI nicht konfiguriert" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.slice(-20), // limit context window
          ],
          stream: true,
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Zu viele Anfragen, bitte versuchen Sie es später erneut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-Service vorübergehend nicht verfügbar." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "AI-Fehler" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (err) {
    console.error("tenant-chat error:", err);
    return new Response(
      JSON.stringify({ error: "Interner Serverfehler" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
