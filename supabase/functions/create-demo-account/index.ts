import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, fullName } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "E-Mail und Passwort sind erforderlich" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use service role to create user with auto-confirm
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if a demo organization exists, or create one
    let demoOrgId: string;
    const { data: existingOrg } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("name", "Demo Organisation")
      .maybeSingle();

    if (existingOrg) {
      demoOrgId = existingOrg.id;
    } else {
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from("organizations")
        .insert({ name: "Demo Organisation" })
        .select("id")
        .single();
      if (orgError) throw orgError;
      demoOrgId = newOrg.id;
    }

    // Create user with email auto-confirmed
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || "Demo Benutzer",
        invite_token: "demo", // prevents trigger from creating a new org
      },
    });

    if (authError) {
      if (authError.message?.includes("already been registered") || authError.message?.includes("already exists")) {
        return new Response(
          JSON.stringify({ error: "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an." }),
          { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      throw authError;
    }

    const userId = authData.user.id;

    // Update profile with demo org
    await supabaseAdmin
      .from("profiles")
      .update({ organization_id: demoOrgId })
      .eq("id", userId);

    // Assign tester role
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "tester" }, { onConflict: "user_id" });

    // Set access expiry to 30 days from now for demo accounts
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await supabaseAdmin
      .from("profiles")
      .update({ access_expires_at: expiresAt.toISOString() })
      .eq("id", userId);

    console.log("Demo account created successfully for:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Demo-Konto erfolgreich erstellt" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error creating demo account:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unbekannter Fehler" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
