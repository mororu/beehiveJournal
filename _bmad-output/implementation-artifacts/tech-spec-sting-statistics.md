---
title: 'Sting Statistics Overview'
slug: 'sting-statistics'
created: '2026-09-06'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  [
    'SvelteKit 2.50.2 (adapter-node, SSR)',
    'Svelte 5.51.0 (Runes mode, enforced)',
    'TypeScript 5.9.3 (strict)',
    'Drizzle ORM 0.45.1 + better-sqlite3 12.6.2 (synchronous)',
    'chart.js 4.5.1 (dynamic import, code-split)',
    'Vite 7.3.1 + vite-plugin-pwa 1.2.0',
  ]
files_to_modify:
  [
    'src/lib/client/utils/bodyZones.ts (CREATE)',
    'src/lib/components/BodyMap.svelte (MODIFY — import shared zones)',
    'src/lib/client/utils/date.ts (MODIFY — export MONTH_NAMES_SHORT_DE)',
    'src/lib/components/StingBodyHeatmap.svelte (CREATE)',
    'src/lib/components/StingsPerMonthChart.svelte (CREATE)',
    'src/lib/server/db/queries/stings.ts (MODIFY — add aggregation helpers)',
    'src/routes/stats/+page.server.ts (CREATE)',
    'src/routes/stats/+page.svelte (CREATE)',
    'src/routes/+layout.svelte (MODIFY — nav entry, desktop + mobile)',
  ]
code_patterns:
  [
    'Chart.js via await import() inside initChart(), tree-shaken registration',
    'onMount/onDestroy chart lifecycle; page-level {#await import(...)} for chart components',
    'Raw SQL via db.all<T>(sql`...`) with snake_case → camelCase mapping',
    'UTC bucketing — stung_at epochs encode the typed wall clock as UTC',
    'Synchronous query helpers — never async on better-sqlite3',
    'URL-driven filter state: goto(url, { replaceState: true }) + url.searchParams in load',
    'var(--color-x, #fallback) — CSS custom properties are NOT globally defined',
    'German UI, max-width 600px page, 44px touch targets',
  ]
test_patterns:
  [
    'No test framework configured — do not add one for this feature',
    'CI gates: npm run lint + npm run build (+ npm run check for svelte-check)',
    'Manual browser testing at 375px mobile viewport',
  ]
---

# Tech-Spec: Sting Statistics Overview

**Created:** 2026-09-06

## Overview

### Problem Statement

After roughly half a season of beekeeping, sting incidents are being logged reliably, but
`/stings` presents them only as a reverse-chronological list. There is no way to see how many
stings occurred, how they are distributed over the season, or which body locations are hit most
often. The accumulated data currently produces no insight.

### Solution

Add a new top-level page `/stats` (nav entry "Statistik") that aggregates `sting_incidents`
server-side into KPI tiles, a stings-per-month bar chart (Chart.js, dynamically imported like the
existing `HealthChart`), and a body-map heatmap that reuses the `BodyMap` zone geometry — all
scoped by a year selector driven from the URL.

### Scope

**In Scope:**

- New route `/stats` — `src/routes/stats/+page.server.ts` + `src/routes/stats/+page.svelte`
- Nav entry "Statistik" in both the desktop nav and the mobile menu of `src/routes/+layout.svelte`
- New aggregation query helpers in `src/lib/server/db/queries/stings.ts` (synchronous, no Drizzle
  calls in route files)
- Year selector driven by URL param `?year=`, default = current year, plus an "Alle" option;
  only years that actually have data are listed
- KPI tiles: total (all time), count in selected period, most frequent body location,
  average stings per month
- Bar chart: stings per month for the selected period
- New read-only `StingBodyHeatmap.svelte` shading each body zone by sting frequency, with a legend
- Refactor: extract the 16 body-zone definitions from `BodyMap.svelte` into
  `$lib/client/utils/bodyZones.ts`, consumed by both `BodyMap.svelte` and the new heatmap;
  `BodyMap` behaviour stays unchanged
- Export a shared `MONTH_NAMES_SHORT_DE` array from `$lib/client/utils/date.ts` (used by both the
  chart labels and the average-span sub-label)
- German UI throughout, mobile-first, 44px touch targets

**Out of Scope:**

- Statistics for hives, honey harvests/sales, inspections or todos — `/stats` is deliberately
  sting-only for this iteration
- Charts by hive, weekday or hour-of-day
- A hive filter on the statistics page
- Export (CSV/PDF), offline/service-worker caching of statistics
- Any DB schema change or migration
- Any change to the sting create/delete flows, the `/stings` list page, or `/api/stings`
- Retro-fixing the pre-existing UTC assumption in `src/lib/server/weather.ts`
- Adding validation of `bodyLocation` against the zone list on write paths
- Fixing the missing `LineController` registration in `HealthChart.svelte` (pre-existing bug —
  see Codebase Pattern 1)
- Fixing the write-path timezone dependency in `fromDatetimeLocal()`, or the resulting
  date-display drift on `/stings` (pre-existing — see Notes)
- Declaring the `--color-*` tokens globally in `app.html` (would change existing pages — see
  Technical Decision 8)

## Context for Development

### Codebase Patterns

**1. Chart.js is code-split, manually registered — and the existing registration is buggy.**
Both `HealthChart.svelte` and `WeatherHistoryChart.svelte` load Chart.js with
`await import('chart.js')` inside `initChart()` called from `onMount`, then register components.
Chart.js is never imported at module top level (only `import type { Chart as ChartType }`).

⚠️ **`HealthChart.svelte:44` registers `LineElement, PointElement, LinearScale, CategoryScale,
Tooltip, Filler` but NOT `LineController`, while building `type: 'line'`.** Under chart.js 4.5.1
that throws `"line" is not a registered controller` — it only survives because registration is
global and static, and `WeatherHistoryChart.svelte` (on `/diary/[entryId]`) registers
`LineController` and `BarController`. Visiting `/hives/[hiveId]` in a fresh session can break it.
**Do not copy the registration list from `HealthChart`.** A bar chart needs exactly
`BarElement, BarController, LinearScale, CategoryScale, Tooltip`. Fixing `HealthChart` is out of
scope for this spec (see Notes).

Shared options worth copying: `responsive: true, maintainAspectRatio: true, aspectRatio: 2.2`,
`plugins.legend.display: false` for single-series charts, `grid: { color: 'rgba(0,0,0,0.06)' }` on
y and `grid: { display: false }` on x, tick `font: { size: 10 | 11 }`. Teardown is
`chartInstance.destroy()` in `onDestroy`.

**2. Chart components are imported page-level via `{#await import(...)}`, and do NOT rebuild
themselves.**
Neither chart is a static import. Both pages use
`{#await import('$lib/components/X.svelte') then { default: X }}`
(`src/routes/hives/[hiveId]/+page.svelte:203`, `src/routes/diary/[entryId]/+page.svelte:98`).
Separately: `HealthChart` has an `$effect` that mutates `chartInstance.data` and calls
`chartInstance.update('active')`; `WeatherHistoryChart` has **no** such effect — it renders once.
Because the year selector navigates within the same route (`/stats?year=…`), SvelteKit reuses the
component instance and only swaps `data`, so a chart without an update path silently keeps showing
the previous year. This spec uses `{#key}` (Technical Decision 9).

**3. CSS custom properties are not defined globally — and cannot safely be.**
`src/app.html:24-27` defines only `--color-success-bg` and `--color-success-fg`. Every other colour
token exists solely as the fallback argument of `var(--color-accent, #f59e0b)` inside scoped
component styles. Two consequences:
- `readCssVar()` in `WeatherHistoryChart.svelte` always resolves to its hard-coded fallback. **Do
  not copy that helper** — pass literal hex values to Chart.js.
