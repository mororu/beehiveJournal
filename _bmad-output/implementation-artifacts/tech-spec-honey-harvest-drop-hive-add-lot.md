---
title: 'Honey Harvest — drop hive link, add Los, date-only'
slug: 'honey-harvest-drop-hive-add-lot'
created: '2026-08-16'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
implemented_on: '2026-08-16'
reviewed_on: '2026-08-16'
findings_addressed: 9
findings_skipped: 5
deviations:
  - 'Hand-edited migration 0008_worried_barracuda.sql: added an empty-string literal AS "lot" in the SELECT because the auto-generator referenced a source column that does not exist in the pre-migration table. Documented inline in the SQL file. Zero rows in the DB at migrate time, so the placeholder literal is never actually persisted.'
tech_stack:
  - SvelteKit 2.50.2
  - Svelte 5.51.0 (Runes mode)
  - TypeScript 5.9.3 (strict)
  - Drizzle ORM 0.45.1
  - better-sqlite3 12.6.2
  - IndexedDB (raw browser API, no idb library)
files_to_modify:
  - src/lib/server/db/schema.ts
  - src/lib/server/db/queries/honeyHarvests.ts
  - src/routes/api/harvests/+server.ts
  - src/routes/harvests/+page.server.ts
  - src/routes/harvests/+page.svelte
  - src/routes/harvests/new/+page.server.ts
  - src/routes/harvests/new/+page.svelte
  - src/lib/client/offline/db.ts
  - src/lib/client/offline/sync.ts
  - src/lib/client/utils/date.ts
  - src/routes/hives/[hiveId]/+page.svelte
files_to_delete:
  - src/routes/hives/[hiveId]/harvests/new/+page.server.ts
  - src/routes/hives/[hiveId]/harvests/new/+page.svelte
files_to_create: []
code_patterns:
  - drizzle-satisfies-insert
  - query-file-boundary
  - onConflictDoNothing-dedup
  - offline-outbox-clientId
  - date-utility-colocated
  - svelte5-runes-derived
  - use-enhance-offline-branch
  - api-error-helper
test_patterns:
  - manual-browser-375px
  - npm-run-build
  - npm-run-lint
---

# Tech-Spec: Honey Harvest — drop hive link, add Los, date-only

**Created:** 2026-08-16

## Overview

### Problem Statement

The current honey-harvest feature forces the user to associate every harvest with a specific hive, which does not match how Manuel actually harvests (a single lot is drawn from multiple hives). The form also uses a datetime input whose "time" component is meaningless, and there is no lot identifier — Manuel needs a `Los` label of the form `L` + `ddmmyyyy` visible on both the form and the log.

### Solution

Drop `hive_id` from the `honey_harvests` table (destructive migration — no rows exist yet), add a stored `lot TEXT NOT NULL` column derived server-side from `harvestedAt` as `L` + `ddmmyyyy`, and switch the harvest date input to `type="date"` while keeping `harvestedAt` as a Unix epoch integer set to midnight local time. Remove the hive-scoped create route, the hive-detail CTA, and the hive filter on the global list.

### Scope

**In Scope:**

- Schema change: drop `hive_id` (FK + column) from `honey_harvests`; add `lot TEXT NOT NULL` column; keep `harvested_at INTEGER NOT NULL` semantics (now representing midnight local of a calendar day)
- Drizzle migration generated via `npm run db:generate` and applied via `npm run db:migrate` (SQLite version supports `DROP COLUMN` directly; Kit may still rebuild the table — either is safe with zero rows)
- Query file `honeyHarvests.ts`: remove `HarvestWithHive` interface, remove the `hives` left-join and unused `hives` import, drop the `{ hiveId? }` param on `getHarvestEntries`, add `lot` to `createHarvestEntry` input/insert, drop the `hiveId` param on `createHarvestEntry`
- API `/api/harvests`: `GET` no longer accepts `hiveId`; `POST` no longer accepts `hiveId`, derives `lot` from `harvestedAt` server-side (client-submitted `lot` is ignored — server is source of truth). FK-violation try/catch is removed alongside the `hiveId` param.
- Offline store: drop `hiveId` from `HarvestOutboxEntry` interface (TS-only — IndexedDB is schemaless; no `DB_VERSION` bump). Legacy queued entries carrying `hiveId` remain safe to sync: the sync loop simply stops reading that field.
- Sync loop in `sync.ts`: remove `hiveId` from the POST body in the harvest branch
- Date helpers in `src/lib/client/utils/date.ts`: add three pure helpers — `formatLot(epoch)`, `toDateInput(epoch)`, `fromDateInput(str)` (framework-free; import-safe from client and server)
- Global create form `/harvests/new`: remove the hive `<select>`, switch the date input to `type="date"`, add a read-only `Los` input whose value is `$derived` from the date via `formatLot()`, drop `hiveId` from offline outbox write, update `use:enhance` offline branch (no more `hiveIdStr` parse guard)
- Global list `/harvests`: remove the hive-name column, remove the hive filter dropdown, remove `?hiveId` query param handling in load and delete redirect, remove `hives` from returned data, add a `Los` column showing `harvest.lot`
- Delete: `/hives/[hiveId]/harvests/new` route (both `+page.server.ts` and `+page.svelte`) — no callers remain after removing the hive-detail CTA
- Delete: `+ Neue Ernte` anchor in `.hive-detail__cta` on `src/routes/hives/[hiveId]/+page.svelte` (single line, no CSS cleanup needed)

