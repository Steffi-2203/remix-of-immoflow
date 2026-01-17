import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import immoflowLogo from '@/assets/immoflowme-logo.png';

const emailSchema = z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein');
const passwordSchema = z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein');

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isAuthenticated, loading: authLoading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, location]);

  const validateForm = () => {
    setError(null);
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        setError(e.errors[0].message);
        return false;
      }
    }

    if (!showForgotPassword) {
      try {
        passwordSchema.parse(password);
      } catch (e) {
        if (e instanceof z.ZodError) {
          setError(e.errors[0].message);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    const { error } = await signIn(email, password);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Ungültige E-Mail oder Passwort');
      } else if (error.message.includes('Email not confirmed')) {
        setError('E-Mail-Adresse nicht bestätigt. Bitte überprüfen Sie Ihren Posteingang.');
      } else {
        setError(error.message);
      }
    }
    
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setResetEmailSent(true);
    }

    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Forgot password view
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link to="/" className="flex flex-col items-center mb-4 hover:opacity-80 transition-opacity">
              <img src={immoflowLogo} alt="ImmoflowMe Logo" className="h-16 w-auto mb-2" />
              <span className="font-bold text-xl">ImmoflowMe</span>
              <span className="text-xs text-muted-foreground">by ImmoPepper</span>
            </Link>
            <CardTitle className="text-2xl">Passwort zurücksetzen</CardTitle>
            <CardDescription>
              Geben Sie Ihre E-Mail-Adresse ein, um einen Link zum Zurücksetzen zu erhalten
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resetEmailSent ? (
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-muted-foreground">
                  Falls ein Konto mit dieser E-Mail existiert, haben wir Ihnen einen Link zum Zurücksetzen des Passworts gesendet.
                </p>
                <p className="text-sm text-muted-foreground">
                  Bitte überprüfen Sie auch Ihren Spam-Ordner.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmailSent(false);
                    setEmail('');
                  }}
                  className="mt-4"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Zurück zur Anmeldung
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="ihre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gesendet...
                    </>
                  ) : (
                    'Link senden'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          {!resetEmailSent && (
            <CardFooter className="flex justify-center">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowForgotPassword(false);
                  setError(null);
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück zur Anmeldung
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="flex flex-col items-center mb-4 hover:opacity-80 transition-opacity">
            <img src={immoflowLogo} alt="ImmoflowMe Logo" className="h-16 w-auto mb-2" />
            <span className="font-bold text-xl">ImmoflowMe</span>
            <span className="text-xs text-muted-foreground">by ImmoPepper</span>
          </Link>
          <CardTitle className="text-2xl">Willkommen zurück</CardTitle>
          <CardDescription>
            Melden Sie sich an, um fortzufahren
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ihre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Passwort</Label>
                <Button
                  type="button"
                  variant="link"
                  className="px-0 h-auto font-normal text-sm text-muted-foreground hover:text-primary"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError(null);
                  }}
                >
                  Passwort vergessen?
                </Button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Anmelden...
                </>
              ) : (
                'Anmelden'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Alert className="bg-muted/50 border-muted">
            <AlertDescription className="text-center text-sm">
              Der Zugang ist auf autorisierte Benutzer beschränkt. 
              Konten werden nur per Einladung erstellt.
            </AlertDescription>
          </Alert>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Zurück zur Startseite
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
