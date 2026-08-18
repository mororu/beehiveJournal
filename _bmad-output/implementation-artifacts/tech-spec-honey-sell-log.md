---
title: 'Honey Sell Log with Container Sizes'
slug: 'honey-sell-log'
created: '2026-08-17'
updated: '2026-08-17'
status: 'completed'
stepsCompleted: [1, 2, 3, 4, 5, 6]
review_rounds: 2
tech_stack:
  - 'SvelteKit 2.50.2'
  - 'Svelte 5.51 (Runes mode)'
  - 'TypeScript 5.9 (strict)'
  - 'Drizzle ORM 0.45.1'
  - 'better-sqlite3 12.6.2 (synchronous)'
  - '@sveltejs/adapter-node 5.5.4'
files_to_modify:
  - 'src/lib/server/db/schema.ts'
  - 'src/routes/+layout.svelte'
  - 'src/lib/server/db/migrations/0010_*.sql (generated)'
  - 'src/lib/server/db/migrations/meta/_journal.json (generated)'
  - 'src/lib/server/db/migrations/meta/0010_snapshot.json (generated)'
  - 'src/lib/server/db/queries/containerSizes.ts (new)'
  - 'src/lib/server/db/queries/honeySales.ts (new)'
  - 'src/lib/server/db/queries/honeyHarvests.ts (extend)'
  - 'src/routes/honey/+page.svelte (new landing)'
  - 'src/routes/honey/+page.server.ts (new)'
  - 'src/routes/honey/containers/+page.svelte (new list)'
  - 'src/routes/honey/containers/+page.server.ts (new)'
  - 'src/routes/honey/containers/new/+page.svelte (new)'
  - 'src/routes/honey/containers/new/+page.server.ts (new)'
  - 'src/routes/honey/containers/[containerId]/edit/+page.svelte (new)'
  - 'src/routes/honey/containers/[containerId]/edit/+page.server.ts (new)'
  - 'src/routes/sells/+page.svelte (new list)'
  - 'src/routes/sells/+page.server.ts (new)'
  - 'src/routes/sells/new/+page.svelte (new)'
  - 'src/routes/sells/new/+page.server.ts (new)'
  - 'src/routes/sells/[sellId]/edit/+page.svelte (new)'
  - 'src/routes/sells/[sellId]/edit/+page.server.ts (new)'
files_to_verify_no_change:
  - 'src/lib/client/offline/*.ts (should not reference /harvests as a post-sync redirect target)'
  - 'vite.config.ts (PWA precache should not hardcode /harvests as start_url)'
  - 'src/routes/harvests/+page.server.ts (stays on raw getHarvestEntries — no auto-migration to remaining-kg helper)'
code_patterns:
  - 'form-action + use:enhance + fail(400, {...}) for validation'
  - 'Drizzle queries co-located in $lib/server/db/queries/<entity>.ts (never in routes)'
  - '$inferSelect / $inferInsert + satisfies NewX on insert values'
  - 'Unix epoch seconds for all timestamps (Math.floor(Date.now()/1000))'
  - 'ESM imports with .js extension for local .ts files'
  - 'Svelte 5 Runes: $props / $state / $derived / $effect'
  - 'Native <dialog> + POST action for delete confirmations'
  - 'CSS custom properties (--color-accent etc.); no hardcoded hex'
  - '48px min-height inputs/buttons; content max-width 480/600px'
  - 'invalidateAll() from $app/navigation after list-affecting mutations'
test_patterns:
  - 'No test framework configured — manual browser testing at 375px mobile viewport'
  - 'npm run build and npm run lint are the only automated gates'
---

# Tech-Spec: Honey Sell Log with Container Sizes

**Created:** 2026-08-17
**Last updated:** 2026-08-17 (after 2 rounds of adversarial review — 35 findings folded in)

## Review Notes

- Adversarial review completed on 2026-08-17.
- Findings: 15 total, 5 fixed (F4, F5, F7, F13, F14), 10 acknowledged/skipped.
  - F2 (invalidateAll ordering): current implementation matches spec Task 12/13 verbatim; not fixed.
  - F1, F3, F6, F8, F9, F10, F11, F12, F15: low-severity or notes-only, not fixed.
- Resolution approach: auto-fix real findings only.
- Quality gates: `npm run build` ✅, `npm run lint` ✅, `npm run check` — 0 errors, 44 warnings (all pre-existing `state_referenced_locally` pattern shared with `stings/new/+page.svelte`).

## Overview

### Problem Statement

Manuel currently only tracks honey harvests. He needs to log sales — who bought what, in which container, for what price (or as a gift) — so he has a lightweight book of sales and can see how much of each lot is still unsold.

### Solution

Add a `/sells` route (list + create + edit + delete) for recording honey sales, a `/honey` landing page grouping harvests and sales, and a `/honey/containers` CRUD page for editable container sizes. Each sale references a harvest lot + a container size + a count, so total kg is derived; the lot dropdown shows remaining kg per lot as inventory context (warn but do not block over-selling).

### Scope

**In Scope:**

- Nav change: replace "Ernten" link with "Honig" pointing to `/honey` (desktop `.nav-links` and mobile `.mobile-menu`, preserving position between "Aufgaben" and "Tagebuch").
- `/honey` landing page with three tiles → Ernten (`/harvests`), Verkäufe (`/sells`), Behältergrößen (`/honey/containers`).
- `/sells` — list, create, edit, delete.
- `/honey/containers` — list, create, edit, delete.
- Sell entry fields: Los (dropdown w/ remaining kg), Verkaufsdatum, Anzahl (Stück), Behältergröße (dropdown), Kundenname, Preis (CHF), Geschenk (checkbox — disables & clears Preis when checked), Notizen.
- New DB tables: `container_sizes`, `honey_sales` + Drizzle migration.
- Empty-state guidance on sell form when no container sizes exist → link to `/honey/containers/new`.
- Los dropdown label format: `Lxxxx — 11.4 kg (5.2 kg übrig)`; soft warn on over-sell, don't block.
- FK strategy: `honey_sales.container_size_id` → `container_sizes.id` **ON DELETE RESTRICT**; `honey_sales.harvest_id` → `honey_harvests.id` **ON DELETE RESTRICT** (protect audit trail).
- `invalidateAll()` after successful sell/delete so lot-remaining is refreshed for the current tab.
- `--color-success-bg` (`#ecfdf5`) and `--color-success-fg` (`#065f46`) added as CSS custom properties for the "Geschenk" chip; no new hex hardcoded in component styles.

