import { Link } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AGB() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">ImmoFlowMe</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" data-testid="button-back-agb">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Allgemeine Geschäftsbedingungen (AGB)</h1>

        <div className="space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 1 Geltungsbereich</h2>
            <p>
              (1) Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen
              ImmoFlowMe (nachfolgend "Anbieter") und dem Kunden über die Nutzung der
              webbasierten Hausverwaltungssoftware unter{' '}
              <a href="https://www.immoflowme.at" className="text-primary hover:underline">
                https://www.immoflowme.at
              </a>.
            </p>
            <p className="mt-2">
              (2) Abweichende Bedingungen des Kunden werden nicht anerkannt, es sei denn, 
              der Anbieter stimmt ihrer Geltung ausdrücklich schriftlich zu.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 2 Vertragsgegenstand</h2>
            <p>
              (1) Der Anbieter stellt dem Kunden eine webbasierte Softwarelösung zur 
              Verwaltung von Immobilien als Software-as-a-Service (SaaS) zur Verfügung.
            </p>
            <p className="mt-2">
              (2) Der Funktionsumfang richtet sich nach dem jeweils gewählten Tarif 
              (Starter, Professional, Enterprise).
            </p>
            <p className="mt-2">
              (3) Die Software wird über das Internet bereitgestellt. Der Kunde benötigt 
              einen aktuellen Webbrowser und eine Internetverbindung.
            </p>
            <p className="mt-2">
              (4) Der Anbieter erbringt seine Leistungen nach Maßgabe der jeweils gültigen Leistungsbeschreibung und des Service Level Agreements (SLA).
            </p>
            <p className="mt-2">
              (5) Die Software dient als Hilfsmittel zur Immobilienverwaltung. Die Verantwortung für die Richtigkeit der eingegebenen Daten und die rechtliche Konformität der erstellten Abrechnungen liegt beim Kunden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 3 Vertragsschluss und Testphase</h2>
            <p>
              (1) Die Registrierung des Kunden stellt ein Angebot zum Abschluss eines 
              Nutzungsvertrages dar.
            </p>
            <p className="mt-2">
              (2) Der Vertrag kommt mit der Aktivierung des Kundenkontos zustande.
            </p>
            <p className="mt-2">
              (3) Neukunden erhalten eine kostenlose Testphase von 14 Tagen. Nach Ablauf 
              der Testphase ist die Buchung eines kostenpflichtigen Tarifs erforderlich.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 4 Leistungen des Anbieters</h2>
            <p>(1) Der Anbieter gewährleistet eine Verfügbarkeit der Software von 99% im Jahresmittel.</p>
            <p className="mt-2">
              (2) Wartungsarbeiten werden, soweit möglich, außerhalb der üblichen 
              Geschäftszeiten durchgeführt.
            </p>
            <p className="mt-2">
              (3) Der Anbieter führt regelmäßige Datensicherungen durch.
            </p>
            <p className="mt-2">
              (4) Details zur Verfügbarkeit und Support-Zeiten ergeben sich aus dem jeweiligen Service Level Agreement (SLA).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 5 Pflichten des Kunden</h2>
            <p>(1) Der Kunde ist verpflichtet:</p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
              <li>Zugangsdaten sicher aufzubewahren und vor unbefugtem Zugriff zu schützen</li>
              <li>Die Software nur für rechtmäßige Zwecke zu nutzen</li>
              <li>Keine rechtswidrigen Inhalte einzugeben oder zu speichern</li>
              <li>Änderungen seiner Kontaktdaten unverzüglich mitzuteilen</li>
              <li>Regelmäßige Kontrollen der Software-Ergebnisse (insbesondere Abrechnungen) durchzuführen</li>
            </ul>
            <p className="mt-2">
              (2) Der Kunde ist für die Richtigkeit der eingegebenen Daten verantwortlich.
            </p>
            <p className="mt-2">
              (3) Der Kunde ist für die Einhaltung der DSGVO bei der Verarbeitung von Mieterdaten verantwortlich.
            </p>
            <p className="mt-2">
              (4) Der Kunde schließt vor Nutzung einen Auftragsverarbeitungsvertrag (AVV) ab.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 6 Preise und Zahlung</h2>
            <p>
              (1) Die aktuellen Preise sind der Preisübersicht auf der Website zu entnehmen.
            </p>
            <p className="mt-2">
              (2) Alle Preise verstehen sich in Euro und inklusive der gesetzlichen Umsatzsteuer.
            </p>
            <p className="mt-2">
              (3) Die Zahlung erfolgt im Voraus per Kreditkarte oder SEPA-Lastschrift.
            </p>
            <p className="mt-2">
              (4) Bei Zahlungsverzug ist der Anbieter berechtigt, den Zugang zur Software 
              vorübergehend zu sperren.
            </p>
            <p className="mt-2">
              (5) Alle Preise verstehen sich zuzüglich der gesetzlichen Umsatzsteuer von 20% (B2B). Für Verbraucher sind die angegebenen Preise Endpreise inkl. USt.
            </p>
            <p className="mt-2">
              (6) Der Anbieter behält sich Preisanpassungen mit einer Ankündigungsfrist von 30 Tagen vor. Bei Preiserhöhungen hat der Kunde ein Sonderkündigungsrecht.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 7 Vertragslaufzeit und Kündigung</h2>
            <p>
              (1) Der Vertrag wird auf unbestimmte Zeit geschlossen und kann von beiden 
              Parteien mit einer Frist von einem Monat zum Ende des jeweiligen 
              Abrechnungszeitraums gekündigt werden.
            </p>
            <p className="mt-2">
              (2) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.
            </p>
            <p className="mt-2">
              (3) Nach Vertragsende werden die Kundendaten für 30 Tage zur Abholung 
              bereitgehalten und anschließend gelöscht.
            </p>
            <p className="mt-2">
              (4) Bei Kündigung erhält der Kunde die Möglichkeit, seine Daten innerhalb von 30 Tagen zu exportieren (CSV, XLSX, PDF).
            </p>
            <p className="mt-2">
              (5) Gesetzliche Aufbewahrungsfristen (BAO §132: 7 Jahre, §18 UStG: 22 Jahre für Grundstücksunterlagen) bleiben von der Löschung unberührt.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 8 Datenschutz</h2>
            <p>
              Der Anbieter verarbeitet personenbezogene Daten des Kunden gemäß der 
              Datenschutzerklärung und den geltenden Datenschutzgesetzen (DSGVO).
            </p>
            <p className="mt-2">
              Der Anbieter verarbeitet personenbezogene Daten gemäß der{' '}
              <Link to="/datenschutz" className="text-primary hover:underline">Datenschutzerklärung</Link>{' '}
              und dem{' '}
              <Link to="/avv" className="text-primary hover:underline">Auftragsverarbeitungsvertrag (AVV)</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 9 Haftung und Haftungsbegrenzung</h2>
            <p>
              (1) Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Schäden an Leben, Körper und Gesundheit.
            </p>
            <p className="mt-2">
              (2) Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten), begrenzt auf den vorhersehbaren, vertragstypischen Schaden.
            </p>
            <p className="mt-2">
              (3) Die Haftung ist der Höhe nach auf den doppelten Jahresbeitrag des jeweiligen Abonnements begrenzt, maximal jedoch auf EUR 10.000,00.
            </p>
            <p className="mt-2">
              (4) <span className="font-semibold text-foreground">Haftungsausschluss für Berechnungen:</span> Der Anbieter übernimmt keine Gewähr für die Richtigkeit automatisch erstellter Abrechnungen (insbesondere Betriebskosten-, Heizkosten- und sonstiger Abrechnungen). Der Kunde ist verpflichtet, sämtliche Berechnungsergebnisse eigenverantwortlich zu prüfen. Die Software dient als Hilfsmittel und ersetzt nicht die fachliche Prüfung durch qualifiziertes Personal oder einen Steuerberater.
            </p>
            <p className="mt-2">
              (5) Der Anbieter haftet nicht für Schäden, die durch fehlerhafte Eingaben des Kunden, durch Nutzung der Software entgegen der Dokumentation oder durch höhere Gewalt entstehen.
            </p>
            <p className="mt-2">
              (6) Schadensersatzansprüche des Kunden verjähren innerhalb eines Jahres ab Kenntnis des Schadens.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 10 Datensicherung und Verfügbarkeit</h2>
            <p>
              (1) Der Anbieter erstellt tägliche Sicherungskopien der Kundendaten.
            </p>
            <p className="mt-2">
              (2) Dem Kunden wird empfohlen, regelmäßig eigene Datensicherungen über die Export-Funktion der Software durchzuführen.
            </p>
            <p className="mt-2">
              (3) Der Anbieter gewährleistet die im SLA festgelegte Verfügbarkeit.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 11 Geistiges Eigentum</h2>
            <p>
              (1) Alle Rechte an der Software verbleiben beim Anbieter.
            </p>
            <p className="mt-2">
              (2) Der Kunde erhält ein nicht-exklusives, nicht-übertragbares Nutzungsrecht für die Dauer des Vertrages.
            </p>
            <p className="mt-2">
              (3) Die vom Kunden eingegebenen Daten verbleiben im Eigentum des Kunden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 12 Änderungen der AGB</h2>
            <p>
              (1) Der Anbieter behält sich vor, diese AGB mit Wirkung für die Zukunft zu ändern.
            </p>
            <p className="mt-2">
              (2) Änderungen werden dem Kunden per E-Mail mitgeteilt. Widerspricht der 
              Kunde nicht innerhalb von 4 Wochen, gelten die geänderten AGB als angenommen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 13 Schlussbestimmungen</h2>
            <p>
              (1) Es gilt österreichisches Recht unter Ausschluss des UN-Kaufrechts.
            </p>
            <p className="mt-2">
              (2) Gerichtsstand für alle Streitigkeiten ist, soweit gesetzlich zulässig, 
              der Sitz des Anbieters.
            </p>
            <p className="mt-2">
              (3) Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die 
              Wirksamkeit der übrigen Bestimmungen unberührt.
            </p>
            <p className="mt-4 text-sm">Stand: Februar 2026</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-6 text-sm">
          <Link to="/impressum" className="text-muted-foreground hover:text-foreground">
            Impressum
          </Link>
          <Link to="/datenschutz" className="text-muted-foreground hover:text-foreground">
            Datenschutz
          </Link>
          <Link to="/avv" className="text-muted-foreground hover:text-foreground">
            AVV
          </Link>
          <Link to="/sla" className="text-muted-foreground hover:text-foreground">
            SLA
          </Link>
        </div>
      </main>
    </div>
  );
}