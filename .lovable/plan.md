

## Google-Fonts-Imports entfernen

### Problem
`src/index.css` enthaelt 8 `@import url("https://fonts.googleapis.com/...")` Zeilen (Zeilen 5-18). Diese laden Fonts extern von Google, obwohl die lokalen woff2-Dateien in `public/fonts/` bereits korrekt eingebunden sind ueber `src/fonts.css`. Das fuehrt zu:
- **DSGVO-Verstoss**: Daten werden an Google-Server gesendet
- **Doppeltes Laden**: Gleiche Fonts werden lokal UND extern geladen
- **Performance**: Render-Blocking durch externe CSS-Imports

### Loesung
Alle 8 `@import url("https://fonts.googleapis.com/...")` Zeilen aus `src/index.css` entfernen. Keine weiteren Aenderungen noetig -- `src/fonts.css` (bereits in `main.tsx` importiert) liefert Inter, Lora und Space Mono lokal.

### Technische Details

**Datei**: `src/index.css`

Folgende Zeilen werden entfernt (Zeilen 5-18):
```
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:...");
@import url("https://fonts.googleapis.com/css2?family=Lora:...");
@import url("https://fonts.googleapis.com/css2?family=Space+Mono:...");
@import url("https://fonts.googleapis.com/css2?family=Work+Sans:...");
@import url("https://fonts.googleapis.com/css2?family=Inconsolata:...");
@import url("https://fonts.googleapis.com/css2?family=Inter:...");  (Duplikat)
@import url("https://fonts.googleapis.com/css2?family=Space+Mono:..."); (Duplikat)
```

Fonts die NUR extern geladen wurden (Space Grotesk, Work Sans, Inconsolata) werden nirgends im Code verwendet und sind daher nicht noetig.

### Ergebnis
- Null externe Font-Requests
- DSGVO-konform (keine Daten an Google)
- Schnellerer First Paint (kein Render-Blocking durch externe CSS)

