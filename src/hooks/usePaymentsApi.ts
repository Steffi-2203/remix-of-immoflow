import useSWR from "swr";

export function usePayments(page = 1, limit = 50) {
  const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json());

  const { data, error } = useSWR(`/api/payments?page=${page}&limit=${limit}`, fetcher);

  return {
    payments: data?.data ?? [],
    pagination: data?.pagination,
    isLoading: !error && !data,
    error,
  };
}
