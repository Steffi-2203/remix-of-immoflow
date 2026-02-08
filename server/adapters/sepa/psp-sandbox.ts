/**
 * PSP Sandbox Adapter
 * Simuliert PSP responses for CI and local testing.
 * Replace or extend with real PSP adapter for production.
 */
import { randomUUID } from "crypto";

export async function submitSepaBatchSandbox(xml: string) {
  // Simulate network latency
  await new Promise((res) => setTimeout(res, 200));

  // Simulate success or transient failure
  const success = Math.random() > 0.05; // 95% success in sandbox
  if (!success) {
    return {
      ok: false,
      status: 502,
      body: { error: "sandbox temporary failure" },
    };
  }

  return {
    ok: true,
    status: 200,
    body: {
      pspBatchId: `SBX-${randomUUID()}`,
      message: "accepted",
      timestamp: new Date().toISOString(),
    },
  };
}