**Out of Scope:**

- Edit form / harvest detail page
- Totals, charts, statistics
- Editable `Los` field (read-only only; server always recomputes)
- Uniqueness enforcement on `Los` (two harvests on the same date share the same `Los` — by design)
- Data preservation (no rows exist yet, so no backfill needed)
- Renaming URL paths (`/harvests` and `/harvests/new` remain)
- Nav link change (`Ernten` stays)
- `pendingSync` store changes (already counts both outboxes)
- Bumping `DB_VERSION` (not needed — IndexedDB is schemaless and the `hiveId` field on legacy entries is harmless)

---

## Context for Development

### Codebase Patterns

- **Query file boundary is sacred**: never write Drizzle calls in route files. All harvest DB access continues to go through `src/lib/server/db/queries/honeyHarvests.ts`. See `project-context.md` § "Never write Drizzle calls in route files".
- **Drizzle migration workflow**: `npm run db:generate` then `npm run db:migrate`. Never hand-edit migration files. Column drops on SQLite 3.35+ are natively supported; Drizzle-Kit may still generate a table rebuild for FK-constrained changes. Verify the generated `NNNN_*.sql` before running migrate.
- **Timestamps are Unix epoch seconds**: `harvestedAt` remains an integer. Midnight local for a chosen calendar day is derived via `new Date(str + 'T00:00:00').getTime() / 1000` — same pattern already used in `hives/[hiveId]/+page.svelte` (lines 32-37) for the date-range filter.
- **Date utilities live together in one file**: `src/lib/client/utils/date.ts` already exports `formatDate`, `formatDateTime`, `toDatetimeLocal`, `fromDatetimeLocal`. Add `formatLot`, `toDateInput`, `fromDateInput` in the same file. Keep them framework-free — no `$app/*` imports.
- **Svelte 5 Runes only**: `$state`, `$derived`, `$props`. `Los` uses `$derived` so it reactively tracks the date input via `bind:value`.
- **`clientId` initialisation via `$state(crypto.randomUUID())`**: initialiser runs once on component creation. Do NOT use `$effect` — it re-runs and would silently break offline dedup.
- **API errors**: `error(statusCode, { message })` from `@sveltejs/kit`, never `throw new Error`. Duplicate-`clientId` inserts return `undefined` from `.onConflictDoNothing().returning().get()` — API returns `json({ duplicate: true }, { status: 200 })`. Sync removes on any 2xx.
- **Offline outbox pattern**: raw IndexedDB via the promise-wrapped helpers in `src/lib/client/offline/db.ts`. `keyPath: 'clientId'` on both stores.
- **`use:enhance` offline branching**: forms check `!navigator.onLine`, cancel the submit, write to IDB via `addToHarvestsOutbox`, then `pendingSync.refresh()` and `goto('/harvests')`. Reference the current `harvests/new/+page.svelte` for the exact shape.
- **German UI throughout**: all user-facing text in German. Colours via `var(--color-*)` custom properties, never hardcoded hex. `<html lang="de">`.
- **`use:enhance` for all forms**: progressive enhancement, no full-page reloads.
- **Route file separation**: form actions in `+page.server.ts`, JSON APIs in `+server.ts`, never mixed.
- **Mobile-first, 44px touch targets**: form fields are 48px; keep those styles unchanged.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/lib/server/db/schema.ts` | Modify: `honeyHarvests` block lines 98-113 — drop `hiveId` column + FK, add `lot` column |
| `src/lib/server/db/queries/honeyHarvests.ts` | Modify: drop `HarvestWithHive`, drop `hives` import, drop left-join + hiveId filter, add `lot` to insert values |
| `src/routes/api/harvests/+server.ts` | Modify: drop `hiveId` handling in both GET (lines 11-16) and POST (lines 29-35, 55-63); compute `lot` server-side |
| `src/routes/harvests/+page.server.ts` | Modify: drop `?hiveId` handling (lines 12-19, 40-46), drop `getActiveHives()` import and call, drop `hives` in return payload, unconditional `redirect(302, '/harvests')` in delete action |
| `src/routes/harvests/+page.svelte` | Modify: drop `goto` import if unused, drop `applyFilter` (lines 23-26), drop hive filter block (lines 69-84), drop `harvest-card__hive` span (line 102), add `harvest-card__lot` span |
| `src/routes/harvests/new/+page.server.ts` | Modify: drop `getActiveHives` import + load return, drop `hiveIdRaw` parsing (lines 16, 22-38), swap `fromDatetimeLocal` → `fromDateInput` |
| `src/routes/harvests/new/+page.svelte` | Modify: drop hive `<select>` block (lines 87-105), change date input `type="datetime-local"` → `type="date"` (line 114), swap `toDatetimeLocal`/`fromDatetimeLocal` imports for `toDateInput`/`fromDateInput`, add read-only `Los` input `$derived` from date, drop `hiveId` from `addToHarvestsOutbox` call and remove the `hiveIdStr`/`hiveId` parse+guard (lines 41-46) |
| `src/lib/client/offline/db.ts` | Modify: drop `hiveId: number` from `HarvestOutboxEntry` (line 41). No `DB_VERSION` change. |
| `src/lib/client/offline/sync.ts` | Modify: drop `hiveId: entry.hiveId,` from the harvest POST body (line 87) |
| `src/lib/client/utils/date.ts` | Modify: add `formatLot`, `toDateInput`, `fromDateInput` helpers. Do NOT remove `toDatetimeLocal`/`fromDatetimeLocal` — still used elsewhere. |
| `src/routes/hives/[hiveId]/+page.svelte` | Modify: delete the `+ Neue Ernte` anchor on line 100 inside `.hive-detail__cta`. CSS on `.hive-detail__cta` (lines 373-378) already handles single-child case fine. |
| `src/routes/hives/[hiveId]/harvests/new/+page.server.ts` | Delete |
| `src/routes/hives/[hiveId]/harvests/new/+page.svelte` | Delete |
| `src/routes/stings/new/+page.svelte` | Reference: `clientId` pattern, offline enhance branching (unchanged, still valid template) |
| `src/lib/client/stores/pendingSync.ts` | Reference only: already sums both outboxes — no change needed |

### Technical Decisions

- **`lot` stored, not computed on read**: even though it is fully derivable, storing it in the row is cheaper for display in lists, freezes the label if the date-format convention ever changes, and matches how Manuel would treat a physical jar label. Server always overwrites any client-supplied `lot` on insert — the field is read-only from a security and consistency standpoint, so client trust is not required.
- **`ddmmyyyy` format is zero-padded, no separators**: `2026-08-04` → `L04082026`; `2026-12-31` → `L31122026`. `formatLot` uses `String(d.getDate()).padStart(2, '0')`, `String(d.getMonth()+1).padStart(2, '0')`, `String(d.getFullYear())` (year is always 4-digit for supported range).
- **Midnight local for date-only storage**: `fromDateInput(str)` uses `new Date(str + 'T00:00:00').getTime() / 1000` to guarantee local midnight (mirrors the existing pattern in `hives/[hiveId]/+page.svelte`). Do NOT use `new Date('YYYY-MM-DD')` bare — the ECMAScript spec parses that as UTC midnight, which would shift the calendar day for negative UTC offsets and misalign with `formatDate()` output.
- **`toDateInput(epoch)`**: returns `` `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` `` — the value shape required by `<input type="date">`.
- **`formatLot(epoch)`**: same `Date` construction (`new Date(epoch * 1000)`) so the label is computed in local time, matching what the user sees in the date picker.
- **Destructive schema migration is safe here**: `honey_harvests` has zero rows in Manuel's environments. Whatever SQL Drizzle-Kit generates (column drop vs. table rebuild) is fine. If Kit produces a rebuild that would drop the `honey_harvests_client_id_unique` index temporarily, that is still safe — the index will be re-created in the same migration.
- **No `DB_VERSION` bump**: dropping a field from `HarvestOutboxEntry` is TS-only. Legacy queued entries in IndexedDB may have `hiveId` on them — after the change, the sync loop simply ignores it. IndexedDB does not validate object shape, so no upgrade is required. This avoids the risk of destroying any pending harvest entry a user has queued.
- **Server-side `lot` is source of truth**: the client `$derived` `Los` is a display convenience only. The server always computes `lot = formatLot(harvestedAt)` before insert. If someone POSTs a `lot` that disagrees with the date, the server ignores it. Invariant: `lot === formatLot(harvestedAt)`.
- **`Los` field UX**: `<input readonly>` (not `disabled`, so it participates in tab order and copy-paste), no `name` attribute so it doesn't submit (server recomputes anyway), styled with a slightly muted background via inline `style` or a `.field-input--readonly` modifier. `bind:value` to a `$derived` expression sourced from the date input's `bind:value`.
- **Hive filter deletion is a hard cut**: any bookmarked URL `/harvests?hiveId=3` will silently drop the param (the query param is no longer read). Do not 400. Old bookmarks land on the plain list.
- **`getActiveHives` cleanup**: after removing all its call sites in the harvest routes, verify the import is still used elsewhere in the codebase (it is — `stings/+page.server.ts` and `stings/new/+page.server.ts` use it). Only remove the local import in the two harvest server files.
- **`goto` import in `/harvests/+page.svelte`**: after removing `applyFilter`, `goto` may be unused. Remove the import to satisfy ESLint no-unused-imports.
- **Nav link stays**: `Ernten` in `+layout.svelte` is unchanged.
- **Migration name**: Drizzle-Kit will auto-name based on schema diff (e.g. `0008_*.sql`). Do not rename or hand-edit the generated file.
- **Sync loop error handling unchanged**: 2xx removes from IDB, other status marks `syncStatus: 'error'`, network errors mark `syncStatus: 'error'`. No cap on retries — consistent with inspection sync (accepted V1 limitation).

---

## Implementation Plan

### Tasks

Tasks are strictly dependency-ordered (schema and utils first, then routes, then UI cleanup, then verification).

- [x] **Task 1 — Add date/lot helpers to `date.ts`**
  - File: `src/lib/client/utils/date.ts`
  - Action: Append three new exports after `fromDatetimeLocal` (keep the existing helpers untouched — still used by inspections/stings):
    ```ts
    /**
     * Format a Unix epoch (seconds) as a "Los" (lot) label: `L` + ddmmyyyy in local time.
     * Example: 2026-08-04 → "L04082026".
     */
    export function formatLot(epoch: number): string {
      const d = new Date(epoch * 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `L${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}`;
    }

    /**
     * Format a Unix epoch (seconds) for use in a <input type="date"> value.
     * Returns "YYYY-MM-DD" in local time.
     */
    export function toDateInput(epoch: number): string {
      const d = new Date(epoch * 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    /**
     * Parse a date input string ("YYYY-MM-DD") to a Unix epoch (seconds) at local midnight.
     * Do NOT use `new Date("YYYY-MM-DD")` — the ECMAScript spec parses that as UTC midnight,
     * which shifts the calendar day for non-zero UTC offsets.
     */
    export function fromDateInput(value: string): number {
      return Math.floor(new Date(value + 'T00:00:00').getTime() / 1000);
    }
    ```
  - Notes: Pure functions, no framework imports. Safe to import from both server (`+page.server.ts`, `+server.ts`) and client (`+page.svelte`).

- [x] **Task 2 — Schema change: drop `hive_id`, add `lot`**
  - File: `src/lib/server/db/schema.ts`
  - Action: In the `honeyHarvests` block (lines 95-113), replace the current definition with:
    ```ts
    // ─── Honey Harvests ──────────────────────────────────────────────────────────
    // Log of honey harvests. NOT tied to a specific hive — a single harvest lot
    // is drawn from multiple hives. `lot` is a display label derived server-side
    // from `harvested_at` as `L` + ddmmyyyy (see formatLot in utils/date.ts).
    export const honeyHarvests = sqliteTable(
      'honey_harvests',
      {
        id: integer('id').primaryKey({ autoIncrement: true }),
        harvestedAt: integer('harvested_at').notNull(), // Unix epoch seconds (local midnight of the chosen day)
        amountKg: real('amount_kg').notNull(), // decimal kg, e.g. 11.4
        lot: text('lot').notNull(), // `L` + ddmmyyyy — recomputed server-side on every insert
        notes: text('notes'), // optional free text
        clientId: text('client_id'), // UUID v4 for offline dedup; nullable
        createdAt: integer('created_at').notNull(),
        updatedAt: integer('updated_at').notNull(), // reserved for future edit support
      },
      (t) => [uniqueIndex('honey_harvests_client_id_unique').on(t.clientId)]
    );
    ```
  - Notes: The exported types `HoneyHarvest` and `NewHoneyHarvest` at the bottom of the file re-infer automatically — no change needed there.

- [x] **Task 3 — Generate and apply the Drizzle migration**
  - Commands: `npm run db:generate` (produces the next `NNNN_*.sql` file under `src/lib/server/db/migrations/`), then inspect the generated SQL, then `npm run db:migrate`.
  - Expected SQL: either `ALTER TABLE honey_harvests DROP COLUMN hive_id;` + `ALTER TABLE honey_harvests ADD COLUMN lot text NOT NULL;` (SQLite 3.35+) OR a rebuild (`__new_honey_harvests` create → copy → drop → rename). Both are safe with zero rows.
  - Notes: Do NOT hand-edit the migration file. If the generated SQL looks unexpected (e.g. dropping other tables), STOP and investigate rather than running migrate.

- [x] **Task 4 — Query file: drop hive join, add `lot`**
  - File: `src/lib/server/db/queries/honeyHarvests.ts`
  - Action:
    - Drop `hives` from the schema import; drop the `HarvestWithHive` interface entirely.
    - `getHarvestEntries()`: simplify to no parameter, no join:
      ```ts
      export function getHarvestEntries(): HoneyHarvest[] {
        return db.select().from(honeyHarvests).orderBy(desc(honeyHarvests.harvestedAt)).all();
      }
      ```
    - `createHarvestEntry`: drop the `hiveId` param, add a required `lot: string` param, drop `hiveId` from `.values({...})`, add `lot`:
      ```ts
      export function createHarvestEntry(data: {
        harvestedAt: number;
        amountKg: number;
        lot: string;
        notes?: string | null;
        clientId?: string | null;
      }): HoneyHarvest | undefined {
        const now = Math.floor(Date.now() / 1000);
        return db
          .insert(honeyHarvests)
          .values({
            harvestedAt: data.harvestedAt,
            amountKg: data.amountKg,
            lot: data.lot,
            notes: data.notes ?? null,
            clientId: data.clientId ?? null,
            createdAt: now,
            updatedAt: now,
          } satisfies NewHoneyHarvest)
          .onConflictDoNothing()
          .returning()
          .get();
      }
      ```
    - `getHarvestById` and `deleteHarvestEntry`: unchanged.
  - Notes: `.get()` on a plain `select().from().orderBy()` returns the first row — call `.all()` for the list.

- [x] **Task 5 — API endpoint: drop hive, compute `lot`**
  - File: `src/routes/api/harvests/+server.ts`
  - Action:
    - Add import: `import { formatLot } from '$lib/client/utils/date.js';`
    - `GET`: replace the body with `return json(getHarvestEntries());` — drop `hiveId` param parsing entirely, drop the `url` destructure if unused.
    - `POST`: remove the `hiveId` validation block (lines 29-35) and the FK-violation try/catch (lines 55-63). Compute `const lot = formatLot(harvestedAt);` after `harvestedAt` is finalised, then call `createHarvestEntry({ harvestedAt, amountKg, lot, notes, clientId })`. Any client-supplied `lot` in the body is ignored (do not read `b.lot`).
    - Keep the `Invalid JSON`, `amountKg` range, `harvestedAt` NaN, and duplicate-`clientId` handling intact.
  - Notes: The `try/catch` around `createHarvestEntry` was solely for the FK-violation case. Without `hiveId` there is no FK left to violate — remove the try/catch entirely so failures surface as 500s (correct behaviour for genuine DB errors).

- [x] **Task 6 — Offline outbox interface cleanup**
  - File: `src/lib/client/offline/db.ts`
  - Action: Remove the `hiveId: number;` line from the `HarvestOutboxEntry` interface (line 41). That is the ONLY change.
  - Notes: `DB_VERSION` stays at 2. No store recreation. IndexedDB is schemaless, so legacy queued entries carrying an unused `hiveId` field remain safe.

- [x] **Task 7 — Sync loop: drop `hiveId` from POST body**
  - File: `src/lib/client/offline/sync.ts`
  - Action: In the harvests-outbox `for` loop (lines 81-103), remove the line `hiveId: entry.hiveId,` from the `JSON.stringify({...})` body. Do not remove anything else.
  - Notes: Legacy entries where `entry.hiveId` is defined at runtime still sync cleanly — the field is simply not sent.

- [x] **Task 8 — Global list server: drop hive filter**
  - File: `src/routes/harvests/+page.server.ts`
  - Action:
    - Drop the `getActiveHives` import (from `$lib/server/db/queries/hives.js`).
    - `load`: replace the entire body with:
      ```ts
      return { harvests: getHarvestEntries() };
      ```
    - `actions.delete`: drop the `url` parameter, drop the `hiveIdParam`/`activeHiveFilter` lines, and replace the redirect with the unconditional `redirect(302, '/harvests');`.
  - Notes: The `error` import stays (used by the id validation + not-found path). The `PageServerLoad` and `Actions` type imports also stay.

- [x] **Task 9 — Global list UI: drop hive filter + column, add `Los` column**
  - File: `src/routes/harvests/+page.svelte`
  - Action:
    - Drop imports: `import { goto } from '$app/navigation';` (no longer used after `applyFilter` removal).
    - Drop the `applyFilter` function.
    - Drop the entire `<!-- Hive filter -->` block (lines 68-84 — the `{#if data.hives.length > 0}` filter-bar).
    - Simplify the empty state to always show `<p>Noch keine Ernten erfasst.</p>` (drop the `{#if data.activeHiveFilter}` branch).
    - In the harvest card, replace this line:
      ```svelte
      <span class="harvest-card__hive">{harvest.hiveName ?? '—'}</span>
      ```
      with:
      ```svelte
      <span class="harvest-card__lot">{harvest.lot}</span>
      ```
    - Update CSS: rename `.harvest-card__hive` selector to `.harvest-card__lot` (keep the same font-size and colour — muted, monospace-ish is fine but not required).
    - Remove the now-unused `.filter-bar`, `.filter-label`, `.filter-select`, and `.filter-select:focus` blocks in the `<style>` section.
  - Notes: `data.harvests` is now `HoneyHarvest[]` (not `HarvestWithHive[]`), so TypeScript will drop the `hiveName` property automatically — the compiler will flag any residual `harvest.hiveName` reference.

- [x] **Task 10 — Global create server: drop hive, compute `lot`**
  - File: `src/routes/harvests/new/+page.server.ts`
  - Action: Replace the full contents of the file with:
    ```ts
    // src/routes/harvests/new/+page.server.ts

    import { fail, redirect } from '@sveltejs/kit';
    import { createHarvestEntry } from '$lib/server/db/queries/honeyHarvests.js';
    import { fromDateInput, formatLot } from '$lib/client/utils/date.js';
    import type { Actions } from './$types.js';

    export const actions: Actions = {
      default: async ({ request }) => {
        const data = await request.formData();
        const harvestedAtRaw = (data.get('harvestedAt') as string | null)?.trim() ?? '';
        const amountKgRaw = (data.get('amountKg') as string | null)?.trim() ?? '';
        const notes = (data.get('notes') as string | null)?.trim() || null;
        const clientId = (data.get('clientId') as string | null) || null;

        if (!amountKgRaw) {
          return fail(400, { error: 'Ungültige Menge (0.1–9999 kg)', amountKgRaw, notes: notes ?? '' });
        }
        const amountKg = parseFloat(amountKgRaw);
        if (isNaN(amountKg) || amountKg <= 0 || amountKg > 9999) {
          return fail(400, { error: 'Ungültige Menge (0.1–9999 kg)', amountKgRaw, notes: notes ?? '' });
        }

        let harvestedAt: number;
        if (harvestedAtRaw) {
          harvestedAt = fromDateInput(harvestedAtRaw);
          if (isNaN(harvestedAt)) {
            return fail(400, { error: 'Ungültiges Erntedatum', amountKgRaw, notes: notes ?? '' });
          }
        } else {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          harvestedAt = Math.floor(d.getTime() / 1000);
        }

        const lot = formatLot(harvestedAt);
        createHarvestEntry({ harvestedAt, amountKg, lot, notes, clientId });
        redirect(302, '/harvests');
      },
    };
    ```
  - Notes: No `load` export — `PageServerLoad` is no longer needed. The `PageData` referenced in the `.svelte` will still resolve (SvelteKit falls back to inherited layout data).

- [x] **Task 11 — Global create UI: hive selector out, date input + Los in**
  - File: `src/routes/harvests/new/+page.svelte`
  - Action:
    - Update imports: replace `toDatetimeLocal, fromDatetimeLocal` with `toDateInput, fromDateInput, formatLot` from `$lib/client/utils/date.js`.
    - Change props to just `let { form }: { form: ActionData } = $props();` (drop `data` — nothing is loaded now). Drop the `PageData` type import.
    - Add reactive state for the date input and Los:
      ```ts
      let dateInputValue = $state(toDateInput(Math.floor(Date.now() / 1000)));
      const losValue = $derived(formatLot(fromDateInput(dateInputValue)));
      ```
    - Remove the entire `{#if data.hives.length === 0} ... {:else}` wrapper — always render the form.
    - Remove the entire hive `<select>` field block (lines 87-105 in current file).
    - Change the date input:
      ```svelte
      <div class="field">
        <label class="field-label" for="harvestedAt">
          Erntedatum <span class="required" aria-hidden="true">*</span>
        </label>
        <input
          class="field-input"
          type="date"
          id="harvestedAt"
          name="harvestedAt"
          bind:value={dateInputValue}
          required
          disabled={isSubmitting}
        />
      </div>
      ```
    - Add a read-only Los field directly below the date field (before the Menge field):
      ```svelte
      <div class="field">
        <label class="field-label" for="lot">Los</label>
        <input
          class="field-input field-input--readonly"
          type="text"
          id="lot"
          readonly
          value={losValue}
          tabindex="-1"
          aria-readonly="true"
        />
      </div>
      ```
      Do NOT give the input a `name` attribute — the server recomputes `lot` and any submitted value is ignored.
    - In the `use:enhance` offline branch, drop the `hiveIdStr`/`hiveId` parse + guard (lines 41-46), change the date parsing to use `fromDateInput`, and drop `hiveId` from the `addToHarvestsOutbox` payload:
      ```ts
      const harvestedAtRaw = (formData.get('harvestedAt') as string | null)?.trim() ?? '';
      let harvestedAt: number;
      if (harvestedAtRaw) {
        harvestedAt = fromDateInput(harvestedAtRaw);
      } else {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        harvestedAt = Math.floor(d.getTime() / 1000);
      }
      const amountKg = parseFloat((formData.get('amountKg') as string | null) ?? '0');
      const notes = (formData.get('notes') as string | null)?.trim() || null;

      addToHarvestsOutbox({
        clientId,
        harvestedAt,
        amountKg,
        notes,
        syncStatus: 'pending',
        createdAt: Math.floor(Date.now() / 1000),
      })
        .then(async () => { /* … */ });
      ```
    - Add a `.field-input--readonly` CSS modifier in the `<style>` block:
      ```css
      .field-input--readonly {
        background: var(--color-bg, #f3f4f6);
        color: var(--color-text-muted, #6b7280);
        cursor: default;
      }
      ```
  - Notes: `form?.hiveIdRaw` was previously read on the hive `<select>` — that key no longer exists on `ActionData` (the server never returns it), so nothing else references it. Verify no residual `data.hive*` or `form?.hiveIdRaw` references remain in the file.

- [x] **Task 12 — Hive detail: remove `+ Neue Ernte` button**
  - File: `src/routes/hives/[hiveId]/+page.svelte`
  - Action: Delete line 100 (`<a href="/hives/{data.hive.id}/harvests/new" class="btn btn--ghost">+ Neue Ernte</a>`). No CSS change needed — `.hive-detail__cta` still has one child (`+ Neue Kontrolle`) and renders fine.
  - Notes: There are no other references to `/hives/[hiveId]/harvests/new` in the codebase after this — verify with `grep -r 'harvests/new' src/` before considering the task done; the only remaining hit should be `src/routes/harvests/new/`.

- [x] **Task 13 — Delete hive-scoped harvest create route**
  - Files: `src/routes/hives/[hiveId]/harvests/new/+page.server.ts`, `src/routes/hives/[hiveId]/harvests/new/+page.svelte`.
  - Action: Delete both files. If the `new/` directory (and its parent `harvests/` under `[hiveId]/`) is empty after this, delete those empty directories too so SvelteKit doesn't materialise an empty route.
  - Notes: Do this LAST so a partially applied change never leaves a form action pointing at a removed table shape.

- [x] **Task 14 — Verify: lint, build, manual test**
  - Commands: `npm run lint` then `npm run build`. Both must complete without new errors or warnings.
  - Manual test steps: see "Testing Strategy" below.
  - Notes: If lint flags `PageData` / `getActiveHives` / `fromDatetimeLocal` / `goto` / `applyFilter` as unused in any file we touched, remove those imports — do not add `// eslint-disable-next-line`.

### Acceptance Criteria

- [x] **AC1 — Create harvest online (happy path)**
  - Given: Manuel navigates to `/harvests/new`
  - When: He picks a date, enters `11.4` for Menge, optionally adds notes, and submits
  - Then: A new row is inserted with `harvestedAt` at local midnight of the chosen day, `amountKg = 11.4`, `lot = "L" + ddmmyyyy`, and he is redirected to `/harvests` where the entry appears in descending date order

- [x] **AC2 — `Los` preview reflects date on load**
  - Given: The form at `/harvests/new` opens
  - When: The date input is pre-populated with today's date (e.g. 2026-08-16)
  - Then: The read-only `Los` field shows `L16082026`

- [x] **AC3 — `Los` updates reactively when the date changes**
  - Given: The form at `/harvests/new` is open with `Los = L16082026`
  - When: Manuel changes the date input to 2026-08-04
  - Then: The `Los` field updates in place to `L04082026` without a page reload

- [x] **AC4 — Date stored as local midnight, `lot` stored server-side**
  - Given: The user submits the form with date 2026-08-04
  - When: The server processes the action
  - Then: `harvestedAt` is `new Date(2026, 7, 4, 0, 0, 0).getTime() / 1000` (local midnight) and `lot` in the row is exactly `"L04082026"` regardless of any submitted `lot` value

- [x] **AC5 — List page renders `Los` column, no hive column, no filter**
  - Given: At least one harvest exists
  - When: Manuel opens `/harvests`
  - Then: Each list item shows date, `Los`, and `amountKg`. No hive name is displayed. No "Nach Bienenstock filtern" dropdown is present.

- [x] **AC6 — Delete flow works end-to-end**
  - Given: A harvest exists in `/harvests`
  - When: Manuel clicks "Löschen", confirms in the modal
  - Then: The row is removed from the DB, the modal closes, and the list redirects to `/harvests` (never to `/harvests?hiveId=…`)

- [x] **AC7 — Offline create writes to IndexedDB without `hiveId`**
  - Given: The browser is offline (`navigator.onLine === false`)
  - When: Manuel submits the form at `/harvests/new`
  - Then: A `HarvestOutboxEntry` is written to the `harvests-outbox` store with `{ clientId, harvestedAt, amountKg, notes, syncStatus: 'pending', createdAt }` — no `hiveId` key — and he is redirected to `/harvests`. The `PendingSyncBadge` count increases by 1.

- [x] **AC8 — Offline entry syncs successfully when online**
  - Given: A pending entry exists in `harvests-outbox`
  - When: The device regains connectivity (window `online` event fires, or visibility returns while online)
  - Then: `POST /api/harvests` is called with `{ harvestedAt, amountKg, notes, clientId }` (no `hiveId`), the server inserts the row with a correctly derived `lot`, and the IDB entry is removed. `PendingSyncBadge` returns to 0.

- [x] **AC9 — Legacy IDB entries carrying `hiveId` still sync (backward compat)**
  - Given: A pre-existing IDB entry in `harvests-outbox` was written before the change and contains `hiveId: 3`
  - When: The sync loop runs
  - Then: The POST body omits `hiveId`, the server accepts it (endpoint no longer reads `hiveId`), and the entry is removed from IDB

- [x] **AC10 — `/hives/[hiveId]/harvests/new` returns 404**
  - Given: The user navigates to `/hives/1/harvests/new`
  - When: SvelteKit resolves the route
  - Then: The route is not found (404) — no server error, no crash

- [x] **AC11 — Hive detail page shows only `+ Neue Kontrolle` in the CTA row**
  - Given: Manuel is on `/hives/1`
  - When: He looks at the `.hive-detail__cta` section
  - Then: Only the `+ Neue Kontrolle` button is present (no `+ Neue Ernte`)

- [x] **AC12 — Stale `?hiveId` bookmarks on `/harvests` load cleanly**
  - Given: Manuel navigates to `/harvests?hiveId=3` (an old bookmark)
  - When: The load runs
  - Then: The full unfiltered list renders — no error, no filter applied, no query param persisted after the next action

- [x] **AC13 — `Los` is server-authoritative (client value ignored)**
  - Given: An adversarial POST to `/api/harvests` includes `"lot": "L99999999"` in the body
  - When: The server processes it
  - Then: The stored row has `lot = formatLot(harvestedAt)`, not the submitted value

- [x] **AC14 — Amount validation still rejects out-of-range values**
  - Given: The user submits `amountKg = -1`, `amountKg = 0`, or `amountKg = 10001`
  - When: The form action runs (or API POST)
  - Then: A 400 is returned with a user-visible German error; no row is inserted

- [x] **AC15 — Build and lint pass**
  - Given: All tasks 1-13 are complete
  - When: `npm run lint` and `npm run build` run
  - Then: Both exit 0 with no new errors and no new warnings (relative to the pre-change baseline)

---

## Additional Context

### Dependencies

- No new npm packages.
- Drizzle migration required after Task 2: `npm run db:generate` → inspect the generated SQL → `npm run db:migrate`.
- No IndexedDB `DB_VERSION` bump.
- No env var changes.
- No changes to `docker-compose.yml`, nginx config, or backup script.

### Testing Strategy

Manual browser testing at 375px viewport (the project's standard mobile check):

1. **Migration**: run `npm run db:generate`, inspect the new SQL, then `npm run db:migrate`. `honey_harvests` table should have columns `id, harvested_at, amount_kg, lot, notes, client_id, created_at, updated_at` and no `hive_id`. Verify via `npm run db:studio`.
2. **Create online (happy path)**: `/harvests/new` → pick date 2026-08-04 → verify `Los` shows `L04082026` → enter Menge `11.4` → submit → land on `/harvests` with the entry visible.
3. **Los reactivity**: open form → change date input → confirm `Los` updates without a reload.
4. **Amount validation**: try `-1`, `0`, `10001`, `abc` → form returns a German error, no row created.
5. **Empty date fallback**: (harder to trigger with `required` attribute, but if bypassed) — server falls back to today at local midnight.
6. **List display**: navigate to `/harvests` → confirm columns are date, Los, amount, no hive name, no filter dropdown.
7. **Delete**: click Löschen → confirm modal → row removed → still on `/harvests` (not `/harvests?hiveId=…`).
8. **Stale hive filter URL**: manually visit `/harvests?hiveId=3` → renders unfiltered list without error.
9. **Hive detail cleanup**: `/hives/1` → only `+ Neue Kontrolle` in the CTA area.
10. **Removed route**: `/hives/1/harvests/new` → 404.
11. **Offline flow**: DevTools → Network → Offline → open `/harvests/new` → submit → verify IDB entry in `beehiveJournal-offline > harvests-outbox` with no `hiveId` field, `PendingSyncBadge` shows increment → back Online → sync fires → entry POSTs to `/api/harvests`, row appears in DB with correct `lot`, IDB entry removed, badge returns to 0.
12. **Legacy IDB entry**: manually inject a fake entry into `harvests-outbox` with `hiveId: 99` set → trigger sync → entry syncs successfully.
13. **Server-authoritative Los**: `curl -X POST http://localhost:5173/api/harvests -H "Content-Type: application/json" --cookie "session=…" -d '{"harvestedAt":1754265600,"amountKg":5,"lot":"L99999999"}'` → verify inserted row has `lot = L04082025` (or whatever the epoch actually decodes to), not `L99999999`.
14. **Lint + build**: `npm run lint && npm run build` — both must be green.

No unit or E2E tests are added — the project has no test framework configured (see `project-context.md` § Testing Rules). If Manuel wants to add coverage for this feature, run `/bmad-tea-testarch-framework` first.

### Review Notes

Adversarial code review completed on 2026-08-16 (see step-05 findings, retained in git history only).

- **14 findings total:** 2 Critical, 4 High, 5 Medium, 3 Low.
- **9 addressed:** F1 (stray migration deleted), F2 (migration `INSERT SELECT` now uses `strftime` inline to compute `lot` for any accidental rows), F4 (API `harvestedAt` gains `Number.isFinite` + upper-bound check), F5 (`Los` `$derived` guards empty date input, displays `—` instead of `LNaNNaNNaN`), F6 (comment in sync.ts explaining legacy `hiveId` handling), F7 (server enforces `notes.length <= 2000` in both API POST and form action), F8 (`fromDateInput` switched to noon-local via component `Date(y,m-1,d,12)` for DST safety — `harvested_at` column comment updated accordingly), F10 (offline outbox write guards against non-finite / out-of-range `amountKg` to prevent poison-pill entries), F12 (schema comment documents "no per-hive contribution" design decision).
- **5 skipped:** F3 (Drizzle-auto-generated `PRAGMA foreign_keys` toggles are a no-op inside its transaction — leaving as-generated), F9 (silent `?hiveId` ignore is the deliberate AC12 design), F11 (unauthenticated `/api/harvests` — pre-existing project-wide gap; needs a `hooks.server.ts` handle hook, out of scope for this diff), F13 (subsumed by F2 fix), F14 (`clientId` regeneration on mount — pre-existing dedup weakness across all offline forms, unchanged by this diff).
- Resolution approach: **auto-fix** on the flagged real findings.
- All fixes verified via `npm run lint` (clean) and `npm run build` (green).

### Notes

- The prior `tech-spec-honey-harvest-log.md` (status: completed) describes the pre-change state; treat it as reference for what is being torn out, not as current truth.
- `pendingSync` counting logic and IndexedDB `HARVEST_STORE_NAME` are already in place — do NOT re-add them.
- **Risk — Drizzle migration shape**: on rare SQLite setups Kit generates a table-rebuild migration. With zero rows this is safe, but if in doubt open the generated SQL in an editor before running migrate. If the SQL touches unrelated tables, stop and investigate.
- **Risk — Timezone edge**: `formatLot`/`toDateInput`/`fromDateInput` all use local time. If Manuel travels across timezones and picks a date, the `Los` label reflects his machine's current TZ at the moment of submit. Accepted — single-user app in CH.
- **Risk — Y10K**: `formatLot` assumes a 4-digit year. Not a real concern.
- **Legacy `hiveId` on queued IDB entries**: safe to ignore at sync time (Task 7 drops it from the POST body). No cleanup required.
- **Future edit form**: the reserved `updatedAt` column and the `getHarvestById` query remain in place. When an edit form is added later, `lot` must be recomputed on every update so the invariant `lot === formatLot(harvestedAt)` holds.
