import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Cookie, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'immoflow-cookie-consent';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  consentDate: string;
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState<boolean>(() => {
    try {
      return !localStorage.getItem(COOKIE_CONSENT_KEY);
    } catch {
      return true;
    }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    consentDate: '',
  });

  const savePreferences = (prefs: CookiePreferences) => {
    const prefsWithDate = {
      ...prefs,
      consentDate: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefsWithDate));
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    savePreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      consentDate: '',
    });
  };

  const acceptNecessary = () => {
    savePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      consentDate: '',
    });
  };

  const saveCustomPreferences = () => {
    savePreferences(preferences);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <Card className="w-full max-w-lg animate-in slide-in-from-bottom-4">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Cookie className="h-5 w-5" />
            Cookie-Einstellungen
          </CardTitle>
          <CardDescription>
            Wir verwenden Cookies, um Ihre Erfahrung zu verbessern. Bitte wählen Sie Ihre Präferenzen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showSettings ? (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label className="font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      Erforderliche Cookies
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Notwendig für die Grundfunktionen der Website
                    </p>
                  </div>
                  <Switch checked={true} disabled />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Analyse-Cookies</Label>
                    <p className="text-xs text-muted-foreground">
                      Helfen uns zu verstehen, wie Sie die Website nutzen
                    </p>
                  </div>
                  <Switch
                    checked={preferences.analytics}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, analytics: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Marketing-Cookies</Label>
                    <p className="text-xs text-muted-foreground">
                      Ermöglichen personalisierte Werbung
                    </p>
                  </div>
                  <Switch
                    checked={preferences.marketing}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, marketing: checked }))
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowSettings(false)} className="flex-1">
                  Zurück
                </Button>
                <Button onClick={saveCustomPreferences} className="flex-1">
                  Auswahl speichern
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Diese Website verwendet Cookies. Erforderliche Cookies sind für die Grundfunktionen
                notwendig. Optionale Cookies helfen uns, die Website zu verbessern.{' '}
                <Link to="/datenschutz" className="text-primary underline">
                  Mehr erfahren
                </Link>
              </p>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button variant="outline" onClick={acceptNecessary} className="flex-1">
                  Nur erforderliche
                </Button>
                <Button variant="outline" onClick={() => setShowSettings(true)} className="flex-1">
                  Einstellungen
                </Button>
                <Button onClick={acceptAll} className="flex-1">
                  Alle akzeptieren
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Hook to get current cookie preferences
export function useCookieConsent() {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      try {
        setPreferences(JSON.parse(stored));
      } catch {
        setPreferences(null);
      }
    }
  }, []);

  return preferences;
}
