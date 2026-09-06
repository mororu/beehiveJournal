---
title: 'Honey Sales Statistics Page'
slug: 'honey-sales-statistics'
created: '2026-09-06'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  [
    'SvelteKit 2.50.2',
    'Svelte 5.51.0 (Runes)',
    'TypeScript 5.9.3 (strict)',
    'Drizzle ORM 0.45.1',
    'better-sqlite3 12.6.2 (synchronous)',
    'chart.js 4.5.1',
    '@sveltejs/adapter-node 5.5.4',
  ]
files_to_modify:
  [
    'src/routes/stats/+page.server.ts (rewrite -> hub)',
    'src/routes/stats/+page.svelte (rewrite -> hub tiles)',
    'src/routes/stats/stings/+page.server.ts (new - moved verbatim)',
    'src/routes/stats/stings/+page.svelte (new - moved, hrefs updated)',
    'src/routes/stats/sales/+page.server.ts (new)',
    'src/routes/stats/sales/+page.svelte (new)',
    'src/lib/server/db/queries/honeySales.ts (extend with stats helpers)',
    'src/lib/components/HoneySalesPerMonthChart.svelte (new)',
    'src/lib/client/utils/number.ts (new - formatKg / formatChf)',
  ]
code_patterns:
  [
    'Queries only in $lib/server/db/queries/*.ts - never Drizzle in route files',
    'Synchronous DB helpers - no async/await on query functions',
    'UTC month/year bucketing via getUTC* (see stings.ts rationale block)',
    'URL-driven filters with strict param validation + error(400) in German',
    'goto(url, { replaceState: true, keepFocus: true, noScroll: true }) on filter change',
    'Lazy import() of chart.js + {#key} remount (chart has no update path)',
    'import type only for $lib/server/* in client components (verbatimModuleSyntax)',
    'Tile hub pattern from /honey (.tiles grid, tile__title / tile__desc)',
    'German UI, CSS custom properties, 44px touch targets, max-width 600px',
  ]
test_patterns:
  [
    'No test framework configured - manual verification only',
    'CI gates: npm run build && npm run lint (both must pass)',
    'Manual browser test at 375px mobile viewport',
  ]
---

# Tech-Spec: Honey Sales Statistics Page

**Created:** 2026-09-06

## Overview

### Problem Statement

The honey sell log at `/sells` records every sale and every gift as an individual card, but offers no aggregation whatsoever. Manuel cannot answer "how much honey did I sell this year, and what did it earn?" without manually adding up cards on screen. The existing `/stats` page covers sting incidents only — honey, the commercially relevant side of the operation, has no statistical view at all.

### Solution

Restructure `/stats` into a tile hub (mirroring the established `/honey` hub pattern), relocating the sting statistics to `/stats/stings` and adding a new honey-sales statistics page at `/stats/sales`. The new page offers three URL-driven filters (year / lot / gifts), KPI tiles for sold amount and revenue, a monthly bar chart, and three breakdown tables.

### Scope

**In Scope:**

- `/stats` → tile hub with two tiles: **Stiche** and **Honigverkauf**, following the `/honey` tile pattern
- `/stats/stings` → the existing sting statistics page, moved unchanged (pure route relocation — no behavioural change)
- `/stats/sales` → new honey-sales statistics page
- Three filters, all URL-driven (`?year=`, `?lot=`, `?gifts=`) so a reload preserves the selection:
  - **Zeitraum** — filters on `honey_sales.sold_at`; `Alle` plus one option per year that has sales; defaults to the current year, falling back to the newest year with data
  - **Los** — `Alle` plus every lot that has at least one sale, **independent of the selected year** so the list never empties under the user
  - **Geschenke** — `Alle` (default) / `Ohne Geschenke` / `Nur Geschenke`
- KPI tiles: **Verkauft** (paid kg + container count), **Verschenkt** (gift kg + container count), **Erlös** (CHF), **Ø CHF/kg**
- Monthly chart — kilogram bars per month with both kg and CHF in the tooltip, mirroring `StingsPerMonthChart` (chart.js, lazy `import()`, `{#key}` remount on every filter change)
- Breakdown by **Los** — kg, CHF, Ø CHF/kg
- Breakdown by **Behältergröße** — containers sold, kg, CHF
- **Top-Kunden** — kg, CHF, sorted descending; grouped by exact `customer_name` string match
- New read/aggregate query helpers for honey sales statistics in the `$lib/server/db/queries/` layer
- Nav label stays **Statistik** → `/stats` in both the desktop nav and the mobile panel (no nav markup change required)

**Out of Scope:**

- Any change to the sell / harvest / container CRUD flows, or to `schema.ts` (no migration needed)
- Harvest-side statistics: yield per lot, remaining stock, sold-vs-harvested reconciliation
- Cost or profit tracking — only gross revenue from `price_chf`
- Any currency other than CHF; no exchange-rate handling
- CSV / PDF export
- A redirect from the old `/stats` sting URL. `/stats` becomes the hub, so an old bookmark lands one tap away rather than on a 404

## Context for Development

### Codebase Patterns

**Query layer (`src/lib/server/db/queries/`)**

- Every Drizzle call lives here — **never** in a route file. This is the single most important architecture rule in `project-context.md`.
- `better-sqlite3` is synchronous: query helpers return values directly. **Never** add `async`/`await` to them.
- Statistics helpers live in the domain file alongside CRUD — `stings.ts` holds `getStingStats()`, `getStingYears()`, and `currentStatsYear()` next to `createStingIncident()`. The honey-sales stats helpers therefore belong in **`honeySales.ts`**, not a new `*Stats.ts` module.
- `HoneySaleView` (already in `honeySales.ts`) flattens both `innerJoin`s and exposes exactly the fields the aggregation needs: `lot`, `harvestedAt`, `containerName`, `containerSizeG`, plus every `honey_sales` column.
- Precedent for raw SQL exists — `getHarvestEntriesWithRemaining()` uses a correlated subquery with an explicit comment on why a `LEFT JOIN + GROUP BY` was rejected (row multiplication when a lot has ≥ 2 sales).

**Statistics page conventions (set by `src/routes/stats/`)**

- Filters are URL-driven so a reload preserves the selection. The server validates strictly rather than coercing: `if (!/^\d{4}$/.test(yearParam)) error(400, 'Ungültiger Jahresfilter')`, plus a `2000..2100` range check.
- **No redirect to a canonical URL.** A bare `/stats` link keeps meaning "whatever is current"; the `<select>` reflects the resolved value.
- Client-side filter change: `goto(url, { replaceState: true, keepFocus: true, noScroll: true })` — the `<select>` keeps focus and the page does not jump, so keyboard users can keep arrowing.
- A valid filter value with no data is **not** an error. `/stats` injects the selected year into `yearOptions` when it is absent from the data, otherwise the `<select>` would match nothing and render blank.
- Layout: `.page { max-width: 600px; margin: 0 auto }`, a `.filter-bar`, a `.kpis` grid (2 columns mobile → 4 at `min-width: 641px`), then `.card` sections each with an `h2`.

