---
title: 'Diary (Tagebuch) — global journal with weather snapshot + 30-day history'
slug: 'diary'
created: '2026-08-16'
status: 'Completed'
stepsCompleted: [1, 2, 3, 4, 5, 6]
tech_stack:
  - SvelteKit 2.50.2
  - Svelte 5.51.0 (Runes)
  - TypeScript 5.9.3 (strict)
  - Drizzle ORM 0.45.1
  - better-sqlite3 12.6.2
  - Chart.js 4.5.1 (code-split via dynamic import)
  - Open-Meteo (forecast + archive APIs — no npm dependency, plain fetch)
files_to_modify:
  - src/lib/server/db/schema.ts
  - src/routes/+layout.svelte
  - src/routes/hives/[hiveId]/inspect/+page.svelte
files_to_create:
  - src/lib/server/db/queries/diary.ts
  - src/lib/server/weather.ts
  - src/lib/utils/weather.ts
  - src/lib/components/WeatherHistoryChart.svelte
  - src/routes/diary/+page.server.ts
  - src/routes/diary/+page.svelte
  - src/routes/diary/new/+page.server.ts
  - src/routes/diary/new/+page.svelte
  - src/routes/diary/[entryId]/+page.server.ts
  - src/routes/diary/[entryId]/+page.svelte
  - src/routes/diary/[entryId]/edit/+page.server.ts
  - src/routes/diary/[entryId]/edit/+page.svelte
code_patterns:
  - drizzle-satisfies-insert
  - query-file-boundary
  - date-noon-local-anchor
  - server-side-fetch-with-abortcontroller
  - client-gps-hidden-inputs
  - use-enhance
  - dynamic-chart-import
  - delete-with-modal
  - fail-redirect-form-actions
  - wmo-code-mapping
test_patterns:
  - manual-browser-375px
  - npm-run-build
  - npm-run-lint
  - manual-offline-mode-verification-form-blocks
---

# Tech-Spec: Diary (Tagebuch) — global journal with weather snapshot + 30-day history

**Created:** 2026-08-16

## Overview

### Problem Statement

There is no global running log of beekeeping milestones in the app. Manuel wants to record events that are not tied to a single hive — for example, "Frühjahrshonig geerntet", "Königin markiert", "Standort umgezogen" — browse them grouped by year, search across all entries, and see the weather context (both the day-of and the 30 days leading up to the event) so he can correlate weather patterns with what happened in the apiary.

### Solution

Introduce a new `diary_entries` table with a date, title, body, GPS/weather snapshot (matching the inspection column pattern), and a JSON blob of 30 daily weather aggregates. Add routes `/diary` (list grouped by year with a server-side substring search), `/diary/new`, `/diary/[entryId]` (detail with a 30-day mini weather chart), `/diary/[entryId]/edit`, and delete via the existing modal pattern. Weather is fetched at save time via Open-Meteo — the `forecast` endpoint for current/near-current dates and the `archive` endpoint for backdated entries and the 30-day history. GPS is captured at form submit via `navigator.geolocation`, mirroring how inspections handle location. If any weather fetch fails, the entry still saves with weather fields null and `weatherUnavailable = true`. Online-only — no offline outbox.

### Scope

**In Scope:**

- **DB table `diary_entries`** with columns:
  - `id` INTEGER PRIMARY KEY AUTOINCREMENT
  - `entryDate` INTEGER NOT NULL — Unix epoch seconds at local noon (DST-safe anchor, matches new `honey_harvests.harvested_at` convention)
  - `title` TEXT NOT NULL — max 200 chars enforced at app layer
  - `body` TEXT — nullable, max 5000 chars enforced at app layer
  - `weatherLat`, `weatherLon` REAL — nullable, captured at save time
  - `weatherTemp` REAL, `weatherDesc` TEXT, `weatherWindSpeed` REAL, `weatherCode` INTEGER — nullable, matches inspection column names
  - `weatherUnavailable` INTEGER (boolean) — default false
  - `weatherHistory` TEXT — nullable, JSON string of `Array<{ date: string; tMin: number | null; tMax: number | null; precip: number | null; code: number | null }>` (30 entries, oldest → newest, all daily aggregates in local time)
  - `createdAt`, `updatedAt` INTEGER NOT NULL — Unix epoch seconds
- Drizzle migration via `npm run db:generate` → inspect → `npm run db:migrate`
- Query file `src/lib/server/db/queries/diary.ts`:
  - `getDiaryEntries(opts?: { search?: string }): DiaryEntry[]` — case-insensitive `LIKE %q%` on `title` + `body`, ordered `entryDate DESC`
  - `getDiaryEntryById(id: number): DiaryEntry | null`
  - `createDiaryEntry(data): DiaryEntry`
  - `updateDiaryEntry(id: number, data): DiaryEntry | null`
  - `deleteDiaryEntry(id: number): boolean`
- Routes:
  - `/diary` (`+page.server.ts` + `+page.svelte`) — list, year-grouped with descending headers, per-entry card (date, title, weather chip, first line of body), server-side search via `?q=` param, empty states for "no entries" and "no search results", `?/delete` action wired to the existing dialog modal pattern (mirror `/harvests/+page.svelte`)
  - `/diary/new` (`+page.server.ts` + `+page.svelte`) — create form: date (default today, backdate allowed), title (required), body (optional). On submit: capture GPS via `navigator.geolocation`, POST to server action. Server action fetches weather from Open-Meteo and stores everything in one transaction. Redirect to `/diary/[newId]` on success.
  - `/diary/[entryId]` (`+page.server.ts` + `+page.svelte`) — detail: date, title, full body, weather chip for the day-of, `WeatherHistoryChart` component below body, edit + delete buttons
  - `/diary/[entryId]/edit` (`+page.server.ts` + `+page.svelte`) — edit form (same fields as create). If `entryDate` changes, re-fetch weather + history; otherwise leave weather fields untouched.
- New component `src/lib/components/WeatherHistoryChart.svelte` — Chart.js multi-axis chart: temperature range (min/max lines or shaded area, left Y-axis, °C) + precipitation (bars, right Y-axis, mm), X-axis = 30 days ending at entryDate. Dynamic import mirroring `HealthChart.svelte` usage in `hives/[hiveId]/+page.svelte`.
- Open-Meteo integration in a new server-side helper `src/lib/server/weather.ts`:
  - `fetchCurrentWeather({ lat, lon, date }): Promise<CurrentWeather | null>` — uses `forecast` endpoint for today/future, `archive` endpoint for past
  - `fetchWeatherHistory({ lat, lon, endDate }): Promise<DailyAggregate[] | null>` — uses `archive` endpoint for 30 days ending on `endDate`
  - Both return `null` on any fetch/parse failure (never throw); callers set `weatherUnavailable = true`
  - Endpoints:
    - Current: `https://api.open-meteo.com/v1/forecast?latitude=…&longitude=…&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`
    - Historical single day: `https://archive-api.open-meteo.com/v1/archive?latitude=…&longitude=…&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto`
    - 30-day history: same archive endpoint with `start_date = entryDate - 30 days`, `end_date = entryDate`
