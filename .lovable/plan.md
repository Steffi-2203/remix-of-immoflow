

## .gitignore bereinigen

### Was ist falsch?
- **Zeile 1-2**: Enthalten versehentlich eingefügte Shell-Befehle statt gitignore-Eintraege
- **Fehlend**: Die Reconciliation-Artefakte (dryrun.json, db_lines.json, etc.) werden nicht ignoriert

### Korrigierte .gitignore

Die Datei soll so aussehen:

```text
# Reconciliation artifacts (never commit)
dryrun.json
db_lines.json
invoice_lines_run.json
missing_lines.csv
missing_lines.json
dry_db_diffs.json

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
.env
```

### Aenderungen
1. Zeile 1-2 (Shell-Befehle) entfernen
2. Reconciliation-Artefakte als Block oben einfuegen mit Kommentar
3. Rest der Datei bleibt unveraendert

