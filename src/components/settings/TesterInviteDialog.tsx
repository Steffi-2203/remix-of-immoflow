import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Timer, Copy, Check, ExternalLink } from 'lucide-react';
import { useCreateTesterInvite } from '@/hooks/useOrganizationInvites';

const testerSchema = z.object({
  email: z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
});

type TesterFormData = z.infer<typeof testerSchema>;

interface TesterInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TesterInviteDialog({ open, onOpenChange }: TesterInviteDialogProps) {
  const createTesterInvite = useCreateTesterInvite();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<TesterFormData>({
    resolver: zodResolver(testerSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: TesterFormData) => {
    setIsSubmitting(true);
    try {
      const invite = await createTesterInvite.mutateAsync(data.email);
      
      // Generate the invite link to show to the admin for manual sharing
      const inviteLink = `${window.location.origin}/register?invite=${invite.token}`;
      setCreatedInviteLink(inviteLink);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (createdInviteLink) {
      await navigator.clipboard.writeText(createdInviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setCreatedInviteLink(null);
      setCopied(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Tester einladen
          </DialogTitle>
          <DialogDescription>
            Erstellen Sie einen zeitlich begrenzten Testzugang (30 Minuten)
          </DialogDescription>
        </DialogHeader>

        {createdInviteLink ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-green-50 dark:bg-green-950 p-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                ✓ Tester-Einladung erfolgreich erstellt!
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                Teilen Sie den folgenden Link manuell (z.B. per WhatsApp, SMS oder E-Mail):
              </p>
              <div className="flex items-center gap-2">
                <Input 
                  value={createdInviteLink} 
                  readOnly 
                  className="text-xs font-mono"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="rounded-lg border bg-amber-50 dark:bg-amber-950 p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Der Tester hat nach Registrierung genau 30 Minuten Zugang.
              </p>
            </div>
            
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>
                Schließen
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-Mail-Adresse des Testers *</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="tester@beispiel.de" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Kein E-Mail-Versand - Sie erhalten einen Link zum manuellen Teilen.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tester info card */}
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="h-5 w-5 text-primary" />
                  <span className="font-medium">Tester (30 Min.)</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Zeitlich begrenzt (30 Minuten), nur Leserechte. Der Tester kann keine 
                  Einladungen erstellen oder Daten ändern.
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose(false)}
                  disabled={isSubmitting}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Link erstellen
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