- Nav link "Tagebuch" in `src/routes/+layout.svelte` — placed between "Ernten" and `<PendingSyncBadge />`
- All UI text in German

**Out of Scope:**

- FTS5 full-text index (V1 uses a plain `LIKE` filter; can revisit if search becomes slow at multi-year scale)
- Offline outbox / offline creation for diary entries (per user decision — online-only)
- Fixed apiary-location setting (per user decision — GPS at creation, same as inspections; a wrong-location entry is a user error)
- Photo attachments on diary entries
- Categories / tags on entries
- Auto-mirroring harvest or inspection events into the diary
- Server-side rendering of the weather chart (client-side dynamic import mirrors the health chart)
- Rate-limiting / caching of Open-Meteo calls (project is single-user; call volume is trivial)

---

## Context for Development

### Codebase Patterns

- **Weather column shape** — copy from `inspections` table in `schema.ts` (lines 45-51): `weatherTemp: real`, `weatherDesc: text`, `weatherWindSpeed: real`, `weatherCode: integer`, `weatherLat: real`, `weatherLon: real`, `weatherUnavailable: integer({ mode: 'boolean' })`. Reuse column *names* verbatim so a future shared `WeatherBadge` component can render across both entities. `weather_history` is a new column exclusive to diary — stores JSON text.
- **Date semantics** — `entryDate` is a Unix epoch second anchored at **local noon** of the chosen day (DST-safe, matches `honey_harvests.harvested_at` post-refactor). Use `fromDateInput()` / `toDateInput()` from `$lib/client/utils/date.ts` verbatim.
- **Query file boundary** — all Drizzle calls live in `src/lib/server/db/queries/diary.ts`. Route files import query helpers only. Never write raw Drizzle in `+page.server.ts` / `+server.ts`.
- **Insert pattern** — use `satisfies NewDiaryEntry` on `.values({...})` and let `$inferSelect` / `$inferInsert` drive types.
- **Search filter** — `.where(or(like(sql`lower(${diaryEntries.title})`, `%${q.toLowerCase()}%`), like(sql`lower(${diaryEntries.body})`, `%${q.toLowerCase()}%`)))` — force case-insensitivity for both ASCII and UTF-8 (SQLite's default `LIKE` is case-insensitive for ASCII only; German umlauts need explicit `lower()`). Bind `q` as a parameter — never string-interpolate into SQL.
- **Delete-with-modal pattern** — mirror `src/routes/harvests/+page.svelte:33-59` (dialog element + `?/delete` action + hidden id input). Rename `harvestId` → `entryId`.
- **Detail-page delete** — put a second `?/delete` action on `/diary/[entryId]/+page.server.ts` so the detail view can trigger it without bouncing back to the list. Redirect to `/diary` on success.
- **Chart pattern** — dynamic import mirror of `HealthChart.svelte`: `onMount` → `const { Chart, LineElement, BarElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler } = await import('chart.js')` → `Chart.register(...)` → build chart. Guard render inside `{#if browser}` on the parent page and use `{#await import(...) then { default: WeatherHistoryChart }} <WeatherHistoryChart ... /> {/await}` (same shape as `hives/[hiveId]/+page.svelte:203-211`).
- **GPS capture** — mirror inspection pattern (`inspect/+page.svelte:63-114`): `navigator.geolocation.getCurrentPosition()` with `timeout: 10_000` and `maximumAge: 5*60*1000`, called from `$effect` on mount so lat/lon are ready by submit time. If denied or times out, submit still proceeds with lat/lon = `null` and the server treats weather as unavailable.
- **Weather-fetch strategy** — server-side in the form action (NOT client-side pre-submit like inspections). Reasons:
  1. Backdated entries can't use `forecast?current=` — they need `archive` endpoint. Server-side unifies the branch.
  2. 30-day history is a separate API call anyway.
  3. Client bundle stays small — Open-Meteo URLs, WMO map, retry/timeout live in one place.
  4. UX consequence: no live weather chip on the form (unlike inspections). The chip + chart appear on the detail page after save. Acceptable trade for a "reflective" journal (vs. field inspection).
- **Two API endpoints, one helper**:
  - `fetchDayWeather({ lat, lon, epochSeconds })` → returns `{ temp, desc, windSpeed, code } | null`. Chooses `forecast` for today/future or `archive` for past internally.
  - `fetchWeatherHistory({ lat, lon, endEpochSeconds })` → returns 30 daily aggregates or `null`.
  - Both use `AbortController` with 8-second timeout, `try/catch` for network errors, `!res.ok` for non-2xx. Return `null` on any failure; callers set `weatherUnavailable = true`.
- **`weatherUnavailable` semantics** — set `true` if lat/lon are null OR either helper returns `null`. Frontend renders weather chip + chart from the stored columns; if unavailable, show a small "Wetterdaten nicht verfügbar" note in place of the chart. Individual fields may still be null even when `weatherUnavailable = false` (e.g. `weatherDesc` when `weather_code` was missing).
- **WMO code → German description** — extract the existing inline map from `inspect/+page.svelte:42-55` into a new `$lib/utils/weather.ts` `wmoDescription(code: number): string`. Framework-free (no `$app/*` imports) so both the inspection form and the new server helper can consume it. Update the inspection form to import instead of re-declare.
- **Semantic difference: current vs. historical `weatherTemp`** — for today/future entries, `weatherTemp` is the instantaneous `temperature_2m` from `forecast?current=` (matches inspection semantics). For backdated entries, `weatherTemp` is `daily.temperature_2m_max` from `archive` (the day's max temperature). Document this in the schema comment.
- **`weather_history` shape**:
  ```ts
  type WeatherHistoryDay = {
    date: string; // "YYYY-MM-DD" local
    tMin: number | null; // °C
    tMax: number | null; // °C
    precip: number | null; // mm
    code: number | null; // WMO
  };
  // Stored as JSON.stringify(Array<WeatherHistoryDay>) — always 30 entries, oldest → newest
  ```
- **German UI** — all labels/buttons/empty states in German. Nav link "Tagebuch". Empty state "Noch keine Einträge im Tagebuch." Buttons: "Speichern", "Löschen", "Bearbeiten", "Neuer Eintrag", "Suchen".
- **`use:enhance` for all forms** — progressive enhancement, no full-page reloads.
- **CSS custom properties** — `var(--color-accent)`, `var(--color-surface)`, `var(--color-text)`, `var(--color-text-muted)`, `var(--color-border)`, `var(--color-hover)`, `var(--color-bg)`. Never hardcode hex.
- **Mobile-first**: 48px form fields, 44px touch targets, 600px max content width.
- **Route file separation**: form actions in `+page.server.ts` only, JSON APIs in `+server.ts` only. Diary has no JSON API endpoints in V1 (online-only, no offline sync = no `/api/diary`).
- **No auth-in-page-load reliance** — per project-context.md, `locals.user` is not populated for page loads/form actions (no `hooks.server.ts`). Diary is single-user so we don't filter by user — no `getSessionUser` call needed.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/lib/server/db/schema.ts` | **Modify**: append `diaryEntries` table after `honeyHarvests`; add `DiaryEntry` + `NewDiaryEntry` exports at bottom |
| `src/routes/+layout.svelte` | **Modify**: add `<a href="/diary" class="nav-link">Tagebuch</a>` in `.nav-links` (between `Ernten` on line 66 and `<PendingSyncBadge />` on line 68) |
| `src/routes/hives/[hiveId]/inspect/+page.svelte` | **Modify**: remove inline `wmoDescription` (lines 42-55) and import from `$lib/utils/weather.js` instead. One-line change; standalone task. |
| `src/lib/server/db/queries/diary.ts` | **NEW** — query helpers for `diary_entries` |
| `src/lib/server/weather.ts` | **NEW** — Open-Meteo fetch helpers (`fetchDayWeather`, `fetchWeatherHistory`), server-only |
| `src/lib/utils/weather.ts` | **NEW** — framework-free WMO code → German label mapping (`wmoDescription`) |
| `src/lib/components/WeatherHistoryChart.svelte` | **NEW** — Chart.js 30-day mini chart |
| `src/routes/diary/+page.server.ts` | **NEW** — list `load` (with `?q=` param) + `?/delete` action |
| `src/routes/diary/+page.svelte` | **NEW** — year-grouped list UI + search input |
| `src/routes/diary/new/+page.server.ts` | **NEW** — create form action (GPS from hidden inputs; server calls weather helper) |
| `src/routes/diary/new/+page.svelte` | **NEW** — create form UI (client captures GPS in `$effect`) |
| `src/routes/diary/[entryId]/+page.server.ts` | **NEW** — detail load + `?/delete` action (redirects to `/diary`) |
| `src/routes/diary/[entryId]/+page.svelte` | **NEW** — detail view with `WeatherHistoryChart` (dynamic import) |
| `src/routes/diary/[entryId]/edit/+page.server.ts` | **NEW** — edit form action; re-fetches weather only if `entryDate` changed |
| `src/routes/diary/[entryId]/edit/+page.svelte` | **NEW** — edit form UI |
| `src/lib/server/db/queries/inspections.ts` | Reference: query file shape, filter parameter, `like`/`or` usage |
| `src/lib/server/db/queries/honeyHarvests.ts` | Reference: create/get/delete shape — closest structural analogue post-refactor |
| `src/lib/client/utils/date.ts` | Reference + reuse: `formatDate`, `toDateInput`, `fromDateInput` |
| `src/routes/harvests/+page.svelte` | Reference: list page + delete modal + empty state (mobile-first CSS to copy) |
| `src/routes/harvests/+page.server.ts` | Reference: `load` + `?/delete` action shape |
| `src/routes/harvests/new/+page.svelte` | Reference: create form UI, `use:enhance` shape |
| `src/routes/harvests/new/+page.server.ts` | Reference: form action validation, `fail` / `redirect` pattern |
| `src/routes/hives/[hiveId]/+page.svelte` | Reference: dynamic `HealthChart` import (lines 203-211) |
| `src/routes/hives/[hiveId]/inspect/+page.server.ts` | Reference: weather-field parsing from form data (lines 87-111) |
| `src/routes/hives/[hiveId]/inspect/+page.svelte` | Reference: client-side GPS + weather-fetch UX (loading/ready/unavailable states) |
| `src/lib/components/HealthChart.svelte` | Reference: Chart.js dynamic-import + register pattern |

### Technical Decisions

- **Weather fetch server-side, not client-side** — Diary weather = current + 30-day history = two Open-Meteo calls + non-trivial JSON assembly. Server-side keeps the client bundle small, unifies the `forecast`-vs-`archive` branching for backdated entries, and puts all Open-Meteo knowledge in one file. Inspections fetch client-side for a different reason (real-time weather chip pre-submit); diary can afford to fetch on submit because the chip only appears on the detail page after save.
- **GPS capture client-side, weather fetch server-side** — Browser geolocation is only available in the client. Capture lat/lon in `$effect` on form mount (`navigator.geolocation.getCurrentPosition()` with `timeout: 10_000`, `maximumAge: 5*60*1000` — mirrors `inspect/+page.svelte:63-114`). Pass lat/lon as hidden inputs. Server action reads them, dispatches to weather helper. If lat/lon are missing (permission denied or timeout), server sets `weatherUnavailable = true` and stores nulls without calling the API.
- **`weatherHistory` as JSON TEXT** — 30 daily aggregates × 5 fields ≈ 150 numbers per row (~2 KB serialised). Storing as JSON TEXT is simpler than a separate `diary_weather_days` table, avoids a join on every read, and matches the "snapshot" philosophy already used for inspection weather (never re-fetched, frozen at record time). Downside: not queryable via SQL — accepted, we never need to filter/aggregate on weather history.
- **`entryDate` at local noon** — matches the DST-safe anchor decision from the recent honey-harvest refactor. Reuse `fromDateInput` / `toDateInput` verbatim. Chart X-axis labels also use local time so days align visually with the user's calendar.
- **Current-vs-historical `weatherTemp` semantics** — for today/future entries, `weatherTemp` = instantaneous `temperature_2m` from `forecast?current=` (matches inspection semantics). For backdated entries, `weatherTemp` = `daily.temperature_2m_max` from `archive` (day's max temp). Similar shift for `weatherWindSpeed` (current wind → daily max wind). Document in the schema comment. Rationale: archive returns aggregates, not instants; picking hourly-at-noon adds complexity for marginal benefit.
- **Search: server-side case-insensitive `LIKE`** — via `?q=` URL param so URLs are shareable and search doesn't require loading all entries into the client (future-proofs against a 1000-entry diary). Use `LOWER(title) LIKE LOWER('%q%')` (and same for body) so German umlauts match case-insensitively. Bind `q` as a parameter — never string-interpolate. Empty query returns all entries.
- **Search input: autosubmit on Enter** — `<input type="search" name="q">` inside a GET form so browsers do the right thing; no debounced client filter. Explicit "Suchen" button optional.
- **Chart component naming** — `WeatherHistoryChart.svelte` (not `DiaryWeatherChart`) so it can be reused for a future feature (e.g., hive-detail weather timeline) without a rename. Takes prop `history: WeatherHistoryDay[]`.
- **Detail page vs. inline expansion** — separate detail route `/diary/[entryId]`. Reasons: (a) chart is heavy enough to want a dedicated page (Chart.js is dynamic-imported), (b) URL is shareable, (c) edit route slots in naturally as `/diary/[entryId]/edit`.
- **Edit route re-fetches weather only if `entryDate` changed** — compare `existing.entryDate` vs. new submitted date server-side; if unchanged, `UPDATE ... SET title=?, body=?, updated_at=?` without touching weather columns. Avoids duplicate API calls when the user just fixes a typo.
- **No offline outbox** — per user decision. Simplifies the diff by ~30% vs. the harvests feature. If demand emerges, add a `diary-outbox` IDB store later; the query shape is already outbox-compatible.
- **No `/api/diary` endpoint** — no offline sync = no need for a JSON API. If offline is added later, add `/api/diary/+server.ts` mirroring `/api/harvests`.
- **`wmoDescription` extraction** — move from `inspect/+page.svelte:42-55` to `$lib/utils/weather.ts`. Framework-free, no `$app/*` imports so both client (inspection form) and server (`weather.ts`) can consume. The inspection form gets a one-line import change; behaviour is preserved.
- **Route conflict check** — no existing `/diary/*` routes. Confirmed via `ls src/routes/` returning only: `hives`, `stings`, `todos`, `harvests`, `api`, `login`, `logout`, `settings` + root `+layout` / `+page`.
- **Open-Meteo terms** — free for non-commercial use, no API key required, generous rate limits (currently >10000/day). Personal beekeeping app is well within terms. If Manuel ever needs a commercial tier, `src/lib/server/weather.ts` is the only file that changes.
- **Error handling** — Open-Meteo returns 200 + JSON on success, 4xx/5xx on failure. Both helpers catch network errors, non-2xx status, and JSON parse errors — return `null`. Server action treats `null` as "weather unavailable" and stores nulls + `weatherUnavailable = true`. No user-visible error at save time — the entry always persists.
- **Timeout policy** — client GPS fetch: 10 seconds (mirrors inspections). Server weather fetch: 8 seconds per call via `AbortController` (Open-Meteo p50 <500ms; 8s is a generous safety net). Two calls sequentially = 16s worst-case — acceptable for a submit action.
- **Chart Y-axes** — dual-axis chart: left Y = temperature (°C), right Y = precipitation (mm). Precipitation as bars, temp min/max as a shaded area (Chart.js `fill` between two line datasets). Compact height (~200px), touch-friendly. X-axis labels formatted "dd.MM" for compactness.
- **Body length cap** — `body` limited to 5000 chars server-side (matches project pattern of server-enforced textarea caps; project-context.md § "notes must be ≤ 2000 chars" precedent).
- **Title length cap** — 200 chars.

---

## Implementation Plan

### Tasks

Ordered by dependency (foundation first, routes bottom-up, wiring + verify last).

- [x] **Task 1 — Shared `wmoDescription` helper**
  - File: `src/lib/utils/weather.ts` (new)
  - Action: Create a framework-free module exporting `export function wmoDescription(code: number): string` with the exact German mapping from `inspect/+page.svelte:42-55` (Klarer Himmel / Überwiegend klar / Teilweise bewölkt / Bedeckt / Neblig / Nieselregen / Regen / Schnee / Regenschauer / Schneeschauer / Gewitter / Unbekannt). Guard against non-integer or negative codes returning "Unbekannt".
  - Notes: No `$app/*` imports. Pure function. Server and client both consume.

- [x] **Task 2 — Inspection form uses the shared helper**
  - File: `src/routes/hives/[hiveId]/inspect/+page.svelte`
  - Action: Remove the inline `function wmoDescription(code: number): string` block (lines 42-55). Add `import { wmoDescription } from '$lib/utils/weather.js';` alongside existing imports.
  - Notes: Behaviour must be identical. Verify by picking any weather code and confirming the same German string is returned.

- [x] **Task 3 — Open-Meteo server helpers**
  - File: `src/lib/server/weather.ts` (new)
  - Action: Export three functions and one type:
    ```ts
    import { wmoDescription } from '$lib/utils/weather.js';

    export type WeatherHistoryDay = {
      date: string; // "YYYY-MM-DD" local
      tMin: number | null;
      tMax: number | null;
      precip: number | null;
      code: number | null;
    };

    export type DayWeather = {
      temp: number | null;
      desc: string | null;
      windSpeed: number | null;
      code: number | null;
    };

    export async function fetchDayWeather(opts: {
      lat: number;
      lon: number;
      epochSeconds: number;
    }): Promise<DayWeather | null>;

    export async function fetchWeatherHistory(opts: {
      lat: number;
      lon: number;
      endEpochSeconds: number;
    }): Promise<WeatherHistoryDay[] | null>;
    ```
  - Implementation details for `fetchDayWeather`:
    - Compute `todayLocal = Math.floor(new Date().setHours(0,0,0,0) / 1000)` and compare against `opts.epochSeconds`. If `epochSeconds >= todayLocal` → `forecast?current=` endpoint. Else → `archive?daily=` endpoint.
    - `forecast` URL: `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto` → return `{ temp: cw.temperature_2m, desc: wmoDescription(cw.weather_code), windSpeed: cw.wind_speed_10m, code: cw.weather_code }` rounded to 1 decimal.
    - `archive` URL: `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${ymd}&end_date=${ymd}&daily=temperature_2m_max,wind_speed_10m_max,weather_code&timezone=auto` → return `{ temp: daily.temperature_2m_max[0], desc: wmoDescription(daily.weather_code[0]), windSpeed: daily.wind_speed_10m_max[0], code: daily.weather_code[0] }`.
    - `ymd` = `date.toISOString().slice(0,10)` OR reuse `toDateInput(epochSeconds)` — prefer the latter for consistency with the app's date utilities.
    - `AbortController` with 8-second timeout. `try/catch` around fetch + `res.json()`. Return `null` on any error, non-2xx status, or unexpected shape.
  - Implementation details for `fetchWeatherHistory`:
    - Compute `startEpoch = endEpochSeconds - 29 * 86400` (so 30 days inclusive of end).
    - URL: `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startYmd}&end_date=${endYmd}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto`.
    - Parse response `daily.time[]`, `daily.temperature_2m_max[]`, `daily.temperature_2m_min[]`, `daily.precipitation_sum[]`, `daily.weather_code[]` in lockstep into `WeatherHistoryDay[]` — oldest → newest, exactly 30 entries. If the API returns fewer than 30 (edge case: date before Open-Meteo archive coverage begins in 1940), return whatever it returned; caller may still store as partial history.
    - Same 8-second timeout, same error → `null` behaviour.
  - Notes: No `$app/*` imports. No auth. Pure fetch + JSON. Round temperatures to 1 decimal to keep storage compact.

- [x] **Task 4 — Schema: `diary_entries` table**
  - File: `src/lib/server/db/schema.ts`
  - Action: After the `honeyHarvests` block (before `todos`), add:
    ```ts
    // ─── Diary Entries ───────────────────────────────────────────────────────────
    // Global journal — one row per milestone. Not tied to a hive.
    // `entry_date` is Unix epoch seconds at local noon (DST-safe anchor).
    // Weather snapshot mirrors the `inspections` column naming for cross-entity consistency.
    // For today/future entries, weather_temp/wind are instantaneous (forecast API);
    // for backdated entries they are the day's max (archive API).
    // `weather_history` is JSON: 30 daily aggregates ending at entry_date (oldest → newest).
    export const diaryEntries = sqliteTable('diary_entries', {
      id: integer('id').primaryKey({ autoIncrement: true }),
      entryDate: integer('entry_date').notNull(),
      title: text('title').notNull(),
      body: text('body'),
      weatherLat: real('weather_lat'),
      weatherLon: real('weather_lon'),
      weatherTemp: real('weather_temp'),
      weatherDesc: text('weather_desc'),
      weatherWindSpeed: real('weather_wind_speed'),
      weatherCode: integer('weather_code'),
      weatherUnavailable: integer('weather_unavailable', { mode: 'boolean' }).notNull().default(false),
      weatherHistory: text('weather_history'), // JSON: WeatherHistoryDay[] | null
      createdAt: integer('created_at').notNull(),
      updatedAt: integer('updated_at').notNull(),
    });
    export type DiaryEntry = typeof diaryEntries.$inferSelect;
    export type NewDiaryEntry = typeof diaryEntries.$inferInsert;
    ```
  - Notes: The type exports go alongside the other inferred types at the bottom of the file. Field naming mirrors `inspections` for the weather columns.

- [x] **Task 5 — Drizzle migration**
  - Commands: `npm run db:generate` → inspect the generated `NNNN_*.sql` file → `npm run db:migrate`.
  - Expected SQL: a straightforward `CREATE TABLE diary_entries (…)`. No `INSERT SELECT` gymnastics because we're adding a table, not altering one.
  - Notes: If Drizzle-Kit prompts interactively (as it did on the previous refactor for column renames), no action needed — this migration should be an unambiguous add.

- [x] **Task 6 — Query file `diary.ts`**
  - File: `src/lib/server/db/queries/diary.ts` (new)
  - Action: Export the following (using `sql` template from `drizzle-orm` for the `LOWER()` wrapping):
    ```ts
    import { and, desc, eq, or, sql } from 'drizzle-orm';
    import { db } from '../index.js';
    import { diaryEntries } from '../schema.js';
    import type { DiaryEntry, NewDiaryEntry } from '../schema.js';

    export function getDiaryEntries(opts?: { search?: string }): DiaryEntry[] {
      const q = opts?.search?.trim();
      const base = db.select().from(diaryEntries).orderBy(desc(diaryEntries.entryDate));
      if (!q) return base.all();
      const pattern = `%${q.toLowerCase()}%`;
      return base
        .where(
          or(
            sql`lower(${diaryEntries.title}) like ${pattern}`,
            sql`lower(${diaryEntries.body}) like ${pattern}`
          )
        )
        .all();
    }

    export function getDiaryEntryById(id: number): DiaryEntry | null {
      return db.select().from(diaryEntries).where(eq(diaryEntries.id, id)).get() ?? null;
    }

    export function createDiaryEntry(data: {
      entryDate: number;
      title: string;
      body: string | null;
      weatherLat: number | null;
      weatherLon: number | null;
      weatherTemp: number | null;
      weatherDesc: string | null;
      weatherWindSpeed: number | null;
      weatherCode: number | null;
      weatherUnavailable: boolean;
      weatherHistory: string | null; // pre-serialised JSON
    }): DiaryEntry {
      const now = Math.floor(Date.now() / 1000);
      return db
        .insert(diaryEntries)
        .values({ ...data, createdAt: now, updatedAt: now } satisfies NewDiaryEntry)
        .returning()
        .get();
    }

    export function updateDiaryEntry(
      id: number,
      data: Partial<{
        entryDate: number;
        title: string;
        body: string | null;
        weatherLat: number | null;
        weatherLon: number | null;
        weatherTemp: number | null;
        weatherDesc: string | null;
        weatherWindSpeed: number | null;
        weatherCode: number | null;
        weatherUnavailable: boolean;
        weatherHistory: string | null;
      }>
    ): DiaryEntry | null {
      const now = Math.floor(Date.now() / 1000);
      return (
        db
          .update(diaryEntries)
          .set({ ...data, updatedAt: now })
          .where(eq(diaryEntries.id, id))
          .returning()
          .get() ?? null
      );
    }

    export function deleteDiaryEntry(id: number): boolean {
      return (
        db
          .delete(diaryEntries)
          .where(eq(diaryEntries.id, id))
          .returning({ id: diaryEntries.id })
          .get() !== undefined
      );
    }
    ```
  - Notes: `sql` tagged template for `lower()` — Drizzle doesn't have a first-class `lower()` builder. Bind `pattern` as a parameter (Drizzle does this automatically for template literals).

- [x] **Task 7 — `WeatherHistoryChart.svelte` component**
  - File: `src/lib/components/WeatherHistoryChart.svelte` (new)
  - Action: Model on `HealthChart.svelte`. Props: `{ history: WeatherHistoryDay[] }` (import type from `$lib/server/weather.js`).
  - Chart type: dual-axis composite — left Y = temperature (°C, min/max as filled area between two line datasets), right Y = precipitation (mm, bar dataset).
  - Dynamic import: `const { Chart, LineElement, BarElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler, BarController, LineController } = await import('chart.js'); Chart.register(...);`
  - Data:
    - `labels` = history.map(h => h.date formatted "dd.MM")
    - Dataset 1: type `line`, data = tMax, `fill: '+1'` (fills area to next dataset), borderColor accent, no points
    - Dataset 2: type `line`, data = tMin, borderColor muted, no points (fill target for #1)
    - Dataset 3: type `bar`, data = precip, yAxisID `precip`, backgroundColor blue-ish, transparent when 0
  - Axes: `y` left (temp °C), `precip` right (mm, min 0). X-axis compact ticks.
  - Placeholder if `history.length < 2`: "Wetterverlauf nicht verfügbar."
  - Same `onMount` + `onDestroy` lifecycle as HealthChart.
  - Aspect ratio ~2.2 for a compact ~200px height on mobile.

- [x] **Task 8 — List route server**
  - File: `src/routes/diary/+page.server.ts` (new)
  - Action:
    ```ts
    import { error, redirect } from '@sveltejs/kit';
    import {
      getDiaryEntries,
      getDiaryEntryById,
      deleteDiaryEntry,
    } from '$lib/server/db/queries/diary.js';
    import type { Actions, PageServerLoad } from './$types.js';

    export const load: PageServerLoad = ({ url }) => {
      const q = url.searchParams.get('q')?.trim() || '';
      return { entries: getDiaryEntries({ search: q || undefined }), q };
    };

    export const actions: Actions = {
      delete: async ({ request }) => {
        const data = await request.formData();
        const idRaw = data.get('entryId') as string | null;
        const id = idRaw ? parseInt(idRaw, 10) : NaN;
        if (isNaN(id)) error(400, 'Invalid entry ID');
        const entry = getDiaryEntryById(id);
        if (!entry) error(404, 'Eintrag nicht gefunden');
        deleteDiaryEntry(id);
        redirect(302, '/diary');
      },
    };
    ```
  - Notes: The `q` return value drives the search-input default state on the client.

- [x] **Task 9 — List route UI**
  - File: `src/routes/diary/+page.svelte` (new)
  - Action: Model on `harvests/+page.svelte`. Key differences:
    - Search form at the top: `<form method="GET"><input type="search" name="q" value={data.q} placeholder="Suchen…" /></form>` — GET so the URL reflects the query.
    - Year-grouping: derive `const byYear = $derived.by(() => {...})` — reduce entries into `Map<number, DiaryEntry[]>` keyed by `new Date(entry.entryDate * 1000).getFullYear()`, then iterate in descending year order.
    - Section header per year: `<h2 class="year-header">{year}</h2>` — sticky-position optional.
    - Entry card: date + title + weather chip (compact °C + description if `!weatherUnavailable && weatherTemp != null`) + first line of body truncated with CSS. Anchor around the whole card linking to `/diary/{entry.id}`.
    - Delete: click delete → opens the confirmation dialog → posts to `?/delete` with hidden `entryId` input. Same dialog shape as `harvests/+page.svelte:33-59`.
    - Empty states: no entries at all → "Noch keine Einträge im Tagebuch." No search results → "Keine Ergebnisse für '{data.q}'." with a "Filter löschen" link back to `/diary`.
    - Header + CTA: `<h1>Tagebuch</h1>` + `<a href="/diary/new" class="btn btn--primary">+ Neuer Eintrag</a>` — same mobile-wrap pattern as harvests header.
  - Notes: All strings in German. Use CSS custom properties.

- [x] **Task 10 — Create form server**
  - File: `src/routes/diary/new/+page.server.ts` (new)
  - Action:
    ```ts
    import { fail, redirect } from '@sveltejs/kit';
    import { createDiaryEntry } from '$lib/server/db/queries/diary.js';
    import { fromDateInput, formatLot as _unused } from '$lib/client/utils/date.js'; // (formatLot only needed if reused elsewhere)
    import { fetchDayWeather, fetchWeatherHistory } from '$lib/server/weather.js';
    import type { Actions } from './$types.js';

    const MAX_TITLE_LEN = 200;
    const MAX_BODY_LEN = 5000;

    export const actions: Actions = {
      default: async ({ request }) => {
        const data = await request.formData();
        const title = ((data.get('title') as string | null) ?? '').trim();
        const body = ((data.get('body') as string | null) ?? '').trim() || null;
        const entryDateRaw = ((data.get('entryDate') as string | null) ?? '').trim();
        const latRaw = (data.get('lat') as string | null) ?? '';
        const lonRaw = (data.get('lon') as string | null) ?? '';

        if (!title) return fail(400, { error: 'Titel ist erforderlich', title, body: body ?? '', entryDateRaw });
        if (title.length > MAX_TITLE_LEN) return fail(400, { error: `Titel darf höchstens ${MAX_TITLE_LEN} Zeichen enthalten`, title, body: body ?? '', entryDateRaw });
        if (body && body.length > MAX_BODY_LEN) return fail(400, { error: `Text darf höchstens ${MAX_BODY_LEN} Zeichen enthalten`, title, body, entryDateRaw });

        let entryDate: number;
        if (entryDateRaw) {
          entryDate = fromDateInput(entryDateRaw);
          if (isNaN(entryDate)) return fail(400, { error: 'Ungültiges Datum', title, body: body ?? '', entryDateRaw });
        } else {
          const d = new Date();
          d.setHours(12, 0, 0, 0);
          entryDate = Math.floor(d.getTime() / 1000);
        }

        const lat = latRaw ? parseFloat(latRaw) : null;
        const lon = lonRaw ? parseFloat(lonRaw) : null;

        let dayWeather = null;
        let history = null;
        if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
          dayWeather = await fetchDayWeather({ lat, lon, epochSeconds: entryDate });
          history = await fetchWeatherHistory({ lat, lon, endEpochSeconds: entryDate });
        }

        const weatherUnavailable = dayWeather === null && history === null;

        const entry = createDiaryEntry({
          entryDate,
          title,
          body,
          weatherLat: lat,
          weatherLon: lon,
          weatherTemp: dayWeather?.temp ?? null,
          weatherDesc: dayWeather?.desc ?? null,
          weatherWindSpeed: dayWeather?.windSpeed ?? null,
          weatherCode: dayWeather?.code ?? null,
          weatherUnavailable,
          weatherHistory: history ? JSON.stringify(history) : null,
        });

        redirect(302, `/diary/${entry.id}`);
      },
    };
    ```
  - Notes: Drop the `formatLot as _unused` — I only kept it in the sketch to show the import origin. Remove that line in the actual implementation.

- [x] **Task 11 — Create form UI**
  - File: `src/routes/diary/new/+page.svelte` (new)
  - Action: Model on `harvests/new/+page.svelte`. Key elements:
    - `import { enhance } from '$app/forms'; import { toDateInput } from '$lib/client/utils/date.js';`
    - `let { form }: { form: ActionData } = $props();`
    - `let dateInputValue = $state(toDateInput(Math.floor(Date.now() / 1000)));` — bound to `<input type="date" name="entryDate">`
    - `let title = $state(form?.title ?? '');`, `let body = $state(form?.body ?? '');`
    - `let isSubmitting = $state(false);`
    - GPS capture in `$effect`:
      ```ts
      let lat = $state<number | null>(null);
      let lon = $state<number | null>(null);
      $effect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
          (pos) => { lat = pos.coords.latitude; lon = pos.coords.longitude; },
          () => { /* silent — server will treat as weatherUnavailable */ },
          { maximumAge: 5 * 60 * 1000, timeout: 10_000 }
        );
      });
      ```
    - Form fields (German labels):
      - `Datum` (`<input type="date" name="entryDate" bind:value={dateInputValue} required>`)
      - `Titel *` (`<input type="text" name="title" maxlength="200" bind:value={title} required>`)
      - `Text` (`<textarea name="body" maxlength="5000" rows="6" bind:value={body}>`)
    - Hidden inputs for GPS: `<input type="hidden" name="lat" value={lat ?? ''}>`, `<input type="hidden" name="lon" value={lon ?? ''}>`
    - No client-side weather preview (unlike inspections — server fetches after submit)
    - Info line under the fields: "Wetter wird nach dem Speichern erfasst." when GPS is available; "Wetter wird nicht erfasst (Standort nicht freigegeben)." when denied
    - `use:enhance` — set `isSubmitting = true` on submit; standard progressive enhancement (no offline branch, since diary is online-only)
    - Submit button: "Speichern" / "Speichern…"
    - Cancel link back to `/diary`

- [x] **Task 12 — Detail route server**
  - File: `src/routes/diary/[entryId]/+page.server.ts` (new)
  - Action:
    ```ts
    import { error, redirect } from '@sveltejs/kit';
    import { getDiaryEntryById, deleteDiaryEntry } from '$lib/server/db/queries/diary.js';
    import type { Actions, PageServerLoad } from './$types.js';

    export const load: PageServerLoad = ({ params }) => {
      const id = parseInt(params.entryId, 10);
      if (isNaN(id)) error(404, 'Eintrag nicht gefunden');
      const entry = getDiaryEntryById(id);
      if (!entry) error(404, 'Eintrag nicht gefunden');
      return { entry };
    };

    export const actions: Actions = {
      delete: async ({ params }) => {
        const id = parseInt(params.entryId, 10);
        if (isNaN(id)) error(400, 'Invalid entry ID');
        deleteDiaryEntry(id);
        redirect(302, '/diary');
      },
    };
    ```

- [x] **Task 13 — Detail route UI**
  - File: `src/routes/diary/[entryId]/+page.svelte` (new)
  - Action:
    - Back link: `← Tagebuch` → `/diary`
    - Title: `<h1>{data.entry.title}</h1>`
    - Meta line: date (`formatDate(data.entry.entryDate)`) + weather chip (if `!weatherUnavailable && data.entry.weatherTemp != null`) showing `{temp}°C {desc}, {wind} km/h`
    - Body: `<pre class="entry-body">{data.entry.body}</pre>` — preserves line breaks; CSS `white-space: pre-wrap; font-family: inherit`
    - Weather history section (below body): header "Wetter (letzte 30 Tage)". Dynamic-imported `WeatherHistoryChart` if `data.entry.weatherHistory` is non-null; otherwise "Wetterdaten nicht verfügbar."
    - Deserialise weatherHistory: `const history = data.entry.weatherHistory ? JSON.parse(data.entry.weatherHistory) as WeatherHistoryDay[] : null;`
    - Actions bar: "Bearbeiten" (link to `/diary/{id}/edit`) + "Löschen" (opens confirmation dialog, posts to `?/delete`)
    - Delete dialog: same shape as harvests list dialog

- [x] **Task 14 — Edit route server**
  - File: `src/routes/diary/[entryId]/edit/+page.server.ts` (new)
  - Action:
    - `load`: same as detail (get by id, error 404 if missing).
    - `actions.default`: parse title/body/entryDate/lat/lon like the create form. Load the existing entry. Compare `existing.entryDate` vs. new `entryDate`:
      - If unchanged: `updateDiaryEntry(id, { title, body })` — weather columns untouched.
      - If changed: re-fetch `dayWeather` + `history` with the new date, then `updateDiaryEntry(id, { entryDate, title, body, weatherLat, weatherLon, weatherTemp, ..., weatherHistory })`.
    - `redirect(302, `/diary/${id}`)` on success.
  - Notes: Server-side date-change detection avoids duplicate API calls. Do NOT trust the client to indicate a "date changed" flag.

- [x] **Task 15 — Edit route UI**
  - File: `src/routes/diary/[entryId]/edit/+page.svelte` (new)
  - Action: Same shape as `/diary/new/+page.svelte` but with initial values from `data.entry`:
    - `let dateInputValue = $state(toDateInput(data.entry.entryDate));`
    - `let title = $state(data.entry.title);`
    - `let body = $state(data.entry.body ?? '');`
    - Same GPS capture (only needed if date changes, but easier to always capture; server ignores if not re-fetching)
    - Submit button: "Änderungen speichern"
    - Back link: `← {data.entry.title}` → `/diary/{id}`

- [x] **Task 16 — Nav link**
  - File: `src/routes/+layout.svelte`
  - Action: In `.nav-links` div, after the `Ernten` line (line 66), before `<PendingSyncBadge />` (line 68), add:
    ```svelte
    <a href="/diary" class="nav-link">Tagebuch</a>
    ```

- [x] **Task 17 — Verify**
  - Commands: `npm run lint` then `npm run build`. Both must complete without new errors or warnings.
  - Manual test steps: see "Testing Strategy" below.
  - Notes: If lint flags unused imports (e.g. `formatLot as _unused` from Task 10 sketch), remove them.

### Acceptance Criteria

- [x] **AC1 — Create entry online with GPS (happy path)**
  - Given: Manuel is on `/diary/new`, GPS is available and granted, network is online
  - When: He picks today's date, enters a title, submits
  - Then: A new row is inserted with `title` and `entryDate` (local noon epoch), the server fetches weather via Open-Meteo forecast + archive, `weatherTemp/Desc/WindSpeed/Code/Lat/Lon` are populated, `weatherHistory` is a JSON string of 30 daily aggregates, `weatherUnavailable = false`, and Manuel is redirected to `/diary/{newId}`

- [x] **AC2 — Create entry with GPS denied**
  - Given: GPS permission denied or `navigator.geolocation` unavailable
  - When: Manuel submits the create form
  - Then: The entry is saved with `weatherLat/Lon = null`, all weather columns null, `weatherHistory = null`, and `weatherUnavailable = true`. No Open-Meteo API call is made.

- [x] **AC3 — Create backdated entry (6+ months ago)**
  - Given: The date input is set to a date in the past
  - When: The form is submitted with valid GPS
  - Then: `weatherTemp` reflects the day's max temperature (archive API's `temperature_2m_max`), `weatherWindSpeed` reflects the day's max wind, `weatherCode/Desc` reflect the day's weather code; `weatherHistory` contains 30 daily aggregates ending on `entryDate` (oldest → newest)

- [x] **AC4 — List page grouped by year (descending)**
  - Given: Multiple entries exist across ≥2 different calendar years (based on `entryDate`)
  - When: Manuel opens `/diary`
  - Then: Entries are grouped under year headers, years render in descending order (newest year on top), and within each year entries are ordered by `entryDate` descending

- [x] **AC5 — Search matches title + body case-insensitively**
  - Given: An entry titled "Königin gesichtet" and another with body containing "Frühjahrshonig"
  - When: Manuel types "königin" or "KÖNIGIN" or "frühjahrshonig" into the search input and submits
  - Then: The matching entry appears. URL contains `?q=…`. (Note: ASCII fold only — "koenigin" does NOT match "königin"; document this limitation.)

- [x] **AC6 — Empty states**
  - Given: No entries exist OR search returns zero results
  - When: Manuel views `/diary`
  - Then: "Noch keine Einträge im Tagebuch." (no entries at all) OR "Keine Ergebnisse für '…'." + "Filter löschen" link back to `/diary` (zero search results)

- [x] **AC7 — Detail page renders chip + chart**
  - Given: An entry has `weatherUnavailable = false` and non-null `weatherHistory`
  - When: Manuel opens `/diary/{id}`
  - Then: The weather chip shows `{temp}°C {desc}, {wind} km/h`; the 30-day chart renders below the body with temperature range + precipitation bars

- [x] **AC8 — Detail page fallback when weather unavailable**
  - Given: `weatherUnavailable = true` on an entry
  - When: Manuel opens `/diary/{id}`
  - Then: In place of the chip and chart, a single "Wetterdaten nicht verfügbar" note is shown; no error, no broken layout

- [x] **AC9 — Edit entry without changing date preserves weather**
  - Given: An existing entry with populated weather columns
  - When: Manuel opens `/diary/{id}/edit`, edits only the title or body, and submits
  - Then: `entryDate`, `weatherTemp`, `weatherDesc`, `weatherWindSpeed`, `weatherCode`, `weatherLat`, `weatherLon`, `weatherHistory` are unchanged; `updatedAt` is bumped; NO Open-Meteo API call is made

- [x] **AC10 — Edit entry with changed date re-fetches weather**
  - Given: An existing entry with populated weather
  - When: Manuel edits the date to a different day and submits
  - Then: All weather columns are re-fetched from Open-Meteo (or set to null + `weatherUnavailable = true` if GPS missing or API fails); `weatherHistory` is regenerated for the new date

- [x] **AC11 — Delete from list page**
  - Given: An entry exists in `/diary`
  - When: Manuel clicks Löschen and confirms the modal
  - Then: The row is removed from the DB and the list refreshes without that entry; URL stays `/diary` (no `?entryId=…` residue)

- [x] **AC12 — Delete from detail page**
  - Given: Manuel is on `/diary/{id}`
  - When: He clicks Löschen and confirms
  - Then: The row is removed; he is redirected to `/diary` and the entry is absent

- [x] **AC13 — Server validates title required + length caps**
  - Given: Empty title, or title > 200 chars, or body > 5000 chars
  - When: The create or edit form is submitted
  - Then: Server returns `fail(400, { error })` in German; no row inserted/updated; form re-renders with the entered values preserved

- [x] **AC14 — Inspection form still works after `wmoDescription` extraction**
  - Given: A user opens `/hives/{id}/inspect` (any hive) and weather fetch succeeds
  - When: The weather chip renders
  - Then: The German description string is identical to pre-refactor for every WMO code 0-99

- [x] **AC15 — Nav link + build/lint gates**
  - Given: All tasks 1-16 complete
  - When: Manuel opens any authenticated page
  - Then: "Tagebuch" is visible in the nav bar and links to `/diary`
  - And: `npm run lint` exits 0 with no new warnings; `npm run build` completes with no new errors or warnings vs. baseline

---

## Additional Context

### Dependencies

- No new npm packages.
- Drizzle migration required after Task 4: `npm run db:generate` → inspect → `npm run db:migrate`.
- Chart.js 4.5.1 is already in `package.json` and used lazily elsewhere. No version bump.
- Open-Meteo free tier — no API key, no signup, no billing.
- No changes to `docker-compose.yml`, nginx, or backup script.

### Testing Strategy

No test framework configured (project-context.md § Testing Rules). Manual browser test at 375px viewport:

1. **Fresh install**: run `npm run db:migrate`; verify `diary_entries` table via `npm run db:studio` — columns match schema, no extra columns.
2. **Nav link**: any authenticated page → verify "Tagebuch" visible between "Ernten" and the pending-sync badge; clicking navigates to `/diary`.
3. **Empty state**: `/diary` with no entries → "Noch keine Einträge im Tagebuch." + "+ Neuer Eintrag" button.
4. **Create happy path (today, GPS granted)**: `/diary/new` → grant GPS prompt → enter title "Erster Testeintrag" and a body → submit → land on `/diary/{id}` with weather chip and 30-day chart rendered.
5. **Create with GPS denied**: reload `/diary/new`, deny GPS prompt in DevTools → submit → land on `/diary/{id}` → chip absent, chart absent, "Wetterdaten nicht verfügbar" shown.
6. **Backdated entry**: `/diary/new` → set date to 3 months ago → submit → detail page shows historical weather (temp likely different from today) + 30-day chart ending on that historical date.
7. **List year-grouping**: create entries in at least two different years (backdate to prior year) → `/diary` → verify year headers descending and entries within each year descending by date.
8. **Search**: `/diary/?q=Königin` → verify only matching entries; `?q=frühjahr` case-insensitive; empty `q` returns all.
9. **Search no results**: `/diary/?q=xxxx` → "Keine Ergebnisse" state + "Filter löschen" link.
10. **Edit title only**: pick an entry with weather → edit → change only the title → submit → detail page shows same weather chip + chart (no re-fetch, verify via Network panel that no Open-Meteo call fired).
11. **Edit date**: same entry → change the date to a different day → submit → detail page reflects new weather values.
12. **Delete from list**: click Löschen on a list card → confirm modal → row disappears, page stays on `/diary`.
13. **Delete from detail**: open a detail page → Löschen → confirm → redirected to `/diary`, entry gone.
14. **Server-side validation**: use DevTools to remove the `required` on the title → submit empty → verify 400 + German error rendered.
15. **Long title**: paste 201 chars into title → submit → 400.
16. **Long body**: paste 5001 chars → submit → 400.
17. **Inspection form regression**: open `/hives/{id}/inspect` for any active hive → verify weather chip shows German description; compare to a WMO code sample (e.g., pick a rainy day and confirm the description still reads "Regen" not the raw code).
18. **Mobile viewport (375px)**: list, form, detail all render without horizontal scroll; touch targets ≥44px; chart is visible and interactive.
19. **`npm run build`** and **`npm run lint`** — both green.

### Notes

- **API rate limits** — Open-Meteo's free tier allows >10,000 calls/day. Two calls per diary entry save. Manuel would need >5000 entries per day to hit the ceiling — not a concern.
- **Data cost** — 30-day history at ~2 KB serialised × N entries = trivial DB growth (100 entries per year × 5 years × 2 KB ≈ 1 MB).
- **Timezone edge for archive endpoint** — Open-Meteo's `archive` uses UTC by default; passing `timezone=auto` shifts response to the client's local timezone based on lat/lon. This aligns with our local-noon `entryDate` convention and the `formatDate` output on the frontend.
- **Chart palette** — reuse `--color-accent` (amber) for temperature max line, muted gray for temperature min, a cool blue for precipitation bars. All via CSS custom properties passed to Chart.js dataset options as literal color values (Chart.js can't read CSS variables directly).
- **Future work** (out of scope, worth capturing):
  - Add photo attachments to entries (mirror `inspectionPhotos` pattern)
  - Auto-mirror harvest events into the diary (nightly job or `AFTER INSERT` trigger)
  - Add categories/tags for faceted filtering
  - Full-text search (FTS5) if the substring `LIKE` filter becomes slow past several thousand entries
  - Fixed apiary-location setting to override per-entry GPS
  - Offline creation via a `diary-outbox` IDB store

---

## Review Notes

- Adversarial review completed (2026-08-16)
- Findings: 7 total, 7 fixed, 0 skipped
- Resolution approach: auto-fix
- Fixes applied:
  - **F1 (High)** — `src/lib/server/weather.ts` now branches today / strictly-future / past across three endpoints (forecast `current=`, forecast `daily=`, archive `daily=`) so future entries store the day's forecast rather than "now"-values.
  - **F2 (High)** — Weather calls in `/diary/new` and `/diary/[entryId]/edit` server actions run via `Promise.all` (worst case ~8 s instead of ~16 s).
  - **F3 (Med)** — Helper renamed `todayLocalNoonEpoch` → `todayLocalMidnightEpoch` to match behavior.
  - **F4 (Med)** — Detail-page delete action now returns 404 when the entry is missing, matching the list-page delete.
  - **F5 (Med)** — Edit action preserves existing weather columns when the date changes but GPS is unavailable (stale snapshot > no data).
  - **F6 (Low)** — `weatherHistory` JSON is shape-validated per entry before rendering.
  - **F7 (Low)** — `WeatherHistoryChart` reads `--color-accent` and `--color-text-muted` from CSS variables at init time.
- Post-fix gates: `npm run lint` ✅, `npm run build` ✅ (0 warnings, 0 errors)
