import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function TotpSetup() {
  const { toast } = useToast();
  const [step, setStep] = useState<'idle' | 'enrolling' | 'verifying' | 'done'>('idle');
  const [qrCode, setQrCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEnroll = async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setFactorId(data.id);
      setStep('enrolling');
    } catch (err: any) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!supabase || !factorId) return;
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

      setStep('done');
      toast({ title: '2FA aktiviert', description: 'Zwei-Faktor-Authentifizierung wurde erfolgreich eingerichtet.' });
    } catch (err: any) {
      toast({ title: 'Verifizierung fehlgeschlagen', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnenroll = async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      if (totpFactor) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
        if (error) throw error;
      }
      setStep('idle');
      toast({ title: '2FA deaktiviert' });
    } catch (err: any) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Zwei-Faktor-Authentifizierung (2FA)
        </CardTitle>
        <CardDescription>
          Schützen Sie Ihr Konto mit einem TOTP-Authenticator (z.B. Google Authenticator, Authy).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'idle' && (
          <Button onClick={handleEnroll} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
            2FA aktivieren
          </Button>
        )}

        {step === 'enrolling' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scannen Sie den QR-Code mit Ihrer Authenticator-App und geben Sie den Code ein:
            </p>
            {qrCode && (
              <div className="flex justify-center p-4 bg-background rounded-lg w-fit mx-auto border">
                <img src={qrCode} alt="TOTP QR Code" className="w-48 h-48" />
              </div>
            )}
            <div className="flex flex-col items-center gap-3">
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
              <Button onClick={handleVerify} disabled={otpCode.length !== 6 || isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Verifizieren
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">2FA ist aktiv</span>
            </div>
            <Button variant="destructive" size="sm" onClick={handleUnenroll} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              2FA deaktivieren
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