**Out of Scope:**

- Offline sync for sales & container sizes (online-only for v1).
- Photos, invoices, printable receipts.
- Customer entity / customer table (Kundenname is a free text field).
- Payment status tracking (paid/unpaid).
- Multi-currency, tax handling.
- Aggregation/reporting views (revenue totals, top customers).
- Editing existing harvest lot data.
- Seed data for container sizes (empty on first run).

## Context for Development

### Codebase Patterns

**Route architecture:**

- One `+page.server.ts` per route with `load` and `actions`. Form actions **only** in `+page.server.ts`; JSON handlers **only** in `+server.ts`. Never mix.
- All Drizzle calls live in `src/lib/server/db/queries/<entity>.ts` — the single most important architecture rule (`project-context.md`). Routes call the query helpers, never `db.select(...)` directly.
- Auth guard is centralised in `src/routes/+layout.server.ts` and covers everything except `/login`, `/login/*`, `/logout`. New routes under `/honey/**` and `/sells/**` are auto-guarded — **no auth-guard edits needed.**
- `error(status, 'msg')` and `redirect(302, ...)` from `@sveltejs/kit` inside actions/loads; `fail(400, { error, ...preservedFormValues })` for validation feedback.

**DB layer:**

- `better-sqlite3` is **synchronous** — query helper functions return values directly, never Promises. Never wrap them in `async`.
- Schema types are the single source of truth: `type X = typeof xTable.$inferSelect`, `type NewX = typeof xTable.$inferInsert`. Use `satisfies NewX` on insert `.values({...})`.
- Migrations: modify `schema.ts` → `npm run db:generate` (adds new `0010_*.sql` + `meta/0010_snapshot.json` + updates `meta/_journal.json`) → `npm run db:migrate`. Never hand-edit migration files.
- `migrate()` is auto-called on app startup in `db/index.ts`.
- All timestamps are Unix epoch **seconds** — `Math.floor(Date.now() / 1000)`. Storing milliseconds is a silent bug.

**UI/UX conventions:**

- German UI throughout (labels, buttons, empty states, page titles). `<html lang="de">`.
- CSS custom properties: `--color-accent (#f59e0b)`, `--color-accent-hover (#d97706)`, `--color-text (#1a1a1a)`, `--color-text-muted (#6b7280)`, `--color-border (#e5e7eb)`, `--color-surface (#ffffff)`, `--color-hover (#f3f4f6)`, `--color-bg (#f3f4f6)`. Never hardcode hex in component `<style>` blocks.
- New: `--color-success-bg (#ecfdf5)`, `--color-success-fg (#065f46)` — added for the Geschenk chip. Define once at the root (mirror how the existing palette is declared — `src/app.html` `<style>` block or `src/app.css` if present).
- Buttons/inputs 48px height (`min-height: 44px` for accessibility). List pages `max-width: 600px`, form pages `max-width: 480px`, both `margin: 0 auto`.
- Delete confirmation: native `<dialog>` opened via state, submits POST to a form action. **The delete form MUST use `use:enhance`** so `fail(...)` responses re-render the parent page with `form?.error` (without `use:enhance`, SvelteKit navigates as a full-page fail and dialog state is lost).
- Svelte 5 Runes only: `$props()`, `$state()`, `$derived()`, `$effect()`. Never `export let`, `$:`, or `writable()`.
- `use:enhance` on every `<form method="POST">`; standard pattern:
  ```svelte
  use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => { await update(); isSubmitting = false; };
  }}
  ```
- After list-affecting mutations (sale created/deleted, container edited), call `invalidateAll()` from `$app/navigation` in the enhance callback so the client's `data` reflects fresh inventory state.
- Language rule: import local TS files with `.js` extension (`import { db } from '../index.js'`) — required by `moduleResolution: bundler` + Node ESM.

**Existing lot/harvest conventions:**

- `formatLot(epoch)` → `L${dd}${mm}${yyyy}` (e.g. `L18082026`). Stored on `honey_harvests.lot`.
- `fromDateInput('YYYY-MM-DD')` → epoch seconds at local noon (DST-safe). Used for the harvest-date input, and we will reuse it for the selling date.
- Harvest amount is stored in kg (`real`) — no per-unit tracking.

### Files to Reference

| File                                                          | Purpose                                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `_bmad-output/project-context.md`                             | Comprehensive rulebook — read first before implementation                                    |
| `src/lib/server/db/schema.ts`                                 | Add `containerSizes`, `honeySales` tables + inferred types                                   |
| `src/lib/server/db/index.ts`                                  | Confirm `data/` dir bootstrap; check `foreign_keys = ON` + WAL mode set before `migrate()`   |
| `src/lib/server/db/queries/honeyHarvests.ts`                  | Reference query module; extend with `getHarvestEntriesWithRemaining()` helper                |
| `src/lib/server/db/queries/diary.ts`                          | Reference for full CRUD query module (create/read/update/delete)                             |
| `src/routes/harvests/+page.server.ts`                         | Reference for list + delete action pattern (`delete` named action)                           |
| `src/routes/harvests/+page.svelte`                            | Reference for list + delete dialog styling; **stays on raw `getHarvestEntries()`** (see TD)  |
| `src/routes/harvests/new/+page.server.ts`                     | Reference for validation & `fromDateInput`/`formatLot` usage                                 |
| `src/routes/harvests/new/+page.svelte`                        | Reference for create-form field styling                                                     |
| `src/routes/diary/+page.server.ts`                            | Reference for full CRUD server (create, edit, delete named actions)                          |
| `src/routes/diary/[entryId]/edit/+page.svelte`                | Reference for edit-form pattern (prefill from `data.entry`, `form?.field` for error retention) |
| `src/routes/diary/[entryId]/edit/+page.server.ts`             | Reference for edit action, including `fail(400, { ... })` shape                              |
| `src/routes/+layout.svelte`                                   | Nav change: replace `/harvests` link with `/honey` (desktop and mobile)                      |
| `src/routes/+layout.server.ts`                                | Confirm no auth-guard changes needed for new authed routes                                   |
| `src/lib/client/utils/date.ts`                                | `formatDate`, `fromDateInput`, `toDateInput`, `formatLot`                                    |
| `src/lib/client/offline/*.ts`                                 | Verify no post-sync redirect targets `/harvests` as an assumed permanent URL                 |
| `vite.config.ts`                                              | Verify PWA precache/start_url does not hardcode `/harvests`                                  |

### Technical Decisions

