---
title: 'Verhalten-Dropdown bei Kontrolle'
slug: 'verhalten-dropdown'
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

# Tech-Spec: Verhalten-Dropdown bei Kontrolle

**Created:** 2026-05-14

## Overview

### Problem Statement

Beim Erfassen einer neuen Kontrolle kann Manuel das Verhalten der Bienen nicht dokumentieren. Das entsprechende Feld fehlt im Formular und in der Datenbank.

### Solution

Neues optionales `text`-Feld `verhalten` in der DB-Tabelle `inspections` plus ein `<select>`-Dropdown im Neue-Kontrolle-Formular — direkt unterhalb des bestehenden Fluglochbeobachtung-Dropdowns. Das Feld wird durch den gesamten Datenpfad (Schema → Query → Server-Action → Form → Offline-Outbox → Sync-API) durchgezogen, analog zu `fluglochBeobachtung`.

### Scope

**In Scope:**
- DB: neue nullable Spalte `verhalten` in `inspections` (via `npm run db:generate`)
- `schema.ts`: Feld `verhalten: text('verhalten')` hinzufügen
- `inspections.ts` (Queries): `createInspection` Parameter + `.values()` + `updateInspection` Pick-Typ erweitern
- `inspect/+page.server.ts`: Feld aus `formData` parsen, validieren und an `createInspection` übergeben
- `inspect/+page.svelte`: Dropdown-Feld mit 3 Optionen inkl. Offline-Pfad (unterhalb Fluglochbeobachtung, keine neue CSS nötig)
- `offline/db.ts`: `verhalten: string | null` zu `OutboxEntry` Interface hinzufügen
- `offline/sync.ts`: Feld in POST-Body an Sync-API aufnehmen
- `api/hives/[hiveId]/inspections/+server.ts`: Feld aus JSON-Body parsen und an `createInspection` übergeben

**Out of Scope:**
- Edit-Formular (`/inspections/[inspectionId]/edit`)
- Listansicht / Hive-Übersicht

**Added after initial completion:**
- Detailansicht (`/inspections/[inspectionId]`): `verhalten`-Wert als `detail-row` in der Core-Fields-Card anzeigen (nur wenn nicht null)

---

## Context for Development

### Codebase Patterns

