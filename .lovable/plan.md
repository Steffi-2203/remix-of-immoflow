
Ziel
- Den Blank-Screen beheben, der durch den Runtime-Fehler `Uncaught Error: supabaseUrl is required.` entsteht.
- Ursache: `createClient(SUPABASE_URL, ...)` wird mit einem leeren/undefined `SUPABASE_URL` aufgerufen, weil `import.meta.env.VITE_SUPABASE_URL` (und/oder der Key) im Build/Runtime nicht gesetzt ist. Das passiert so früh (beim Import), dass die App gar nicht erst rendert.

Was ich im Code gesehen habe
- `src/integrations/supabase/client.ts` liest:
  - `const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;`
  - `const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;`
  - und ruft direkt beim Modul-Load `createClient(...)` auf.
- Viele Hooks/Komponenten importieren `@/integrations/supabase/client`, daher crasht die App schon beim initialen Bundle-Auswerten.
- `src/integrations/supabase/client.ts` ist auto-generiert und darf nicht editiert werden, also müssen wir die Initialisierung „von außen“ robust machen.

Lösungsstrategie (robust + ohne Änderungen am auto-generierten Client)
Wir machen zwei Dinge:
1) Sicherstellen, dass die erwarteten `VITE_*` Variablen beim Build gesetzt werden, auch wenn die Umgebung evtl. eher nicht-`VITE_` Variablen bereitstellt.
2) Zusätzliche Absicherung im App-Bootstrap, damit selbst bei fehlender Konfiguration kein Blank-Screen entsteht, sondern eine verständliche Fehlermeldung angezeigt wird (und die App nicht schon beim Import abstürzt).

Implementationsschritte (konkret)
A) Build-Time Fallback für Env-Variablen (Vite Config)
Datei: `vite.config.ts`
- Ergänzen von `define`, um die erwarteten Werte zu „injecten“, falls nur alternative Env-Keys verfügbar sind.
- Logik:
  - `supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL`
  - `supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY`
- Dann definieren:
  - `'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl ?? '')`
  - `'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabaseKey ?? '')`
Warum:
- Wenn der Build-Runner die Werte nicht als `VITE_…` bereitstellt, wird der Bundle-Code sonst mit `undefined` gebacken → Crash.
- Mit `define` bekommen wir stabile Werte im Client-Bundle.

B) Bootstrap-Guard, damit die App nicht mehr „hart“ crasht (kein Blank Screen)
Datei: `src/main.tsx`
- Aktuell importiert `main.tsx` `App` statisch. Dadurch werden sofort alle Seiten/Hooks mitgeladen, die wiederum den Supabase-Client importieren → Crash bevor wir überhaupt reagieren können.
- Umbau auf:
  1) `createRoot(...)` sofort erstellen.
  2) Env-Check vor dem Laden der App:
     - Prüfen: `import.meta.env.VITE_SUPABASE_URL` und `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`
  3) Wenn Werte fehlen:
     - Statt App eine kleine „Konfiguration fehlt“-Seite rendern (mit klaren Hinweisen).
  4) Wenn Werte vorhanden:
     - `import("./App")` dynamisch laden und dann rendern.
- Optional: Während `import("./App")` läuft, ein kleines Loading-UI rendern.

C) Kleine UI-Komponente für die Fehlermeldung (optional, aber empfehlenswert)
- Neue Komponente z.B. `src/components/ConfigMissing.tsx` (oder inline in `main.tsx`), die:
  - „Backend-Konfiguration fehlt“ anzeigt
  - einen Button „Seite neu laden“
  - optional eine kurze Debug-Zeile (z.B. welche Variable fehlt), ohne sensible Werte zu zeigen
Vorteil:
- Selbst wenn Konfiguration kurzfristig fehlt (Build/Env/Cache), ist die App nicht „weg“, sondern erklärt sich selbst.

D) Verifikation / Testplan (nach Umsetzung)
1) Preview öffnen → es darf keinen Blank-Screen mehr geben.
2) Browser-Konsole prüfen:
   - Kein `supabaseUrl is required` mehr.
3) Standard-Flows testen:
   - Startseite (/) lädt.
   - Login-Seite lädt.
   - Nach Login Dashboard lädt.
4) Einladungsfunktion end-to-end testen:
   - Einstellungen → Team → Einladen
   - Prüfen: UI-Feedback (Erfolg/Fehler)
   - Optional: Eintrag in Invites-Liste sichtbar

Risiken / Edge Cases
- Falls in der Build-Umgebung tatsächlich gar keine der erwarteten Env-Variablen existiert, wird (B) zumindest eine verständliche Fehlermeldung statt Blank-Screen liefern.
- `define` muss Strings bekommen; deshalb sauberer Fallback auf `''` (leer) plus Guard-UI, damit nicht wieder der gleiche Crash passiert.

Scope: Was ich nicht anfasse
- `src/integrations/supabase/client.ts` bleibt unverändert (auto-generiert).

Wenn du zustimmst
- Ich setze A + B (und optional C) um. Damit ist der Crash nachhaltig abgefangen und die App wird wieder benutzbar, selbst wenn die Konfiguration mal kurz nicht verfügbar ist.
