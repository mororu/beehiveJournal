---
title: 'Fluglochbeobachtung & Verhalten in Kontrolldetailansicht anzeigen'
slug: 'dropdown-felder-detailansicht'
created: '2026-05-14'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['SvelteKit 2', 'Svelte 5 Runes', 'TypeScript strict', 'Drizzle ORM', 'SQLite (better-sqlite3)']
files_to_modify:
  - src/routes/hives/[hiveId]/inspections/[inspectionId]/+page.svelte
code_patterns: ['detail-row', 'queenLabels Record map', 'Svelte {#if} conditional', 'CSS custom properties']
test_patterns: ['manual browser test at 375px', 'npm run build', 'npm run lint']
---

# Tech-Spec: Fluglochbeobachtung & Verhalten in Kontrolldetailansicht anzeigen

**Created:** 2026-05-14

## Overview

### Problem Statement

Die Detailansicht einer gespeicherten Kontrolle (`/hives/[hiveId]/inspections/[inspectionId]`) zeigt die Felder `fluglochBeobachtung` und `verhalten` nicht an, obwohl beide Werte bereits in der DB gespeichert werden und im `data.inspection`-Objekt der `load`-Funktion enthalten sind.

### Solution

Zwei neue `detail-row` Einträge in die bestehende `detail-card` (neben Königinnenstatus) einfügen — je einen für Fluglochbeobachtung und Verhalten. Beide nur anzeigen wenn der Wert nicht null ist. Kein Server-, DB- oder Query-Code nötig.

### Scope

**In Scope:**
- `+page.svelte`: Label-Maps für `fluglochBeobachtung` und `verhalten` hinzufügen
- `+page.svelte`: Zwei bedingte `detail-row`s in die bestehende `detail-card` einfügen (nach dem Königinnenstatus-Row)

**Out of Scope:**
- Server-Code, DB-Änderungen, Query-Änderungen
- Edit-Formular
- Listenansicht / Hive-Übersicht

---

## Context for Development

### Codebase Patterns