- **URL structure:** `/harvests` stays where it is (no redirects, no route move). Only the top-level nav label changes ("Ernten" → "Honig"). `/honey` is a new landing page. `/sells` and `/honey/containers` are new. This avoids touching existing harvest URLs, PWA cache keys, and bookmarks.
- **`/harvests` list stays on raw `getHarvestEntries()`** — no automatic migration to `getHarvestEntriesWithRemaining()`. The two views intentionally answer different questions: `/harvests` = "what did I harvest", `/sells/new` lot dropdown = "how much is left to sell". Adding a "remaining kg" column on `/harvests` is a future consideration.
- **Amount semantics:** the sell form stores `amount` (integer count of containers). Total kg is derived at read time as `amount × container.sizeG / 1000`. We do **not** store the derived kg on the sale row.
- **Inventory calculation:** remaining kg per lot = `harvest.amountKg - Σ(sales.amount × container.sizeG / 1000 for sales with harvestId = harvest.id)`. Implemented as a single Drizzle query using a **correlated subquery** for `sold_g` (avoids GROUP BY on every harvest column and eliminates row-multiplication risk when a lot has ≥2 sales):

  ```ts
  // Pseudocode — actual code uses Drizzle sql`...` template
  SELECT
    honey_harvests.*,
    COALESCE(
      (SELECT SUM(honey_sales.amount * COALESCE(container_sizes.size_g, 0))
       FROM honey_sales
       LEFT JOIN container_sizes ON container_sizes.id = honey_sales.container_size_id
       WHERE honey_sales.harvest_id = honey_harvests.id),
      0
    ) AS sold_g
  FROM honey_harvests
  ORDER BY honey_harvests.harvested_at DESC
  ```

  Convert `sold_g` to kg in the query helper. Warn (inline hint) on over-sell but do not block server-side.
- **Container FK strategy:** `honey_sales.container_size_id` uses `ON DELETE RESTRICT`. Same for `honey_sales.harvest_id`. Drizzle syntax: `.references(() => containerSizes.id, { onDelete: 'restrict' })`. **Detection:** catch and match `err.name === 'SqliteError' && typeof err.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')` — the specific `SQLITE_CONSTRAINT_FOREIGNKEY` subcode is not always exposed depending on better-sqlite3 build flags.
- **Gift semantics + server ordering:** if `is_gift = true`, `price_chf` is stored as `NULL`. Client disables + clears the price input when the checkbox is checked. **Server MUST parse `isGift` FIRST**; if true, set `priceChf = null` and skip price parsing entirely. Never validate price when gift is set — a disabled input isn't submitted, so `priceChfRaw` will be empty and would spuriously fail a `> 0` check.
- **Price semantic:** allow `priceChf >= 0` when `!isGift`. A price of `0` represents a paid-for-free sample (e.g. shop tasting) — distinct from `isGift = true` (formal gift). Negative prices are rejected.
- **Price precision:** stored as `real`. Server-side `Math.round(priceChf * 100) / 100` normalises to 2 dp to avoid float display drift.
- **German-locale decimals:** the Preis input uses `<input type="text" inputmode="decimal" pattern="[0-9]+([.,][0-9]+)?">` — not `type="number"` — so German browsers submit the literal string (e.g. `1,50`) instead of a locale-parsed number that `parseFloat` misreads. Server normalises `,` → `.` before `parseFloat`.
- **Currency:** price stored as `real` (CHF), displayed as `Preis (CHF)`. No currency column.
- **Container size storage:** `size_g` (integer grams). Name is a free-text label (e.g. "500g Glas"). Display formatting done at read time.
- **Container size range:** `1 ≤ sizeG ≤ 5000` grams (hobbyist-realistic). Enforced client-side (input min/max) and server-side.
- **Sold-at date range:** client `<input type="date" max={today}>`. Server accepts dates `>= 2000-01-01` and `<= now + 24h` (24h buffer covers browser/server clock skew). Outside → `fail(400)`.
- **No `clientId` / offline outbox** on the new tables — online-only per scope. Documented trade-off: sales cannot dedupe replays and cannot be recorded when offline. Aligned with the `diary_entries` precedent, deliberately diverging from the harvest/inspection/sting pattern to keep v1 shippable.
- **Migration numbering:** the next migration file will be numbered by Drizzle after inspecting `meta/_journal.json`. There is currently an unapplied `0009` pending in the working tree — run `db:migrate` first so `0010` is the correct next slot before running `db:generate`.
- **PK / ROWID reuse note:** `.primaryKey({ autoIncrement: true })` compiles to `INTEGER PRIMARY KEY AUTOINCREMENT`, which prevents ROWID reuse at the SQLite level. Still: any client code holding a stale `container_size_id` (e.g. from a URL param captured before a delete-then-recreate cycle in another session) would misbind. **Rule:** never persist `container_size_id` or `harvest_id` in URL/localStorage; always read from server-loaded `data` on the current page.
- **Selling date:** stored as Unix epoch seconds at local noon (same anchor as `harvestedAt`, `entryDate`). Form uses `<input type="date">` + `fromDateInput`/`toDateInput`.
- **Server timezone assumption:** production Docker container runs `TZ=Europe/Zurich`. `fromDateInput('YYYY-MM-DD')` uses component-based `new Date(y, m-1, d, 12, 0, 0)` which is timezone-sensitive; a mismatched server TZ would shift stored dates by up to a day. **Verification step included in Task 15.** Existing harvest/diary code has the same assumption.

## Implementation Plan

### Tasks

**Ordered by dependency (foundational → user-facing).**

- [x] **Task 1: Extend the DB schema with `containerSizes` and `honeySales` tables.**
  - File: `src/lib/server/db/schema.ts`
  - Action: Add two new table definitions, exported types, and FK constraints. Place after `honeyHarvests` and before `diaryEntries`.
  - Details:
    - `containerSizes`: `id` (autoincrement PK), `name` text notNull (max 60 chars enforced at app layer, e.g. "500g Glas"), `sizeG` integer notNull (grams, `1..5000`), `createdAt` integer notNull (epoch s), `updatedAt` integer notNull.
    - `honeySales`: `id` (autoincrement PK), `harvestId` integer notNull references `honeyHarvests.id` with `{ onDelete: 'restrict' }`, `containerSizeId` integer notNull references `containerSizes.id` with `{ onDelete: 'restrict' }`, `soldAt` integer notNull (epoch s at local noon), `amount` integer notNull (count of containers, `1..10000`), `customerName` text notNull (max 200 chars, app-layer), `priceChf` real (nullable — null when `isGift = true`; else `≥ 0`), `isGift` integer boolean notNull default false, `notes` text (nullable, max 2000 chars app-layer), `createdAt` integer notNull, `updatedAt` integer notNull.
    - Export inferred types: `ContainerSize`, `NewContainerSize`, `HoneySale`, `NewHoneySale`.
  - Notes: No `clientId` (online-only). No unique constraints beyond PKs.

