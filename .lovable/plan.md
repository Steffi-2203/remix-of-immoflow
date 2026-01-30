
# Plan: Zwei separate Einladungsfunktionen

## Zusammenfassung

Trennung der Einladungsfunktionalität in zwei Bereiche:

1. **"Benutzer einladen"** - Für interne Teammitglieder (Admin, Hausverwalter, Buchhalter, Betrachter) mit E-Mail-Versand über verifizierte Domain
2. **"Tester einladen"** - Für externe Tester mit manuellem Link-Sharing und **30 Minuten** Zeitlimit

---

## Geplante Änderungen

### 1. Zeitlimit auf 30 Minuten ändern

**Datei:** `src/hooks/useOrganizationInvites.ts`
- Änderung von `expiresAt.setHours(expiresAt.getHours() + 1)` zu `expiresAt.setMinutes(expiresAt.getMinutes() + 30)`
- Aktualisierung der Labels:
  - `tester: 'Tester (30 Min.)'`
  - `tester: 'Zeitlich begrenzt (30 Minuten), nur Leserechte'`

---

### 2. InviteUserDialog anpassen (nur interne Rollen)

**Datei:** `src/components/settings/InviteUserDialog.tsx`
- Tester-Rolle aus der Rollenauswahl entfernen
- Nur interne Rollen anzeigen: Admin, Hausverwalter, Buchhalter, Betrachter
- Standard-Rolle auf `viewer` setzen
- E-Mail wird via Resend gesendet (erfordert verifizierte Domain)

---

### 3. Neuen TesterInviteDialog erstellen

**Neue Datei:** `src/components/settings/TesterInviteDialog.tsx`
- Vereinfachter Dialog nur für Tester-Einladungen
- Kein E-Mail-Versand - nur Link-Generierung
- Nach Erstellung wird der Registrierungslink direkt angezeigt
- Kopier-Button für manuelles Teilen (WhatsApp, SMS, etc.)
- Titel: "Tester einladen"
- Beschreibung: "Erstellen Sie einen zeitlich begrenzten Testzugang (30 Minuten)"

---

### 4. TeamManagement-Seite anpassen

**Datei:** `src/pages/TeamManagement.tsx`
- Zwei separate Buttons im Header:
  - "Benutzer einladen" (für interne Teammitglieder)
  - "Tester einladen" (für externe Tester mit Link)
- Beide Dialoge einbinden

---

### 5. Separater Hook für Tester-Einladungen (optional)

**Datei:** `src/hooks/useOrganizationInvites.ts`
- Neuer `useCreateTesterInvite` Hook der:
  - Automatisch `role: 'tester'` setzt
  - Keinen E-Mail-Versand auslöst
  - Nur den Invite-Eintrag in der Datenbank erstellt

---

## Technische Details

```text
+---------------------------+       +---------------------------+
|   Benutzer einladen       |       |   Tester einladen         |
+---------------------------+       +---------------------------+
| Rollen:                   |       | Rolle: Tester (fix)       |
| - Admin                   |       |                           |
| - Hausverwalter           |       | Zeitlimit: 30 Minuten     |
| - Buchhalter              |       |                           |
| - Betrachter              |       | Kein E-Mail-Versand       |
|                           |       |                           |
| E-Mail via Resend         |       | Link wird angezeigt       |
| (verifizierte Domain)     |       | zum manuellen Teilen      |
+---------------------------+       +---------------------------+
```

---

## Benutzeroberfläche (Team-Seite)

```text
+----------------------------------------------------------+
|  Team-Verwaltung                                          |
|                                                           |
|  [Benutzer einladen]  [Tester einladen]                  |
|                                                           |
|  +------------------------------------------------------+ |
|  | Teammitglieder                                       | |
|  | ...                                                  | |
|  +------------------------------------------------------+ |
|                                                           |
|  +------------------------------------------------------+ |
|  | Ausstehende Einladungen                              | |
|  | (zeigt beide Typen - Benutzer und Tester)           | |
|  +------------------------------------------------------+ |
+----------------------------------------------------------+
```

---

## Dateien die geändert werden

| Datei | Aktion |
|-------|--------|
| `src/hooks/useOrganizationInvites.ts` | Bearbeiten - 30 Min. Limit, neuer Hook |
| `src/components/settings/InviteUserDialog.tsx` | Bearbeiten - Tester entfernen |
| `src/components/settings/TesterInviteDialog.tsx` | Neu erstellen |
| `src/pages/TeamManagement.tsx` | Bearbeiten - Zweiter Button |