**Chart components (set by `StingsPerMonthChart.svelte`)**

- Chart.js is **code-split** — never in the main bundle. Loaded via `await import('chart.js')` inside `initChart()`.
- `Chart.register(BarElement, BarController, LinearScale, CategoryScale, Tooltip)` — registering `BarElement` without `BarController` throws `'"bar" is not a registered controller'`.
- A `destroyed` flag guards the post-`await` path: the component can be torn down mid-import, and without the guard a dead instance is registered in Chart.js's global registry and never destroyed.
- The component has **no update path**. The parent wraps it in `{#key <filter state>}` — without that, the instance survives a filter switch and keeps rendering stale bars. This is load-bearing, and the honey chart must be keyed on **all three** filters.
- Types from `$lib/server/*` are imported with `import type` only — `verbatimModuleSyntax` would emit a value import, and SvelteKit hard-fails any client-side import of `$lib/server/*`.
- Colours are hardcoded inside the chart config (`#f59e0b` / `#d97706`) because Chart.js cannot read CSS custom properties — the one sanctioned exception to the no-hardcoded-colours rule.
- Emptiness is `buckets.some((b) => b.count > 0)`, never `buckets.length` — a concrete year always carries 12 buckets.

**Hub pages (set by `/honey`)**

- `+page.server.ts` returns `{}` with a comment noting that the root layout handles the auth guard.
- `+page.svelte` renders a `.tiles` list of `<a class="tile">` with a `tile__title` and `tile__desc`, 1 column on mobile → 3 at `min-width: 641px`, `min-height: 96px`.

**Routing & auth**