- [x] **Task 2: Generate and apply the Drizzle migration.**
  - Files: `src/lib/server/db/migrations/0010_*.sql` (auto), `src/lib/server/db/migrations/meta/0010_snapshot.json` (auto), `src/lib/server/db/migrations/meta/_journal.json` (auto-updated).
  - Action:
    1. First confirm any pending prior migrations are applied: `npm run db:migrate`.
    2. Then `npm run db:generate` (should produce `0010_*.sql`).
    3. Then `npm run db:migrate` again to apply the new one.
  - Preconditions: the directory for `DATABASE_PATH` must exist. `new Database(path)` in better-sqlite3 does **not** auto-mkdir. On a fresh clone: `mkdir -p data && touch data/.gitkeep` before running migrate.
  - Notes: Do not hand-edit generated files. Verify the generated SQL contains `FOREIGN KEY (...) REFERENCES ... ON DELETE RESTRICT` for both FKs.

- [x] **Task 3: Create `containerSizes` query module.**
  - File: `src/lib/server/db/queries/containerSizes.ts` (new)
  - Action: Export five functions:
    - `getContainerSizes(): ContainerSize[]` — order by `sizeG` ASC, then `name` ASC (deterministic tiebreak).
    - `getContainerSizeById(id: number): ContainerSize | null`.
    - `createContainerSize(data: { name: string; sizeG: number }): ContainerSize` — set `createdAt`/`updatedAt` inside the helper.
    - `updateContainerSize(id: number, data: { name: string; sizeG: number }): ContainerSize | null` — update `updatedAt` inside the helper.
    - `deleteContainerSize(id: number): { ok: true } | { ok: false; reason: 'referenced' }` — wrap `db.delete(...)` in try/catch; on `err.name === 'SqliteError' && typeof err.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')` return `{ ok: false, reason: 'referenced' }`. Rethrow any other error.
  - Notes: Use `satisfies NewContainerSize` on inserts. Follow the exact shape of `diary.ts`.

- [x] **Task 4: Create `honeySales` query module with joined-read helpers.**
  - File: `src/lib/server/db/queries/honeySales.ts` (new)
  - Action: Export:
    - Type `HoneySaleView = HoneySale & { lot: string; harvestedAt: number; containerName: string; containerSizeG: number }` — **flat shape** so consumers read `view.soldAt` (not `view.sale.soldAt`); mirrors the flat access pattern in `diary/[entryId]/edit`.
    - `getHoneySales(): HoneySaleView[]` — `innerJoin` `honeyHarvests` and `containerSizes` (both FKs are notNull; leftJoin is misleading here and leaks nullable types). Order by `soldAt` DESC.
    - `getHoneySaleById(id: number): HoneySaleView | null`.
    - `createHoneySale(data: { harvestId; containerSizeId; soldAt; amount; customerName; isGift; priceChf; notes }): HoneySale` — signature is **non-partial**. Server enforces `priceChf = data.isGift ? null : Math.round(data.priceChf * 100) / 100` inside the helper. Returns the inserted row.
    - `updateHoneySale(id: number, data: { harvestId; containerSizeId; soldAt; amount; customerName; isGift; priceChf; notes }): HoneySale | null` — **non-partial signature** to prevent the "toggle isGift without clearing priceChf" bug. Helper applies the same `priceChf` invariant. Updates `updatedAt`.
    - `deleteHoneySale(id: number): boolean`.
  - Notes: Enforcing the gift invariant inside the helper (not the route) means every caller is safe. Store `priceChf` rounded to 2 dp.

- [x] **Task 5: Extend the harvest queries with a "with remaining" helper.**
  - File: `src/lib/server/db/queries/honeyHarvests.ts`
  - Action: Add a new export:
    ```ts
    export type HarvestWithRemaining = HoneyHarvest & { soldKg: number; remainingKg: number };
    export function getHarvestEntriesWithRemaining(): HarvestWithRemaining[]
    ```
    Implementation: single query using a **correlated subquery** for `sold_g` (see the "Inventory calculation" bullet in Technical Decisions above for the SQL shape). Do **not** use `LEFT JOIN + GROUP BY` on harvest columns — it row-multiplies when a lot has ≥2 sales unless every selected column appears in the GROUP BY (fragile). Convert `sold_g` to kg in JS: `soldKg = sold_g / 1000; remainingKg = amountKg - soldKg;`.
  - Notes: Do **not** modify existing `getHarvestEntries()` — the new helper is additive. `/harvests` list continues using `getHarvestEntries()` (see Technical Decisions).

- [x] **Task 6: Update the nav — replace "Ernten" with "Honig" → `/honey`.**
  - File: `src/routes/+layout.svelte`
  - Action: In both `.nav-links` (desktop) and `.mobile-menu` (mobile), change:
    - `<a href="/harvests" class="nav-link">Ernten</a>` → `<a href="/honey" class="nav-link">Honig</a>`.
    - `<a href="/harvests" class="mobile-nav-link" ...>Ernten</a>` → `<a href="/honey" class="mobile-nav-link" ...>Honig</a>`.
  - Verification (part of this task):
    - `grep -r "/harvests" src/lib/client/offline vite.config.ts` — confirm no hardcoded post-sync redirect or PWA start_url points at `/harvests`. If any hit exists, evaluate whether it must move to `/honey`.
  - Notes: Do not add a separate `/sells` top-level link; access is via `/honey`. "Honig" replaces "Ernten" in-place (currently between "Aufgaben" and "Tagebuch").

- [x] **Task 7: Create the `/honey` landing page with three tiles.**
  - Files: `src/routes/honey/+page.server.ts` (new), `src/routes/honey/+page.svelte` (new)
  - Action:
    - `+page.server.ts`: no `load` needed; export nothing (or an empty `load`). Auth guard handled by root layout.
    - `+page.svelte`: `<h1>Honig</h1>` and three tile links: "Ernten" → `/harvests`, "Verkäufe" → `/sells`, "Behältergrößen" → `/honey/containers`. Each tile is a large tappable card (min 96px height) with title + short description ("Erfasste Ernten", "Verkaufsprotokoll", "Behältertypen verwalten").
    - CSS: `display: grid; grid-template-columns: 1fr;` on mobile; `@media (min-width: 641px) { grid-template-columns: repeat(3, 1fr); }`. Tile titles use `overflow-wrap: anywhere` so "Behältergrößen" wraps cleanly on narrow viewports.
  - Notes: Reuse the amber/border palette (CSS custom props). `<svelte:head><title>Honig — beehiveJournal</title></svelte:head>`.

