

## Fix: Dependency-Konflikt jspdf / jspdf-autotable

### Problem
`jspdf-autotable@5.0.2` erfordert `jspdf@"^2 || ^3"`, aber `jspdf@4.0.0` ist installiert. `npm ci` schlaegt in der CI fehl.

### Loesung
Zwei Aenderungen:

1. **`package.json`**: jspdf von `^4.0.0` auf `^3.0.0` downgraden, damit es mit jspdf-autotable kompatibel ist.

2. **`.github/workflows/ci.yml`**: Zusaetzlich `--legacy-peer-deps` als Fallback bei allen `npm ci` Steps hinzufuegen, um zukuenftige Minor-Konflikte abzufangen.

### Betroffene Dateien

| Datei | Aenderung |
|---|---|
| `package.json` | `jspdf`: `"^4.0.0"` wird zu `"^3.0.0"` |
| `.github/workflows/ci.yml` | Alle `npm ci` Aufrufe werden zu `npm ci --legacy-peer-deps` |

### Risiko
Gering. jspdf 3.x und 4.x haben eine sehr aehnliche API. Falls dein Code jspdf-4-spezifische Features nutzt, muessten diese angepasst werden -- das wird beim Build sofort sichtbar.

