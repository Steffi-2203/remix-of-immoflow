import { Link } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AGB() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">ImmoFlowMe</span>
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
        <h1 className="text-3xl font-bold text-foreground mb-8">Allgemeine Geschäftsbedingungen (AGB)</h1>

        <div className="space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 1 Geltungsbereich</h2>
            <p>
              (1) Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen
              ImmoFlowMe (nachfolgend "Anbieter") und dem Kunden über die Nutzung der
              webbasierten Hausverwaltungssoftware unter{' '}
              <a href="https://immoflowme.at" className="text-primary hover:underline">
                https://immoflowme.at
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
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 5 Pflichten des Kunden</h2>
            <p>(1) Der Kunde ist verpflichtet:</p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
              <li>Zugangsdaten sicher aufzubewahren und vor unbefugtem Zugriff zu schützen</li>
              <li>Die Software nur für rechtmäßige Zwecke zu nutzen</li>
              <li>Keine rechtswidrigen Inhalte einzugeben oder zu speichern</li>
              <li>Änderungen seiner Kontaktdaten unverzüglich mitzuteilen</li>
            </ul>
            <p className="mt-2">
              (2) Der Kunde ist für die Richtigkeit der eingegebenen Daten verantwortlich.
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
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 8 Datenschutz</h2>
            <p>
              Der Anbieter verarbeitet personenbezogene Daten des Kunden gemäß der 
              Datenschutzerklärung und den geltenden Datenschutzgesetzen (DSGVO).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 9 Haftung</h2>
            <p>
              (1) Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des 
              Lebens, des Körpers oder der Gesundheit sowie für Vorsatz und grobe 
              Fahrlässigkeit.
            </p>
            <p className="mt-2">
              (2) Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung 
              wesentlicher Vertragspflichten (Kardinalpflichten), begrenzt auf den 
              typischerweise vorhersehbaren Schaden.
            </p>
            <p className="mt-2">
              (3) Eine weitergehende Haftung ist ausgeschlossen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 10 Änderungen der AGB</h2>
            <p>
              (1) Der Anbieter behält sich vor, diese AGB mit Wirkung für die Zukunft zu ändern.
            </p>
            <p className="mt-2">
              (2) Änderungen werden dem Kunden per E-Mail mitgeteilt. Widerspricht der 
              Kunde nicht innerhalb von 4 Wochen, gelten die geänderten AGB als angenommen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 11 Schlussbestimmungen</h2>
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
            <p className="mt-4 text-sm">Stand: Januar 2026</p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-border flex gap-6 text-sm">
          <Link to="/impressum" className="text-muted-foreground hover:text-foreground">
            Impressum
          </Link>
          <Link to="/datenschutz" className="text-muted-foreground hover:text-foreground">
            Datenschutz
          </Link>
        </div>
      </main>
    </div>
  );
}