- [x] **Task 8: Create the container sizes list + delete page.**
  - Files: `src/routes/honey/containers/+page.server.ts` (new), `src/routes/honey/containers/+page.svelte` (new)
  - Action:
    - `+page.server.ts`: `load` returns `{ sizes: getContainerSizes() }`. Named action `delete` reads `containerId`, validates numeric, calls `deleteContainerSize(id)`. If result is `{ ok: false, reason: 'referenced' }`, return `fail(409, { error: 'Behältergröße wird von Verkäufen verwendet und kann nicht gelöscht werden.' })`. On success, `redirect(302, '/honey/containers')`.
    - `+page.svelte`: Header "Behältergrößen" + "+ Neue Größe" link to `/honey/containers/new`. If empty, show empty-state card with "Noch keine Behältergrößen." + link to add. Otherwise list each row: name + `sizeG`-formatted (e.g. "500 g"), with a "Bearbeiten" link and a "Löschen" button that opens the confirmation dialog (mirror the harvest dialog).
    - **Delete form uses `use:enhance`** — pattern:
      ```svelte
      use:enhance={() => {
        isDeleting = true;
        return async ({ result, update }) => {
          await update();
          isDeleting = false;
          deleteDialogOpen = false;
          if (result.type === 'failure') {
            errorBanner = String(result.data?.error ?? 'Löschen fehlgeschlagen');
            await tick();
            document.getElementById('delete-error-banner')?.focus();
          }
        };
      }}
      ```
    - Render `{#if errorBanner}` → `<div id="delete-error-banner" role="alert" tabindex="-1" class="form-error">{errorBanner}</div>` at the top of the page.
  - Notes: Back link "← Honig" to `/honey`.

- [x] **Task 9: Create the container size create page.**
  - Files: `src/routes/honey/containers/new/+page.server.ts` (new), `src/routes/honey/containers/new/+page.svelte` (new)
  - Action:
    - `+page.server.ts`: default action reads `name` (trim, required, max 60 chars) and `sizeG` (parseInt, required, `1 ≤ sizeG ≤ 5000`). On invalid, `fail(400, { error, name, sizeGRaw })`. On success, `createContainerSize({ name, sizeG })` then `redirect(302, '/honey/containers')`.
    - `+page.svelte`: Form with two fields — "Name" (`<input type="text" maxlength="60" required>`, placeholder "z.B. 500g Glas") and "Größe (g)" (`<input type="number" min="1" max="5000" step="1" required>`). Back link "← Behältergrößen" to `/honey/containers`. Use the standard form styling from `harvests/new/+page.svelte`.
  - Notes: Preserve prior values on validation error via `form?.name` / `form?.sizeGRaw`.

- [x] **Task 10: Create the container size edit page.**
  - Files: `src/routes/honey/containers/[containerId]/edit/+page.server.ts` (new), `src/routes/honey/containers/[containerId]/edit/+page.svelte` (new)
  - Action:
    - `+page.server.ts`: `load` parses `params.containerId`, calls `getContainerSizeById(id)`, `error(404)` if missing, returns `{ container }`. Default action re-validates like Task 9 and calls `updateContainerSize(id, ...)`, redirect to `/honey/containers`.
    - `+page.svelte`: Prefill with `form?.name ?? data.container.name` and `form?.sizeGRaw ?? String(data.container.sizeG)`. Back link "← Behältergrößen". Submit label "Änderungen speichern".
  - Notes: Follow the diary edit pattern for prefill + error preservation.

- [x] **Task 11: Create the sells list + delete page.**
  - Files: `src/routes/sells/+page.server.ts` (new), `src/routes/sells/+page.svelte` (new)
  - Action:
    - `+page.server.ts`: `load` returns `{ sales: getHoneySales() }`. Named action `delete` reads `sellId`, validates numeric, `deleteHoneySale(id)`, redirect to `/sells`.
    - `+page.svelte`: Header "Verkäufe" + "+ Neuer Verkauf" link to `/sells/new`. Empty state: "Noch keine Verkäufe erfasst." Otherwise render list of cards, each showing:
      - Top row: `formatDate(sale.soldAt)` + lot label (e.g. `L18082026`).
      - Main: `{amount} × {containerName}` (e.g. "12 × 500g Glas"), Kundenname (semibold), Preis as `{priceChf.toFixed(2)} CHF` or a green "Geschenk" chip if `isGift`.
      - Optional 2-line clamped notes.
      - "Bearbeiten" link to `/sells/[id]/edit` and "Löschen" button triggering the dialog.
    - Geschenk chip CSS uses `--color-success-bg` / `--color-success-fg` (defined at the root as part of this task if not already present).
    - Delete form uses `use:enhance` and calls `await invalidateAll()` on success before releasing `isDeleting`.
  - Notes: Cards styled like `harvests/+page.svelte`.

