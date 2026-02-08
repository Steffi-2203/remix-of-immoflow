// tools/check_password_protection.js
import fetch from "node-fetch";
const AUTH_URL = process.env.AUTH_URL;
const TEST_EMAIL = `pwcheck+${Date.now()}@example.test`;
const LEAKED_PW = "password123";

if (!AUTH_URL) { console.error("AUTH_URL missing"); process.exit(2); }

async function signup(email, password) {
  const res = await fetch(`${AUTH_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

(async () => {
  const r = await signup(TEST_EMAIL, LEAKED_PW);
  console.log("status:", r.status);
  console.log("body:", r.body.slice(0,300));
  if (r.status === 400 || /leak|weak|compromis/i.test(r.body)) {
    console.log("PASS: leaked password blocked");
    process.exit(0);
  } else {
    console.error("FAIL: leaked password not blocked");
    process.exit(1);
  }
})();