- Declaring the tokens globally is *not* a safe cleanup: `--color-border` is used with three
  different fallbacks across the codebase (`#d1d5db`, `#e5e7eb`, `#f3f4f6`), `--color-bg` with two
  (`#f3f4f6`, `#fafaf8`), `--color-text-muted` with two. Declaring them would visibly change
  existing pages.

**4. Component styles are scoped — nothing is "reused", it is copied.**
Svelte scopes every `<style>` block and `project-context.md:144-145` confirms there is no global
stylesheet beyond the `app.html` resets. `.chart-placeholder`, `.page`, `.page-header`,
`.empty-state`, `.btn`, `.filter-bar` and `.filter-select` each exist inside exactly one component.
Every new component that wants them must **copy the CSS block**. This spec names the source file
for each copy; `.card` does **not** exist anywhere in `src/` and is defined from scratch in Task 8.

**5. Aggregation precedent: raw SQL through Drizzle's `sql` tag.**
`getHarvestEntriesWithRemaining()` in `honeyHarvests.ts` uses
`db.all<{ snake_case fields }>(sql\`SELECT …\`)` and maps rows to camelCase.
`countInspectionsByHiveId()` uses the lighter `db.select({ count: sql<number>\`count(*)\` })` form.
Both are synchronous — `better-sqlite3` returns values directly and query helpers are never `async`.

**6. URL-driven filter state.**
`/stings` is the model: `+page.server.ts:15-21` reads `url.searchParams.get('hiveId')`, `parseInt`s
it and calls `error(400, 'Invalid hiveId filter')` on `NaN` — note the **string** form, not the
object form. `+page.svelte:26-29` reacts to `<select onchange>` with
`goto(url, { replaceState: true })`. The load function returns the active filter so the `<select>`
can be re-synced after reload.

**7. Auth is automatic for new routes.**
`src/routes/+layout.server.ts` guards everything except `/login*` and `/logout`, so `/stats` needs
no auth code. Per project rules, do **not** read `locals.user` in the page load.

**8. Nav has two lists that must be edited together.**
`+layout.svelte` renders `.nav-links` (desktop, hidden below 641px) and a separate `.mobile-menu`
panel. `/stats` needs an entry in both — the repo already has a spec for a mobile-nav regression
(`tech-spec-mobile-nav-hamburger-button-fix.md`), so this is a known trap. "Statistik" becomes the
6th desktop link; check horizontal fit just above the 641px breakpoint.

**9. Body-zone geometry is a literal array inside `BodyMap.svelte`.**
16 zones: one `circle` (`head`) and 15 `rect`s, each `{ id, label, shape, … coords }` on a
`viewBox="0 0 200 390"`, plus a separate `labels` array of 9 text overlays keyed by **`id`** (some
rotated -90°). Selection state is compared by **`label`** (`value === zone.label`) — the two arrays
use different keys, which matters for the heatmap (Task 6). The interactive markup uses
`role="button"`, `tabindex="0"`, `aria-pressed`, `onclick`/`onkeydown` per zone; the heatmap must
drop all of it.

**10. `bodyLocation` is unvalidated free text, but only one path writes it.**
`stings/new/+page.server.ts` (hidden input, trimmed) and `POST /api/stings` both accept any
non-empty string and store it verbatim. **The offline sync client never posts stings** — the
IndexedDB outbox has only `outbox` (inspections) and `harvests-outbox`
(`src/lib/client/offline/db.ts:9-10`), and `syncOutbox()` calls only
`/api/hives/*/inspections` and `/api/harvests` (`src/lib/client/offline/sync.ts:45,87`). So
`POST /api/stings` is reachable only by a hand-crafted request. In practice every stored value comes
from the body map and matches a zone label; the "Sonstige" bucket is cheap defensiveness against a
hand-written row or a future zone rename, not a live data path.

**11. Timezone: `stung_at` encodes the typed wall clock as UTC.**
`fromDatetimeLocal()` is `Math.floor(new Date(value).getTime() / 1000)`
(`src/lib/client/utils/date.ts:45-47`) and is called **server-side** in
`src/routes/stings/new/+page.server.ts:35`. `new Date("YYYY-MM-DDTHH:mm")` parses in the *server's*
zone, and the container sets no `TZ` (`Dockerfile` `node:20-alpine`, no `TZ` in
`docker-compose.yml`) — so the stored epoch is the entered wall clock interpreted as UTC. Reading it
back with `getUTC*()` therefore reproduces exactly what was typed into the form. Bucketing in
`Europe/Zurich` would shift every value +1/+2h and push evening entries into the following day,
month or year. See Technical Decision 6.

**12. `@typescript-eslint/no-non-null-assertion` is NOT enabled.**
`eslint.config.js` spreads `ts.configs.recommended.rules`, which does not include that rule —
`isNaN(hiveId!)` at `src/routes/api/stings/+server.ts:12` passes `npm run lint` today. `!` is
permitted; this spec prefers optional chaining for readability, not because a rule forbids it.

**13. Date utilities and locale are inconsistent.**
`$lib/client/utils/date.ts` formats with `en-GB` (`formatDate` → "Mon 12 Jan 2026"), while
`HealthChart.svelte:27` inlines `toLocaleDateString('de-DE', …)`. For fixed month names this spec
adds one shared literal German array to `date.ts` (Task 5a) rather than a third approach.

