
# Plan: Virtuelle Demo-Umgebung für Tester

## Zusammenfassung

Wenn ein Tester sich anmeldet, bekommt er eine **komplett isolierte virtuelle Umgebung** mit Demo-Daten. Er kann diese Daten ansehen und sogar bearbeiten - aber alles passiert nur lokal im Browser und beeinflusst die echten Daten nicht.

Nach 30 Minuten endet die Session und alle virtuellen Änderungen sind weg.

---

## Konzept

```text
┌────────────────────────────────────────────────────────────┐
│                    NORMALE BENUTZER                        │
│                                                            │
│    App → Hooks → Supabase → Echte Datenbank               │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                       TESTER                               │
│                                                            │
│    App → Hooks → DemoDataProvider → Lokaler State         │
│                                                            │
│    ✓ Sieht Demo-Liegenschaften, Einheiten, Mieter         │
│    ✓ Kann "erstellen", "bearbeiten", "löschen"            │
│    ✓ Alles nur im Browser-Speicher                        │
│    ✓ Keine echten Datenbank-Aufrufe                       │
│    ✓ Nach 30 Min. alles weg                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Geplante Änderungen

### 1. DemoDataProvider Context erstellen

**Neue Datei:** `src/contexts/DemoDataContext.tsx`

Dieser Context:
- Prüft ob der Benutzer die Tester-Rolle hat
- Stellt Demo-Daten bereit (aus `mockData.ts` erweitert)
- Speichert alle Änderungen im lokalen State
- Bietet CRUD-Funktionen die nur den lokalen State ändern

```text
DemoDataContext
├── isDemoMode: boolean
├── properties: Property[]
├── units: Unit[]
├── tenants: Tenant[]
├── expenses: Expense[]
├── transactions: Transaction[]
├── addProperty(...)
├── updateProperty(...)
├── deleteProperty(...)
└── ... (alle CRUD-Operationen)
```

---

### 2. Mock-Daten erweitern

**Datei:** `src/data/mockData.ts`

Erweitern mit:
- Demo-Transaktionen
- Demo-Ausgaben
- Demo-Zahlungen
- Demo-Wartungsaufgaben
- Dashboard-Statistiken passend zu den Demo-Daten

---

### 3. Wrapper-Hooks erstellen

**Neue Dateien:**
- `src/hooks/demo/useDemoProperties.ts`
- `src/hooks/demo/useDemoUnits.ts`
- `src/hooks/demo/useDemoTenants.ts`
- etc.

Jeder Hook:
- Prüft `isDemoMode` aus dem Context
- Wenn Demo: Gibt lokale Daten zurück
- Wenn nicht Demo: Delegiert an echten Supabase-Hook

---

### 4. App-Level Integration

**Datei:** `src/App.tsx`

DemoDataProvider um die geschützten Routen wickeln:

```text
<ProtectedRoute>
  <DemoDataProvider>
    <SimpleDashboard />
  </DemoDataProvider>
</ProtectedRoute>
```

---

### 5. Bestehende Hooks anpassen

**Betroffene Hooks:**
| Hook | Änderung |
|------|----------|
| `useProperties.ts` | Demo-Fallback hinzufügen |
| `useUnits.ts` | Demo-Fallback hinzufügen |
| `useTenants.ts` | Demo-Fallback hinzufügen |
| `useTransactions.ts` | Demo-Fallback hinzufügen |
| `useExpenses.ts` | Demo-Fallback hinzufügen |
| `usePayments.ts` | Demo-Fallback hinzufügen |
| `useBankAccounts.ts` | Demo-Fallback hinzufügen |

Die Anpassung erfolgt direkt in den bestehenden Hooks:

```typescript
export function useProperties() {
  const { isDemoMode, properties } = useDemoData();
  
  // Wenn Demo-Modus: lokale Daten zurückgeben
  if (isDemoMode) {
    return {
      data: properties,
      isLoading: false,
      error: null
    };
  }
  
  // Sonst: normaler Supabase-Aufruf
  return useQuery({...});
}
```

---

### 6. usePermissions erweitern

**Datei:** `src/hooks/usePermissions.ts`

Neue Eigenschaft hinzufügen:
- `isTester: boolean` - Prüft ob Benutzer die Tester-Rolle hat

---

### 7. Demo-Indikator in der UI

**Datei:** `src/components/layout/MainLayout.tsx`

Wenn Tester aktiv:
- Banner oben: "Demo-Modus - Alle Änderungen sind nur virtuell"
- Zeigt verbleibende Zeit (bereits implementiert in ProtectedRoute)

---

## Technische Details

### Datenfluss für Tester

```text
Tester klickt "Neue Liegenschaft"
           ↓
PropertyForm ruft createProperty auf
           ↓
useCreateProperty prüft isDemoMode
           ↓
isDemoMode = true
           ↓
DemoDataContext.addProperty()
           ↓
Lokaler State wird aktualisiert
           ↓
UI zeigt neue Liegenschaft
           ↓
Keine Datenbank-Änderung!
```

### Session-Ende

```text
30 Minuten vorbei
        ↓
ProtectedRoute logout
        ↓
Tester wird ausgeloggt
        ↓
Lokaler State (alle Demo-Änderungen) wird verworfen
        ↓
Nächster Login: Frische Demo-Daten
```

---

## Dateien die erstellt/geändert werden

| Datei | Aktion |
|-------|--------|
| `src/contexts/DemoDataContext.tsx` | Neu erstellen |
| `src/data/mockData.ts` | Erweitern |
| `src/hooks/usePermissions.ts` | isTester hinzufügen |
| `src/hooks/useProperties.ts` | Demo-Fallback |
| `src/hooks/useUnits.ts` | Demo-Fallback |
| `src/hooks/useTenants.ts` | Demo-Fallback |
| `src/hooks/useTransactions.ts` | Demo-Fallback |
| `src/hooks/useExpenses.ts` | Demo-Fallback |
| `src/hooks/usePayments.ts` | Demo-Fallback |
| `src/hooks/useBankAccounts.ts` | Demo-Fallback |
| `src/hooks/useMaintenanceTasks.ts` | Demo-Fallback |
| `src/App.tsx` | DemoDataProvider einbinden |
| `src/components/layout/MainLayout.tsx` | Demo-Banner |

---

## Vorteile dieses Ansatzes

1. **Keine Datenbankänderungen** - Tester berührt nie echte Daten
2. **Vollständige Funktionalität** - Tester kann alles ausprobieren
3. **Automatische Bereinigung** - Nach Logout ist alles weg
4. **Keine Konflikte** - Jeder Tester hat seine eigene virtuelle Umgebung
5. **Einfache Wartung** - Demo-Daten zentral definiert
