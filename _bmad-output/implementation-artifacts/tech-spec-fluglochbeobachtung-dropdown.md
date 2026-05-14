---
title: 'Fluglochbeobachtung Dropdown bei Kontrolle'
slug: 'fluglochbeobachtung-dropdown'
created: '2026-05-14'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['SvelteKit 2', 'Svelte 5 Runes', 'Drizzle ORM', 'SQLite (better-sqlite3)', 'TypeScript strict']
files_to_modify:
  - src/lib/server/db/schema.ts
  - src/lib/server/db/queries/inspections.ts
  - src/routes/hives/[hiveId]/inspect/+page.server.ts
  - src/routes/hives/[hiveId]/inspect/+page.svelte
  - src/lib/client/offline/db.ts
  - src/lib/client/offline/sync.ts
  - src/routes/api/hives/[hiveId]/inspections/+server.ts
code_patterns: ['Drizzle nullable text column', 'SvelteKit form action', 'OutboxEntry offline IDB', 'select dropdown']
test_patterns: ['manual browser test at 375px', 'npm run build', 'npm run lint']
---

# Tech-Spec: Fluglochbeobachtung Dropdown bei Kontrolle

**Created:** 2026-05-14

## Overview

### Problem Statement

Beim Erfassen einer neuen Kontrolle kann Manuel die Aktivität am Flugloch nicht dokumentieren. Das entsprechende Feld fehlt im Formular und in der Datenbank.

### Solution

Neues optionales `text`-Feld `flugloch_beobachtung` in der DB-Tabelle `inspections` plus ein `<select>`-Dropdown im Neue-Kontrolle-Formular. Das Feld wird durch den gesamten Datenpfad (Schema → Query → Server-Action → Form → Offline-Outbox → Sync-API) durchgezogen.

### Scope

**In Scope:**
- DB: neue nullable Spalte `flugloch_beobachtung` in `inspections` (via `npm run db:generate`)
- `schema.ts`: Feld `fluglochBeobachtung: text('flugloch_beobachtung')` hinzufügen
- `inspections.ts` (Queries): `createInspection` Parameter + `.values()` + `updateInspection` Pick-Typ erweitern
- `inspect/+page.server.ts`: Feld aus `formData` parsen, validieren und an `createInspection` übergeben
- `inspect/+page.svelte`: Dropdown-Feld mit 5 Optionen inkl. Offline-Pfad und iOS-CSS-Fix
- `offline/db.ts`: `fluglochBeobachtung: string | null` zu `OutboxEntry` Interface hinzufügen
- `offline/sync.ts`: Feld in POST-Body an Sync-API aufnehmen
- `api/hives/[hiveId]/inspections/+server.ts`: Feld aus JSON-Body parsen und an `createInspection` übergeben

**Out of Scope:**
- Edit-Formular (`/inspections/[inspectionId]/edit`)
- Detailansicht (`/inspections/[inspectionId]`)
- Listansicht / Hive-Übersicht

---

## Context for Development

### Codebase Patterns

