import { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, LogIn, Building2 } from 'lucide-react';
import immoflowLogo from '@/assets/immoflowme-logo.png';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !loading) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, location]);

  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img src={immoflowLogo} alt="ImmoflowMe" className="h-16 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Willkommen bei ImmoflowMe
            </CardTitle>
            <CardDescription>
              Professionelle Hausverwaltung - MRG-konform und effizient
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4 py-6">
              <Building2 className="h-16 w-16 text-primary opacity-80" />
              <p className="text-center text-muted-foreground">
                Melden Sie sich an, um auf Ihre Liegenschaften, Mieter und Abrechnungen zuzugreifen.
              </p>
            </div>
            <Button 
              onClick={handleLogin} 
              className="w-full" 
              size="lg"
              data-testid="button-login"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Anmelden
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground">
            <p>
              Sichere Anmeldung via Replit Auth
            </p>
            <div className="flex gap-4 justify-center text-xs">
              <Link to="/impressum" className="hover:underline">Impressum</Link>
              <Link to="/datenschutz" className="hover:underline">Datenschutz</Link>
              <Link to="/agb" className="hover:underline">AGB</Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
