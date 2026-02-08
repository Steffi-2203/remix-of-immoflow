/**
 * check_password_protection.js
 *
 * Verifies that Leaked Password Protection is enabled on the auth instance.
 * Requires AUTH_URL environment variable pointing to the Supabase Auth endpoint.
 *
 * Usage:
 *   AUTH_URL=https://<project>.supabase.co/auth/v1 node tools/check_password_protection.js
 */

const AUTH_URL = process.env.AUTH_URL;

if (!AUTH_URL) {
  console.error("ERROR: AUTH_URL environment variable is not set.");
  console.error("Usage: AUTH_URL=https://<project>.supabase.co/auth/v1 node tools/check_password_protection.js");
  process.exit(1);
}

async function checkPasswordProtection() {
  console.log("🔒 Password Protection Check");
  console.log("============================");
  console.log(`Auth endpoint: ${AUTH_URL}`);
  console.log("");

  // Attempt signup with a known compromised password (password123)
  const testEmail = `pwcheck-${Date.now()}@test.invalid`;
  const compromisedPassword = "password123456";

  try {
    const res = await fetch(`${AUTH_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": process.env.SUPABASE_ANON_KEY || "" },
      body: JSON.stringify({ email: testEmail, password: compromisedPassword }),
    });

    const body = await res.json();

    if (res.status === 422 || (body.msg && body.msg.includes("compromised"))) {
      console.log("✅ Leaked password protection is ENABLED");
      console.log(`   Response: ${res.status} — ${body.msg || body.error_description || JSON.stringify(body)}`);
    } else if (res.status === 200 || res.status === 201) {
      console.log("⚠️  WARNING: Signup with compromised password SUCCEEDED");
      console.log("   Leaked password protection may be DISABLED");
      console.log("   → Enable it in Auth Console → Security → Password Protection");
    } else {
      console.log(`ℹ️  Unexpected response: ${res.status}`);
      console.log(`   Body: ${JSON.stringify(body)}`);
      console.log("   Manual verification recommended");
    }
  } catch (err) {
    console.error("❌ Failed to connect to auth endpoint:", err.message);
    process.exit(1);
  }

  // Check minimum password length
  console.log("");
  console.log("📏 Minimum Password Length Check");
  const shortPassword = "Ab1!xyzw"; // 8 chars

  try {
    const res = await fetch(`${AUTH_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": process.env.SUPABASE_ANON_KEY || "" },
      body: JSON.stringify({ email: `pwlen-${Date.now()}@test.invalid`, password: shortPassword }),
    });

    const body = await res.json();

    if (res.status === 422) {
      console.log("✅ Minimum password length enforcement is ACTIVE");
      console.log(`   Response: ${body.msg || body.error_description || JSON.stringify(body)}`);
    } else {
      console.log("⚠️  Short password (8 chars) was not rejected — minimum length may be < 12");
    }
  } catch (err) {
    console.log("ℹ️  Could not verify minimum length:", err.message);
  }

  console.log("");
  console.log("Done. Record results in audit log if changes were made.");
}

checkPasswordProtection();
