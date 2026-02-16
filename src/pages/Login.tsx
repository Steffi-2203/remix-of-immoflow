import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, LogIn, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { setAuthToken, getAuthToken, clearAuthToken } from '@/lib/queryClient';
import immoflowLogo from '@/assets/immoflowme-logo.png';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading, signIn } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [showBackupInput, setShowBackupInput] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const twoFAInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      clearAuthToken();
    }
  }, [loading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, location]);

  useEffect(() => {
    if (requires2FA && twoFAInputRef.current) {
      twoFAInputRef.current.focus();
    }
  }, [requires2FA, showBackupInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password;
    
    if (!trimmedEmail || !trimmedPassword) {
      toast({
        title: "Fehler",
        description: "Bitte E-Mail und Passwort eingeben",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      clearAuthToken();

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
        credentials: 'include',
      });

      if (!response.ok) {
        let errorMsg = "Anmeldung fehlgeschlagen";
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
          if (errorData.remainingAttempts) {
            errorMsg += ` (Noch ${errorData.remainingAttempts} Versuch(e))`;
          }
        } catch {
          errorMsg = `Server-Fehler (${response.status})`;
        }
        throw new Error(errorMsg);
      }

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error("Server-Antwort konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.");
      }

      if (result.requires2FA) {
        setRequires2FA(true);
        setIsSubmitting(false);
        return;
      }

      if (result.token) {
        setAuthToken(result.token);
      }

      queryClient.setQueryData(["/api/auth/user"], {
        id: result.id,
        email: result.email,
        fullName: result.fullName,
        organizationId: result.organizationId,
        roles: result.roles,
      });

      try {
        const token = result.token || getAuthToken();
        if (token) {
          const verifyResponse = await fetch("/api/auth/user", {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include',
          });
          if (verifyResponse.ok) {
            const verifiedUser = await verifyResponse.json();
            queryClient.setQueryData(["/api/auth/user"], verifiedUser);
          }
        }
      } catch {
      }

      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });

      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error("Login error:", error);
      let description = error.message || "Ein unbekannter Fehler ist aufgetreten";
      if (error.message === "Failed to fetch" || error.name === "TypeError") {
        description = "Verbindung zum Server fehlgeschlagen. Bitte laden Sie die Seite neu (Strg+Shift+R).";
      }
      toast({
        title: "Anmeldung fehlgeschlagen",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFACode || twoFACode.length !== 6) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie den 6-stelligen Code ein",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: twoFACode }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "2FA-Verifizierung fehlgeschlagen");
      }

      const userData = await response.json();
      if (userData.token) {
        setAuthToken(userData.token);
      }
      queryClient.setQueryData(["/api/auth/user"], userData);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });

      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (error: any) {
      toast({
        title: "2FA-Verifizierung fehlgeschlagen",
        description: error.message || "Ungültiger Code",
        variant: "destructive",
      });
      setTwoFACode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupCode.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Backup-Code ein",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/2fa/backup-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: backupCode.trim() }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Backup-Code-Verifizierung fehlgeschlagen");
      }

      const userData = await response.json();
      if (userData.token) {
        setAuthToken(userData.token);
      }
      queryClient.setQueryData(["/api/auth/user"], userData);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });

      if (userData.backupCodesRemaining !== undefined && userData.backupCodesRemaining < 3) {
        toast({
          title: "Achtung",
          description: `Sie haben nur noch ${userData.backupCodesRemaining} Backup-Code(s) übrig. Bitte generieren Sie neue Codes in den Einstellungen.`,
        });
      }

      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (error: any) {
      toast({
        title: "Backup-Code-Verifizierung fehlgeschlagen",
        description: error.message || "Ungültiger Backup-Code",
        variant: "destructive",
      });
      setBackupCode('');
    } finally {
      setIsSubmitting(false);
    }
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

  if (requires2FA) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <img src={immoflowLogo} alt="ImmoFlowMe" className="h-16 w-auto" />
              </div>
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <ShieldCheck className="h-6 w-6" />
                Zwei-Faktor-Authentifizierung
              </CardTitle>
              <CardDescription>
                {showBackupInput
                  ? "Geben Sie einen Ihrer Backup-Codes ein"
                  : "Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein"}
              </CardDescription>
            </CardHeader>

            {showBackupInput ? (
              <form onSubmit={handleBackupSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="backup-code">Backup-Code</Label>
                    <Input
                      ref={twoFAInputRef}
                      id="backup-code"
                      type="text"
                      placeholder="XXXXXXXX"
                      value={backupCode}
                      onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                      disabled={isSubmitting}
                      data-testid="input-backup-code"
                      autoComplete="off"
                      className="text-center tracking-widest font-mono text-lg"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting || !backupCode.trim()}
                    data-testid="button-verify-backup"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <KeyRound className="mr-2 h-5 w-5" />
                    )}
                    Backup-Code verifizieren
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => { setShowBackupInput(false); setBackupCode(''); }}
                    data-testid="button-use-authenticator"
                  >
                    Authenticator-App verwenden
                  </Button>
                </CardContent>
              </form>
            ) : (
              <form onSubmit={handle2FASubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="2fa-code">Bestätigungscode</Label>
                    <Input
                      ref={twoFAInputRef}
                      id="2fa-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      disabled={isSubmitting}
                      data-testid="input-2fa-code"
                      autoComplete="one-time-code"
                      className="text-center tracking-widest font-mono text-lg"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting || twoFACode.length !== 6}
                    data-testid="button-verify-2fa"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-5 w-5" />
                    )}
                    Verifizieren
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => { setShowBackupInput(true); setTwoFACode(''); }}
                    data-testid="button-use-backup-code"
                  >
                    Backup-Code verwenden
                  </Button>
                </CardContent>
              </form>
            )}

            <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground">
              <Button
                variant="link"
                className="text-sm"
                onClick={() => { setRequires2FA(false); setTwoFACode(''); setBackupCode(''); setShowBackupInput(false); }}
                data-testid="button-back-to-login"
              >
                Zurück zur Anmeldung
              </Button>
            </CardFooter>
          </Card>
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
              <img src={immoflowLogo} alt="ImmoFlowMe" className="h-16 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Anmelden
            </CardTitle>
            <CardDescription>
              Melden Sie sich mit Ihrer E-Mail und Passwort an
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ihre@email.at"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  data-testid="input-email"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ihr Passwort"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    data-testid="input-password"
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="text-right">
                <Link 
                  to="/reset-password" 
                  className="text-sm text-primary hover:underline"
                  data-testid="link-forgot-password"
                >
                  Passwort vergessen?
                </Link>
              </div>
              <Button 
                type="submit"
                className="w-full" 
                size="lg"
                disabled={isSubmitting}
                data-testid="button-login"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-5 w-5" />
                )}
                Anmelden
              </Button>
            </CardContent>
          </form>
          <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground">
            <p>
              Noch kein Konto? <Link to="/demo" className="text-primary hover:underline">Kostenlos testen</Link>
            </p>
            <div className="flex gap-4 justify-center text-xs flex-wrap">
              <Link to="/impressum" className="hover:underline">Impressum</Link>
              <Link to="/datenschutz" className="hover:underline">Datenschutz</Link>
              <Link to="/agb" className="hover:underline">AGB</Link>
              <Link to="/avv" className="hover:underline">AVV</Link>
              <Link to="/sla" className="hover:underline">SLA</Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
