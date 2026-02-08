

## Determinismus und zentrale Rundung in der Rechnungsgenerierung

### Problem 1: Nicht-deterministische Sortierung in `reconcileRounding`

In `server/services/billing.service.ts` (Zeile 36) sortiert `reconcileRounding` nur nach `Math.abs(amount)`. Wenn zwei Zeilen denselben Betrag haben (z.B. BK und HK beide 95,00), ist die Reihenfolge undefiniert -- wiederholte Runs konnen den Cent-Ausgleich auf unterschiedliche Zeilen verteilen.

**Losung:** Sekundare Sortierkriterien `lineType` und `unitId` hinzufugen:

```typescript
// Vorher (Zeile 36):
lines.sort((a, b) => Math.abs(b.amount || 0) - Math.abs(a.amount || 0));

// Nachher:
lines.sort((a, b) => {
  const diff = Math.abs(b.amount || 0) - Math.abs(a.amount || 0);
  if (diff !== 0) return diff;
  const typeCmp = (a.lineType || '').localeCompare(b.lineType || '');
  if (typeCmp !== 0) return typeCmp;
  return (a.unitId || '').localeCompare(b.unitId || '');
});
```

### Problem 2: `roundMoney` als zentrale Utility

`roundMoney` existiert bereits zentral in `shared/utils.ts` und wird konsistent importiert von:
- `server/services/billing.service.ts` (import from `@shared/utils`)
- `server/services/invoice.generator.ts` (import from `@shared/utils`)
- Alle Tests (import from `@shared/utils`)

Es gibt keine `roundToCents`-Funktion -- `roundMoney` IST die zentrale Rundungsfunktion. Kein Code definiert eine lokale Kopie.

**Losung:** Einen `roundToCents`-Alias exportieren und den JSDoc-Kommentar verbessern, damit die Funktion leichter auffindbar ist:

```typescript
// shared/utils.ts
/** Round to nearest cent (2 decimal places). Single source of truth for all monetary rounding. */
export function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/** Alias for roundMoney -- use whichever name reads better in context. */
export const roundToCents = roundMoney;
```

### Problem 3: Determinismus-Test

Ein neuer Unit-Test in `tests/unit/billing-determinism.test.ts`, der beweist, dass `reconcileRounding` bei gleichen Betragen immer dasselbe Ergebnis liefert:

```typescript
// Pruft: 3 Zeilen mit identischem Betrag, Diff = 0.01
// -> Cent-Ausgleich geht immer an dieselbe Zeile (determiniert durch lineType)
```

### Dateianderungen

| Datei | Anderung |
|---|---|
| `server/services/billing.service.ts` | Deterministische Sortierung in `reconcileRounding` (Zeile 36) |
| `shared/utils.ts` | JSDoc + `roundToCents` Alias exportieren |
| `tests/unit/billing-determinism.test.ts` | Neuer Test fur Sortier-Determinismus (erstellen) |

### Risiko

Gering. Die Sortierung andert nur die Verteilung des Cent-Ausgleichs bei bisher undefinierter Reihenfolge. Bestehende Rechnungen werden nicht beeinflusst, da `reconcileRounding` nur bei Neugenerierung lauft.

