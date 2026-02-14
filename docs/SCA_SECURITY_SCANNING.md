# SCA Security Scanning – Konfigurationshandbuch

## Übersicht

Software Composition Analysis (SCA) identifiziert bekannte Schwachstellen in Drittanbieter-Abhängigkeiten. Dieses Dokument beschreibt die Konfiguration für das ImmoflowMe-Projekt.

---

## 1. npm audit (integriert)

### Lokale Prüfung
```bash
npm audit
npm audit --production   # Nur Produktions-Dependencies
npm audit fix            # Automatische Fixes
```

### Schwellenwerte
| Schwere    | Aktion                   |
|------------|--------------------------|
| Critical   | Build blockieren         |
| High       | Build blockieren         |
| Moderate   | Warning, Ticket erstellen|
| Low        | Protokollieren           |

### CI-Integration
```yaml
# In CI-Pipeline ergänzen:
- name: Security Audit
  run: npm audit --audit-level=high
```

---

## 2. GitHub Dependabot

### Konfiguration (`.github/dependabot.yml`)
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "06:00"
      timezone: "Europe/Vienna"
    open-pull-requests-limit: 10
    reviewers:
      - "security-team"
    labels:
      - "dependencies"
      - "security"
    allow:
      - dependency-type: "all"
    versioning-strategy: increase-if-necessary
```

### Alerts konfigurieren
1. GitHub Repository → Settings → Code security and analysis
2. "Dependabot alerts" aktivieren
3. "Dependabot security updates" aktivieren
4. "Dependabot version updates" aktivieren

---

## 3. Snyk Integration (Optional)

### Setup
```bash
npm install -g snyk
snyk auth
snyk test
snyk monitor   # Kontinuierliches Monitoring
```

### CI-Integration
```yaml
- name: Snyk Security Scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high
```

---

## 4. SBOM-Generierung (CycloneDX)

### Installation
```bash
npm install -g @cyclonedx/cyclonedx-npm
```

### Generierung
```bash
cyclonedx-npm --output-file sbom.json
cyclonedx-npm --output-file sbom.xml --output-format xml
```

### Automatisierung
SBOM wird bei jedem Release generiert und im `artifacts/`-Verzeichnis archiviert.

---

## 5. Socket.dev (Optional)

Socket.dev erkennt Supply-Chain-Angriffe:
- Typosquatting
- Malicious Packages
- Protestware

### Integration
1. https://socket.dev/ registrieren
2. GitHub App installieren
3. Automatische PR-Kommentare bei verdächtigen Paketen

---

## 6. Schwachstellen-Management-Prozess

### Workflow
1. **Erkennung**: Automatisch via Dependabot/Snyk/npm audit
2. **Bewertung**: CVSS-Score + Relevanz für unser System
3. **Priorisierung**: Critical/High innerhalb 48h, Moderate innerhalb 1 Woche
4. **Behebung**: Update, Patch oder Workaround
5. **Verifizierung**: Re-Scan nach Fix
6. **Dokumentation**: Im Audit-Log festhalten

### Eskalationsmatrix
| CVSS Score | Priorität | SLA         |
|------------|-----------|-------------|
| 9.0–10.0   | P1        | 24 Stunden  |
| 7.0–8.9    | P2        | 48 Stunden  |
| 4.0–6.9    | P3        | 1 Woche     |
| 0.1–3.9    | P4        | Nächstes Release |

---

## 7. Ausnahmen (Suppressions)

Bekannte False Positives oder akzeptierte Risiken:
```json
// .nsprc oder .snyk
{
  "ignore": {
    "CVE-XXXX-YYYY": {
      "reason": "Nicht exploitierbar in unserer Konfiguration",
      "expires": "2026-06-01"
    }
  }
}
```

Jede Ausnahme muss dokumentiert und zeitlich begrenzt sein.

---

*Letzte Aktualisierung: 2026-02-14*
