import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Clock, CheckCircle2, Loader2, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export default function DemoRequestPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/demo/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Fehler beim Anfordern der Demo");
      }
    } catch (err) {
      setError("Netzwerkfehler. Bitte versuchen Sie es später erneut.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">E-Mail gesendet!</CardTitle>
            <CardDescription>
              Wir haben Ihnen eine E-Mail an <strong>{email}</strong> gesendet.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Klicken Sie auf den Link in der E-Mail, um Ihren 30-Minuten Demo-Zugang zu aktivieren.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>Prüfen Sie auch Ihren Spam-Ordner</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-10 h-10 text-blue-600" />
            <h1 className="text-3xl font-bold">ImmoflowMe</h1>
          </div>
          <h2 className="text-4xl font-bold leading-tight">
            Testen Sie unsere Hausverwaltungssoftware
          </h2>
          <p className="text-lg text-muted-foreground">
            Erleben Sie alle Funktionen von ImmoflowMe mit realistischen Beispieldaten - 
            kostenlos und unverbindlich.
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">30 Minuten Demo-Zugang</h3>
                <p className="text-sm text-muted-foreground">
                  Genug Zeit, um alle wichtigen Funktionen zu testen
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Realistische Beispieldaten</h3>
                <p className="text-sm text-muted-foreground">
                  Wiener Altbau, Grazer Neubau - echte österreichische Szenarien
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">MRG-konform</h3>
                <p className="text-sm text-muted-foreground">
                  Betriebskostenabrechnung, Mahnwesen, VPI-Indexierung
                </p>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Demo anfordern</CardTitle>
            <CardDescription>
              Geben Sie Ihre E-Mail-Adresse ein, um einen Demo-Link zu erhalten.
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
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ihre@email.at"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-demo-email"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
                data-testid="button-request-demo"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  "Demo-Link anfordern"
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Keine Kreditkarte erforderlich. Kein Abo-Zwang.
              </p>
              <div className="text-center text-sm">
                <span className="text-muted-foreground">Bereits registriert? </span>
                <Link to="/login" className="text-blue-600 hover:underline">
                  Anmelden
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