**14. PWA needs no change — and offers no offline shell.**
`vite.config.ts` precaches build output by glob and sets `navigateFallback: null`, which
deliberately disables serving a cached shell for navigation requests; runtime caching is scoped to
`/api/hives*` and Open-Meteo. A new SSR route and a new Chart.js chunk need no config entry, and
`/stats` is **not** expected to work offline.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/lib/server/db/schema.ts:80-93` | `stingIncidents` definition; `stungAt` epoch **seconds**, `hiveId` nullable, `bodyLocation` text, unique index on `clientId`. No index on `stung_at`. Use `$inferSelect`. |
| `src/lib/server/db/queries/stings.ts` | Where the new aggregation helpers go; existing functions show the file's style. |
| `src/lib/server/db/queries/honeyHarvests.ts:29-75` | Raw-SQL aggregation pattern: `db.all<T>(sql\`…\`)` + snake_case → camelCase, with a comment explaining the query choice. |
| `src/lib/server/db/queries/inspections.ts:55-61` | Lighter aggregation form: `db.select({ count: sql<number>\`count(*)\` })`. |
| `src/lib/components/HealthChart.svelte` | Chart.js lifecycle reference — dynamic import, `onMount`/`onDestroy`, placeholder branch, `.chart-wrap` styles, and `import type` from `$lib/server/…` at line 4. ⚠️ **Its `Chart.register` list is buggy — see Codebase Pattern 1.** Copy `.chart-placeholder` CSS from lines 196-210. |
| `src/lib/components/WeatherHistoryChart.svelte:92-99` | Correct bar-dataset config and a correct controller registration (`BarController` + `LineController`). Ignore `readCssVar` (Codebase Pattern 3). |
| `src/lib/components/BodyMap.svelte:4-169` | The 16 zones (keyed by `id`, matched by `label`) and 9 text labels (keyed by `id`) to extract; `.zone` fill/stroke styling to mirror in the heatmap. |
| `src/routes/hives/[hiveId]/+page.svelte:203` | The `{#await import('$lib/components/X.svelte') then { default: X }}` page-level chart-loading pattern. |
| `src/routes/stings/+page.server.ts:15-21` | URL-param parsing + `error(400, 'string')` pattern for the year selector. |
| `src/routes/stings/+page.svelte:26-29, 196-224` | `goto(url, { replaceState: true })` filter bar; `.page` / `.page-header` / `.empty-state` / `.btn` / `.filter-bar` / `.filter-select` CSS to **copy** (note `.filter-select` is 40px — see Task 8). |
| `src/routes/harvests/+page.server.ts:11` | Synchronous `load` precedent. |
| `src/routes/honey/+page.svelte:8-25, 44-56` | Responsive tile-grid **layout** precedent only (`grid-template-columns`, card border/radius). It holds navigation cards with title+description — there is **no** KPI/metric-tile precedent in this repo, so that styling is new. |
| `src/routes/+layout.svelte:61-96` | The two nav lists that both need the "Statistik" entry. |
| `src/routes/+layout.server.ts` | Confirms `/stats` is auth-guarded automatically. |
| `src/lib/client/utils/date.ts` | Existing date helpers; where `MONTH_NAMES_SHORT_DE` is added (Task 5a). Note `fromDatetimeLocal` runs server-side — the basis of Technical Decision 6. |
| `src/app.html:24-27` | The only global `:root` block — proof that the `--color-*` tokens are undeclared. |
| `_bmad-output/project-context.md` | Binding project rules (ESM `.js` imports, runes-only, no Drizzle in routes, epoch seconds, German UI, 44px targets). |

### Technical Decisions

Decisions 1–4 were locked during discovery (Step 1). Decisions 5–10 were added by the Step 2
investigation. Decisions 11–14 were added or corrected after the adversarial review (Step 4).

1. **Placement** — top-level nav entry "Statistik" pointing at `/stats`; the page renders sting
   statistics directly (no hub/tile page), accepting that future non-sting statistics will require
   a restructure.
2. **Visualisations** — KPI tiles + stings-per-month bar chart, plus the body-map heatmap.
   Explicitly *not* included: per-hive chart, weekday/hour-of-day distribution, body-location bar
   chart (the heatmap covers that dimension).
3. **Time range** — year selector defaulting to the current year, with an "Alle" option; state
   lives in the URL (`?year=`) so reload and sharing preserve the view, matching the existing
   `?hiveId=` filter pattern on `/stings`.
4. **Zone geometry** — extracted into a shared module so `BodyMap.svelte` (interactive) and
   `StingBodyHeatmap.svelte` (read-only) have a single source of truth. Requires a manual retest of
   the sting entry form since a working feature is touched.
5. **Module placement** — the extracted geometry lives at `$lib/client/utils/bodyZones.ts`, not in
   `$lib/components/`. `project-context.md:153-160` reserves `src/lib/components/` for PascalCase
   `.svelte` files and puts shared client utilities in `src/lib/client/utils/`. Server code already
   imports from that directory (`weather.ts:6`, `stings/new/+page.server.ts:6`), so the boundary is
   established.
6. **UTC bucketing** — all year/month buckets are derived with `getUTCFullYear()` /
   `getUTCMonth()`, deliberately **not** with a named timezone.
   *Rationale:* `fromDatetimeLocal()` executes server-side and the container runs UTC, so
   `stung_at` already stores the typed wall clock as if it were UTC (Codebase Pattern 11). Reading
   it back in UTC reproduces exactly the date the user entered into the form.
   *Rejected:* `Intl` with `timeZone: 'Europe/Zurich'` — shifts every value +1/+2h and pushes
   evening entries into the next day/month/year, i.e. it manufactures the bug it appears to fix.
   *Rejected:* changing the write path to parse in a fixed zone — correct, but it needs a migration
   of existing rows and touches inspections and the diary too; out of scope (see Notes).
   *Consequence, accepted:* `/stings` renders dates client-side in the browser's zone, so for a
   sting entered late in the evening the list already shows the following day while `/stats` will
   bucket it on the day it was typed. The two disagree for those rows. Stats follow the typed value;
   the list's display is the pre-existing bug.
7. **Aggregation location** — aggregation lives in `$lib/server/db/queries/stings.ts`, not in the
   route and not in the component, per the "no Drizzle in route files" rule. Implemented as one row
   fetch + JS reduce: a single round trip, all bucketing logic in one place, trivial at this volume.
   SQL `GROUP BY strftime('%Y-%m', stung_at, 'unixepoch')` is now an equally correct alternative
   (UTC bucketing makes `strftime` right) and is the natural optimisation if the table ever grows —
   see Notes.
8. **Colour handling** — Chart.js and the heatmap fills receive **literal hex values**. This
   knowingly deviates from `project-context.md:216` ("Never hardcode color values") because
   (a) Chart.js cannot consume CSS custom properties, and (b) the tokens are undeclared and cannot
   safely be declared — three different `--color-border` fallbacks exist in the codebase
   (Codebase Pattern 3). Component `<style>` blocks still use `var(--token, #fallback)` like every
   other component. If the tokens are ever centralised, the chart colours become the one place to
   revisit.
9. **Chart refresh** — the monthly chart is wrapped in `{#key data.selectedYear}` in
   `+page.svelte`. Simpler than replicating the `$effect` mutation dance from `HealthChart`, and
   correct by construction: the component is destroyed (`onDestroy` → `chart.destroy()`) and rebuilt
   when the year changes.
10. **Two new components, not one** — `StingsPerMonthChart.svelte` (Chart.js, loaded via
    `{#await import()}`) and `StingBodyHeatmap.svelte` (plain SVG, static import) stay separate so
    the heatmap never pulls the Chart.js chunk.
11. **"Ø Stiche/Monat" formula** — `totalInPeriod ÷ (number of months spanned from the first to the
    last sting inside the selected period, inclusive)`, denominator floored at 1, rounded to one
    decimal, rendered German-style with a comma. *Rejected:* dividing by 12 (understates a part
    season) and dividing by months elapsed so far (jumps on 1 January). The tile carries a sub-label
    naming the span so the number is never ambiguous.
12. **Invalid `?year=` returns 400** — matching the `?hiveId=` precedent on `/stings`, which uses
    the **string** form `error(400, '…')` in a page load (the `error(400, { message })` rule in
    `project-context.md:49-50` is scoped to API routes). The message is German because it is
    user-facing; the existing precedent is mixed (`'Invalid hiveId filter'` vs
    `'Ernte nicht gefunden'`). Validation is strict — `/^\d{4}$/` plus a 2000–2100 range — so
    `?year=2025abc`, `?year=-4` and `?year=999999` are all rejected rather than silently coerced.
13. **Heatmap steps adapt to the data** — with a half-season of data `max` is often 1 or 2, which
    collapses a fixed quartile scale into a single indistinguishable shade. Thresholds are therefore
    computed, deduplicated and clamped to strictly increasing values, and the legend renders only
    the steps that actually exist (Task 6).
14. **No canonical redirect** — when `/stats` is opened with no `?year=`, the resolved default is
    rendered as-is without redirecting to `/stats?year=NNNN`. The `<select>` reflects
    `data.selectedYear`, so the UI is never ambiguous, and a bare `/stats` link keeps working as
    "whatever is current".

## Implementation Plan

### Tasks

Ordered by dependency: shared modules → data layer → components → page → navigation.

- [x] **Task 1: Extract the body-zone geometry into a shared module**
  - File: `src/lib/client/utils/bodyZones.ts` (CREATE)
  - Action: Move the `zones` array (16 entries) and the `labels` array (9 entries) verbatim out of
    `BodyMap.svelte` into this module and export them, together with the viewBox constant and a
    matching helper. Note the two key spaces: geometry and text labels are keyed by **`id`**, while
    `sting_incidents.body_location` joins on **`label`**.

    ```ts
    // src/lib/client/utils/bodyZones.ts
    //
    // Single source of truth for the body-map geometry. Consumed by the interactive
    // BodyMap (sting entry) and the read-only StingBodyHeatmap (statistics).

    export type BodyZone =
    	| { id: string; label: string; shape: 'circle'; cx: number; cy: number; r: number }
    	| {
    			id: string;
    			label: string;
    			shape: 'rect';
    			x: number;
    			y: number;
    			width: number;
    			height: number;
    			rx: number;
    	  };

    export interface BodyZoneTextLabel {
    	id: string;
    	x: number;
    	y: number;
    	text: string;
    	rotate?: number;
    }

    export const BODY_MAP_VIEWBOX = '0 0 200 390';
    export const BODY_ZONES: BodyZone[] = [ /* the 16 entries, coordinates unchanged */ ];
    export const BODY_ZONE_TEXT_LABELS: BodyZoneTextLabel[] = [ /* the 9 entries, unchanged */ ];
    ```

    Then add the counting helper. **`perZone` is keyed by zone `id`**, so the text-label contrast
    logic in Task 6 (whose entries carry `id`) can look counts up directly:

    ```ts
    /**
     * Maps raw body_location counts onto zone ids, keeping anything that matches no
     * zone label in a separate list. body_location is free text on the write paths,
     * so an exact label match is not guaranteed (see Codebase Pattern 10).
     *
     * @returns perZone - counts keyed by zone **id** (zones with no stings are absent)
     * @returns unmatched - counts whose label matched no zone, descending by count
     */
    export function splitCountsByZone(byLocation: { label: string; count: number }[]): {
    	perZone: Map<string, number>;
    	unmatched: { label: string; count: number }[];
    } { /* build a label→id index from BODY_ZONES once, then partition */ }
    ```

  - Notes: Copy the coordinates exactly — do not "tidy" them, the layout is hand-tuned, and the
    `label` strings are the join key to stored data. Keep `shape: 'circle'`/`'rect'` as literal
    types so the `{#if zone.shape === 'circle'}` narrowing in both consumers still type-checks.
    Run `npm run check` after this task, before touching anything else.

- [x] **Task 1a: Add the shared German month names**
  - File: `src/lib/client/utils/date.ts` (MODIFY)
  - Action: Append
    `export const MONTH_NAMES_SHORT_DE = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'] as const;`
    with a one-line comment noting it is indexed 0–11 to match `Date.getUTCMonth()`.
  - Notes: Needed by both `StingsPerMonthChart.svelte` (axis labels) and `stats/+page.svelte` (the
    "Mär–Aug" span sub-label) — defining it in one place avoids a third date-formatting approach in
    this codebase (Codebase Pattern 13).

- [x] **Task 2: Point `BodyMap.svelte` at the shared module**
  - File: `src/lib/components/BodyMap.svelte` (MODIFY)
  - Action: Delete the local `zones` and `labels` arrays; add
    `import { BODY_ZONES, BODY_ZONE_TEXT_LABELS, BODY_MAP_VIEWBOX } from '$lib/client/utils/bodyZones.js';`
    and rename the two `{#each}` sources plus the `zones.find(...)` lookup in the text-label block.
    Use `BODY_MAP_VIEWBOX` for the `viewBox` attribute.
  - Notes: **Behaviour must not change at all** — same markup, same classes, same `select()` toggle
    semantics (tapping the selected zone clears it), same `<style>` block. Note the `.js` extension
    in the import (ESM rule). This is the only change to existing, working UI.

- [x] **Task 3: Add the UTC bucketing primitives**
  - File: `src/lib/server/db/queries/stings.ts` (MODIFY — append a new `Statistics` section)
  - Action: Add the module-private helpers. Implement the bodies as described:

    ```ts
    /**
     * Buckets are computed in UTC — deliberately, not in Europe/Zurich.
     *
     * fromDatetimeLocal() runs SERVER-side (src/routes/stings/new/+page.server.ts:35)
     * and the app container sets no TZ (node:20-alpine → UTC), so stung_at stores the
     * wall clock the user typed as if it were UTC. Reading it back with getUTC*()
     * reproduces exactly the entered date. Bucketing in Europe/Zurich would shift every
     * value +1/+2h and push evening entries into the following day, month or year.
     */

    /** Unix epoch seconds → "YYYY-MM" in UTC. */
    function monthKey(epoch: number): string {
    	const d = new Date(epoch * 1000);
    	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }

    /** Unix epoch seconds → calendar year in UTC. */
    function yearOf(epoch: number): number {
    	return new Date(epoch * 1000).getUTCFullYear();
    }

    /** Inclusive list of "YYYY-MM" keys from `from` to `to`; [] if from > to. */
    function monthRange(from: string, to: string): string[] {
    	/* parse both into (year, month) ints and step month by month */
    }
    ```

  - Notes: No `Intl`, no timezone database, no formatter instance — plain `getUTC*` accessors are
    host-independent by construction. Do not reintroduce a named timezone here without re-reading
    Technical Decision 6.

- [x] **Task 4: Add the three statistics query functions**
  - File: `src/lib/server/db/queries/stings.ts` (MODIFY — same section as Task 3)
  - Action: Add the exported types, then implement the three functions. **The signatures below are
    declarations for reference — write real bodies, not bodiless declarations.**

    ```ts
    export interface StingMonthBucket {
    	key: string; // "YYYY-MM"
    	count: number;
    }

    export interface StingLocationCount {
    	label: string;
    	count: number;
    }

    export interface StingStats {
    	totalAllTime: number;
    	totalInPeriod: number;
    	perMonth: StingMonthBucket[];
    	byLocation: StingLocationCount[]; // descending by count, then label A→Z
    	topLocation: StingLocationCount | null;
    	avgPerMonth: number; // one decimal, formatted for display by the page
    	spanFrom: string | null; // "YYYY-MM" of the first sting in the period
    	spanTo: string | null; // "YYYY-MM" of the last sting in the period
    }
    ```

    **`getStingYears(): number[]`** — `db.select({ stungAt: stingIncidents.stungAt }).from(stingIncidents).all()`,
    map through `yearOf()`, dedupe into a `Set`, return sorted **descending**. Must use `yearOf()`,
    not SQL `strftime`, so the dropdown can never disagree with the buckets.

    **`currentStatsYear(): number`** — `new Date().getUTCFullYear()`. Used only to pick the default
    selection.

    **`getStingStats(opts: { year: number | null }): StingStats`**:
    1. `const rows = db.select({ stungAt: stingIncidents.stungAt, bodyLocation: stingIncidents.bodyLocation }).from(stingIncidents).all();`
    2. `totalAllTime = rows.length`
    3. Filter to the period: keep every row when `year === null`, else `yearOf(r.stungAt) === year`
    4. Reduce the filtered rows into a `Map<string, number>` keyed by `monthKey(r.stungAt)` and a
       second `Map<string, number>` keyed by `r.bodyLocation`
    5. `spanFrom` / `spanTo` = the lexicographically smallest / largest month key present, or `null`
       when the period is empty (`"YYYY-MM"` sorts correctly as a string)
    6. `perMonth`: for a concrete year, emit all twelve keys `YYYY-01 … YYYY-12` (zeros included) so
       the seasonal shape is readable; for `year === null`, emit
       `monthRange(spanFrom, spanTo)` so gaps render as zero bars rather than collapsing the axis
    7. `byLocation`: sort by `count` descending, then `label` ascending (`localeCompare`) so ties are
       deterministic; `topLocation = byLocation[0] ?? null`
    8. Average — narrow the nullable span explicitly (strict mode is on):
       ```ts
       const months = spanFrom !== null && spanTo !== null ? monthRange(spanFrom, spanTo).length : 0;
       const avgPerMonth =
       	totalInPeriod === 0 ? 0 : Math.round((totalInPeriod / Math.max(1, months)) * 10) / 10;
       ```
  - Notes: **Synchronous — no `async`/`await`** (`better-sqlite3`). Select only the two columns
    needed. Do not import anything from `$lib/components/` into this server module.

- [x] **Task 5: Build the monthly bar chart component**
  - File: `src/lib/components/StingsPerMonthChart.svelte` (CREATE)
  - Action: Props — note **`import type`**, which is mandatory here:

    ```ts
    import type { StingMonthBucket } from '$lib/server/db/queries/stings.js';

    interface Props {
    	buckets: StingMonthBucket[];
    	/** 'year' → "Mär"; 'all' → "Mär 26" */
    	mode: 'year' | 'all';
    }
    ```

    - `import type` is required: `verbatimModuleSyntax` is on, so a value import would be emitted at
      runtime and SvelteKit hard-fails any client-side import of `$lib/server/*`.
      `HealthChart.svelte:4` is the precedent.
    - Also `import type { Chart as ChartType } from 'chart.js';` and
      `import { MONTH_NAMES_SHORT_DE } from '$lib/client/utils/date.js';`
    - Inside `initChart()`:
      `const { Chart, BarElement, BarController, LinearScale, CategoryScale, Tooltip } = await import('chart.js');`
      then `Chart.register(BarElement, BarController, LinearScale, CategoryScale, Tooltip);`
      — `BarController` is **required**; omitting it is the live bug in `HealthChart` (Pattern 1)
    - Labels: `MONTH_NAMES_SHORT_DE[Number(key.slice(5, 7)) - 1]`, plus `' ' + key.slice(2, 4)` in
      `'all'` mode (→ `Mär 26`)
    - Dataset: `backgroundColor: '#f59e0b'`, `hoverBackgroundColor: '#d97706'`, `borderWidth: 0`,
      `borderRadius: 4`
    - Options: `responsive: true, maintainAspectRatio: true, aspectRatio: 2.2`,
      `plugins.legend.display: false`,
      `scales.y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.06)' } }`,
      `scales.x: { ticks: { font: { size: 10 }, maxRotation: 45, maxTicksLimit: 12 }, grid: { display: false } }`
    - Tooltip label callback returns `1 Stich` for 1 and `${n} Stiche` otherwise
    - `onMount(initChart)` / `onDestroy(destroyChart)` with `chartInstance.destroy()`
    - Markup: `<div class="chart-wrap">` + `<canvas bind:this={canvas} aria-label="Stiche pro Monat">`;
      when `buckets.length === 0`, render the dashed placeholder box instead with
      "Keine Stiche in diesem Zeitraum."
    - **Copy** the `.chart-wrap` and `.chart-placeholder` CSS from `HealthChart.svelte:196-210`
      into this component's `<style>` block — styles are scoped, nothing is inherited
      (Codebase Pattern 4)
  - Notes: Pass literal hex to Chart.js; do not copy `readCssVar` (Codebase Pattern 3). No `$effect`
    is needed — the page re-keys the component (Task 8).

- [x] **Task 6: Build the body-map heatmap component**
  - File: `src/lib/components/StingBodyHeatmap.svelte` (CREATE)
  - Action: Plain SVG, **no Chart.js**. Props: `{ byLocation: StingLocationCount[] }` (again via
    `import type`).
    - `const { perZone, unmatched } = $derived(splitCountsByZone(byLocation));` — `perZone` is keyed
      by zone **id**
    - `const max = $derived(perZone.size === 0 ? 0 : Math.max(...perZone.values()));`
    - **Adaptive steps** (Technical Decision 13): build candidate upper bounds
      `[ceil(max*0.25), ceil(max*0.5), ceil(max*0.75), max]`, then dedupe and keep only strictly
      increasing values ≥ 1. Assign the amber ramp to as many steps as survive, always ending at the
      darkest: `['#fef3c7', '#fcd34d', '#f59e0b', '#d97706']` sliced from the end when fewer than
      four steps exist. `max = 1` → one step (`#d97706`); `max = 2` → two steps. Zones with zero
      stings keep the neutral `#f3f4f6` fill used by `BodyMap`
    - Render `BODY_ZONES` with `BODY_MAP_VIEWBOX`, mirroring `BodyMap`'s `<circle>`/`<rect>` markup
      but **inert**: no `role="button"`, no `tabindex`, no `aria-pressed`, no `onclick`/`onkeydown`,
      no hover/focus style, `cursor: default`. **Keep pointer events enabled** — a
      `<title>` child needs them to show the native tooltip. `stroke: #d1d5db; stroke-width: 1.5`
      as in `BodyMap`
    - Tooltip text: `{label}: 1 Stich` for one, `{label}: {n} Stiche` otherwise — same pluralisation
      rule as the chart
    - Render `BODY_ZONE_TEXT_LABELS` unchanged with `pointer-events="none"`; look each entry's count
      up by `id` in `perZone` and switch the text fill to `#ffffff` when that zone's computed fill is
      `#f59e0b` or `#d97706`
    - `<svg role="img" aria-label="Körperkarte — Stiche nach Körperstelle">`
    - Below the map: a legend row with one swatch per **existing** step and its numeric range, then a
      chip list of every zone with `count > 0` (`Linke Hand 12`, …, descending). The chip list is the
      accessible text equivalent — colour alone must not carry the data
    - If `unmatched.length > 0`, append a `Sonstige` line listing those labels and counts so the
      figures reconcile with the KPI total (Codebase Pattern 10)
    - If `byLocation.length === 0`, render the dashed placeholder box with
      "Keine Stiche in diesem Zeitraum."
  - Notes: Copy `.svg { width: 100%; max-width: 200px; height: auto; }` and the `.chart-placeholder`
    block as in Task 5. Zone fills are set via the `fill` **attribute** from the scale function;
    static colours in `<style>` keep the `var(--token, #fallback)` form.

- [x] **Task 7: Create the statistics page — server load**
  - File: `src/routes/stats/+page.server.ts` (CREATE)
  - Action:

    ```ts
    export const load: PageServerLoad = ({ url }) => {
    	const years = getStingYears();
    	const yearParam = url.searchParams.get('year');

    	let year: number | null;
    	if (yearParam === null || yearParam === '') {
    		const current = currentStatsYear();
    		year = years.includes(current) ? current : (years[0] ?? current);
    	} else if (yearParam === 'all') {
    		year = null;
    	} else {
    		// Strict: reject '2025abc', '-4', '999999' rather than coercing them (Decision 12)
    		if (!/^\d{4}$/.test(yearParam)) error(400, 'Ungültiger Jahresfilter');
    		const parsed = Number(yearParam);
    		if (parsed < 2000 || parsed > 2100) error(400, 'Ungültiger Jahresfilter');
    		year = parsed;
    	}

    	return { stats: getStingStats({ year }), years, selectedYear: year };
    };
    ```

  - Notes: Synchronous `load` (see `harvests/+page.server.ts:11`). No form actions — the page is
    read-only. Do **not** touch `locals.user`; `/stats` is already covered by the root layout guard.
    Use the **string** form of `error()`, matching the page-load precedent at
    `stings/+page.server.ts:18`. A valid year with no data is not an error — it renders the empty
    period state. No redirect is issued when the year is defaulted (Technical Decision 14).

- [x] **Task 8: Create the statistics page — markup**
  - File: `src/routes/stats/+page.svelte` (CREATE)
  - Action: `let { data }: { data: PageData } = $props();` and:
    - `<svelte:head><title>Statistik — beehiveJournal</title></svelte:head>`
    - `.page` wrapper (`max-width: 600px; margin: 0 auto`) with `<h1>Statistik</h1>` — copy `.page`
      and `.page-header` CSS from `stings/+page.svelte`
    - Year selector: copy the `.filter-bar` / `.filter-select` markup and CSS from
      `stings/+page.svelte:196-224`, **but set `min-height: 44px` instead of `height: 40px`** —
      `project-context.md:148-150` requires 44px targets and the existing 40px control is a
      pre-existing deviation this spec does not propagate. Label "Zeitraum"; options `Alle`
      (`value="all"`) plus each year in `data.years` descending; `value` bound to
      `data.selectedYear === null ? 'all' : String(data.selectedYear)`; `onchange` →
      `goto('/stats?year=' + v, { replaceState: true })`
    - KPI tiles (`<ul class="kpis">`, 2 columns on mobile, 4 at `min-width: 641px`). There is **no**
      KPI precedent in the repo — take only the grid/border/radius idiom from
      `honey/+page.svelte:44-56` and write the metric styling fresh:
      1. `Gesamt` → `stats.totalAllTime`
      2. `{data.selectedYear ?? 'Alle'}` → `stats.totalInPeriod`
      3. `Top-Körperstelle` → `stats.topLocation?.label ?? '—'`, sub-label `({count})`
      4. `Ø Stiche/Monat` → `stats.avgPerMonth.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })`
         (→ `5,2`, and `5,0` rather than `5`), sub-label = the span
    - **Span sub-label** from `stats.spanFrom` / `spanTo` using `MONTH_NAMES_SHORT_DE`:
      same month → `Mär`; same year → `Mär–Aug`; different years → `Mär 25–Aug 26`;
      `spanFrom === null` → `—`
    - Section "Stiche pro Monat" in a `.card`, containing the chart. `.card` does **not** exist in
      this codebase — define it here (`background: var(--color-surface, #ffffff); border: 1.5px solid
      var(--color-border, #e5e7eb); border-radius: 10px; padding: 1rem;`) with an `<h2>` heading.
      Load the chart page-level, matching `hives/[hiveId]/+page.svelte:203`:

      ```svelte
      {#key data.selectedYear}
      	{#await import('$lib/components/StingsPerMonthChart.svelte') then { default: StingsPerMonthChart }}
      		<StingsPerMonthChart
      			buckets={data.stats.perMonth}
      			mode={data.selectedYear === null ? 'all' : 'year'}
      		/>
      	{/await}
      {/key}
      ```

      The dynamic import is module-cached, so re-keying costs nothing after the first load.
    - Section "Nach Körperstelle" in a `.card`, containing
      `<StingBodyHeatmap byLocation={data.stats.byLocation} />` — a **static** import (no Chart.js,
      nothing to code-split)
    - If `data.stats.totalAllTime === 0`: render only the `.empty-state` box (copied from
      `stings/+page.svelte`) — "Noch keine Stichvorfälle erfasst." plus a link to `/stings/new` —
      and skip the selector, tiles and both sections
    - If `totalAllTime > 0` but `totalInPeriod === 0`: keep the selector and tiles, and let each
      component render its own placeholder
  - Notes: The `{#key}` wrapper is load-bearing — without it the chart keeps rendering the previous
    year (Codebase Pattern 2). Runes only: `$props()`, no `export let`, no `$:`. Every interactive
    element keeps `min-height: 44px`.

- [x] **Task 9: Add the "Statistik" navigation entry**
  - File: `src/routes/+layout.svelte` (MODIFY)
  - Action: Add `<a href="/stats" class="nav-link">Statistik</a>` to `.nav-links` after the
    "Tagebuch" link (before `<PendingSyncBadge />`), and
    `<a href="/stats" class="mobile-nav-link" onclick={() => (menuOpen = false)}>Statistik</a>` to
    the `.mobile-menu` panel after "Tagebuch" (before "Einstellungen").
  - Notes: Both lists must be edited — the repo already has a spec for a mobile-nav regression.
    "Statistik" is the 6th desktop link; verify it still fits on one line just above the 641px
    breakpoint and does not push `.nav-right` off the row.

- [x] **Task 10: Verify and format**
  - Action: Run `npm run check`, `npm run format`, `npm run lint`, `npm run build` — in that order.
  - Notes: The current baseline is **0 errors, 44 warnings across 7 files**; the change must not add
    errors or increase the warning count. Prettier is tabs / single quotes / `printWidth: 100`, so
    run `format` before `lint`.

### Acceptance Criteria

**Navigation and access**

- [x] AC1: Given a logged-in user on any page, when they look at the desktop navigation, then a
      "Statistik" entry appears after "Tagebuch" and links to `/stats`; the same entry is present in
      the mobile hamburger panel and closes the panel when tapped.
- [x] AC2: Given a logged-out visitor, when they request `/stats`, then they are redirected to
      `/login` by the existing root-layout guard (no new auth code).

**Year selector**

- [x] AC3: Given stings exist in the current year, when the user opens `/stats` with no query
      string, then the year selector shows the current year and all figures cover that year only.
- [x] AC4: Given stings exist but none in the current year, when the user opens `/stats` with no
      query string, then the most recent year that has data is selected, the `<select>` displays
      that year, and the URL stays `/stats` without a redirect.
- [x] AC5: Given the user is on `/stats`, when they pick a different year in the selector, then the
      URL becomes `/stats?year=<year>` (replacing history), the KPI tiles, the monthly chart and the
      heatmap all update to that year, and reloading the page preserves the selection.
- [x] AC6: Given the user is on `/stats`, when they pick "Alle", then the URL becomes
      `/stats?year=all`, the monthly chart spans every month from the first to the last recorded
      sting, and month labels include the two-digit year (e.g. "Mär 26").
- [x] AC7: Given the selector, when it is rendered, then it lists only years that actually contain
      stings, newest first, plus the "Alle" option — and those years are derived with the same
      `getUTCFullYear()` logic as the buckets, so the dropdown can never offer a year whose page is
      empty.
- [x] AC8: Given a request to `/stats?year=abc`, `/stats?year=2025abc`, `/stats?year=-4` or
      `/stats?year=999999`, when the page loads, then each returns 400 with the message
      "Ungültiger Jahresfilter" — none is silently coerced to a valid year.
- [x] AC9: Given a request to `/stats?year=1999` (well-formed, in range, no data), when the page
      loads, then the page renders normally with zeroed figures and the components' empty
      placeholders — not an error.
- [x] AC10: Given the year selector control, when it is measured, then it is at least 44px tall.

**KPI tiles**

- [x] AC11: Given 47 stings in total and 31 in the selected year, when the page renders, then the
      "Gesamt" tile shows 47 and the period tile shows 31 — "Gesamt" is unaffected by the year
      selection.
- [x] AC12: Given "Linke Hand" is the most frequent body location in the selected period with 12
      stings, when the page renders, then the "Top-Körperstelle" tile shows "Linke Hand" with 12 as
      its sub-label.
- [x] AC13: Given two body locations tie for the top count, when the page renders, then the
      alphabetically first label is shown, and the choice is stable across reloads.
- [x] AC14: Given 31 stings in the selected period spanning March to August of one year, when the
      page renders, then "Ø Stiche/Monat" shows **"5,2"** (31 ÷ 6, one decimal, German comma) with
      "Mär–Aug" as its sub-label.
- [x] AC15: Given an average that lands on a whole number, when the page renders, then it is shown
      as "5,0" — not "5".
- [x] AC16: Given all stings in the period fall in one month, when the page renders, then the span
      sub-label shows a single month ("Mär"), not "Mär–Mär".
- [x] AC17: Given "Alle" is selected and the data spans more than one year, when the page renders,
      then the span sub-label includes both years ("Mär 25–Aug 26").
- [x] AC18: Given exactly one sting in the selected period, when the page renders, then
      "Ø Stiche/Monat" shows "1,0" (denominator floored at 1) and never `Infinity` or `NaN`.

**Monthly chart**

- [x] AC19: Given a concrete year is selected, when the chart renders, then all twelve months
      Jan–Dez appear on the x-axis with German short names, months without stings shown as zero.
- [x] AC20: Given the chart is displayed, when the user hovers or taps a bar, then a tooltip shows
      "1 Stich" for a single sting and "n Stiche" otherwise.
- [x] AC21: Given the y-axis, when the chart renders, then it starts at zero and shows whole-number
      ticks only.
- [x] AC22: Given the user switches from one year to another, when the new data arrives, then the
      `{#key}` block destroys and rebuilds the chart — no stale bars from the previous year remain.
- [x] AC23: Given the chart component, when `/stats` is first opened, then Chart.js arrives as a
      separate dynamically-imported chunk (verifiable in the `npm run build` output) and is absent
      from the main bundle.
- [x] AC24: Given a browser session in which `/diary/[entryId]` has **never** been visited, when the
      user opens `/stats`, then the monthly chart renders without a console error — i.e.
      `BarController` is registered by this component and does not rely on another component's
      registration.

**Body-map heatmap**

- [x] AC25: Given stings recorded on several body zones with a maximum count of 4 or more, when the
      heatmap renders, then four distinct amber steps are used, zones with zero stings keep the
      neutral `#f3f4f6` fill, and the legend states the numeric range of each step.
- [x] AC26: Given the maximum count in the period is exactly 1, when the heatmap renders, then every
      stung zone uses the darkest step (clearly distinct from the zero fill) and the legend shows a
      single step — not four steps with identical or empty ranges.
- [x] AC27: Given the maximum count in the period is exactly 2, when the heatmap renders, then
      exactly two steps are shown in both the map and the legend.
- [x] AC28: Given the heatmap, when the user hovers a zone, then a native SVG tooltip shows the zone
      label and its count, using "1 Stich" / "n Stiche" — the same pluralisation as the chart.
- [x] AC29: Given the heatmap, when it renders, then no zone is focusable or clickable — no
      `tabindex`, no `role="button"`, no click handler — while pointer events remain enabled so the
      tooltips work, and the SVG itself exposes `role="img"` with a descriptive `aria-label`.
- [x] AC30: Given a zone rendered in one of the two darkest steps, when it carries a text label,
      then that label switches to white so it stays readable.
- [x] AC31: Given the colour encoding, when the page renders, then a text chip list beneath the map
      names every zone with at least one sting and its count, so the data is available without
      relying on colour.
- [x] AC32: Given a `body_location` value that matches no zone label (insertable via
      `npm run db:studio` for the test), when the page renders, then it appears in a "Sonstige" line
      below the map and its count is included in the period total — nothing is silently dropped.
- [x] AC33: Given the sum of all heatmap chip counts plus any "Sonstige" counts, when compared with
      the period KPI tile, then the two are equal.

**Empty states**

- [x] AC34: Given no stings have ever been recorded, when the user opens `/stats`, then a single
      empty-state box reading "Noch keine Stichvorfälle erfasst." with a link to `/stings/new` is
      shown, and no selector, tiles or sections are rendered.
- [x] AC35: Given stings exist but none in the selected year, when the page renders, then the
      selector and KPI tiles remain visible and both visualisations show "Keine Stiche in diesem
      Zeitraum."

**Timezone correctness**

- [x] AC36: Given a sting entered through the form as 31 December at 23:30, when the statistics are
      computed, then it is counted in **December of that year** — the bucket matches the date typed
      into the form, not the date the `/stings` list renders for it.
- [x] AC37: Given the same database, when the app is served from the Docker container (no `TZ`) and
      from a developer machine set to `TZ=Europe/Zurich`, then the month and year buckets are
      identical, because bucketing uses `getUTC*` and is independent of the host zone.
- [x] AC38: Given the year dropdown and the month buckets, when both are computed, then they use the
      same `getUTCFullYear()` derivation — a sting can never appear in a dropdown year whose page
      shows it in a different year.

**Regression — the `bodyZones.ts` extraction**

- [x] AC39: Given `/stings/new`, when the user taps a body zone, then it is selected and highlighted
      exactly as before; tapping the same zone again deselects it; the "Löschen" button clears the
      selection; `Enter` activates a focused zone; and the nine rotated text labels render in the
      same positions.
- [x] AC40: Given a sting is submitted from `/stings/new`, when it is stored, then `body_location`
      holds the identical German label string as before the refactor (e.g. "Linker Unterarm") — the
      heatmap depends on this exact value.

**Quality gates**

- [x] AC41: Given the finished implementation, when `npm run check`, `npm run lint` and
      `npm run build` are run, then `check` reports 0 errors and no more than the pre-change
      baseline of 44 warnings, and `lint` and `build` pass cleanly.

## Additional Context

### Dependencies

- **No new npm dependencies.** `chart.js` 4.5.1 is already a runtime dependency.
- **No DB migration.** The feature is strictly read-only over the existing `sting_incidents` table;
  `npm run db:generate` must **not** be run.
- **No environment or deployment change.** In particular, do **not** add `TZ` to
  `docker-compose.yml` — the container running UTC is load-bearing for how `stung_at` is written
  today (Codebase Pattern 11), and changing it would silently alter the meaning of new rows.
- **No PWA config change**, and no offline support for `/stats`.
- Depends on `sting_incidents` rows existing to be meaningful, but every code path must behave
  correctly with zero rows.

### Testing Strategy

No test framework is configured and this feature must not introduce one (use
`/bmad-tea-testarch-framework` if that is ever wanted). Verification is the established mix of
automated gates plus manual browser testing.

**Automated gates:**

1. `npm run check` — baseline is 0 errors / 44 warnings / 7 files; must not regress. Specifically
   catches a broken discriminated union after the Task 1 extraction and a missing `import type`.
2. `npm run format`, then `npm run lint`
3. `npm run build` — also confirms Chart.js stays in its own chunk (AC23)

**Manual testing — at a 375px viewport first, then desktop width:**

1. **Regression first.** Before opening `/stats` at all, exercise `/stings/new`: select a zone,
   re-tap to deselect, use "Löschen", tab to a zone and press `Enter`, submit a sting, and confirm
   the new row on `/stings` shows the expected German location label. (AC39, AC40)
2. Navigate to `/stats` from both the desktop nav and the mobile hamburger menu. (AC1)
3. Check the four KPI tiles against the raw list on `/stings` — count the rows for the selected year
   by hand and confirm the period tile matches. (AC11)
4. Switch the year selector through every option including "Alle"; confirm bars and heatmap both
   change, then reload and confirm the selection survives. (AC5, AC6, AC22)
5. Hit `/stats?year=abc`, `?year=2025abc`, `?year=-4`, `?year=999999` — all four must 400. Then
   `?year=1999` — must render the empty period state. (AC8, AC9)
6. **Chart registration.** In a fresh browser profile (or after clearing the tab), go straight to
   `/stats` **without** visiting `/diary/[entryId]` first, and confirm the chart renders with a clean
   console. This is the check that catches the `HealthChart`-style missing-controller bug. (AC24)
7. **Heatmap scale.** Verify against a period whose maximum zone count is 1, then one where it is 2,
   then a fuller period — the legend must show 1, 2 and 4 steps respectively, and single-count zones
   must be clearly distinguishable from unstung ones. (AC25–AC27)
8. Hover/tap chart bars and heatmap zones for tooltips; try to tab into a heatmap zone and confirm
   focus skips it. (AC20, AC28, AC29)
9. Add the heatmap chip counts plus any "Sonstige" values and compare with the period tile. (AC33)
10. **Timezone check.** Enter a sting through the form dated 31 December, 23:30, confirm the stats
    bucket it in December (not January of the next year), then delete it. (AC36)
11. **Unmatched label.** Insert a row with `body_location = 'Ellbogen'` via `npm run db:studio`,
    confirm it appears under "Sonstige" and that AC33 still balances, then delete it. (AC32)
12. **Empty state.** Verify against a database with no sting rows — point `DATABASE_PATH` at a
    scratch file. (AC34)
13. **Service worker.** Run `npm run preview` (not `npm run dev`) and confirm the SW still registers
    and precached assets are served. Do **not** expect `/stats` to load offline —
    `navigateFallback: null` disables the offline shell for navigations by design.

### Notes

**Risks and traps**

- **The `bodyZones.ts` extraction is the only change to working UI.** Everything else is additive.
  Task 2 must be a pure move — resist renaming `label` to something tidier, because that string is
  the join key to `body_location`.
- **`{#key}` around the chart is not cosmetic.** Drop it and the chart silently keeps showing the
  previous year's bars while the tiles update — the most likely bug in this feature.
- **Register `BarController`.** `HealthChart.svelte` omits `LineController` and gets away with it
  only because another component registers it globally. Copying its registration list is the second
  most likely bug here.
- **Do not switch bucketing to a named timezone.** `Europe/Zurich` looks more "correct" and is
  wrong for this data — see Technical Decision 6 and Codebase Pattern 11. If the write path is ever
  fixed, this decision must be revisited *together* with a migration of existing rows.
- **`readCssVar()` is a trap.** Copying it from `WeatherHistoryChart.svelte` looks right but always
  returns its fallback, because the `--color-*` tokens are only ever declared as `var()` fallbacks.
- **Styles are copied, not inherited.** `.chart-placeholder`, `.page`, `.empty-state`, `.filter-bar`
  and friends live inside single scoped components. `.card` does not exist at all.

**Pre-existing bugs found during this spec's investigation (all out of scope, worth their own fix)**

1. **`HealthChart.svelte:44` never registers `LineController`.** Under chart.js 4.5.1 the chart on
   `/hives/[hiveId]` throws unless `/diary/[entryId]` was visited first in the same session.
   One-line fix, but it belongs to its own change.
2. **`fromDatetimeLocal()` runs server-side**, so `datetime-local` input is parsed in the container's
   zone (UTC) rather than the user's. Every `stung_at`, `inspected_at` and diary timestamp is stored
   as the typed wall clock labelled UTC. Because `formatDate()`/`formatDateTime()` render
   client-side in the browser's zone, entries display 1–2 hours later than typed — so a sting entered
   at 23:30 already shows the next day on `/stings`. Fixing this needs a decision about existing
   rows, which is why this spec buckets to the typed value instead.
3. **`--color-border` has three different fallbacks** across components (`#d1d5db`, `#e5e7eb`,
   `#f3f4f6`), and `--color-bg` two. Centralising the tokens in `app.html` — the obvious cleanup —
   would visibly change existing pages until the fallbacks are reconciled first.

**Known limitations (accepted)**

- Statistics reflect what was *typed*, which for late-evening entries differs from what `/stings`
  displays. This is the honest reading of the stored data; see pre-existing bug 2.
- The "Sonstige" bucket has no live data path — no client code POSTs to `/api/stings`. It is
  defensive against a hand-written row or a future zone rename, and normally renders nothing.
- The heatmap is front-view only, matching `BodyMap` — a sting on the back of the left forearm and
  one on the front are indistinguishable, exactly as at data-entry time.
- With a single season the monthly chart is sparse. That is the honest picture, and the twelve-month
  axis is what makes seasonality legible once a second year exists.
- Every page load reads the whole `sting_incidents` table (no index on `stung_at`) and reduces in
  JS. At the current volume — a single keeper's half-season, well under a thousand rows — this is
  imperceptible. Revisit past roughly 5,000 rows: add an index on `stung_at` and move the buckets
  into SQL with `strftime('%Y-%m', stung_at, 'unixepoch')`, which is **correct** under UTC bucketing.

**Future considerations (explicitly out of scope)**

- Per-hive and hour-of-day/weekday breakdowns — the data supports both (`hive_id`, and `stung_at`
  carries a time component); deliberately deferred.
- If statistics for honey, harvests or inspections are added later, `/stats` will need to become a
  hub (tiles, as on `/honey`) with the sting view moving to `/stats/stings`. Decision 1 accepted that
  cost knowingly.
- Validating `body_location` against `BODY_ZONES` on the write paths would make the "Sonstige"
  bucket unnecessary.

## Review Notes

- Adversarial review completed (information-asymmetric: reviewer received only the diff).
- Findings: 16 total, 6 fixed, 10 skipped.
- Resolution approach: auto-fix (real findings only).

**Fixed**

- **F15 (AC35 violation).** `StingsPerMonthChart` gated its placeholder on `buckets.length === 0`,
  but a concrete year always carries 12 buckets — a year with no stings rendered 12 empty bars
  while the heatmap correctly showed "Keine Stiche in diesem Zeitraum." Now gated on a
  `hasData` derived (`buckets.some((b) => b.count > 0)`).
- **F5.** A well-formed `?year=` with no data is valid per AC9, but matched no `<option>`, so the
  `<select>` rendered blank (`selectedIndex = -1`). The page now injects the selected year into
  the option list when it is absent, deduplicated and sorted descending.
- **F4.** `initChart()` checked `canvas` only *before* `await import('chart.js')`. Navigating away
  mid-download left `canvas` null after the await, and `new Chart(null, …)` registers itself in
  Chart.js's global registry before throwing — leaking a dead instance past `onDestroy`. Added a
  `destroyed` flag plus a post-await re-check.
- **F12a.** `.zone` stroke and `.zone-label` fill in `StingBodyHeatmap` were bare hex; the spec
  requires `<style>` blocks to keep the `var(--token, #fallback)` form (the *chart and fill* hex
  remains literal per Technical Decision 8).
- **F6.** `goto()` now passes `keepFocus: true, noScroll: true` so changing the year does not drop
  focus from the `<select>` or scroll to the top.
- **F11.** Added a `{:catch}` branch to the dynamic chart import so a stale chunk hash after a
  deploy shows a German message instead of an uncaught error.

**Skipped — noise or already decided by this spec**

- **F1** (/stats vs /stings timezone disagreement) — Technical Decision 6's explicitly accepted
  consequence, restated as a defect.
- **F2** (pin `TZ` in `docker-compose.yml`) — the Dependencies section forbids exactly this change.
- **F3** (stale bars after `invalidateAll()`) — unreachable: `sync.ts` posts only
  `/api/hives/*/inspections` and `/api/harvests`, and the IndexedDB outbox has no sting store, so
  sting stats cannot change under a constant year.
- **F9** (`max <= 1` uses only the darkest step) — that is AC26, verbatim.
- **F13** (string vs object `error()` form) — Technical Decision 12; the object-form rule is scoped
  to API routes.
- **F8** (`role="img"` hides per-zone `<title>`; no touch tooltips) — the mandated design is
  `role="img"` + aria-label with the chip list as the accessible equivalent (AC29/AC31). The
  touch-tooltip limit is inherent to SVG `<title>`.

**Skipped — real but out of scope for this spec**

- **F7** — `<canvas>` has no accessible data equivalent. True, and true of both existing chart
  components; adding one is a change to charting conventions repo-wide.
- **F10** — "Alle" mode has an unbounded bar count (~60 bars at five seasons). The Known
  Limitations section already accepts a sparse chart; worth revisiting when a second year exists.
- **F14** — `monthLabel` is duplicated between the page and the chart. The `.chart-placeholder`
  duplication it also flags is mandated by Codebase Pattern 4 (styles are copied, not inherited).
- **F16** — under "Alle", the "Gesamt" and period tiles show the same number. Spec-mandated tile set.
