import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  const [accessExpired, setAccessExpired] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    const checkAccessExpiration = async () => {
      if (!user?.id) {
        setCheckingAccess(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('access_expires_at')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking access:', error);
          setCheckingAccess(false);
          return;
        }

        if (profile?.access_expires_at) {
          const expiresAt = new Date(profile.access_expires_at);
          const now = new Date();

          if (now >= expiresAt) {
            setAccessExpired(true);
            toast.error('Ihre Testzeit ist abgelaufen');
            // Sign out the user
            await supabase.auth.signOut();
          } else {
            // Calculate remaining time and set up countdown
            const updateRemaining = () => {
              const remaining = expiresAt.getTime() - Date.now();
              if (remaining <= 0) {
                setAccessExpired(true);
                toast.error('Ihre Testzeit ist abgelaufen');
                supabase.auth.signOut();
                return;
              }
              const minutes = Math.floor(remaining / 60000);
              const seconds = Math.floor((remaining % 60000) / 1000);
              setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            };

            updateRemaining();
            const interval = setInterval(updateRemaining, 1000);
            return () => clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Access check error:', error);
      } finally {
        setCheckingAccess(false);
      }
    };

    if (!loading && isAuthenticated) {
      checkAccessExpiration();
    } else {
      setCheckingAccess(false);
    }
  }, [user?.id, loading, isAuthenticated]);

  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  if (accessExpired || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <>
      {timeRemaining && (
        <div className="fixed top-4 right-4 z-50 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="font-medium">Testzeit: {timeRemaining}</span>
        </div>
      )}
      {children}
    </>
  );
};