- **Drizzle Schema** (`schema.ts`): Alle Felder werden als `camelCase` TypeScript-Property mit snake_case DB-Spaltenname definiert. Nullable Felder haben keinen `.notNull()`. Beispiel: `queenStatus: text('queen_status').notNull()` → neues Feld analog aber ohne `.notNull()`.
- **Query-Funktionen** (`inspections.ts`): `createInspection` nimmt ein typisiertes Datenobjekt entgegen und verwendet `satisfies NewInspection` auf dem `.values()`-Call. Neues Feld muss in Parametertyp, `.values()` und im `Partial<Pick<>>` von `updateInspection` ergänzt werden.
- **Server-Action** (`+page.server.ts`): Optional-Felder werden per `(data.get('field') as string | null)?.trim() || null` gelesen. Validierung erlaubter Werte erfolgt mit einem `as const`-Array (bestehendes Pattern: `VALID_QUEEN_STATUSES` auf Zeile 16). Gleiches Muster für `VALID_FLUGLOCH_STATUSES` — ungültige oder leere Werte → `null` (kein `fail(400)`, da Feld optional).
- **Svelte 5 Runes**: `$state<string>('')` für Dropdown-State (leerer String = "Keine Angabe"). Kein `export let`, kein `$:`.
- **Offline OutboxEntry** (`offline/db.ts`): Reines Interface-Feld hinzufügen — kein IDB-Schema-Upgrade nötig, da IDB-ObjectStore schemalos ist. `DB_VERSION` bleibt auf `1`.
- **Sync** (`offline/sync.ts`): Alle Felder aus `entry` werden in den `JSON.stringify()`-Body aufgenommen (Zeile 39–53).
- **CSS für `<select>`**: `.field-input` Klasse auf `<select>` anwenden UND eine `.field-input--select` Modifier-Klasse mit `appearance: none` hinzufügen — ohne dieses Property überschreibt iOS Safari alle Border/Height/Radius-Styles mit dem System-Renderer. Pfeil-Icon via SVG-Data-URL als CSS-Background.
- **German UI**: Label "Fluglochbeobachtung", Option-Texte auf Deutsch.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/lib/server/db/schema.ts` | Drizzle table definitions — Zeilen 29–58 (inspections-Tabelle) |
| `src/lib/server/db/queries/inspections.ts` | Query helpers — `createInspection` ab Zeile 69, `updateInspection` ab Zeile 114 |
| `src/routes/hives/[hiveId]/inspect/+page.server.ts` | Server-Action (create) — vollständige Datei, 121 Zeilen |
| `src/routes/hives/[hiveId]/inspect/+page.svelte` | Formular-Komponente — vollständige Datei, 680 Zeilen |
| `src/lib/client/offline/db.ts` | OutboxEntry Interface — Zeilen 16–33 |
| `src/lib/client/offline/sync.ts` | Sync-Worker — POST-Body ab Zeile 39 |
| `src/routes/api/hives/[hiveId]/inspections/+server.ts` | Offline-Sync-API — POST-Handler ab Zeile 32 |

### Technical Decisions

- **Nullable statt Pflichtfeld**: Das Feld ist optional. Ungültige oder leere Werte werden serverseitig als `null` gespeichert — kein `fail(400)`, da das Feld nicht required ist.
- **`<select>`-Dropdown mit `appearance: none`**: Bei 5 Optionen ist ein `<select>` platzsparender und mobiltauglicher als eine Button-Gruppe. `appearance: none` ist zwingend erforderlich — ohne es überschreibt iOS Safari alle `.field-input`-Styles (height, border, border-radius) mit dem nativen System-Renderer.
- **Kein IDB-Version-Bump**: Das IDB ObjectStore `outbox` ist schemalos — `DB_VERSION` bleibt auf `1`. Bestehende Outbox-Einträge ohne dieses Feld haben `fluglochBeobachtung === undefined` zur Laufzeit. `JSON.stringify` lässt `undefined`-Keys weg → der Server behandelt das fehlende Feld als `null`. Verhalten ist korrekt und bedarf keines Migrationsskripts.
- **`npm run db:generate` statt manueller Migration**: Erfordert `.env.local` mit gesetztem `DATABASE_PATH`. Nächste Migration: `0005_...`. SQLite `ADD COLUMN TEXT` ist für bestehende Daten sicher — vorhandene Zeilen erhalten automatisch `NULL`.
- **`VALID_FLUGLOCH_STATUSES` lokal in zwei Dateien**: Je lokal in `+page.server.ts` und `api/+server.ts` definiert. **Achtung Synchronisierungsrisiko**: Wertänderungen müssen in beiden Dateien gleichzeitig erfolgen, sonst divergieren Online- und Offline-Sync-Validierung stillschweigend.
- **`updateInspection`-Pick-Erweiterung ohne Edit-Form-Änderung**: Der Pick-Typ wird erweitert, damit das Feld theoretisch updatebar ist. Das Edit-Formular übergibt das Feld nicht — Drizzle's partielles `.set()` überschreibt nur explizit übergebene Felder, der bestehende DB-Wert bleibt also erhalten. Kein Breaking Change an der Edit-Form.

---

## Implementation Plan

### Tasks

Tasks sind in Dependency-Reihenfolge sortiert. Tasks, die dieselbe Datei betreffen, sind zusammengeführt um Teilimplementierungen zu verhindern.

- [x] **Task 1 — schema.ts: Feld hinzufügen**
  - File: `src/lib/server/db/schema.ts`
  - Action: In der `inspections`-Tabelle nach `queenStatus: text('queen_status').notNull()` (Zeile 38) einfügen:
    ```ts
    fluglochBeobachtung: text('flugloch_beobachtung'), // 'keine'|'wenig'|'mittel'|'hoch'|'sehr_hoch'; nullable
    ```

- [x] **Task 2 — DB-Migration generieren**
  - File: `src/lib/server/db/migrations/` (automatisch generiert)
  - Action: `npm run db:generate` ausführen
  - Notes: Erfordert `.env.local` mit gesetztem `DATABASE_PATH`. Erzeugt `0005_<auto-name>.sql` mit `ALTER TABLE inspections ADD COLUMN flugloch_beobachtung TEXT;` — SQLite-sicher, bestehende Zeilen erhalten `NULL`. Dev-Server-Neustart wendet die Migration automatisch an (Auto-Migrate in `db/index.ts`).

- [x] **Task 3 — inspections.ts: createInspection + updateInspection erweitern**
  - File: `src/lib/server/db/queries/inspections.ts`
  - Action A — Parameter-Typ von `createInspection` (ab Zeile 70): `fluglochBeobachtung?: string | null;` hinzufügen
  - Action B — `.values({...})` Block (ab Zeile 88): `fluglochBeobachtung: data.fluglochBeobachtung ?? null,` hinzufügen
  - Action C — `Partial<Pick<Inspection, ...>>` Typ von `updateInspection` (Zeile ~116): `'fluglochBeobachtung'` ergänzen:
    ```ts
    Partial<Pick<Inspection,
      'inspectedAt' | 'healthScore' | 'queenStatus' | 'behaviourNotes' | 'nextInspectNote' | 'fluglochBeobachtung'
    >>
    ```
  - Notes: Actions A+B+C in einem Schritt — eine halbfertige `inspections.ts` erzeugt TypeScript-Fehler

- [x] **Task 4 — inspect/+page.server.ts: Feld parsen und übergeben**
  - File: `src/routes/hives/[hiveId]/inspect/+page.server.ts`
  - Action A — nach `VALID_QUEEN_STATUSES` (Zeile 16):
    ```ts
    const VALID_FLUGLOCH_STATUSES = ['keine', 'wenig', 'mittel', 'hoch', 'sehr_hoch'] as const;
    type FluglochStatus = (typeof VALID_FLUGLOCH_STATUSES)[number];
    ```
  - Action B — nach `nextInspectNote`-Parsing (Zeile ~63):
    ```ts
    const fluglochBeobachtungRaw = (data.get('fluglochBeobachtung') as string | null)?.trim() || null;
    const fluglochBeobachtung =
      fluglochBeobachtungRaw && VALID_FLUGLOCH_STATUSES.includes(fluglochBeobachtungRaw as FluglochStatus)
        ? fluglochBeobachtungRaw
        : null;
    ```
  - Action C — im `createInspection({...})`-Aufruf (Zeile ~73): `fluglochBeobachtung,` hinzufügen

- [x] **Task 5 — inspect/+page.svelte: State, Dropdown-UI, CSS und Offline-Pfad**
  - File: `src/routes/hives/[hiveId]/inspect/+page.svelte`
  - Action A — Script-Block, nach `let queenStatus = $state<string | null>(null);` (Zeile 14):
    ```ts
    let fluglochBeobachtung = $state<string>('');
    ```
  - Action B — Template, nach dem Queen-Status-Block (Zeile ~260), vor `<!-- ── Inspection Date/Time`:
    ```html
    <!-- ── Fluglochbeobachtung ─────────────────────────────────────────────── -->
    <div class="field">
      <label class="field-label" for="fluglochBeobachtung">
        Fluglochbeobachtung <span class="field-hint">(optional)</span>
      </label>
      <select
        class="field-input field-input--select"
        id="fluglochBeobachtung"
        name="fluglochBeobachtung"
        bind:value={fluglochBeobachtung}
        disabled={isSubmitting}
      >
        <option value="">— Keine Angabe —</option>
        <option value="keine">Keine</option>
        <option value="wenig">Wenig</option>
        <option value="mittel">Mittel</option>
        <option value="hoch">Hoch</option>
        <option value="sehr_hoch">Sehr Hoch</option>
      </select>
    </div>
    ```
  - Action C — `<style>`-Block, nach `.field-input:disabled`-Rule:
    ```css
    .field-input--select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.875rem center;
      padding-right: 2.5rem;
      cursor: pointer;
    }
    ```
  - Action D — `addToOutbox({...})`-Aufruf (Zeile ~154, `if (!$isOnline)`-Block), nach `queenStatus: queenStatus!,`:
    ```ts
    fluglochBeobachtung: fluglochBeobachtung || null,
    ```
  - Notes: Actions A+B+C+D in einem Schritt — A+B ohne D hinterlässt einen kaputten Offline-Pfad. Das `|| null` in Action D konvertiert den leeren String (Default-Selektion) korrekt zu `null`.

- [x] **Task 6 — offline/db.ts: OutboxEntry Interface erweitern**
  - File: `src/lib/client/offline/db.ts`
  - Action: Im `OutboxEntry` Interface nach `queenStatus: string;` (Zeile 21) einfügen:
    ```ts
    fluglochBeobachtung: string | null;
    ```
  - Notes: `DB_VERSION` bleibt auf `1`. Bestehende IDB-Einträge haben `undefined` für dieses Feld — `JSON.stringify` lässt es weg, Server behandelt fehlendes Feld korrekt als `null`.

- [x] **Task 7 — offline/sync.ts: POST-Body erweitern**
  - File: `src/lib/client/offline/sync.ts`
  - Action: Im `JSON.stringify({...})`-Body (Zeile ~42, nach `queenStatus: entry.queenStatus,`) einfügen:
    ```ts
    fluglochBeobachtung: entry.fluglochBeobachtung,
    ```

- [x] **Task 8 — api/inspections/+server.ts: Feld aus JSON parsen und übergeben**
  - File: `src/routes/api/hives/[hiveId]/inspections/+server.ts`
  - Action A — nach `queenStatus`-Validierung (Zeile ~66):
    ```ts
    const VALID_FLUGLOCH_STATUSES = ['keine', 'wenig', 'mittel', 'hoch', 'sehr_hoch'] as const;
    type FluglochStatus = (typeof VALID_FLUGLOCH_STATUSES)[number];
    const fluglochBeobachtung =
      typeof b.fluglochBeobachtung === 'string' &&
      VALID_FLUGLOCH_STATUSES.includes(b.fluglochBeobachtung as FluglochStatus)
        ? b.fluglochBeobachtung
        : null;
    ```
  - Action B — im `createInspection({...})`-Aufruf (Zeile ~72): `fluglochBeobachtung,` hinzufügen
  - Notes: `VALID_FLUGLOCH_STATUSES` ist identisch zur Definition in Task 4. Wertänderungen müssen in **beiden Dateien** synchron erfolgen.

---

### Acceptance Criteria

- [x] **AC1 — Dropdown erscheint im Formular mit korrektem Styling**
  - Given: Manuel öffnet `/hives/[id]/inspect`
  - When: Die Seite lädt (auch auf iOS Safari / 375px Viewport)
  - Then: Ein `<select>`-Dropdown mit Label "Fluglochbeobachtung (optional)" und 6 Optionen ist zwischen Königinnenstatus und Datum/Uhrzeit sichtbar; das Styling ist konsistent mit anderen Feldern (kein nativer iOS-System-Look)

- [x] **AC2 — Feld ist optional**
  - Given: Das Dropdown steht auf "— Keine Angabe —" (Default)
  - When: Manuel speichert die Kontrolle (alle Pflichtfelder ausgefüllt)
  - Then: Kontrolle wird ohne Fehler gespeichert; `flugloch_beobachtung` ist `NULL` in der DB (prüfbar via `npm run db:studio` → Tabelle `inspections`)

- [x] **AC3 — Wert wird korrekt persistiert (online)**
  - Given: Manuel wählt "Hoch" im Dropdown
  - When: Er speichert die Kontrolle online
  - Then: `flugloch_beobachtung = 'hoch'` in der DB (prüfbar via `npm run db:studio`)

- [x] **AC4 — Ungültige Werte werden sicher behandelt**
  - Given: Ein manipulierter POST-Request sendet `fluglochBeobachtung = 'ungueltig'`
  - When: Der Server die Anfrage verarbeitet
  - Then: Wert wird als `null` gespeichert, kein HTTP 400

- [x] **AC5 — Offline-Pfad: Wert landet im IDB-Outbox und wird korrekt synchronisiert**
  - Given: Manuel ist offline (Chrome DevTools → Network-Tab → "Offline" aktivieren) und wählt "Mittel"
  - When: Er speichert die Kontrolle
  - Then (Schritt 1): Chrome DevTools → Application → Storage → IndexedDB → `beehiveJournal-offline` → `outbox` → Eintrag enthält `fluglochBeobachtung: "mittel"`
  - Then (Schritt 2): Offline deaktivieren → App neu laden → `flugloch_beobachtung = 'mittel'` in der DB

- [x] **AC6 — Build und Lint grün**
  - Given: Alle 8 Tasks implementiert
  - When: `npm run build` und `npm run lint` ausgeführt
  - Then: Beide Commands ohne Fehler oder Warnungen

---

## Review Notes

- Adversarial review completed (2026-05-14)
- Findings: 6 total, 5 fixed, 1 skipped (F6 — noise/duplicate of F2)
- Resolution approach: auto-fix
- F1 fixed: `VALID_FLUGLOCH_STATUSES` moved to module scope in `api/+server.ts`
- F2 fixed: `OutboxEntry.fluglochBeobachtung` changed to optional (`?`) with explanatory comment
- F3 fixed: Cross-reference comments added to both server files linking the duplicated constant
- F4 noted: Drizzle meta snapshots 0002–0004 absent; migration 0005 manually corrected; 0005_snapshot.json is the correct new baseline
- F5 fixed: `background-size: 12px 8px` added to `.field-input--select`

---

## Additional Context

### Dependencies

- Kein neues npm-Package erforderlich
- Task 2 muss nach Task 1 ausgeführt werden; erfordert `.env.local` mit `DATABASE_PATH`
- `DB_VERSION` in `offline/db.ts` wird **nicht** erhöht

### Testing Strategy

Manuelles Testing (kein Test-Framework konfiguriert laut `project-context.md`):

1. **Online Happy Path**: Kontrolle mit "Hoch" → `npm run db:studio` → `flugloch_beobachtung = 'hoch'`
2. **Leeres Feld**: Kontrolle ohne Auswahl → DB = `NULL`
3. **Alle 5 Werte**: Jeden Wert einmal speichern und in DB verifizieren
4. **Offline-Pfad**: DevTools Offline → "Wenig" wählen → speichern → IDB prüfen → Online → DB prüfen (siehe AC5 für exakte DevTools-Navigation)
5. **iOS-Styling**: 375px Viewport (oder iOS Safari Simulator) — Dropdown muss konsistent gestylt sein, kein System-Look
6. **`npm run build`** und **`npm run lint`** — CI-Gates

### Notes

- Das Feld erscheint **bewusst nicht** in Edit-Form und Detailansicht (Out of Scope)
- DB-Strings: `keine`, `wenig`, `mittel`, `hoch`, `sehr_hoch`
- **Synchronisierungsrisiko `VALID_FLUGLOCH_STATUSES`**: In `+page.server.ts` und `api/+server.ts` dupliziert — Wertänderungen müssen in beiden Dateien gleichzeitig erfolgen
- Bestehende IDB-Einträge ohne Feld: `undefined` → `JSON.stringify` lässt Key weg → Server = `null`. Kein Migrationsskript nötig.
- SQLite `ADD COLUMN TEXT`: sicher für bestehende Daten, vorhandene Zeilen = `NULL`
