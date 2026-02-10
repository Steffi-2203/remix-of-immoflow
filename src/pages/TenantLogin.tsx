import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Home, Lock, Mail } from 'lucide-react';

/**
 * Separate login page for tenants accessing their self-service portal.
 * Uses same auth system but redirects to /mieterportal after login.
 */
export default function TenantLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'reset'>('login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Verify tenant portal access
      const { data: access, error: accessError } = await supabase
        .from('tenant_portal_access')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();

      if (!access) {
        await supabase.auth.signOut();
        toast.error('Kein aktiver Portal-Zugang für diese E-Mail-Adresse.');
        return;
      }

      // Update user_id and last_login if needed
      if (!access.user_id && data.user) {
        await supabase
          .from('tenant_portal_access')
          .update({ user_id: data.user.id, last_login_at: new Date().toISOString() })
          .eq('id', access.id);
      } else {
        await supabase
          .from('tenant_portal_access')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', access.id);
      }

      toast.success('Erfolgreich angemeldet');
      navigate('/mieterportal');
    } catch (err: any) {
      toast.error(err.message || 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Bitte E-Mail-Adresse eingeben');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/mieterportal`,
      });
      if (error) throw error;
      toast.success('Passwort-Reset E-Mail wurde gesendet');
      setMode('login');
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Senden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Home className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Mieterportal</CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Melden Sie sich an, um Ihre Mietdaten einzusehen'
              : 'Geben Sie Ihre E-Mail ein, um Ihr Passwort zurückzusetzen'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ihre.email@beispiel.at"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Wird angemeldet...' : 'Anmelden'}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-sm text-muted-foreground hover:text-primary underline"
                >
                  Passwort vergessen?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">E-Mail</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ihre.email@beispiel.at"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Wird gesendet...' : 'Passwort zurücksetzen'}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-sm text-muted-foreground hover:text-primary underline"
                >
                  Zurück zur Anmeldung
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
