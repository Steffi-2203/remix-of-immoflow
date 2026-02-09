import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch");
    return r.json();
  });

export interface LedgerEntry {
  id: string;
  tenant_id: string;
  invoice_id?: string;
  payment_id?: string;
  amount: number;
  type: string;
  booking_date: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
}

export interface JobEntry {
  id: string;
  job_type: string;
  status: string;
  priority: number;
  retry_count: number;
  max_retries: number;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function useOverpayments(page = 1, limit = 20) {
  return useSWR<PaginatedResponse<LedgerEntry>>(
    `/api/ledger/overpayments?page=${page}&limit=${limit}`,
    fetcher
  );
}

export function useInterestAccruals(page = 1, limit = 20) {
  return useSWR<PaginatedResponse<LedgerEntry>>(
    `/api/ledger/interest-accruals?page=${page}&limit=${limit}`,
    fetcher
  );
}

export function useJobs(status?: string, limit = 50) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("limit", String(limit));
  return useSWR<JobEntry[]>(`/api/jobs?${params}`, fetcher);
}
