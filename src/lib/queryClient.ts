import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

// CSRF token cache – fetched once per page load
let csrfTokenPromise: Promise<string> | null = null;

async function getCsrfToken(): Promise<string> {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch('/api/auth/csrf-token', { credentials: 'include' })
      .then(r => r.json())
      .then(d => d.token as string)
      .catch(() => {
        csrfTokenPromise = null;
        return '';
      });
  }
  return csrfTokenPromise;
}

/** Invalidate cached CSRF token (call after login/logout). */
export function resetCsrfToken() {
  csrfTokenPromise = null;
}

export async function apiRequest(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  body?: unknown
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';

  // Attach CSRF token for mutating requests
  if (method !== 'GET') {
    const token = await getCsrfToken();
    if (token) headers['x-csrf-token'] = token;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response;
}