- **Drizzle Schema** (`schema.ts`): Alle Felder als `camelCase` Property mit snake_case DB-Spaltenname. Nullable Felder ohne `.notNull()`. Direktes Muster: `fluglochBeobachtung: text('flugloch_beobachtung')` — Zeile 39, direkt nach dem Insert-Punkt.
- **Query-Funktionen** (`inspections.ts`): `createInspection` nimmt typisiertes Datenobjekt entgegen (`satisfies NewInspection` auf `.values()`). Neues Feld muss in Parametertyp (nach Zeile 74), `.values()` (nach Zeile 94) und im `Partial<Pick<>>` von `updateInspection` (nach `'fluglochBeobachtung'` Zeile 124) ergänzt werden.
- **Server-Action** (`+page.server.ts`): Optional-Felder per `(data.get('field') as string | null)?.trim() || null`. Validierung via `as const`-Array. Muster: `VALID_FLUGLOCH_STATUSES` (Zeilen 19–20) + Parsing (Zeilen 68–74) + Übergabe (Zeile 89). Ungültige/leere Werte → `null`, kein `fail(400)`.
- **Svelte 5 Runes** (`+page.svelte`): `$state<string>('')` für Dropdown-State (leerer String = "Keine Angabe"). Muster: `let fluglochBeobachtung = $state<string>('')` Zeile 15. Outbox-Übergabe auf Zeile 154 (`fluglochBeobachtung || null`). Dropdown-Block Zeilen 264–283, Insert **danach** (vor `<!-- ── Inspection Date/Time` Zeile 285).
- **Offline OutboxEntry** (`offline/db.ts`): Reines Interface-Feld hinzufügen — kein IDB-Schema-Upgrade. `DB_VERSION` bleibt auf `1`. Muster: `fluglochBeobachtung: string | null` Zeile 22.
- **Sync** (`offline/sync.ts`): Feld in `JSON.stringify()`-Body aufnehmen. Muster: `fluglochBeobachtung: entry.fluglochBeobachtung` Zeile 43.
- **API** (`api/+server.ts`): `VALID_FLUGLOCH_STATUSES` + Parsing Zeilen 69–75, Übergabe Zeile 85. Gleiches Muster lokal wiederholen.
- **CSS für `<select>`**: `.field-input--select` (mit `appearance: none` + SVG-Pfeil) Zeile 501 — bereits vorhanden. **Keine neue CSS-Rule erforderlich.**
- **German UI**: Label "Verhalten", Option-Texte auf Deutsch.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/lib/server/db/schema.ts` | Drizzle table — Insert nach `fluglochBeobachtung` Zeile 39 |
| `src/lib/server/db/queries/inspections.ts` | Queries — Parameter nach Zeile 74, `.values()` nach Zeile 94, Pick nach Zeile 124 |
| `src/routes/hives/[hiveId]/inspect/+page.server.ts` | Server-Action — Insert nach Zeile 20 (Typ), nach Zeile 74 (Parsing), nach Zeile 89 (Übergabe) |
| `src/routes/hives/[hiveId]/inspect/+page.svelte` | Formular — State nach Zeile 15, Outbox nach Zeile 154, Dropdown-Block nach Zeile 283 |
| `src/lib/client/offline/db.ts` | OutboxEntry Interface — Insert nach `fluglochBeobachtung` Zeile 22 |
| `src/lib/client/offline/sync.ts` | Sync-Body — Insert nach `fluglochBeobachtung` Zeile 43 |
| `src/routes/api/hives/[hiveId]/inspections/+server.ts` | API — Parsing nach Zeile 75, Übergabe nach Zeile 85 |

### Technical Decisions

- **Nullable statt Pflichtfeld**: Optional. Ungültige oder leere Werte → `null`. Kein `fail(400)`.
- **`<select>` mit `appearance: none`**: iOS Safari-Fix bereits via `.field-input--select` (Zeile 501) vorhanden — keine neue CSS-Rule erforderlich.
- **Kein IDB-Version-Bump**: ObjectStore `outbox` ist schemalos. `DB_VERSION` bleibt auf `1`. Bestehende Outbox-Einträge ohne Feld: `undefined` → `JSON.stringify` lässt Key weg → Server = `null`.
- **`npm run db:generate` statt manueller Migration**: Nächste Migration: `0006_...`. SQLite `ADD COLUMN TEXT` ist für bestehende Daten sicher.
- **`VALID_VERHALTEN_VALUES` lokal in zwei Dateien**: Je lokal in `+page.server.ts` und `api/+server.ts`. Wertänderungen müssen in beiden Dateien synchron erfolgen.
- **`updateInspection`-Pick-Erweiterung ohne Edit-Form-Änderung**: Feld theoretisch updatebar; Edit-Form übergibt es nicht — Drizzle's partielles `.set()` überschreibt nur explizit übergebene Felder. Kein Breaking Change.

---

## Implementation Plan

### Tasks

Tasks sind in Dependency-Reihenfolge sortiert. Tasks, die dieselbe Datei betreffen, sind zusammengeführt um Teilimplementierungen zu verhindern.

- [x] **Task 1 — schema.ts: Feld hinzufügen**
  - File: `src/lib/server/db/schema.ts`
  - Action: In der `inspections`-Tabelle nach `fluglochBeobachtung: text('flugloch_beobachtung')` (Zeile 39) einfügen:
    ```ts
    verhalten: text('verhalten'), // 'ruhig'|'aufbrausend'|'aggressiv'; nullable
    ```

- [x] **Task 2 — DB-Migration generieren**
  - File: `src/lib/server/db/migrations/` (automatisch generiert)
  - Action: `npm run db:generate` ausführen
  - Notes: Erfordert `.env.local` mit gesetztem `DATABASE_PATH`. Erzeugt `0006_<auto-name>.sql` mit `ALTER TABLE inspections ADD COLUMN verhalten TEXT;` — SQLite-sicher, bestehende Zeilen erhalten `NULL`. Dev-Server-Neustart wendet die Migration automatisch an (Auto-Migrate in `db/index.ts`).

- [x] **Task 3 — inspections.ts: createInspection + updateInspection erweitern**
  - File: `src/lib/server/db/queries/inspections.ts`
  - Action A — Parameter-Typ von `createInspection` (nach Zeile 74, nach `fluglochBeobachtung?: string | null;`):
    ```ts
    verhalten?: string | null;
    ```
  - Action B — `.values({...})` Block (nach Zeile 94, nach `fluglochBeobachtung: data.fluglochBeobachtung ?? null,`):
    ```ts
    verhalten: data.verhalten ?? null,
    ```
  - Action C — `Partial<Pick<Inspection, ...>>` Typ von `updateInspection` (Zeile 124, nach `'fluglochBeobachtung'`):
    ```ts
    | 'verhalten'
    ```
    Resultat:
    ```ts
    Partial<Pick<Inspection,
      | 'inspectedAt'
      | 'healthScore'
      | 'queenStatus'
      | 'fluglochBeobachtung'
      | 'verhalten'
      | 'behaviourNotes'
      | 'nextInspectNote'
    >>
    ```
  - Notes: Actions A+B+C in einem Schritt — eine halbfertige `inspections.ts` erzeugt TypeScript-Fehler.

- [x] **Task 4 — inspect/+page.server.ts: Feld parsen und übergeben**
  - File: `src/routes/hives/[hiveId]/inspect/+page.server.ts`
  - Action A — nach `VALID_FLUGLOCH_STATUSES` Block (nach Zeile 20):
    ```ts
    const VALID_VERHALTEN_VALUES = ['ruhig', 'aufbrausend', 'aggressiv'] as const;
    type VerhaltenValue = (typeof VALID_VERHALTEN_VALUES)[number];
    ```
  - Action B — nach `fluglochBeobachtung`-Parsing-Block (nach Zeile 74):
    ```ts
    const verhaltenRaw = (data.get('verhalten') as string | null)?.trim() || null;
    const verhalten =
      verhaltenRaw && VALID_VERHALTEN_VALUES.includes(verhaltenRaw as VerhaltenValue)
        ? verhaltenRaw
        : null;
    ```
  - Action C — im `createInspection({...})`-Aufruf (nach Zeile 89, nach `fluglochBeobachtung,`):
    ```ts
    verhalten,
    ```

- [x] **Task 5 — inspect/+page.svelte: State, Dropdown-UI und Offline-Pfad**
  - File: `src/routes/hives/[hiveId]/inspect/+page.svelte`
  - Action A — Script-Block, nach `let fluglochBeobachtung = $state<string>('');` (Zeile 15):
    ```ts
    let verhalten = $state<string>('');
    ```
  - Action B — `addToOutbox({...})`-Aufruf (Zeile 154, nach `fluglochBeobachtung: fluglochBeobachtung || null,`):
    ```ts
    verhalten: verhalten || null,
    ```
  - Action C — Template, nach dem Fluglochbeobachtung-Block (nach Zeile 283, schließendem `</div>`), vor `<!-- ── Inspection Date/Time`:
    ```html
    <!-- ── Verhalten ──────────────────────────────────────────────────────────── -->
    <div class="field">
      <label class="field-label" for="verhalten">
        Verhalten <span class="field-hint">(optional)</span>
      </label>
      <select
        class="field-input field-input--select"
        id="verhalten"
        name="verhalten"
        bind:value={verhalten}
        disabled={isSubmitting}
      >
        <option value="">— Keine Angabe —</option>
        <option value="ruhig">Ruhig</option>
        <option value="aufbrausend">Aufbrausend</option>
        <option value="aggressiv">Aggressiv</option>
      </select>
    </div>
    ```
  - Notes: Actions A+B+C in einem Schritt — A+C ohne B hinterlässt einen kaputten Offline-Pfad. Das `|| null` in Action B konvertiert den leeren String (Default-Selektion) korrekt zu `null`. Keine neue CSS nötig — `.field-input--select` Zeile 501 ist bereits vorhanden.

- [x] **Task 6 — offline/db.ts: OutboxEntry Interface erweitern**
  - File: `src/lib/client/offline/db.ts`
  - Action: Im `OutboxEntry` Interface nach `fluglochBeobachtung: string | null;` (Zeile 22) einfügen:
    ```ts
    verhalten: string | null;
    ```
  - Notes: `DB_VERSION` bleibt auf `1`. Bestehende IDB-Einträge haben `undefined` für dieses Feld — `JSON.stringify` lässt es weg, Server behandelt fehlendes Feld korrekt als `null`.

- [x] **Task 7 — offline/sync.ts: POST-Body erweitern**
  - File: `src/lib/client/offline/sync.ts`
  - Action: Im `JSON.stringify({...})`-Body (nach Zeile 43, nach `fluglochBeobachtung: entry.fluglochBeobachtung,`) einfügen:
    ```ts
    verhalten: entry.verhalten,
    ```

- [x] **Task 8 — api/inspections/+server.ts: Feld aus JSON parsen und übergeben**
  - File: `src/routes/api/hives/[hiveId]/inspections/+server.ts`
  - Action A — nach `fluglochBeobachtung`-Block (nach Zeile 75):
    ```ts
    const VALID_VERHALTEN_VALUES = ['ruhig', 'aufbrausend', 'aggressiv'] as const;
    type VerhaltenValue = (typeof VALID_VERHALTEN_VALUES)[number];
    const verhalten =
      typeof b.verhalten === 'string' &&
      VALID_VERHALTEN_VALUES.includes(b.verhalten as VerhaltenValue)
        ? b.verhalten
        : null;
    ```
  - Action B — im `createInspection({...})`-Aufruf (nach Zeile 85, nach `fluglochBeobachtung,`):
    ```ts
    verhalten,
    ```
  - Notes: `VALID_VERHALTEN_VALUES` ist identisch zur Definition in Task 4. Wertänderungen müssen in **beiden Dateien** synchron erfolgen.

---

### Acceptance Criteria

- [x] **AC1 — Dropdown erscheint im Formular mit korrektem Styling**
  - Given: Manuel öffnet `/hives/[id]/inspect`
  - When: Die Seite lädt (auch auf iOS Safari / 375px Viewport)
  - Then: Ein `<select>`-Dropdown mit Label "Verhalten (optional)" und 4 Optionen ist direkt unterhalb von "Fluglochbeobachtung" sichtbar; das Styling ist konsistent mit anderen Feldern (kein nativer iOS-System-Look)

- [x] **AC2 — Feld ist optional**
  - Given: Das Dropdown steht auf "— Keine Angabe —" (Default)
  - When: Manuel speichert die Kontrolle (alle Pflichtfelder ausgefüllt)
  - Then: Kontrolle wird ohne Fehler gespeichert; `verhalten` ist `NULL` in der DB (prüfbar via `npm run db:studio` → Tabelle `inspections`)

- [x] **AC3 — Wert wird korrekt persistiert (online)**
  - Given: Manuel wählt "Aggressiv" im Dropdown
  - When: Er speichert die Kontrolle online
  - Then: `verhalten = 'aggressiv'` in der DB (prüfbar via `npm run db:studio`)

- [x] **AC4 — Ungültige Werte werden sicher behandelt**
  - Given: Ein manipulierter POST-Request sendet `verhalten = 'ungueltig'`
  - When: Der Server die Anfrage verarbeitet
  - Then: Wert wird als `null` gespeichert, kein HTTP 400

- [x] **AC5 — Offline-Pfad: Wert landet im IDB-Outbox und wird korrekt synchronisiert**
  - Given: Manuel ist offline (Chrome DevTools → Network-Tab → "Offline" aktivieren) und wählt "Aufbrausend"
  - When: Er speichert die Kontrolle
  - Then (Schritt 1): Chrome DevTools → Application → Storage → IndexedDB → `beehiveJournal-offline` → `outbox` → Eintrag enthält `verhalten: "aufbrausend"`
  - Then (Schritt 2): Offline deaktivieren → App neu laden → `verhalten = 'aufbrausend'` in der DB

- [x] **AC6 — Build und Lint grün**
  - Given: Alle 8 Tasks implementiert
  - When: `npm run build` und `npm run lint` ausgeführt
  - Then: Beide Commands ohne Fehler oder Warnungen

---

## Review Notes

- Adversarial review completed (2026-05-14)
- Findings: 11 total, 1 fixed, 10 skipped
- Resolution approach: auto-fix
- F1 fixed: `OutboxEntry.verhalten` changed to optional `verhalten?: string | null` + defensive `?? null` in sync.ts for backward-compat with pre-existing IDB entries

---

## Additional Context

### Dependencies

- Kein neues npm-Package erforderlich
- Task 2 muss nach Task 1 ausgeführt werden; erfordert `.env.local` mit `DATABASE_PATH`
- `DB_VERSION` in `offline/db.ts` wird **nicht** erhöht

### Testing Strategy

Manuelles Testing (kein Test-Framework konfiguriert laut `project-context.md`):

1. **Online Happy Path**: Kontrolle mit "Aggressiv" → `npm run db:studio` → `verhalten = 'aggressiv'`
2. **Leeres Feld**: Kontrolle ohne Auswahl → DB = `NULL`
3. **Alle 3 Werte**: Jeden Wert einmal speichern und in DB verifizieren
4. **Offline-Pfad**: DevTools Offline → "Aufbrausend" wählen → speichern → IDB prüfen → Online → DB prüfen (siehe AC5 für exakte DevTools-Navigation)
5. **iOS-Styling**: 375px Viewport (oder iOS Safari Simulator) — Dropdown muss konsistent gestylt sein, kein System-Look
6. **`npm run build`** und **`npm run lint`** — CI-Gates

### Notes

- Das Feld erscheint **bewusst nicht** in Edit-Form und Detailansicht (Out of Scope)
- DB-Strings: `ruhig`, `aufbrausend`, `aggressiv`
- **Synchronisierungsrisiko `VALID_VERHALTEN_VALUES`**: In `+page.server.ts` und `api/+server.ts` dupliziert — Wertänderungen müssen in beiden Dateien gleichzeitig erfolgen
- Bestehende IDB-Einträge ohne Feld: `undefined` → `JSON.stringify` lässt Key weg → Server = `null`. Kein Migrationsskript nötig.
- SQLite `ADD COLUMN TEXT`: sicher für bestehende Daten, vorhandene Zeilen = `NULL`
- `.field-input--select` CSS-Klasse (Zeile 501 `+page.svelte`) ist bereits vorhanden — kein zweites `appearance: none` nötig
