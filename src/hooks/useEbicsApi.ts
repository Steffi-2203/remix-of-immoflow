import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

export function useEbicsConnections() {
  const { data, error, mutate } = useSWR("/api/ebics/connections", fetcher);
  return {
    connections: data ?? [],
    isLoading: !error && !data,
    error,
    mutate,
  };
}

export function useEbicsConnectionDetail(id?: string) {
  const { data, error, mutate } = useSWR(
    id ? `/api/ebics/connections/${id}` : null,
    fetcher
  );
  return {
    detail: data ?? null,
    isLoading: !error && !data,
    error,
    mutate,
  };
}

export function useEbicsPaymentBatches() {
  const { data, error, mutate } = useSWR("/api/ebics/payment-batches", fetcher);
  return {
    batches: data ?? [],
    isLoading: !error && !data,
    error,
    mutate,
  };
}

export function useEbicsOrders(connectionId?: string) {
  const { data, error, mutate } = useSWR(
    connectionId ? `/api/ebics/orders?connection_id=${connectionId}` : null,
    fetcher
  );
  return {
    orders: data ?? [],
    isLoading: !error && !data,
    error,
    mutate,
  };
}

// ── Mutation helpers ─────────────────────────────────────────────────────

async function postJson(url: string, body?: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const ebicsApi = {
  createConnection: (data: any) => postJson("/api/ebics/connections", data),
  initKeys: (id: string) => postJson(`/api/ebics/connections/${id}/init-keys`),
  sendINI: (id: string) => postJson(`/api/ebics/connections/${id}/send-ini`),
  sendHIA: (id: string) => postJson(`/api/ebics/connections/${id}/send-hia`),
  activate: (id: string) => postJson(`/api/ebics/connections/${id}/activate`),
  downloadStatements: (id: string, orderType?: string) =>
    postJson(`/api/ebics/connections/${id}/download-statements`, { order_type: orderType }),
  createPaymentBatch: (data: any) => postJson("/api/ebics/payment-batches", data),
  approveBatch: (id: string) => postJson(`/api/ebics/payment-batches/${id}/approve`),
  submitBatch: (id: string) => postJson(`/api/ebics/payment-batches/${id}/submit`),
  getIniLetter: async (id: string) => {
    const res = await fetch(`/api/ebics/connections/${id}/ini-letter`, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
};
