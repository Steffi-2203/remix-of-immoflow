import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TotpChallengeProps {
  factorId: string;
  onSuccess: () => void;
}

export function TotpChallenge({ factorId, onSuccess }: TotpChallengeProps) {
  const { toast } = useToast();
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: otpCode,
      });
      if (verifyError) throw verifyError;

      onSuccess();
    } catch (err: any) {
      toast({ title: 'Code ungültig', description: 'Bitte versuchen Sie es erneut.', variant: 'destructive' });
      setOtpCode('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle>Zwei-Faktor-Authentifizierung</CardTitle>
          <CardDescription>
            Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={otpCode.length !== 6 || isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Bestätigen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
