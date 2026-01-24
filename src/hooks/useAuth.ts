import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ReplitUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

async function fetchUser(): Promise<ReplitUser | null> {
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

async function logoutFn(): Promise<void> {
  window.location.href = "/api/logout";
}

export const useAuth = () => {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading: loading } = useQuery<ReplitUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logoutMutation = useMutation({
    mutationFn: logoutFn,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  const signIn = async (_email: string, _password: string) => {
    window.location.href = "/api/login";
    return { data: null, error: null };
  };

  const signUp = async (_email: string, _password: string, _fullName?: string, _companyName?: string, _inviteToken?: string) => {
    window.location.href = "/api/login";
    return { data: null, error: null };
  };

  const signOut = async () => {
    logoutMutation.mutate();
    return { error: null };
  };

  return {
    user: user ? {
      id: user.id,
      email: user.email,
      user_metadata: {
        full_name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.lastName || user.email,
        avatar_url: user.profileImageUrl,
      }
    } : null,
    session: user ? { user } : null,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    isSupabaseConfigured: true,
  };
};
