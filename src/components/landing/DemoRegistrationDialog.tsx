import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, User, Play } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein');
const passwordSchema = z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein');

export function DemoRegistrationDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      emailSchema.parse(email);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-demo-account', {
        body: { email, password, fullName },
      });

      if (fnError) {
        setError('Fehler beim Erstellen des Demo-Kontos. Bitte versuchen Sie es erneut.');
        setIsLoading(false);
        return;
      }

      if (data?.error) {
        setError(data.error);
        setIsLoading(false);
        return;
      }

      // Auto-login with the created credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Konto erstellt, aber Anmeldung fehlgeschlagen. Bitte melden Sie sich manuell an.');
        setIsLoading(false);
        return;
      }

      setOpen(false);
      navigate('/dashboard');
    } catch {
      setError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" className="text-lg px-8">
          <Play className="mr-2 h-5 w-5" />
          Demo testen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Demo-Zugang erstellen</DialogTitle>
          <DialogDescription>
            Erstellen Sie einen kostenlosen Demo-Zugang, um ImmoflowMe mit Beispieldaten zu testen. Keine Kreditkarte erforderlich.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="demo-name">Name (optional)</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="demo-name"
                type="text"
                placeholder="Ihr Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="demo-email">E-Mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="demo-email"
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
            <Label htmlFor="demo-password">Passwort</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="demo-password"
                type="password"
                placeholder="Mind. 6 Zeichen"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Der Demo-Zugang verwendet ausschließlich fiktive Beispieldaten. Alle Änderungen sind nur virtuell.
          </p>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird erstellt...
              </>
            ) : (
              'Demo-Zugang erstellen'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