- **`getInspectionById`** (`inspections.ts:36`): `db.select().from(inspections)` — gibt alle Spalten zurück, inkl. `fluglochBeobachtung` und `verhalten`. Bereits vollständig vorhanden, keine Änderung nötig.
- **`+page.server.ts`** (load): gibt `{ hive, inspection, photos }` zurück — `inspection` enthält alle Felder inkl. beider Dropdowns.
- **`detail-row` Pattern**: Felder in der `detail-card` folgen dem Muster: `<div class="detail-row"><span class="detail-label">...</span><span class="detail-value ...">...</span></div>`. Letztes `detail-row` hat kein `border-bottom` via `:last-child`-Rule.
- **`queenLabels` Map**: `queenStatus` verwendet ein `Record<string, string>` für die Anzeige-Labels. Gleiche Technik für beide neuen Felder verwenden.
- **Optionale Felder**: Nullable Felder mit `{#if data.inspection.field !== null}` konditionell rendern — `!== null` statt Truthiness-Check, da `'keine'` (gültiger Enum-Wert) truthy ist und korrekt angezeigt werden muss.
- **Svelte 5 Runes**: Nur `$state()`, `$derived()`, `$props()` — kein `export let`, kein `$:`.
- **CSS Custom Properties**: Keine Hex-Werte hardcoden, immer `var(--color-text-muted)` etc.
- **`fluglochBeobachtung` Werte**: `'keine'|'wenig'|'mittel'|'hoch'|'sehr_hoch'` (nullable)
- **`verhalten` Werte**: `'ruhig'|'aufbrausend'|'aggressiv'` (nullable)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/routes/hives/[hiveId]/inspections/[inspectionId]/+page.svelte` | Detailansicht — einzige zu ändernde Datei |
| `src/lib/server/db/schema.ts` | Zeile 39: `fluglochBeobachtung`, Zeile 40: `verhalten` — beide nullable text |
| `src/lib/server/db/queries/inspections.ts` | Zeile 36: `getInspectionById` — gibt alle Spalten zurück |
| `src/routes/hives/[hiveId]/inspections/[inspectionId]/+page.server.ts` | load gibt `{ hive, inspection, photos }` — kein Change nötig |

### Technical Decisions

- **Read-only, kein Server-Change**: `data.inspection.fluglochBeobachtung` und `data.inspection.verhalten` sind bereits zur Render-Zeit vorhanden. Die Lösung ist rein presentational.
- **`!== null` statt Truthiness-Check**: Für Enum-Felder `!== null` verwenden statt `{#if field}`. Grund: `'keine'` ist ein semantisch gültiger Wert und truthy — ein Truthiness-Check würde ihn korrekt rendern, ist aber ungenauer in der Intention. `!== null` ist expliziter und schützt vor versehentlichem Leerstring-Hiding.
- **Conditional rendering statt leerer Zeile**: Felder nur rendern wenn `!== null` — vermeidet leere Zeilen für Inspektionen ohne Dropdown-Auswahl (historische Daten, Default "Keine Angabe").
- **Edit-Form Safety**: Gespeicherte Werte bleiben beim Bearbeiten erhalten — Drizzle's partielles `.set()` überschreibt nur explizit übergebene Felder. Das Edit-Formular übergibt diese Felder nicht → bestehende DB-Werte bleiben unverändert. Dokumentiert in `tech-spec-fluglochbeobachtung-dropdown.md` → Technical Decisions.
- **Label-Maps statt Switch**: Gleiche Technik wie `queenLabels` — wartungsfreundlich und typsicher.

---

## Implementation Plan

### Tasks

- [x] **Task 1 — +page.svelte: Label-Maps und conditional detail-rows hinzufügen**
  - File: `src/routes/hives/[hiveId]/inspections/[inspectionId]/+page.svelte`
  - Action A — Im `<script>`-Block, nach der `queenLabels`-Deklaration (Zeile 10–14):
    ```ts
    const fluglochLabels: Record<string, string> = {
      keine: 'Keine',
      wenig: 'Wenig',
      mittel: 'Mittel',
      hoch: 'Hoch',
      sehr_hoch: 'Sehr Hoch',
    };

    const verhaltenLabels: Record<string, string> = {
      ruhig: 'Ruhig',
      aufbrausend: 'Aufbrausend',
      aggressiv: 'Aggressiv',
    };
    ```
  - Action B — Im Template, die erste `detail-card` (Zeile 78–103) enthält Gesundheitsbewertung und Königinnenstatus. Direkt nach dem letzten `</div>` des Königinnenstatus-Rows (Zeile 102) und vor dem schließenden `</div>` der `detail-card` (Zeile 103) einfügen. Kontext zur Orientierung:
    ```html
    <!-- bestehendes Königinnenstatus-Row (Zeilen 97–102), NICHT ändern: -->
    <div class="detail-row">
      <span class="detail-label">Königinnenstatus</span>
      <span class="detail-value queen-status queen-status--{data.inspection.queenStatus}">
        {queenLabels[data.inspection.queenStatus] ?? data.inspection.queenStatus}
      </span>
    </div>

    <!-- NEU: direkt nach dem Königinnenstatus-Row, vor dem </div> der detail-card einfügen: -->
    {#if data.inspection.fluglochBeobachtung !== null}
      <div class="detail-row">
        <span class="detail-label">Fluglochbeobachtung</span>
        <span class="detail-value">
          {fluglochLabels[data.inspection.fluglochBeobachtung] ?? data.inspection.fluglochBeobachtung}
        </span>
      </div>
    {/if}

    {#if data.inspection.verhalten !== null}
      <div class="detail-row">
        <span class="detail-label">Verhalten</span>
        <span class="detail-value">
          {verhaltenLabels[data.inspection.verhalten] ?? data.inspection.verhalten}
        </span>
      </div>
    {/if}

    <!-- BESTEHENDES schließendes </div> der detail-card bleibt: -->
    </div>
    ```
  - Notes: Actions A+B in einem Schritt. `!== null` statt Truthiness-Check (F2-fix). CSS `:last-child` wertet dynamisch aus welches `.detail-row` im DOM zuletzt steht — Svelte's `{#if}` entfernt nicht-gerenderte Elemente vollständig aus dem DOM, daher funktioniert `:last-child` korrekt für alle Kombinationen (beide gesetzt, eine null, beide null). Der `?? raw_value` Fallback ist konsistent mit `queenLabels`.

### Acceptance Criteria

- [x] **AC1 — Fluglochbeobachtung wird in der Detailansicht angezeigt**
  - Given: Eine Kontrolle hat `flugloch_beobachtung = 'hoch'` in der DB
  - When: Manuel öffnet die Detailansicht dieser Kontrolle
  - Then: Eine Zeile "Fluglochbeobachtung — Hoch" ist in der `detail-card` sichtbar

- [x] **AC2 — Verhalten wird in der Detailansicht angezeigt**
  - Given: Eine Kontrolle hat `verhalten = 'ruhig'` in der DB
  - When: Manuel öffnet die Detailansicht dieser Kontrolle
  - Then: Eine Zeile "Verhalten — Ruhig" ist in der `detail-card` sichtbar

- [x] **AC3 — Felder sind versteckt wenn null**
  - Given: Eine ältere Kontrolle hat `flugloch_beobachtung = NULL` und `verhalten = NULL`
  - When: Manuel öffnet deren Detailansicht
  - Then: Keine Fluglochbeobachtungs- oder Verhalten-Zeile ist sichtbar (keine leeren Zeilen)

- [x] **AC4 — Build und Lint grün**
  - Given: Task 1 implementiert
  - When: `npm run build` und `npm run lint` ausgeführt
  - Then: Beide Commands ohne Fehler

---

## Additional Context

### Dependencies

- Keine neuen npm-Packages erforderlich
- Kein DB-Migration oder Server-Change nötig
- Felder müssen in einer Kontrolle gespeichert worden sein (via Create-Formular) damit sie sichtbar werden

### Testing Strategy

Manuelles Testing:
1. Eine Kontrolle mit "Hoch" (Fluglochbeobachtung) und "Ruhig" (Verhalten) über das Create-Formular erfassen → Detailansicht öffnen → beide Felder müssen sichtbar sein
2. Eine Kontrolle mit "Wenig" (Fluglochbeobachtung) und **ohne** Verhalten-Auswahl erfassen → Detailansicht → nur Fluglochbeobachtung sichtbar, kein Verhalten-Row, Fluglochbeobachtung-Row ohne Border-Bottom (`:last-child`)
3. Eine ältere Kontrolle ohne diese Felder öffnen → keine leeren Zeilen für Fluglochbeobachtung oder Verhalten
4. Mobile Viewport (375px) prüfen — Layout muss korrekt umbrechen
5. `npm run build` und `npm run lint` ausführen

### Notes

- Das Label-Map-Pattern (`?? raw_value` Fallback) ist konsistent mit `queenLabels` in derselben Datei
- `verhalten` ist bereits vollständig im Create-Formular implementiert (`inspect/+page.svelte`) und in der DB vorhanden — `tech-spec-verhalten-dropdown.md` hat `status: ready-for-dev` (veralteter Status, Implementierung ist abgeschlossen)

## Review Notes

- Adversarial review completed
- Findings: 10 total, 2 fixed, 8 skipped
- Resolution approach: auto-fix
- F3 fixed: `!== null` → `!= null` (consistency with weather section null-guards in same file)
- F6 fixed: `'Sehr Hoch'` → `'Sehr hoch'` (German orthography — only first word capitalised)
- F1/F10 skipped: architectural improvements (shared label module, typed enum keys) — future refactor
- F4/F5 skipped: out of scope per tech spec
- F2/F8 skipped: noise (Drizzle types nullable text as `string | null`; Svelte removes `{#if}` blocks from DOM)
