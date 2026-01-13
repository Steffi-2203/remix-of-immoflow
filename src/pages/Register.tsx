import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Lock, User, Users } from 'lucide-react';
import { z } from 'zod';
import immoflowLogo from '@/assets/immoflowme-logo.png';
import { useInviteByToken, useAcceptInvite, ROLE_LABELS } from '@/hooks/useOrganizationInvites';

const emailSchema = z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein');
const passwordSchema = z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein');

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  
  const { signUp, isAuthenticated, loading: authLoading } = useAuth();
  
  // Einladung laden wenn Token vorhanden
  const { data: invite, isLoading: inviteLoading } = useInviteByToken(inviteToken);
  const acceptInvite = useAcceptInvite();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Email aus Einladung vorbelegen
  useEffect(() => {
    if (invite?.email) {
      setEmail(invite.email);
    }
  }, [invite]);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const validateForm = () => {
    setError(null);
    
    // Bei Einladung kein Firmenname erforderlich
    // (Normale Registrierung ist nicht mehr möglich)
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        setError(e.errors[0].message);
        return false;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        setError(e.errors[0].message);
        return false;
      }
    }

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Bei Einladung: invite_token setzen (keine neue Org erstellen)
    const { error: signUpError, data } = await signUp(email, password, fullName, undefined, inviteToken ?? undefined);
    
    if (signUpError) {
      if (signUpError.message.includes('User already registered')) {
        setError('Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.');
      } else {
        setError(signUpError.message);
      }
      setIsLoading(false);
      return;
    }
    
    if (data?.user) {
      // Einladung annehmen (Organisation + Rolle zuweisen)
      try {
        await acceptInvite.mutateAsync(inviteToken!);
        setSuccess('Konto erstellt und Organisation beigetreten! Sie werden angemeldet...');
      } catch (acceptError: any) {
        console.error('Fehler beim Annehmen der Einladung:', acceptError);
        setError('Konto erstellt, aber Einladung konnte nicht angenommen werden. Bitte kontaktieren Sie den Administrator.');
        setIsLoading(false);
        return;
      }
    }
    
    setIsLoading(false);
  };

  if (authLoading || inviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Keine Einladung vorhanden - Zugang verweigern
  if (!inviteToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link to="/" className="flex flex-col items-center mb-4 hover:opacity-80 transition-opacity">
              <img src={immoflowLogo} alt="ImmoflowMe Logo" className="h-16 w-auto mb-2" />
              <span className="font-bold text-xl">ImmoflowMe</span>
            </Link>
            <CardTitle className="text-2xl">Zugang beschränkt</CardTitle>
            <CardDescription>
              Der Zugang ist auf autorisierte Benutzer beschränkt.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert className="bg-muted/50 border-muted">
              <AlertDescription>
                Konten werden nur per Einladung erstellt. Bitte kontaktieren Sie einen Administrator, um eine Einladung zu erhalten.
              </AlertDescription>
            </Alert>
            <Button variant="outline" asChild className="w-full">
              <Link to="/login">Zur Anmeldung</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ungültige oder abgelaufene Einladung
  if (inviteToken && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link to="/" className="flex flex-col items-center mb-4 hover:opacity-80 transition-opacity">
              <img src={immoflowLogo} alt="ImmoflowMe Logo" className="h-16 w-auto mb-2" />
              <span className="font-bold text-xl">ImmoflowMe</span>
            </Link>
            <CardTitle className="text-2xl text-destructive">Ungültige Einladung</CardTitle>
            <CardDescription>
              Diese Einladung ist ungültig oder abgelaufen.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Bitte kontaktieren Sie den Administrator, der Sie eingeladen hat, um eine neue Einladung zu erhalten.
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link to="/login">Zur Anmeldung</Link>
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
          <CardTitle className="text-2xl">
            Konto erstellen und beitreten
          </CardTitle>
          <CardDescription>
            Erstellen Sie Ihr Konto, um der Organisation beizutreten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Einladungs-Banner */}
            <Alert className="border-primary/50 bg-primary/5">
              <Users className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-1">
                <span>Sie wurden eingeladen zu:</span>
                <span className="font-semibold">{invite?.organization?.name}</span>
                <div className="mt-1">
                  <Badge variant="secondary">
                    {ROLE_LABELS[invite?.role as keyof typeof ROLE_LABELS] || invite?.role}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="fullName">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Ihr vollständiger Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
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
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground">
                E-Mail-Adresse aus Einladung (nicht änderbar)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Mind. 6 Zeichen"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
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
                  placeholder="Passwort wiederholen"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Beitreten...
                </>
              ) : (
                'Konto erstellen & beitreten'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-center text-sm text-muted-foreground">
            Bereits ein Konto?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Anmelden
            </Link>
          </div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Zurück zur Startseite
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
