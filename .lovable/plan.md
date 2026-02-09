

# RLS und Immutability fuer audit_events aktivieren

## Zusammenfassung
RLS auf der `audit_events`-Tabelle aktivieren und passende Policies sowie Immutability-Trigger erstellen.

## Aenderungen

### 1. Datenbank-Migration
Eine einzelne SQL-Migration mit folgenden Schritten:

1. **RLS aktivieren**
   ```sql
   ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
   ```

2. **RLS-Policies erstellen**
   - **SELECT**: Nur authentifizierte Nutzer mit Admin- oder Auditor-Rolle koennen lesen
   - **INSERT**: Alle authentifizierten Nutzer duerfen schreiben (Services loggen Events)
   - **UPDATE/DELETE**: Niemand darf aendern oder loeschen (Immutability)

3. **Immutability-Trigger** (analog zu `audit_logs`)
   - `prevent_audit_event_update` -- blockiert UPDATE
   - `prevent_audit_event_delete` -- blockiert DELETE

### 2. Keine Code-Aenderungen noetig
Die bestehenden Services schreiben ueber den Server (Drizzle/`db`), nicht ueber den Supabase-Client mit RLS. Die Policies schuetzen nur den direkten Zugriff ueber die Supabase-API.

## Technische Details

```text
audit_events
  +-- RLS: ON
  +-- Policy SELECT: has_role(uid, 'admin') OR has_role(uid, 'auditor')
  +-- Policy INSERT: authenticated
  +-- Policy UPDATE: NONE (denied)
  +-- Policy DELETE: NONE (denied)
  +-- Trigger: prevent_audit_event_update (BEFORE UPDATE -> RAISE EXCEPTION)
  +-- Trigger: prevent_audit_event_delete (BEFORE DELETE -> RAISE EXCEPTION)
```