- [x] **Task 12: Create the sells "new" page.**
  - Files: `src/routes/sells/new/+page.server.ts` (new), `src/routes/sells/new/+page.svelte` (new)
  - Action:
    - `+page.server.ts`:
      - `load` returns `{ harvests: getHarvestEntriesWithRemaining(), containers: getContainerSizes() }`.
      - Default action reads (in this exact order to enforce invariants):
        1. `isGift = formData.get('isGift') === 'on'` (SvelteKit's default checkbox value).
        2. `harvestId` (int, required, must exist).
        3. `containerSizeId` (int, required, must exist).
        4. `soldAtRaw` (date input, required, parse via `fromDateInput`); reject if outside `[2000-01-01, now + 24h]`.
        5. `amount` (int, required, `1..10000`).
        6. `customerName` (trim, required, max 200 chars).
        7. `notes` (trim, nullable, max 2000).
        8. **Price** — only parsed if `!isGift`. Read `priceChfRaw` (string), normalise `,` → `.`, then `parseFloat`. Require `Number.isFinite(x) && x >= 0`. Round to 2 dp: `Math.round(x * 100) / 100`. If `isGift`, skip entirely and set `priceChf = null`.
      - Verify `harvestId` refers to an existing harvest and `containerSizeId` to an existing container (defence in depth); if not, `fail(400, ...)`.
      - Call `createHoneySale({ ... })` → `redirect(302, '/sells')`.
      - On any validation failure, `fail(400, { error, ...allRawFields })` to keep the form populated. Preserve `isGift` as a boolean so the checkbox re-renders correctly.
    - `+page.svelte`:
      - If `data.containers.length === 0`: show empty-state card "Zuerst mindestens eine Behältergröße anlegen." + link to `/honey/containers/new`. Do not render the form.
      - Otherwise render form with fields in order: Los (select), Verkaufsdatum (`<input type="date" max={todayIso}>`, default = today), Anzahl (number, min 1, max 10000), Behältergröße (select), Kundenname (text, maxlength 200), Preis (`<input type="text" inputmode="decimal" pattern="[0-9]+([.,][0-9]+)?">`), Geschenk (checkbox), Notizen (textarea, maxlength 2000).
      - Los options: for each harvest, label `${lot} — ${amountKg.toFixed(1)} kg (${remainingKg.toFixed(1)} kg übrig)`. Order newest first (`harvestedAt` DESC — already handled server-side).
      - Selected harvest + selected container + amount computed via `$derived`:
        - `derivedKg = amount * containerSizeG / 1000`
        - Show `Berechnete Menge: {derivedKg.toFixed(1)} kg`
        - If `derivedKg - remainingKg > 0.05`, show inline warning: `⚠ Überschreitet Restmenge des Loses um ${(derivedKg - remainingKg).toFixed(1)} kg — trotzdem speichern möglich.` **Do not disable submit.**
      - Gift checkbox: `bind:checked={isGift}`. Use a `$effect` that runs when `isGift` becomes `true`: `if (isGift) priceInputValue = ''`. Render `<input ... disabled={isGift}>` on Preis (harmless that it's not submitted — server ignores `priceChfRaw` when `isGift` is true).
      - Back link "← Verkäufe" to `/sells`.
      - Enhance callback: on `result.type === 'redirect'`, `await invalidateAll()` before the redirect fires so the harvest remaining is fresh when the user navigates back.
  - Notes: Use `use:enhance` (no offline branch — sales are online-only).

- [x] **Task 13: Create the sells edit page.**
  - Files: `src/routes/sells/[sellId]/edit/+page.server.ts` (new), `src/routes/sells/[sellId]/edit/+page.svelte` (new)
  - Action:
    - `+page.server.ts`: `load` parses `params.sellId`, calls `getHoneySaleById(id)`, `error(404)` if missing, returns `{ sale: HoneySaleView, harvests: getHarvestEntriesWithRemaining(), containers: getContainerSizes() }`. Default action mirrors Task 12's validation and calls `updateHoneySale(id, ...)`; redirect to `/sells`.
    - `+page.svelte`: Prefill each field from `form?.X ?? data.sale.X` (note **flat shape** — `data.sale.soldAt`, not `data.sale.sale.soldAt`). Convert `soldAt` → `toDateInput(...)`. Submit label "Änderungen speichern". Back link "← Verkäufe".
    - **`effectiveRemaining` as `$derived`** — never `$state`:
      ```ts
      const originalContribKg = data.sale.amount * data.sale.containerSizeG / 1000;
      const selectedHarvest = $derived(data.harvests.find(h => h.id === selectedHarvestId));
      const effectiveRemaining = $derived(
        selectedHarvest
          ? selectedHarvest.remainingKg + (selectedHarvestId === data.sale.harvestId ? originalContribKg : 0)
          : 0
      );
      ```
      Use `effectiveRemaining` in place of `remainingKg` for the warning threshold. When the user changes the lot to a different harvest, no exclusion applies — the sale's old contribution correctly counts against the new lot after save.
    - After successful save, `await invalidateAll()`.
  - Notes: Same over-sell warning logic as create, but uses `effectiveRemaining`.

- [x] **Task 14: Verify build and lint pass.**
  - Files: none (verification).
  - Action: Run `npm run build` and `npm run lint`. Fix any TS or ESLint failures.
  - Notes: Both are the project's only automated gates. Prettier issues → `npm run format`, then re-lint.

- [x] **Task 15: Manual verification pass + environment checks.**
  - Files: none (verification).
  - Action: See Acceptance Criteria below. Walk every AC at both desktop (≥641px) and 375px mobile viewport.
  - Environment checks:
    - **TZ:** production server `TZ` must be `Europe/Zurich`. Test with `docker exec <app-container> date` → confirms `CEST` or `CET`. Escalate before shipping if drifted.
    - **Fresh-clone bootstrap:** with `data/` empty (but existent), `npm run db:migrate` succeeds and creates both new tables (`sqlite3 data/*.db ".schema container_sizes honey_sales"`).
    - **Service-worker precache:** `grep -r "/harvests" vite.config.ts src/lib/client/offline` — flag any hits for evaluation.

### Acceptance Criteria

**Nav & landing:**

- [ ] **AC1:** Given the user is authenticated, when they view the **desktop** nav (`.nav-links`), then they see "Honig" between "Aufgaben" and "Tagebuch"; clicking it navigates to `/honey`.
- [ ] **AC2:** Given the user is on `/honey` at ≥641px viewport, when the page renders, then three tiles labelled "Ernten", "Verkäufe", "Behältergrößen" appear side-by-side (grid `repeat(3, 1fr)`); each tile links to `/harvests`, `/sells`, `/honey/containers` respectively.
- [ ] **AC3:** Given the user is at 375px viewport, when they open the **mobile menu**, then "Honig" appears in the same relative position (between "Aufgaben" and "Tagebuch") in `.mobile-menu`, and the `/honey` landing renders its three tiles stacked in a single column.

**Container CRUD:**

- [ ] **AC4:** Given no container sizes exist, when the user visits `/honey/containers`, then they see an empty state with a link to `/honey/containers/new`.
- [ ] **AC5:** Given the user is on `/honey/containers/new`, when they submit name "500g Glas" and size "500", then a row is created, they are redirected to `/honey/containers`, and the new size appears in the list.
- [ ] **AC6:** Given a container size exists, when the user visits its edit page, changes the name to "500g Kunststoff", and submits, then the list shows the updated name.
- [ ] **AC7:** Given a container size is **not** referenced by any sale, when the user clicks Löschen and confirms, then the row is deleted and the list reflects it.
- [ ] **AC8:** Given a container size **is** referenced by at least one sale, when the user clicks Löschen and confirms, then the deletion is rejected: the dialog closes, an error banner appears at the top of the page with `role="alert"` and receives keyboard focus, the German text explains the size is in use, and the size remains in the list.
- [ ] **AC9:** Given the user submits container-size form with empty name, `sizeG < 1`, or `sizeG > 5000`, then the server returns `fail(400)` with a German error message; the previously entered values remain populated in the form.
- [ ] **AC10:** Given two containers exist with identical `sizeG` (e.g. "500g Glas" and "500g Kunststoff"), when the containers list renders, then they are ordered by `sizeG` ASC then `name` ASC (deterministic).

**Sell form — happy path:**

- [ ] **AC11:** Given at least one harvest and one container size exist, when the user visits `/sells/new`, then the Los dropdown shows entries formatted `Lxxxx — 11.4 kg (5.2 kg übrig)`, sorted newest first, and the Behältergröße dropdown lists all containers sorted by size ascending.
- [ ] **AC12:** Given the user fills in Los, Verkaufsdatum (today), Anzahl=6, Behältergröße=500g Glas, Kundenname="Anna Muster", Preis="90.00" (Geschenk unchecked), and submits, then the sale is persisted (`priceChf = 90.00`, `isGift = false`), they are redirected to `/sells`, and the new sale appears at the top.
- [ ] **AC13:** Given the user is on `/sells`, when the page renders, then each sale card shows date, lot label, "{Anzahl} × {Behältergröße}", customer name, and either `{price.toFixed(2)} CHF` or a green "Geschenk" chip; sales are ordered newest first by `soldAt`.

**Locale, precision, bounds:**

- [ ] **AC14:** Given the user enters Preis as "1,50" (German-locale decimal), when they submit, then the persisted `priceChf` equals `1.5` (not `1`).
- [ ] **AC15:** Given the user enters Preis as "12.345", when they submit, then the persisted `priceChf` equals `12.35` (rounded to 2 dp) and the sells list card displays `12.35 CHF`.
- [ ] **AC16:** Given the user tampers Verkaufsdatum to a value beyond `now + 24h`, when they submit, then the server returns `fail(400)` with a German error and no sale is created.
- [ ] **AC17:** Given the user submits Verkaufsdatum before `2000-01-01`, then the server rejects with `fail(400)`.

**Gift & pricing:**

- [ ] **AC18:** Given the user is on the sell form, when they check "Geschenk", then the Preis input becomes disabled and its bound value clears to empty string; when they uncheck it, the input becomes enabled again with an empty value.
- [ ] **AC19:** Given the user submits with Geschenk checked (any or no value in Preis), then the persisted sale has `priceChf = NULL` and `isGift = true`; the server never attempts to parse the price field; the list card shows the "Geschenk" chip.
- [ ] **AC20:** Given Geschenk is unchecked and Preis is negative or empty, then the server returns `fail(400)` with a German error; the form remains populated. Preis = "0" **is accepted** (paid-for-free sample semantic).

**Inventory warning (soft):**

- [ ] **AC21:** Given the selected Los has 5.2 kg remaining and the user picks a container×amount that totals 6.0 kg, when the user changes any of Los/Behältergröße/Anzahl, then an inline warning appears reading `⚠ Überschreitet Restmenge des Loses um 0.8 kg — trotzdem speichern möglich.` (formatted with `.toFixed(1)`) and the submit button remains enabled.
- [ ] **AC22:** Given the warning is showing, when the user submits, then the sale is persisted successfully (no server rejection) and `invalidateAll()` fires so a subsequent visit to `/sells/new` reflects the reduced remaining.
- [ ] **AC23:** Given a lot has exactly 5.0 kg remaining and the user picks a combination totalling exactly 5.0 kg (no overshoot), then the warning does **not** appear (guard `derivedKg - remainingKg > 0.05` prevents float-noise false positives).

**Edit page:**

- [ ] **AC24:** Given a sale exists, when the user visits its edit page, then every field is prefilled with the current values, including Geschenk state and the correct price (if not a gift).
- [ ] **AC25:** Given the user edits a sale **without** changing its lot, when the over-sell check runs, then the sale's own current contribution is excluded from the "remaining" (`effectiveRemaining = remainingKg + originalContribKg`) — no false warning about the sale conflicting with itself.
- [ ] **AC26:** Given the user edits a sale and **changes** its lot from L1 to L2, when the check runs, then L2's raw `remainingKg` is used (no exclusion). After save, next `/sells/new` load shows L1's remaining recovered and L2's reduced.
- [ ] **AC27:** Given the user submits edits, then the sale is updated, `updatedAt` is refreshed, the gift invariant is enforced (toggling gift off with a new price persists the price; toggling gift on nulls the price), and they are redirected to `/sells`.

**Sell deletion:**

- [ ] **AC28:** Given a sale exists, when the user clicks Löschen on its card and confirms in the dialog, then the sale is deleted, `invalidateAll()` refreshes the list, and the remaining-kg on the sale's lot recovers accordingly on subsequent views of `/sells/new`.

**Empty states & errors:**

- [ ] **AC29:** Given zero container sizes exist, when the user visits `/sells/new`, then the form is not rendered; instead a message and a link to `/honey/containers/new` are shown.
- [ ] **AC30:** Given the user submits `/sells/new` with `harvestId` or `containerSizeId` that does not exist (form-tampered), then the server returns `fail(400)` with a German error and no sale is created.

**Auth & routes:**

- [ ] **AC31:** Given the user is unauthenticated, when they attempt to visit `/honey`, `/honey/containers`, `/honey/containers/new`, `/sells`, `/sells/new`, or any edit URL, then they are redirected to `/login` (root layout guard).

**Bootstrap & migration:**

- [ ] **AC32:** Given a fresh clone with an empty (but existent) `data/` directory, when `npm run db:migrate` runs, then it applies through migration `0010_*` without error and both `container_sizes` and `honey_sales` tables exist with the correct `ON DELETE RESTRICT` foreign keys.

**Quality gates:**

- [ ] **AC33:** `npm run build` succeeds without TypeScript errors.
- [ ] **AC34:** `npm run lint` succeeds (Prettier + ESLint) without errors or new warnings.

## Additional Context

### Dependencies

- **npm packages:** none new. All primitives already installed (Drizzle, SvelteKit form actions, `formatDate`/`formatLot`/`fromDateInput`/`toDateInput`).
- **Runtime dependencies:** none new. Same SQLite file, same auth stack.
- **Task ordering:** Task 1 blocks 2. Task 2 blocks 3–5. Task 5 blocks 7, 11, 12, 13. Task 3 blocks 8, 9, 10, 12, 13. Task 4 blocks 11, 12, 13. Task 6 unblocks user visibility but has no code dependency.

### Testing Strategy

**Automated:**

- `npm run build` — TypeScript + SvelteKit build check.
- `npm run lint` — Prettier + ESLint (via `eslint-plugin-svelte`).
- No unit or E2E tests will be added (project has no test framework; see `project-context.md`).

**Manual (walk once at 375px mobile viewport and once at desktop):**

1. Log in. Confirm nav shows "Honig" (not "Ernten") in both desktop and mobile menu, between "Aufgaben" and "Tagebuch". Click it → land on `/honey` with three tiles (3-col desktop, 1-col mobile).
2. Container CRUD: create "250g Glas / 250", "500g Glas / 500", "1000g Glas / 1000", "500g Kunststoff / 500" (tiebreak test). Edit one. Try invalid inputs (empty name, size 0, size 5001). Delete an unused one.
3. Ensure at least one harvest exists (use existing `/harvests/new`).
4. Visit `/sells/new`. Confirm Los dropdown shows lots with remaining kg. Create a sale with Geschenk unchecked, Preis "90.00" → verify list.
5. Create a sale with German-locale Preis "1,50" → verify DB `price_chf = 1.5`.
6. Create a Preis "0" non-gift sale (paid-for-free sample) → verify accepted.
7. Create a Geschenk sale (with a value left in Preis) → verify Preis clears + disables on check, list shows "Geschenk" chip, DB has `price_chf IS NULL`.
8. Trigger the over-sell warning: 12 × 1000g Glas on a 6 kg lot. Confirm warning appears with `.toFixed(1)` numbers and submit still works.
9. Edit an existing sale. Change nothing but tap save → no false over-sell warning. Toggle Geschenk on then off; enter a new price → verify persisted value replaces old price.
10. Reassign a sale from L1 to L2 → verify L1's remaining recovers and L2's decreases on next `/sells/new` load.
11. Delete a sale → confirm the lot's remaining kg recovers.
12. Try to delete a container size that is referenced → confirm dialog closes, banner appears with `role="alert"`, screen reader announces it (VoiceOver on Mac / TalkBack on Android).
13. Try submitting Verkaufsdatum in the far future / far past → confirm `fail(400)`.
14. Log out. Attempt to visit `/honey`, `/sells`, `/honey/containers` → confirm redirect to `/login`.
15. Verify server TZ: `docker exec <app> date` returns Zurich time. If not, escalate before shipping.

### Notes

**Pre-mortem risks (folded in from 2 review passes — 35 findings):**

- **Silent millisecond timestamps** — every new `soldAt`, `createdAt`, `updatedAt` uses `Math.floor(Date.now() / 1000)` or `fromDateInput(...)`. Query helpers own these values, not the route.
- **FK RESTRICT swallowed silently** — match `err.name === 'SqliteError' && err.code?.startsWith('SQLITE_CONSTRAINT')` (the specific `_FOREIGNKEY` subcode is not always exposed).
- **`isGift` checkbox coercion** — `formData.get('isGift') === 'on'`. Never truthy-string check.
- **Server ordering for gift/price** — parse `isGift` FIRST; if true, skip price parsing entirely. A disabled input isn't submitted, so validating `> 0` on an empty `priceChfRaw` when gift is checked would spuriously reject.
- **Over-sell math drift** — client comparison uses `> 0.05` threshold, display uses `.toFixed(1)` — avoids `-0.7999…` noise both in visibility and in copy.
- **Edit page double-count** — `effectiveRemaining` is a `$derived` including `originalContribKg` only when `harvestId === originalHarvestId`. Never store this in `$state`.
- **Row multiplication in aggregate** — Task 5 uses a correlated subquery for `sold_g`, not `LEFT JOIN + GROUP BY`, to eliminate the risk of double-summing when a lot has ≥2 sales.
- **Aggregate NULL poisoning** — `COALESCE(container_sizes.size_g, 0)` inside the SUM even though RESTRICT should prevent orphans.
- **German-locale decimal comma** — Preis field is `type="text" inputmode="decimal"`, not `type="number"`; server normalises `,` → `.` before `parseFloat`.
- **Timezone assumption** — production server must be `Europe/Zurich`. `fromDateInput` is TZ-sensitive at construction time. Verification is part of Task 15.
- **PWA service worker precache** — verify no hardcoded reference to `/harvests` in `vite.config.ts` PWA config or `src/lib/client/offline/*`. If found, evaluate; `/harvests` still resolves so most cases are harmless.
- **Fresh-clone bootstrap** — `new Database(path)` doesn't auto-mkdir; ensure `data/` exists before first `db:migrate` on a new checkout.
- **ROWID reuse** — even with `AUTOINCREMENT`, never persist `container_size_id` or `harvest_id` in URL/localStorage; always read from server-loaded `data`.
- **Delete-form `use:enhance`** — required so `fail()` responses populate `form?.error` on the same page instead of navigating away.
- **`invalidateAll()`** — call after successful sale create/edit/delete so the harvest remaining is fresh in the same tab. Doesn't fix multi-tab staleness (accepted limitation).
- **Non-partial `updateHoneySale` signature** — accepting `Partial` would let a "toggle gift off" edit silently leave `priceChf = NULL`. Always pass the full record shape from the route.
- **innerJoin, not leftJoin** — `getHoneySales` and `getHoneySaleById` use `innerJoin` because both FKs are `notNull`. `leftJoin` would leak nullable types.
- **Container size range** — `1..5000` grams. Rejects nonsense inputs.
- **Sold-at range** — `[2000-01-01, now + 24h]` server-side, `max={today}` client-side.

**Known limitations (out of scope for v1):**

- No offline sync for sales / container sizes.
- No inventory hard-block on over-sell — user can record more than a lot yielded.
- No revenue reporting, no customer aggregation.
- Multi-tab staleness: `data.harvests` snapshot from `load` isn't refreshed if another tab creates a sale. Single-user app, low likelihood.
- Server-side date validation doesn't cross-check against harvest date (a sale dated before its harvest is technically allowed).

**Future considerations:**

- Optional harvest-lot deletion cascade to sales, gated behind a "purge lot" flow.
- Currency configurability if the user starts selling abroad.
- Aggregate view: total sold vs total harvested by year.
- Add offline outbox for sales if field-selling with poor connectivity becomes a use case.
- Add a "remaining kg" column to `/harvests` list once the pattern proves out on `/sells/new`.
- Cross-check `soldAt >= harvestedAt` if backdating becomes an issue.
