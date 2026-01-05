import { Link } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Datenschutz() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">ImmoFlow</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Datenschutzerklärung</h1>

        <div className="space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Verantwortlicher</h2>
            <p>
              Verantwortlich für die Datenverarbeitung auf dieser Website ist:
            </p>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="font-medium text-foreground">ImmoFlowMe</p>
              <p>Stephania Pfeffer</p>
              <p className="mt-2">
                E-Mail:{' '}
                <a href="mailto:datenschutz@immoflowme.at" className="text-primary hover:underline">
                  datenschutz@immoflowme.at
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Erhebung und Speicherung personenbezogener Daten</h2>
            <p>
              Wir erheben personenbezogene Daten, wenn Sie uns diese im Rahmen Ihrer Registrierung, 
              bei der Nutzung unserer Software oder bei Kontaktaufnahme mit uns freiwillig mitteilen.
            </p>
            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Bei der Registrierung:</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>E-Mail-Adresse</li>
              <li>Name (optional)</li>
              <li>Firmenname (optional)</li>
              <li>Passwort (verschlüsselt gespeichert)</li>
            </ul>
            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Bei der Nutzung der Software:</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Liegenschaftsdaten (Adresse, Größe, etc.)</li>
              <li>Mieterdaten (Name, Kontaktdaten, Mietverträge)</li>
              <li>Finanzdaten (Mieten, Zahlungen, Betriebskosten)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Zweck der Datenverarbeitung</h2>
            <p>Die erhobenen Daten werden verwendet für:</p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
              <li>Bereitstellung und Betrieb der Hausverwaltungssoftware</li>
              <li>Verwaltung Ihres Benutzerkontos</li>
              <li>Abrechnung und Zahlungsabwicklung</li>
              <li>Kommunikation bezüglich Ihres Kontos und des Services</li>
              <li>Verbesserung unserer Dienste</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Rechtsgrundlage</h2>
            <p>
              Die Verarbeitung Ihrer Daten erfolgt auf Grundlage von Art. 6 Abs. 1 DSGVO:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
              <li>Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)</li>
              <li>Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO)</li>
              <li>Berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Datensicherheit</h2>
            <p>
              Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre Daten 
              gegen Manipulation, Verlust, Zerstörung oder unbefugten Zugriff zu schützen. Unsere 
              Sicherheitsmaßnahmen werden entsprechend der technologischen Entwicklung fortlaufend 
              verbessert.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
              <li>Verschlüsselte Datenübertragung (SSL/TLS)</li>
              <li>Verschlüsselte Passwörter</li>
              <li>Regelmäßige Sicherheitsüberprüfungen</li>
              <li>Zugangsbeschränkungen und Berechtigungssysteme</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Ihre Rechte</h2>
            <p>Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:</p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
              <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
              <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
              <li>Recht auf Löschung (Art. 17 DSGVO)</li>
              <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruchsrecht (Art. 21 DSGVO)</li>
            </ul>
            <p className="mt-4">
              Zur Ausübung Ihrer Rechte wenden Sie sich bitte an:{' '}
              <a href="mailto:datenschutz@immoflowme.at" className="text-primary hover:underline">
                datenschutz@immoflowme.at
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Cookies</h2>
            <p>
              Unsere Website verwendet Cookies. Bei Cookies handelt es sich um kleine Textdateien, 
              die auf Ihrem Endgerät gespeichert werden. Wir nutzen Cookies, um die Nutzung unserer 
              Website zu analysieren und Ihren Besuch komfortabler zu gestalten.
            </p>
            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Erforderliche Cookies:</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Session-Cookies für die Authentifizierung</li>
              <li>Sicherheits-Cookies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Hosting</h2>
            <p>
              Unsere Website und Datenbank werden auf Servern von vertrauenswürdigen Cloud-Anbietern 
              gehostet, die die Anforderungen der DSGVO erfüllen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Änderungen</h2>
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie stets an die 
              aktuellen rechtlichen Anforderungen anzupassen oder um Änderungen unserer Leistungen 
              umzusetzen.
            </p>
            <p className="mt-2 text-sm">Stand: Januar 2026</p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-border flex gap-6 text-sm">
          <Link to="/impressum" className="text-muted-foreground hover:text-foreground">
            Impressum
          </Link>
          <Link to="/agb" className="text-muted-foreground hover:text-foreground">
            AGB
          </Link>
        </div>
      </main>
    </div>
  );
}