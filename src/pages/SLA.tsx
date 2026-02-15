import { Link } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SLA() {
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
            <Button variant="ghost" size="sm" data-testid="button-back-sla">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Service Level Agreement (SLA)</h1>
        <p className="text-sm text-muted-foreground mb-2">Stand: Februar 2026</p>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-4 mb-8">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Hinweis: Dieses SLA dient als Muster und sollte vor Verwendung von einem Rechtsanwalt geprüft werden.
          </p>
        </div>

        <div className="space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Präambel</h2>
            <p>
              Dieses Service Level Agreement (SLA) definiert die Qualitätszusagen und Leistungsverpflichtungen 
              der ImmoFlowMe-Plattform gegenüber ihren Kunden. Es regelt die Verfügbarkeit, Supportleistungen, 
              Reaktionszeiten und Kompensationsregelungen für die von Stephania Pfeffer – ImmoFlowMe betriebene 
              webbasierte Hausverwaltungssoftware (Software-as-a-Service, nachfolgend „SaaS-Dienst" genannt).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 1 Geltungsbereich</h2>
            <p>
              Dieses SLA gilt für alle zahlenden Kunden der ImmoFlowMe-Plattform. Der Umfang der zugesicherten 
              Leistungen richtet sich nach dem jeweils gewählten Abonnement (Starter, Professional oder Enterprise). 
              Kostenlose Testphasen und Demo-Zugänge sind von diesem SLA ausgenommen. Das SLA ist Bestandteil der 
              Allgemeinen Geschäftsbedingungen (AGB) und ergänzt diese. Bei Widersprüchen zwischen AGB und SLA 
              gehen die Regelungen des SLA vor, soweit sie für den Kunden günstiger sind.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 2 Verfügbarkeit</h2>
            <p className="mb-4">
              ImmoFlowMe verpflichtet sich zu folgenden monatlichen Verfügbarkeitsgarantien, abhängig vom gewählten Tarif:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-4 py-2 text-left text-foreground">Tarif</th>
                    <th className="border border-border px-4 py-2 text-left text-foreground">Monatspreis</th>
                    <th className="border border-border px-4 py-2 text-left text-foreground">Verfügbarkeit</th>
                    <th className="border border-border px-4 py-2 text-left text-foreground">Max. Ausfallzeit/Monat</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-4 py-2 text-foreground font-medium">Starter</td>
                    <td className="border border-border px-4 py-2">€ 49/Monat</td>
                    <td className="border border-border px-4 py-2">99,0 %</td>
                    <td className="border border-border px-4 py-2">~7,3 Stunden</td>
                  </tr>
                  <tr className="bg-muted/50">
                    <td className="border border-border px-4 py-2 text-foreground font-medium">Professional</td>
                    <td className="border border-border px-4 py-2">€ 149/Monat</td>
                    <td className="border border-border px-4 py-2">99,5 %</td>
                    <td className="border border-border px-4 py-2">~3,6 Stunden</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2 text-foreground font-medium">Enterprise</td>
                    <td className="border border-border px-4 py-2">€ 299/Monat</td>
                    <td className="border border-border px-4 py-2">99,9 %</td>
                    <td className="border border-border px-4 py-2">~43 Minuten</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              Die Verfügbarkeit wird monatlich gemessen. Geplante Wartungsarbeiten gemäß § 3 werden bei der 
              Berechnung der Verfügbarkeit nicht als Ausfallzeit gewertet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 3 Geplante Wartung</h2>
            <p>
              Geplante Wartungsarbeiten werden mindestens 48 Stunden im Voraus per E-Mail und/oder über die 
              Plattform angekündigt. Wartungsarbeiten finden bevorzugt an Wochenenden oder in den Nachtstunden 
              (österreichischer Zeit, MEZ/MESZ) statt, um die Beeinträchtigung des laufenden Betriebs zu 
              minimieren. Die maximale geplante Wartungszeit beträgt 4 Stunden pro Kalendermonat. Geplante 
              Wartungszeiten werden bei der Berechnung der Verfügbarkeit gemäß § 2 nicht berücksichtigt.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 4 Support-Zeiten und Reaktionszeiten</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-4 py-2 text-left text-foreground">Merkmal</th>
                    <th className="border border-border px-4 py-2 text-left text-foreground">Starter</th>
                    <th className="border border-border px-4 py-2 text-left text-foreground">Professional</th>
                    <th className="border border-border px-4 py-2 text-left text-foreground">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-4 py-2 text-foreground font-medium">Support-Kanäle</td>
                    <td className="border border-border px-4 py-2">E-Mail</td>
                    <td className="border border-border px-4 py-2">E-Mail + Chat</td>
                    <td className="border border-border px-4 py-2">E-Mail + Chat + Telefon</td>
                  </tr>
                  <tr className="bg-muted/50">
                    <td className="border border-border px-4 py-2 text-foreground font-medium">Erreichbarkeit</td>
                    <td className="border border-border px-4 py-2">Mo–Fr 9–17 Uhr (MEZ)</td>
                    <td className="border border-border px-4 py-2">Mo–Fr 8–18 Uhr (MEZ)</td>
                    <td className="border border-border px-4 py-2">Mo–Fr 7–20 Uhr (MEZ)</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2 text-foreground font-medium">Reaktionszeit</td>
                    <td className="border border-border px-4 py-2">48 Stunden</td>
                    <td className="border border-border px-4 py-2">24 Stunden</td>
                    <td className="border border-border px-4 py-2">4 Stunden</td>
                  </tr>
                  <tr className="bg-muted/50">
                    <td className="border border-border px-4 py-2 text-foreground font-medium">Zusatzleistungen</td>
                    <td className="border border-border px-4 py-2">—</td>
                    <td className="border border-border px-4 py-2">Priority-Queue</td>
                    <td className="border border-border px-4 py-2">Dedicated Account Manager</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              Reaktionszeiten beziehen sich auf die erste qualifizierte Rückmeldung innerhalb der jeweiligen 
              Support-Zeiten. Anfragen außerhalb der Support-Zeiten werden am nächsten Werktag bearbeitet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 5 Störungskategorien</h2>
            <p className="mb-4">
              Störungen werden in folgende Kategorien eingeteilt, die die Reaktions- und Bearbeitungszeiten bestimmen:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-4 py-2 text-left text-foreground">Kategorie</th>
                    <th className="border border-border px-4 py-2 text-left text-foreground">Beschreibung</th>
                    <th className="border border-border px-4 py-2 text-left text-foreground">Enterprise</th>
                    <th className="border border-border px-4 py-2 text-left text-foreground">Professional</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-4 py-2 text-foreground font-medium">Kritisch (Severity 1)</td>
                    <td className="border border-border px-4 py-2">Gesamtausfall des Systems, keine Nutzung möglich</td>
                    <td className="border border-border px-4 py-2">1 Stunde</td>
                    <td className="border border-border px-4 py-2">4 Stunden</td>
                  </tr>
                  <tr className="bg-muted/50">
                    <td className="border border-border px-4 py-2 text-foreground font-medium">Hoch (Severity 2)</td>
                    <td className="border border-border px-4 py-2">Wesentliche Funktionen eingeschränkt</td>
                    <td className="border border-border px-4 py-2">4 Stunden</td>
                    <td className="border border-border px-4 py-2">8 Stunden</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2 text-foreground font-medium">Mittel (Severity 3)</td>
                    <td className="border border-border px-4 py-2">Einzelne Features betroffen, Workaround möglich</td>
                    <td className="border border-border px-4 py-2">8 Stunden</td>
                    <td className="border border-border px-4 py-2">24 Stunden</td>
                  </tr>
                  <tr className="bg-muted/50">
                    <td className="border border-border px-4 py-2 text-foreground font-medium">Niedrig (Severity 4)</td>
                    <td className="border border-border px-4 py-2">Kosmetische Fehler, geringfügige Beeinträchtigung</td>
                    <td className="border border-border px-4 py-2">48 Stunden</td>
                    <td className="border border-border px-4 py-2">72 Stunden</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              Für den Starter-Tarif gelten die allgemeinen Reaktionszeiten gemäß § 4. Die Einstufung der 
              Störungskategorie erfolgt durch ImmoFlowMe nach pflichtgemäßem Ermessen unter Berücksichtigung 
              der Kundenangaben.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 6 Datensicherung</h2>
            <p className="mb-4">
              ImmoFlowMe setzt folgende Maßnahmen zur Datensicherung ein:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Tägliche automatisierte Backups aller Kundendaten</li>
              <li>Aufbewahrungsdauer der Backups: 30 Tage</li>
              <li>Point-in-Time Recovery über Neon-Datenbank-Infrastruktur</li>
              <li>Recovery Point Objective (RPO): weniger als 1 Stunde</li>
              <li>Recovery Time Objective (RTO): weniger als 4 Stunden</li>
            </ul>
            <p className="mt-4">
              Die Datensicherung erfolgt auf georedundanten Servern innerhalb der Europäischen Union. 
              ImmoFlowMe informiert den Kunden unverzüglich über etwaige Datenverluste und leitet 
              umgehend Wiederherstellungsmaßnahmen ein.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 7 Gutschriften bei SLA-Verletzung</h2>
            <p className="mb-4">
              Bei Nichteinhaltung der zugesicherten Verfügbarkeit gemäß § 2 hat der Kunde Anspruch auf 
              folgende Gutschriften:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-4 py-2 text-left text-foreground">Verfügbarkeit</th>
                    <th className="border border-border px-4 py-2 text-left text-foreground">Gutschrift</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-4 py-2">Unter dem zugesicherten SLA-Wert</td>
                    <td className="border border-border px-4 py-2">5 % des Monatsbeitrags</td>
                  </tr>
                  <tr className="bg-muted/50">
                    <td className="border border-border px-4 py-2">Mehr als 1 Prozentpunkt unter dem SLA-Wert</td>
                    <td className="border border-border px-4 py-2">10 % des Monatsbeitrags</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2">Mehr als 2 Prozentpunkte unter dem SLA-Wert</td>
                    <td className="border border-border px-4 py-2">25 % des Monatsbeitrags</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              Die maximale Gutschrift ist auf 50 % des monatlichen Abonnementbeitrags begrenzt. Gutschriften 
              müssen innerhalb von 30 Tagen nach Ende des betroffenen Abrechnungsmonats schriftlich oder per 
              E-Mail an kontakt@immoflowme.at geltend gemacht werden. Gutschriften werden mit der nächsten 
              Monatsrechnung verrechnet und nicht in bar ausgezahlt.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 8 Ausnahmen</h2>
            <p className="mb-4">
              Folgende Umstände sind von den Verfügbarkeitszusagen und Gutschriftenregelungen ausgenommen:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Höhere Gewalt (Force Majeure), einschließlich Naturkatastrophen, Krieg, Pandemien, behördliche Anordnungen</li>
              <li>Störungen, die durch den Kunden selbst verursacht wurden (z. B. fehlerhafte API-Nutzung, Überschreitung von Ratenlimits)</li>
              <li>Ausfälle von Drittanbietern, die außerhalb des Einflussbereichs von ImmoFlowMe liegen (z. B. Cloud-Infrastruktur-Provider, DNS-Dienste)</li>
              <li>Geplante Wartungsarbeiten gemäß § 3</li>
              <li>Funktionen, die als Beta oder experimentell gekennzeichnet sind</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 9 Monitoring und Berichterstattung</h2>
            <p>
              ImmoFlowMe überwacht die Verfügbarkeit und Leistung der Plattform kontinuierlich mittels 
              automatisierter Monitoring-Systeme. Kunden des Enterprise-Tarifs erhalten auf Anfrage monatliche 
              Verfügbarkeitsberichte. Eine öffentliche Statusseite ist unter{' '}
              <span className="text-foreground font-medium">status.immoflowme.at</span>{' '}
              geplant und wird über aktuelle Störungen, geplante Wartungsarbeiten und den 
              Systemstatus informieren.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 10 Änderungen</h2>
            <p>
              ImmoFlowMe behält sich das Recht vor, dieses SLA mit einer Ankündigungsfrist von mindestens 
              30 Tagen zu ändern. Änderungen werden per E-Mail und/oder über die Plattform mitgeteilt. 
              Sollte eine Änderung zu einer wesentlichen Verschlechterung der zugesicherten Leistungen führen, 
              hat der Kunde das Recht, das Abonnement zum Zeitpunkt des Inkrafttretens der Änderung 
              außerordentlich zu kündigen. Eine Verschlechterung liegt insbesondere vor, wenn die zugesicherte 
              Verfügbarkeit gesenkt oder die Reaktionszeiten verlängert werden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">§ 11 Schlussbestimmungen</h2>
            <p>
              Es gilt ausschließlich österreichisches Recht unter Ausschluss des UN-Kaufrechts und der 
              Verweisungsnormen des internationalen Privatrechts. Gerichtsstand ist, soweit gesetzlich 
              zulässig, Wien, Österreich. Sollten einzelne Bestimmungen dieses SLA unwirksam sein oder 
              werden, bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt. An die Stelle der 
              unwirksamen Bestimmung tritt eine wirksame Regelung, die dem wirtschaftlichen Zweck der 
              unwirksamen Bestimmung am nächsten kommt.
            </p>
            <p className="mt-4 text-foreground font-medium">
              Dieses SLA tritt mit Februar 2026 in Kraft.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-6 text-sm">
          <Link to="/impressum" className="text-muted-foreground hover:text-foreground">
            Impressum
          </Link>
          <Link to="/datenschutz" className="text-muted-foreground hover:text-foreground">
            Datenschutz
          </Link>
          <Link to="/agb" className="text-muted-foreground hover:text-foreground">
            AGB
          </Link>
          <Link to="/avv" className="text-muted-foreground hover:text-foreground">
            AVV
          </Link>
        </div>
      </main>
    </div>
  );
}