import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, CheckCircle, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import immoflowLogo from '@/assets/immoflowme-logo.png';

const passwordSchema = z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein');

export default function ResetPassword() {
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // The session will be present if the user clicked the reset link
      setIsValidSession(!!session);
    };
    
    checkSession();

    // Listen for auth state changes (recovery flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const validateForm = () => {
    setError(null);
    
    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        setError(e.errors[0].message);
        return false;
      }
    }

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      // Sign out after password reset so they can log in fresh
      await supabase.auth.signOut();
    }

    setIsLoading(false);
  };

  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link to="/" className="flex flex-col items-center mb-4 hover:opacity-80 transition-opacity">
              <img src={immoflowLogo} alt="ImmoflowMe Logo" className="h-16 w-auto mb-2" />
              <span className="font-bold text-xl">ImmoflowMe</span>
              <span className="text-xs text-muted-foreground">by ImmoPepper</span>
            </Link>
            <CardTitle className="text-2xl">Link ungültig</CardTitle>
            <CardDescription>
              Der Link zum Zurücksetzen des Passworts ist abgelaufen oder ungültig.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/login')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zur Anmeldung
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link to="/" className="flex flex-col items-center mb-4 hover:opacity-80 transition-opacity">
              <img src={immoflowLogo} alt="ImmoflowMe Logo" className="h-16 w-auto mb-2" />
              <span className="font-bold text-xl">ImmoflowMe</span>
              <span className="text-xs text-muted-foreground">by ImmoPepper</span>
            </Link>
            <CardTitle className="text-2xl">Passwort geändert</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-muted-foreground">
              Ihr Passwort wurde erfolgreich geändert. Sie können sich jetzt mit Ihrem neuen Passwort anmelden.
            </p>
            <Button onClick={() => navigate('/login')} className="mt-4">
              Zur Anmeldung
            </Button>
          </CardContent>
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
          <CardTitle className="text-2xl">Neues Passwort setzen</CardTitle>
          <CardDescription>
            Geben Sie Ihr neues Passwort ein
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
              <Label htmlFor="password">Neues Passwort</Label>
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
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                'Passwort ändern'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="inline mr-1 h-4 w-4" />
            Zurück zur Anmeldung
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
