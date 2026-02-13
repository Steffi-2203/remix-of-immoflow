import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha1(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();

    if (!password || typeof password !== "string" || password.length < 1) {
      return new Response(
        JSON.stringify({ error: "Password is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hash = await sha1(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    // k-Anonymity: only send first 5 chars of hash
    const hibpResponse = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: {
          "User-Agent": "ImmoflowMe-PasswordCheck",
          "Add-Padding": "true",
        },
      }
    );

    if (!hibpResponse.ok) {
      console.error("HIBP API error:", hibpResponse.status);
      // Fail open — don't block registration if HIBP is down
      return new Response(
        JSON.stringify({ leaked: false, count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const text = await hibpResponse.text();
    const lines = text.split("\n");

    let leakCount = 0;
    for (const line of lines) {
      const [hashSuffix, count] = line.trim().split(":");
      if (hashSuffix === suffix) {
        leakCount = parseInt(count, 10);
        break;
      }
    }

    if (leakCount > 0) {
      console.log(`[PASSWORD_LEAK_BLOCKED] Leaked password attempt detected, breach count: ${leakCount}`);
    }

    return new Response(
      JSON.stringify({ leaked: leakCount > 0, count: leakCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-password-leak error:", error);
    // Fail open
    return new Response(
      JSON.stringify({ leaked: false, count: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