- The auth guard is root-only (`src/routes/+layout.server.ts`) and path-based: everything except `/login`, `/login/*`, and `/logout` is guarded. New routes under `/stats/` are therefore protected automatically — **no per-route auth code**.
- Do **not** read `locals.user` in page loads. Layout and page `load` run in parallel, so it is frequently `undefined`. These pages need no user identity anyway.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/lib/server/db/schema.ts` (lines 96–151) | `honeyHarvests`, `containerSizes`, `honeySales` definitions, FK strategy, and the comments stating that sale kg is derived at read time and never stored |
| `src/lib/server/db/queries/honeySales.ts` | `HoneySaleView` shape, the two `innerJoin`s, `baseSelect`, and the `normalisePrice()` gift invariant. Stats helpers get appended here |
| `src/lib/server/db/queries/honeyHarvests.ts` | `getHarvestEntriesWithRemaining()` — the existing precedent for deriving sold kg (`amount × size_g / 1000`) and for raw correlated-subquery SQL |
| `src/lib/server/db/queries/containerSizes.ts` | `getContainerSizes()` ordering (`sizeG ASC, name ASC`), and the FK-RESTRICT delete guard proving a referenced size can never vanish |
| `src/lib/server/db/queries/stings.ts` (lines 110–240) | The reference implementation to mirror: UTC `monthKey()` / `yearOf()` / `monthRange()`, the `getStingYears()` + `currentStatsYear()` pair, and the "fetch rows once, reduce in JS" strategy with its scaling note |
| `src/routes/stats/+page.server.ts` | Param-validation and default-year-resolution logic to generalise; becomes the hub after the move |
| `src/routes/stats/+page.svelte` | Filter bar, KPI grid, `{#key}` chart mount, empty state, and the full CSS vocabulary to reuse; moves to `/stats/stings` |
| `src/lib/components/StingsPerMonthChart.svelte` | Chart.js registration, dynamic import, `destroyed` guard, and teardown pattern for the new honey chart |
| `src/routes/honey/+page.svelte` + `+page.server.ts` | The tile-hub markup and CSS the new `/stats` hub copies |
| `src/routes/sells/+page.svelte` | How a sale is rendered today: `{sale.priceChf.toFixed(2)} CHF`, the `Geschenk` chip, `{sale.amount} × {sale.containerName}` |
| `src/routes/sells/new/+page.svelte` (lines 84–100) | The lot `<select>` — keyed on `harvest.id`, labelled with `h.lot` — confirming lots are addressed by FK, not by label |
| `src/routes/harvests/new/+page.server.ts` (line 45) | `formatLot(harvestedAt)` is recomputed server-side on every insert, which is what makes same-day lot labels collide |
| `src/lib/client/utils/date.ts` | `MONTH_NAMES_SHORT_DE`, `formatDate()`, and `fromDateInput()`'s local-noon anchor |
| `src/routes/+layout.server.ts` | Confirms the path-based root auth guard covers `/stats/*` with no extra work |
| `src/routes/+layout.svelte` (lines 68, 97) | The only two references to `/stats` in the entire codebase — both keep pointing at the hub, so **no nav change is required** |
| `_bmad-output/implementation-artifacts/tech-spec-honey-sell-log.md` | AC12 / AC15 / AC19 — the authority on `price_chf` semantics |

### Technical Decisions

Decisions 1–6 were taken during Step 1 discovery; 7–13 emerged from the Step 2 investigation.

1. **Hub over tabs or a nav dropdown.** `/stats` becomes a tile hub. `/honey` already establishes exactly this pattern, so the flat nav stays untouched (no hover/tap/mobile-panel dropdown machinery). Accepted cost: the sting statistics URL changes from `/stats` to `/stats/stings`.
2. **No redirect for the old sting-stats URL.** `/stats` still resolves — as the hub — so an old bookmark lands one tap from its target rather than on an error.
3. **The year filter operates on `sold_at`, not on the lot's `harvested_at`.** The page answers "what did I sell in this year, from any lot". A lot harvested in 2025 and sold in 2026 counts toward 2026.
4. **The Los dropdown is independent of the selected year.** It lists every lot that has at least one sale regardless of filter state, so switching year never silently shrinks or empties the list.
5. **Gift filter is three-state, defaulting to `Alle`.** `Alle` / `Ohne Geschenke` / `Nur Geschenke`. The KPI row always splits paid kg from gifted kg so the zero-revenue effect of gifts is never confusing.
6. **No schema change.** Every figure derives from the existing `honey_sales`, `honey_harvests`, and `container_sizes` tables. No migration, no `db:generate`.
7. **The Los filter is keyed on `harvest_id`, not on the lot string.** `honey_harvests` has **no unique index on `lot`** (only on `client_id`), and `lot` is recomputed as `L` + ddmmyyyy from `harvested_at` — so **two harvests on the same day produce an identical label**. Filtering by label would silently merge two distinct lots. The `<select>` therefore carries `value={harvest.id}` and displays `lot`, exactly as the sell form already does. Where a label is ambiguous, the option is disambiguated with its harvest amount (e.g. `L04082026 — 11.4 kg`).
8. **Aggregate in JS over a single row fetch, not in SQL.** Mirrors `getStingStats()`: one `select` of the joined sale rows, then a `reduce` producing every KPI, month bucket, and all three breakdowns in one pass. Rationale is identical — a single round trip, all bucketing logic in one place, and imperceptible at this volume (a hobby beekeeper's sales are well under a thousand rows). Carry forward the same scaling note: past roughly 5,000 rows, index `sold_at` and move the buckets into SQL with `strftime('%Y-%m', sold_at, 'unixepoch')`, which is correct precisely because bucketing is UTC.
9. **A single `getHoneySalesStats({ year, harvestId, gifts })` call returns everything the page renders.** One helper, one filter object, one pass — rather than five helpers each re-filtering the same rows. `getHoneySalesYears()` and `getSoldLots()` are separate because they must ignore the active filters.
10. **Revenue is `SUM(price_chf)`, never `price_chf × amount`.** `price_chf` is the **line total** for the whole sale, confirmed by `tech-spec-honey-sell-log.md` AC12 (6 × 500 g Glas at `Preis = "90.00"` persists `priceChf = 90.00`) and by the sells list card, which renders the value flat with no multiplication.
11. **`price_chf = 0` and `price_chf = NULL` must never be conflated.** `0` is a legal, deliberate state — a paid-for-free sample, explicitly *not* a gift (see the `honeySales` table comment). Gift-ness is decided by `is_gift` alone; revenue sums treat `NULL` as excluded, `0` as a real zero-value sale.
12. **UTC bucketing, no exceptions.** Reuse `getUTCFullYear()` / `getUTCMonth()` per the rationale block in `stings.ts`: the app container sets no `TZ` (node:20-alpine → UTC), and `fromDateInput()` anchors sales at **local noon**, so the UTC calendar day is stable across the +1/+2 h Zurich offsets. Bucketing in `Europe/Zurich` would shift every value.
13. **Add `src/lib/client/utils/number.ts` with `formatKg()` and `formatChf()`.** Four tables plus a KPI row render the same two number shapes 15+ times; inlining `toFixed()` at every site is how they drift apart. Formatting matches what already ships — `12.35 CHF` via `toFixed(2)` (as in the sells list) and one decimal for kg — rather than introducing `de-CH` grouping that appears nowhere else in the app.

### Technical Constraints

Hard constraints the implementation must respect. Violating any of these produces either a wrong number or a build failure.

| # | Constraint | Consequence if violated |
| - | ---------- | ----------------------- |
| C1 | `price_chf` is a line total | Revenue inflated by the container count |
| C2 | Sold kg = `amount × container_sizes.size_g / 1000`, derived never stored | No stored kg column exists to read |
| C3 | `is_gift = true` ⇒ `price_chf IS NULL`; `price_chf = 0` is a distinct legal state | Gifts silently counted as 0-CHF sales, or samples misclassified as gifts |
| C4 | `honey_harvests.lot` is **not unique** | Two same-day lots merge into one filter option |
| C5 | Month/year buckets must use `getUTC*` | Evening sales shift into the next day, month, or year |
| C6 | Client components may only `import type` from `$lib/server/*` | SvelteKit build hard-fails |
| C7 | Chart.js needs `BarController` registered, a `destroyed` guard, and a `{#key}` remount | Runtime throw, leaked instance, or stale bars after a filter change |
| C8 | No Drizzle in route files; no `async` on query helpers | Breaks the project's primary architecture rule |
| C9 | German UI, CSS custom properties, 44 px touch targets | Fails the project style rules |
| C10 | ESM imports carry the `.js` extension; `satisfies` on insert values | TypeScript / Node ESM resolution failure |

## Implementation Plan

### Tasks

Ordered by dependency — lowest level first. Tasks 1–3 build the data layer, 4–5 restructure the routes, 6–8 build the new page, 9 verifies.

- [x] **Task 1: Extract the UTC bucketing helpers into a shared server module**
  - File: `src/lib/server/statsBuckets.ts` (new)
  - Action: Move `monthKey()`, `yearOf()`, and `monthRange()` **verbatim** out of `src/lib/server/db/queries/stings.ts` (lines ~119–149), together with the full "Buckets are computed in UTC — deliberately, not in Europe/Zurich" rationale comment block that precedes them. Export all three.
  - Action: In `stings.ts`, delete the three local definitions and add `import { monthKey, yearOf, monthRange } from '$lib/server/statsBuckets.js';`. Leave a one-line pointer comment where the rationale block used to sit: `// UTC bucketing rationale lives in $lib/server/statsBuckets.ts`.
  - Notes: A pure move — **no behaviour change**. Duplicating three functions whose correctness rests on subtle UTC semantics is precisely how the two statistics pages would drift apart. Note the `.js` extension on the import (ESM rule). Verify `/stats/stings` still renders identical numbers after this task.

- [x] **Task 2: Add shared number formatting helpers**
  - File: `src/lib/client/utils/number.ts` (new)
  - Action: Export `formatKg(kg: number): string` → one decimal, e.g. `11.4`. Export `formatChf(chf: number): string` → two decimals, e.g. `12.35`. Both use `toFixed()`, matching what already ships in `sells/+page.svelte`.
  - Action: Export `formatChfPerKg(value: number | null): string` → two decimals, or `'—'` when `null`.
  - Notes: Deliberately **not** `de-CH` grouping — no other screen in the app groups thousands, and introducing it here alone would look inconsistent. The unit suffix (`kg`, `CHF`) is added by the caller, not baked into the helper, so table headers can carry the unit instead of repeating it on every row.

- [x] **Task 3: Add the honey-sales statistics helpers to the query layer**
  - File: `src/lib/server/db/queries/honeySales.ts`
  - Action: Append a `// ─── Statistics ───` section below the existing write helpers. Add the exported types and four functions below. All synchronous — **no `async`**.
  - Notes: Follows `getStingStats()` exactly: one row fetch, one JS reduce producing every figure. Currency is accumulated in **integer Rappen** and divided once at the end; kilograms are accumulated in **integer grams** and divided once at the end. Summing floats row by row drifts.

  ```ts
  export type GiftFilter = 'all' | 'exclude' | 'only';

  export interface SoldLot {
    harvestId: number;
    lot: string;
    harvestedAt: number;
    amountKg: number;
  }

  export interface SalesMonthBucket {
    key: string; // "YYYY-MM"
    kg: number;
    chf: number;
  }

  export interface LotBreakdownRow {
    harvestId: number;
    lot: string;
    harvestedAt: number;
    kg: number;
    chf: number;
    avgChfPerKg: number | null;
  }

  export interface ContainerBreakdownRow {
    containerSizeId: number;
    containerName: string;
    sizeG: number;
    containers: number;
    kg: number;
    chf: number;
  }

  export interface CustomerBreakdownRow {
    customerName: string;
    kg: number;
    chf: number;
  }

  export interface HoneySalesStats {
    totalSalesAllTime: number; // unfiltered row count — drives the page-level empty state
    saleCount: number;         // rows matching the active filters
    containerCount: number;    // SUM(amount) over paid + gift rows in the period
    paidKg: number;            // kg from rows where is_gift = false
    giftKg: number;            // kg from rows where is_gift = true
    paidContainers: number;
    giftContainers: number;
    revenueChf: number;        // SUM(price_chf) — gifts contribute nothing
    avgChfPerKg: number | null; // revenueChf / paidKg; null when paidKg === 0
    perMonth: SalesMonthBucket[];
    byLot: LotBreakdownRow[];
    byContainer: ContainerBreakdownRow[];
    byCustomer: CustomerBreakdownRow[];
    spanFrom: string | null;   // "YYYY-MM" of the earliest sale in the period
    spanTo: string | null;     // "YYYY-MM" of the latest sale in the period
  }
  ```

  - **`getHoneySalesYears(): number[]`** — `select({ soldAt })` from `honeySales`, map through `yearOf()`, dedupe, sort descending. Derived with `yearOf()` rather than SQL `strftime` so the dropdown can never disagree with the month buckets (same reasoning as `getStingYears()`).
  - **`currentSalesYear(): number`** — `new Date().getUTCFullYear()`. A local one-liner rather than importing `currentStatsYear` from `stings.ts`: a honey page must not depend on the stings domain module.
  - **`getSoldLots(): SoldLot[]`** — every harvest with **at least one sale**, newest `harvestedAt` first. `innerJoin` from `honeyHarvests` to `honeySales`, selecting `honeyHarvests.id / lot / harvestedAt / amountKg`, deduped by harvest id (or `groupBy(honeyHarvests.id)`). **Ignores every active filter** — see Decision 4.
  - **`getHoneySalesStats(filter: { year: number | null; harvestId: number | null; gifts: GiftFilter }): HoneySalesStats`**:
    1. Fetch all rows once with the existing `baseSelect` + the two `innerJoin`s (the `HoneySaleView` shape already carries `lot`, `harvestedAt`, `containerName`, `containerSizeG`).
    2. `totalSalesAllTime = rows.length` — captured **before** filtering.
    3. Filter: `year === null || yearOf(r.soldAt) === year`, **and** `harvestId === null || r.harvestId === harvestId`, **and** the gift predicate (`'all'` → keep everything, `'exclude'` → `!r.isGift`, `'only'` → `r.isGift`).
    4. Single reduce over the filtered rows. Per row: `grams = r.amount * r.containerSizeG`, `rappen = r.priceChf === null ? 0 : Math.round(r.priceChf * 100)`. Accumulate grams and rappen into the KPI totals, into a `Map` keyed by `monthKey(r.soldAt)`, a `Map` keyed by `r.harvestId`, a `Map` keyed by `r.containerSizeId`, and a `Map` keyed by `r.customerName` (exact string match — see Notes).
    5. `spanFrom` / `spanTo` from the sorted month keys. Axis keys: a concrete year always renders all twelve months via `monthRange(\`${year}-01\`, \`${year}-12\`)`; `null` (Alle) spans `spanFrom → spanTo`; empty when there are no rows. Identical to `getStingStats()`.
    6. Sort `byLot` by `harvestedAt` descending (newest lot first, matching every other date-ordered list in the app); `byContainer` by `sizeG` ascending then `containerName` ascending (matching `getContainerSizes()`); `byCustomer` by `chf` descending, then `kg` descending, then `customerName` ascending — the kg tiebreak keeps the list meaningfully ordered under `Nur Geschenke`, where every `chf` is `0`.
    7. Convert once at the end: `kg = grams / 1000`, `chf = rappen / 100`. `avgChfPerKg = paidKg === 0 ? null : Math.round((revenueChf / paidKg) * 100) / 100`.

- [x] **Task 4: Relocate the sting statistics page to `/stats/stings`**
  - File: `src/routes/stats/+page.server.ts` → `src/routes/stats/stings/+page.server.ts`
  - File: `src/routes/stats/+page.svelte` → `src/routes/stats/stings/+page.svelte`
  - Action: Move both with `git mv` so the history follows the files. Create the `src/routes/stats/stings/` directory first.
  - Action: In the moved `+page.server.ts`, change the relative type import to `import type { PageServerLoad } from './$types.js';` (unchanged in form — SvelteKit regenerates `$types` for the new path). **No logic changes.**
  - Action: In the moved `+page.svelte`, make exactly three edits: `applyYear()` targets `` `/stats/stings?year=${value}` `` (was `/stats?year=`); the `<title>` becomes `Statistik: Stiche — beehiveJournal`; and add a back-link `<a href="/stats" class="back-link">← Statistik</a>` as the first child of `.page`, copying the `.back-link` rule from `src/routes/sells/+page.svelte`.
  - Notes: Everything else — the year resolution, the `error(400)` validation, the KPI tiles, the heatmap, all CSS — moves **unchanged**. The `/stings/new` link in the empty state stays as it is.

- [x] **Task 5: Turn `/stats` into a tile hub**
  - File: `src/routes/stats/+page.server.ts` (new, replacing the moved one)
  - Action: `export const load: PageServerLoad = () => { return {}; };` with the same "auth guard handled by the root layout" comment as `src/routes/honey/+page.server.ts`.
  - File: `src/routes/stats/+page.svelte` (new, replacing the moved one)
  - Action: Copy the structure and `<style>` block of `src/routes/honey/+page.svelte`. `<h1>Statistik</h1>`, `<title>Statistik — beehiveJournal</title>`, and two tiles: **Stiche** / *Vorfälle & Körperstellen* → `/stats/stings`, and **Honigverkauf** / *Menge & Erlös* → `/stats/sales`.
  - Action: Change the tile grid's wide breakpoint from `repeat(3, 1fr)` to `repeat(2, 1fr)` — there are two tiles, not three.
  - Notes: **No navigation change is required.** `/stats` is referenced only at `src/routes/+layout.svelte:68` and `:97`, and both keep pointing at the hub.

- [x] **Task 6: Build the monthly sales chart component**
  - File: `src/lib/components/HoneySalesPerMonthChart.svelte` (new)
  - Action: Copy `StingsPerMonthChart.svelte` wholesale and adapt. Keep every structural element: the `destroyed` flag, the post-`await` re-check, `onMount`/`onDestroy`, `Chart.register(BarElement, BarController, LinearScale, CategoryScale, Tooltip)`, the `aspectRatio: 2.2` options block, `#f59e0b` / `#d97706`, and the `.chart-wrap` / `.chart-placeholder` styles.
  - Action: Props become `{ buckets: SalesMonthBucket[]; mode: 'year' | 'all' }`, imported with `import type { SalesMonthBucket } from '$lib/server/db/queries/honeySales.js';`.
  - Action: The dataset is **kilograms** — `buckets.map((b) => b.kg)`. The tooltip callback renders **both** figures: `` `${formatKg(kg)} kg · ${formatChf(chf)} CHF` ``, reading the CHF value from the bucket at `ctx.dataIndex`.
  - Action: `hasData` is `buckets.some((b) => b.kg > 0)`; the placeholder text is `Keine Verkäufe in diesem Zeitraum.`; `aria-label="Verkaufte Menge pro Monat"`. Drop `precision: 0` from the y-axis ticks — kilograms are fractional.
  - Notes: One dataset, kilograms, because kg is meaningful under **every** filter state whereas revenue is identically zero under `Nur Geschenke`, which would render a flat, seemingly broken chart. The CHF figure is never lost — it rides in the tooltip. The `import type` is mandatory: a value import of `$lib/server/*` hard-fails the SvelteKit build.

- [x] **Task 7: Build the sales statistics page load**
  - File: `src/routes/stats/sales/+page.server.ts` (new)
  - Action: `load: PageServerLoad = ({ url }) => { … }`, parsing three params and returning `{ stats, years, lots, selectedYear, selectedLot, selectedGifts }`.
  - Action: **`?year=`** — resolve exactly as `/stats/stings` does. Absent or empty → `currentSalesYear()` if present in `getHoneySalesYears()`, else the newest year with data, else the current year. `'all'` → `null`. Otherwise require `/^\d{4}$/` and a `2000..2100` range, else `error(400, 'Ungültiger Jahresfilter')`.
  - Action: **`?lot=`** — absent, empty, or `'all'` → `null`. Otherwise require `/^\d+$/`, else `error(400, 'Ungültiger Los-Filter')`. Then confirm the id appears in `getSoldLots()`; if it does not, `error(400, 'Unbekanntes Los')`.
  - Action: **`?gifts=`** — absent or empty → `'all'`. Must be one of `'all' | 'exclude' | 'only'`, else `error(400, 'Ungültiger Geschenk-Filter')`.
  - Action: Call `getHoneySalesStats({ year, harvestId, gifts })` once and return it with the two option lists.
  - Notes: **No redirect to a canonical URL** — a bare `/stats/sales` keeps meaning "the current year, all lots, including gifts", matching the documented `/stats` behaviour. An unknown `?lot=` is rejected rather than silently ignored because, unlike a year, a lot id has no meaningful "valid but empty" reading: every lot in the dropdown has at least one sale by construction, and `ON DELETE RESTRICT` guarantees a sold lot can never disappear. A **known** lot with no sales in the selected year is perfectly valid and renders the in-period empty state.

- [x] **Task 8: Build the sales statistics page**
  - File: `src/routes/stats/sales/+page.svelte` (new)
  - Action: Start from `src/routes/stats/stings/+page.svelte` (post-Task-4) so the `.page`, `.page-header`, `.filter-bar`, `.kpis`, `.kpi`, `.card`, `.empty-state`, and `.chart-placeholder` CSS carries over verbatim.
  - Action: Back-link `<a href="/stats" class="back-link">← Statistik</a>`, `<h1>Honigverkauf</h1>`, `<title>Statistik: Honigverkauf — beehiveJournal</title>`.
  - Action: **Page-level empty state** — when `data.stats.totalSalesAllTime === 0`, render only `Noch keine Verkäufe erfasst.` with an `Ersten Verkauf erfassen` link to `/sells/new`, and no filters. Mirrors the stings page.
  - Action: **Three filters** in the filter bar, each a `<select>` reusing `.filter-select` (stack them vertically on mobile; the bar becomes `flex-direction: column; align-items: stretch` below 641px, with each row a label + select pair):
    - `Zeitraum` — `Alle` plus `data.years`, with the selected year injected when absent from the list (the same guard the stings page uses, so a valid-but-empty year never renders a blank `<select>`).
    - `Los` — `Alle` plus `data.lots`, `value={String(lot.harvestId)}`, label `{lot.lot}`. **When two lots share a label** (same-day harvests), append the harvest amount to disambiguate: `L04082026 — 11.4 kg`. Compute this by counting label occurrences in `data.lots`.
    - `Geschenke` — `Alle` / `Ohne Geschenke` / `Nur Geschenke`, values `all` / `exclude` / `only`.
  - Action: A single `applyFilter(patch: { year?: string; lot?: string; gifts?: string })` builds the next URL from the three current values plus the patch, emitting **all three** params, then `goto(url, { replaceState: true, keepFocus: true, noScroll: true })`.
  - Action: **Four KPI tiles**, reusing the existing 2-up / 4-up grid: `Verkauft` = `formatKg(paidKg)` kg with sub `{paidContainers} Gebinde`; `Verschenkt` = `formatKg(giftKg)` kg with sub `{giftContainers} Gebinde`; `Erlös` = `formatChf(revenueChf)` CHF; `Ø CHF/kg` = `formatChfPerKg(avgChfPerKg)`.
  - Action: **Chart card** — `<h2>Verkauf pro Monat</h2>`, wrapped in `{#key \`${data.selectedYear}-${data.selectedLot}-${data.selectedGifts}\`}` so the chart remounts on **every** filter change, inside the same `{#await import(...)}` / `{:catch}` block the stings page uses.
  - Action: **Three breakdown cards**, each a `<table>` inside a `.table-wrap { overflow-x: auto }` container so 4-column tables never force the page body to scroll sideways at 375px:
    - `Nach Los` — Los | kg | CHF | Ø CHF/kg
    - `Nach Behältergröße` — Größe | Gebinde | kg | CHF
    - `Top-Kunden` — Kunde | kg | CHF
  - Action: Right-align numeric columns (`text-align: right`), put the unit in the `<th>` rather than repeating it per row, and give each table a `Keine Verkäufe in diesem Zeitraum.` placeholder when its rows array is empty.
  - Notes: Every interactive element keeps `min-height: 44px`. All labels German. Colours come from CSS custom properties — the chart config is the only sanctioned exception.

- [x] **Task 9: Verify**
  - Action: `npm run lint` and `npm run build` must both pass cleanly — these are the project's only automated gates.
  - Action: Run `npm run check` as well; `svelte-check` catches the `$types` drift that a route move can introduce.
  - Action: Walk the manual test steps in **Testing Strategy** below at a 375 px viewport.

### Acceptance Criteria

**Navigation & relocation**

- [ ] **AC1:** Given the user taps `Statistik` in the desktop nav or the mobile menu, when `/stats` loads, then a hub with exactly two tiles is shown — `Stiche` (*Vorfälle & Körperstellen*) and `Honigverkauf` (*Menge & Erlös*) — and neither nav markup nor `static/manifest.webmanifest` required any change.
- [ ] **AC2:** Given the user opens `/stats/stings`, when the page loads, then it renders exactly as the old `/stats` did — same KPI tiles, same year `<select>`, same per-month chart, same body heatmap, same numbers — plus a `← Statistik` back-link.
- [ ] **AC3:** Given the user changes the year on `/stats/stings`, when the `<select>` fires, then the URL becomes `/stats/stings?year=…` (not `/stats?year=…`), the `<select>` keeps focus, and the page does not scroll to the top.
- [ ] **AC4:** Given Task 1 moved `monthKey` / `yearOf` / `monthRange` into `$lib/server/statsBuckets.ts`, when `/stats/stings` is compared against its pre-refactor output for the same data, then every figure — totals, per-month buckets, `Ø Stiche/Monat`, and the span label — is identical.

**Filters**

- [ ] **AC5:** Given sales exist in 2026, when the user opens `/stats/sales` with no query string, then the year filter resolves to the current year, the lot filter reads `Alle`, the gift filter reads `Alle`, and **no redirect occurs** — the URL stays bare.
- [ ] **AC6:** Given the current year has no sales but 2025 does, when the user opens `/stats/sales`, then the year filter falls back to the newest year that has sales (2025).
- [ ] **AC7:** Given the user selects a lot, when the filter fires, then the URL carries all three params (`?year=…&lot=<harvestId>&gifts=…`), and a reload reproduces exactly the same view.
- [ ] **AC8:** Given the user selects year 2024 while a lot that only sold in 2026 is active, when the page reloads, then the request succeeds with zero rows in period — the KPIs read `0.0 kg` / `0.00 CHF`, every table shows its placeholder, and **no error is raised**.
- [ ] **AC9:** Given the user switches the year filter, when the page reloads, then the `Los` dropdown still lists **every** lot that has ever sold — the option list does not shrink.
- [ ] **AC10:** Given `?year=` is `2025abc`, `-4`, `999999`, or `1999`, when the page loads, then it fails with `400` and the message `Ungültiger Jahresfilter`.
- [ ] **AC11:** Given `?lot=` is `abc` or `-1`, when the page loads, then it fails with `400` and `Ungültiger Los-Filter`; given `?lot=` is a well-formed number that matches no sold lot, then it fails with `400` and `Unbekanntes Los`.
- [ ] **AC12:** Given `?gifts=` is anything other than `all`, `exclude`, or `only`, when the page loads, then it fails with `400` and `Ungültiger Geschenk-Filter`.
- [ ] **AC13:** Given `?year=all`, when the page loads, then every year is included and the chart x-axis spans the first sale month to the last, with gaps rendered as zero bars.

**Figures & gift semantics**

- [ ] **AC14:** Given a sale of `6 × 500g Glas` at `priceChf = 90.00`, when it falls inside the active filters, then it contributes `3.0 kg`, `6` containers, and `90.00 CHF` — **not** `540.00 CHF`.
- [ ] **AC15:** Given the gift filter is `Alle` and the period holds one paid sale of `3.0 kg / 90.00 CHF` and one gift of `1.0 kg`, when the KPIs render, then `Verkauft` reads `3.0 kg`, `Verschenkt` reads `1.0 kg`, `Erlös` reads `90.00 CHF`, and `Ø CHF/kg` reads `30.00` — the gift's kilograms never dilute the average.
- [ ] **AC16:** Given the gift filter is `Ohne Geschenke`, when the page renders, then gift rows are excluded everywhere — KPIs, chart, and all three tables — and `Verschenkt` reads `0.0 kg`.
- [ ] **AC17:** Given the gift filter is `Nur Geschenke`, when the page renders, then `Erlös` reads `0.00 CHF`, `Ø CHF/kg` reads `—`, the chart still renders meaningful kilogram bars, and `Top-Kunden` is ordered by kilograms descending rather than collapsing into an arbitrary order.
- [ ] **AC18:** Given a sale with `priceChf = 0` and `isGift = false` (a paid-for-free sample), when it falls inside the active filters, then it counts toward `Verkauft` kilograms and container count, contributes `0.00 CHF` to the revenue, and is **excluded** by the `Nur Geschenke` filter — it is never treated as a gift.
- [ ] **AC19:** Given `paidKg` is `0` for the active filters, when the KPIs render, then `Ø CHF/kg` shows `—` and no division by zero occurs.
- [ ] **AC20:** Given three sales of `10.10`, `10.20`, and `10.30 CHF`, when the revenue is summed, then it reads exactly `30.60 CHF` — the accumulation runs in integer Rappen, so no floating-point drift appears.

**Lot handling**

- [ ] **AC21:** Given two separate harvests were recorded on the same day and therefore share the lot label `L04082026`, when the `Los` dropdown renders, then **two distinct options** appear, each disambiguated by its harvest amount (e.g. `L04082026 — 11.4 kg` and `L04082026 — 8.0 kg`), and selecting one filters to that harvest alone.
- [ ] **AC22:** Given a lot harvested in 2025 was sold in 2026, when the year filter is `2026`, then that sale is counted — the year filter reads `sold_at`, never `harvested_at`.
- [ ] **AC23:** Given the `Nach Los` table renders, when rows are ordered, then the newest harvest appears first, and each row shows kilograms, revenue, and `Ø CHF/kg` (or `—` when that lot has no paid kilograms in the period).

**Chart & tables**

- [ ] **AC24:** Given a concrete year is selected, when the chart renders, then all twelve months appear on the x-axis with German short names, and months without sales render as zero bars.
- [ ] **AC25:** Given the user hovers or taps a bar, when the tooltip opens, then it shows both figures for that month, e.g. `12.5 kg · 340.00 CHF`.
- [ ] **AC26:** Given the user changes **any** of the three filters, when the page updates, then the chart remounts and shows the new data — no stale bars survive, because the `{#key}` expression covers all three filter values.
- [ ] **AC27:** Given the period contains no sales, when the chart card renders, then the placeholder reads `Keine Verkäufe in diesem Zeitraum.` and no canvas is created.
- [ ] **AC28:** Given `Nach Behältergröße` renders, when rows are ordered, then they follow ascending container size, and each row shows the container count, kilograms, and revenue.
- [ ] **AC29:** Given two sales carry customer names differing only in spelling or spacing, when `Top-Kunden` renders, then they appear as **two separate rows** — grouping is exact string match, and this is a documented limitation, not a bug.

**Empty state, layout, and gates**

- [ ] **AC30:** Given no sale has ever been recorded, when `/stats/sales` loads, then only the empty state `Noch keine Verkäufe erfasst.` with an `Ersten Verkauf erfassen` link to `/sells/new` is shown — no filters, no zero-filled tiles.
- [ ] **AC31:** Given the page is viewed at a 375 px viewport, when the four-column `Nach Los` table renders, then the table scrolls horizontally **inside its own container** and the page body itself never scrolls sideways.
- [ ] **AC32:** Given the page renders, when any interactive element is inspected, then every `<select>` and link-button is at least 44 px tall, all user-facing text is German, and no colour is hardcoded outside the chart configuration.
- [ ] **AC33:** Given the implementation is complete, when `npm run lint`, `npm run check`, and `npm run build` are run, then all three pass cleanly with no new warnings.

## Additional Context

### Dependencies

**External libraries — none added.** Everything needed already ships:

| Dependency | Version | Role |
| ---------- | ------- | ---- |
| `chart.js` | 4.5.1 | Already a dependency, already code-split. The new chart registers the identical component set (`BarElement`, `BarController`, `LinearScale`, `CategoryScale`, `Tooltip`) — no new Chart.js pieces, no second y-axis, no plugins |
| `drizzle-orm` | 0.45.1 | `innerJoin` + `select` only; no new operators |
| `better-sqlite3` | 12.6.2 | Unchanged, synchronous |

**Database:** no schema change, therefore **no migration** and no `npm run db:generate`. Every figure derives from `honey_sales`, `honey_harvests`, and `container_sizes` as they stand today.

**Data dependencies:** the page is meaningful only once `honey_sales` rows exist, which requires at least one harvest and one container size. All three flows already ship (`/harvests/new`, `/honey/containers/new`, `/sells/new`), so the empty state is the only unseeded case.

**Task dependencies:** Tasks 1 and 2 must land before Task 3. Task 3 must land before Tasks 6, 7, and 8. Task 4 must land before Task 5 (the hub cannot be written into `src/routes/stats/+page.svelte` until the sting page has been moved out of that path). Task 9 runs last.

**Ordering constraint:** Tasks 4 and 5 are a **single logical commit**. Between them the app is briefly inconsistent — `/stats` would 404 after the move and before the hub is written. Do not stop or hand off between the two.

### Testing Strategy

**Unit tests: none.** No test framework is configured, and adding one is out of scope — `project-context.md` requires going through `/bmad-tea-testarch-framework` for that. `npm run lint`, `npm run check`, and `npm run build` are the only automated gates and all three must pass.

**Manual testing** — Chrome DevTools at a **375 px** viewport, against a database holding at least: two harvests, two container sizes, and a mix of paid sales and gifts spanning two calendar years.

1. **Regression first.** Before touching anything, screenshot `/stats` and note the totals, the `Ø Stiche/Monat` value, and the span label. After Tasks 1 and 4, compare `/stats/stings` against that screenshot — every figure must match (AC2, AC4).
2. **Hub.** Tap `Statistik` in both the desktop nav and the mobile hamburger menu. Both tiles navigate correctly; the back-link on each sub-page returns to the hub (AC1).
3. **Defaults.** Open `/stats/sales` with no query string. Confirm the year resolves to the current year, both other filters read `Alle`, and the address bar is **not** rewritten (AC5).
4. **Fallback.** Temporarily filter to a year with no sales via the dropdown, reload, and confirm the empty-in-period rendering rather than an error (AC8).
5. **Cross-year lot.** Record a sale dated in the current year against a lot harvested last year. Confirm it counts toward the current year (AC22).
6. **Gift matrix.** Cycle the gift filter through all three states and check the KPI row, the chart, and all three tables each time (AC15–AC17).
7. **Zero-price sample.** Record a sale with `Preis = 0` and `Geschenk` unchecked. Confirm it appears under `Ohne Geschenke`, is absent under `Nur Geschenke`, and adds kilograms but no revenue (AC18).
8. **Rounding.** Record three sales at `10.10`, `10.20`, and `10.30 CHF` in one month. The `Erlös` tile must read exactly `30.60 CHF` (AC20).
9. **Duplicate lots.** Record two harvests on the **same date**, sell from each, and confirm the `Los` dropdown shows two distinguishable options that filter independently (AC21). This is the single highest-risk case in the spec.
10. **Chart staleness.** Change each filter in turn and confirm the bars update every time — the classic failure is a chart that only reacts to the year (AC26).
11. **Bad URLs.** Hit `/stats/sales?year=2025abc`, `?year=1999`, `?lot=abc`, `?lot=999999`, and `?gifts=maybe`, and confirm each returns a `400` with the correct German message (AC10–AC12).
12. **Empty database.** Against a database with no sales at all, confirm the page-level empty state and its link (AC30).
13. **Layout.** At 375 px, confirm the page body never scrolls horizontally and that the widest table scrolls within its own container (AC31).

**API verification:** none needed — these are page routes, not JSON endpoints, so there is nothing to `curl`.

### Notes

**High-risk items**

1. 🔴 **Same-day lot labels collide.** `honey_harvests` has a unique index on `client_id` only, and `lot` is recomputed as `L` + ddmmyyyy from `harvested_at`. Two harvests on one day therefore carry an identical label. Any filter keyed on the label string silently merges two distinct lots and reports a single inflated figure that looks entirely plausible. The filter is keyed on `harvest_id` throughout, and the dropdown disambiguates duplicate labels by harvest amount. **This is the defect most likely to ship unnoticed.**
2. 🔴 **`price_chf` is a line total.** Multiplying it by `amount` produces revenue that is wrong by a factor of six or twelve and still looks like a believable number. Verify against a known sale — AC14 exists precisely for this.
3. 🟠 **The `{#key}` must cover all three filters.** `StingsPerMonthChart` has no update path by design; the parent remounts it. Keying the honey chart on the year alone would leave stale bars whenever the lot or gift filter changes — a silent, visually convincing wrong answer.
4. 🟠 **Tasks 4 and 5 must land together.** `/stats` 404s in between.
5. 🟡 **UTC bucketing.** Copying the bucketing logic but calling `getFullYear()` instead of `getUTCFullYear()` would shift evening sales into the wrong month or year on a non-UTC dev machine while looking correct in production. Task 1 exists so that this logic has exactly one home.

**Known limitations** (accepted, not defects)

- **Customer grouping is exact string match.** `customer_name` is free text with no normalisation, so `Anna Muster` and `anna muster ` are two rows in `Top-Kunden`. Normalising would need either a customer entity or a trim/casefold key, both larger than this change.
- **Revenue is gross.** No cost of goods, no jar or label costs, no working time — `Erlös` is the sum of what was charged, not profit.
- **No sold-versus-harvested reconciliation.** `getHarvestEntriesWithRemaining()` already exposes remaining stock on `/harvests`; the statistics page deliberately does not duplicate it.
- **The default year pins itself once a filter is touched.** Because `applyFilter()` always emits all three params, changing the gift filter writes the resolved year into the URL. A bare `/stats/sales` link still means "current year" — only an explicitly built URL is pinned.
- **Single-currency.** CHF is assumed throughout, with no currency column and no conversion.

**Future considerations** (out of scope)

- A `kg` / `CHF` toggle on the chart, once it is clear which view gets used in practice.
- A year-over-year comparison — the same month bucketed across two years on one chart.
- CSV export of the breakdown tables for tax or record-keeping purposes.
- A `sold_at` index plus SQL-side bucketing, once sales pass roughly 5,000 rows. The scaling note already sits in `getStingStats()` and is carried into `getHoneySalesStats()`.
- Extending the hub with harvest statistics (yield per lot, multi-year trend), which would give the `/stats` hub a natural third tile.

## Review Notes

- Adversarial review completed (independent subagent, information-asymmetric).
- Manual verification completed: full 13-step Testing Strategy walked at 375 px against a
  seeded database copy (4 harvests incl. two same-day, 3 container sizes, 13 sales across
  2025-2026, gifts, a zero-price sample, and the 10.10/10.20/10.30 rounding trio).
  The developer's dev database was not modified.
- Gates: `npm run lint`, `npm run check` (0 errors), `npm run build` all pass.
- Findings: 19 total, 14 fixed, 5 skipped (judged noise or out-of-scope refactors).

### Fixed

- F1 (High) `Nach Los` rendered the raw, ambiguous lot label. The `<select>` and the table
  now share one `harvestId -> label` map; the table stacks the disambiguator on a muted
  second line so the 4-column layout still fits at 375 px.
- F4 `getSoldLots()` had no tiebreak, so same-day lots were listed in one order in the
  dropdown and the opposite order in the table. Both now sort `harvestedAt DESC, id DESC`.
- F5 The `{#key}` keyed on filter identity, so `invalidateAll()` (offline sync) refreshed
  the tables but left a stale chart. Both statistics pages now key on `data.stats.perMonth`
  — a fresh array on every `load()` run — which covers filter changes AND any other reload.
  This was a live defect on `/stats/stings`, whose sting incidents do sync offline.
- F6 `.back-link` was 16 px; now 44 px on both pages (AC32).
- F7 `Erlös` now reads `245.60 CHF` inline like the kg tiles (AC15); units render in a
  smaller `.kpi__unit` span so no tile wraps at 375 px.
- F8 Dropped the span sub-label from `Ø CHF/kg`, where it described nothing (per Task 8).
- F10 Rappen are now zeroed at the source for `isGift` rows, so C3 is enforced by the
  aggregation rather than only by `normalisePrice()` on the write path.
- F11 Two same-day harvests with an identical amount produced identical dropdown options;
  the disambiguator now falls back to `(#harvestId)`.
- F14 Added an `{#await}` pending block reserving the chart's box, so the card no longer
  collapses for a frame on each filter change.
- F16 Validate `?gifts=` without casting to the target type.
- F17 `statsBuckets` imported relatively, matching its neighbours in `queries/`.
- F19 Rewrote the shared module's doc block to lead with the general UTC rule rather than
  sting-specific prose, and to name both consumers.

- F2 / F3 (Medium) Gifted kilograms counted toward the `kg` column of all three breakdown
  tables while `CHF` was paid-only, so a row's columns did not reconcile
  (`L12072026`: 6.5 kg against 130.60 CHF, with `Ø` computed on 5.0 paid kg); and
  `Top-Kunden` listed pure gift recipients as customers. Resolved by decision: the main
  columns of every breakdown table now report PAID figures only, and each table carries a
  dedicated `Geschenk` (gift kg) column. Every row now reconciles — `L12072026` reads
  5.0 kg / 1.5 Geschenk / 130.60 CHF / Ø 26.12, and 130.60 ÷ 5.0 = 26.12 — and each
  column sums exactly to its KPI tile. `byContainer.containers` likewise counts paid
  containers only, so `Gebinde` and `kg` correspond.

  Note the ordering consequence: with `kg` now paid-only, `byCustomer` would collapse to
  alphabetical order under `Nur Geschenke` (every `chf` AND every paid `kg` is 0), which
  would break AC17. The sort gained a `giftKg` tiebreak to preserve it; verified with a
  recipient named to make alphabetical and kg-descending order disagree.

  Layout consequence: `Nach Los` is now 5 columns and scrolls ~26 px inside its own
  container at 375 px. That is the behaviour AC31 provides for; the page body still does
  not scroll sideways. The header was shortened to `Geschenk` and cell padding tightened
  so the other two tables still fit outright.

### Skipped
- F12 `<h1>` on `/stats/stings` reads `Stiche`, not `Statistik` — a deliberate deviation
  from Task 4's "exactly three edits", since the page now sits under a hub whose own `<h1>`
  and back-link both read `Statistik`. AC2's "renders exactly as the old /stats did" is
  literally false for the heading only. Accepted; noted here rather than silently left.
- F13 `monthLabel()` is duplicated across 3 remaining files. A real DRY point, but the
  refactor touches two files outside this spec's scope.
- F15 Hardcoded `rgba(245, 158, 11, 0.2)` focus shadow — matches 10 other files; changing
  it here alone would be the inconsistency.
- F18 Three `honey_sales` scans per request. Irrelevant at hobby volume; belongs with the
  existing 5,000-row scaling note.
- `containerCount` remains computed but unrendered. It is declared in the spec's
  `HoneySalesStats` interface, so it was left in place.
