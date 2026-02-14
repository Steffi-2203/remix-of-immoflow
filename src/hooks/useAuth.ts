import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  email: string;
  fullName: string | null;
  organizationId: string | null;
  roles: string[];
}

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function loginFn(email: string, password: string): Promise<User | { requires2FA: true }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const csrf = getCsrfToken();
  if (csrf) headers["x-csrf-token"] = csrf;

  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Anmeldung fehlgeschlagen");
  }

  return response.json();
}

async function registerFn(data: {
  email: string;
  password: string;
  fullName?: string;
  token?: string;
}): Promise<User> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const csrf = getCsrfToken();
  if (csrf) headers["x-csrf-token"] = csrf;

  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Registrierung fehlgeschlagen");
  }

  return response.json();
}

async function logoutFn(): Promise<void> {
  const headers: Record<string, string> = {};
  const csrf = getCsrfToken();
  if (csrf) headers["x-csrf-token"] = csrf;

  await fetch("/api/auth/logout", {
    method: "POST",
    headers,
    credentials: "include",
  });
}

export const useAuth = () => {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading: loading, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) => 
      loginFn(data.email, data.password),
    onSuccess: (userData) => {
      if ('requires2FA' in userData) return;
      queryClient.setQueryData(["/api/auth/user"], userData);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerFn,
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/auth/user"], userData);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutFn,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.setQueryData(["/api/profile"], null);
      queryClient.clear();
    },
  });

  const login = async (email: string, password: string) => {
    return loginMutation.mutateAsync({ email, password });
  };

  const register = async (data: {
    email: string;
    password: string;
    fullName?: string;
    token?: string;
  }) => {
    return registerMutation.mutateAsync(data);
  };

  const signIn = login;
  const signUp = async (
    email: string, 
    password: string, 
    fullName?: string, 
    _companyName?: string, 
    inviteToken?: string
  ) => {
    return register({ email, password, fullName, token: inviteToken });
  };

  const signOut = async () => {
    await logoutMutation.mutateAsync();
    return { error: null };
  };

  const logout = signOut;

  return {
    user: user ? {
      id: user.id,
      email: user.email,
      user_metadata: {
        full_name: user.fullName || user.email,
        avatar_url: null,
      }
    } : null,
    session: user ? { user } : null,
    loading,
    login,
    register,
    logout,
    signIn,
    signUp,
    signOut,
    refetch,
    isAuthenticated: !!user,
    isSupabaseConfigured: true,
  };
};
