

## Problem

Der `billing-parity` CI-Job schlägt fehl, weil `server/db.ts` das Paket `drizzle-orm/node-postgres` importiert, das nicht in `package.json` deklariert ist. Nach dem Fix fur `uuid` tritt nun der nachste fehlende Import zutage. Das Grundproblem: **Alle Server-seitigen Dependencies fehlen in `package.json`**.

## Ursache

Der Server-Code (`server/`) verwendet mehrere Pakete, die nie in `package.json` eingetragen wurden:
- `drizzle-orm` (und `drizzle-kit` in devDependencies)
- `express` / `express-session`
- `connect-pg-simple`
- `passport`
- Weitere je nach Server-Imports

Lokal funktioniert es vermutlich, weil die Pakete manuell oder uber einen anderen Paketmanager installiert wurden, aber `npm ci` in CI installiert nur das, was in `package.json` steht.

## Losungsplan

### Schritt 1: Alle Server-Imports scannen und fehlende Pakete identifizieren

Ich werde alle `import`-Statements im `server/`-Verzeichnis durchgehen und prufent, welche externen Pakete fehlen.

### Schritt 2: Fehlende Dependencies in `package.json` erganzen

Alle identifizierten Pakete werden als `dependencies` hinzugefugt:
- `drizzle-orm`
- `express` / `@types/express`
- Weitere fehlende Pakete

### Schritt 3: `drizzle-kit` als devDependency hinzufugen

Da `drizzle.config.ts` im Projekt existiert, wird `drizzle-kit` als devDependency benotigt.

### Schritt 4: CI-Workflow verifizieren

Nach dem Fix sollten beide Jobs (`test` und `billing-parity`) durchlaufen.

---

### Technische Details

Betroffene Dateien:
- `package.json` -- fehlende Dependencies erganzen

Erwartetes Ergebnis:
- `npm ci` installiert alle benotigten Server-Pakete
- `billing.service.test.ts` kann `server/db.ts` erfolgreich importieren
- CI-Pipeline lauft grun durch

