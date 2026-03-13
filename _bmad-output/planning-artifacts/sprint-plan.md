# Sprint Planning — beehiveJournal

**Author:** Manuel (BMAD Sprint Planning Agent)
**Date:** 2026-03-13
**Based on:** Epics & Stories (2026-03-13), Architecture (2026-03-13), PRD (2026-03-11)
**Status:** Ready for development

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Definition of Done — Global](#definition-of-done--global)
3. [Sprint Rhythm](#sprint-rhythm)
4. [Sprint 1 — Foundation](#sprint-1--foundation)
5. [Sprint 2 — Authentication](#sprint-2--authentication)
6. [Sprint 3 — Hive Basics](#sprint-3--hive-basics)
7. [Sprint 4 — Hive Archive/Delete + Inspection Form](#sprint-4--hive-archivedelete--inspection-form)
8. [Sprint 5 — Inspection Features](#sprint-5--inspection-features)
9. [Sprint 6 — History + Chart](#sprint-6--history--chart)
10. [Sprint 7 — Filter + Sting Tracker](#sprint-7--filter--sting-tracker)
11. [Sprint 8 — PWA Basics](#sprint-8--pwa-basics)
12. [Sprint 9 — Offline Entry + Sync](#sprint-9--offline-entry--sync)
13. [Sprint 10 — Deployment](#sprint-10--deployment)

---

## Project Overview

| | |
|---|---|
| **Project** | beehiveJournal |
| **Developer** | Manuel (solo, self-paced) |
| **Stack** | SvelteKit + TypeScript + SQLite (Drizzle) + Docker Compose + Nginx + Workbox (PWA) |
| **Total scope** | 33 stories · 87 story points · 8 epics |
| **Sprints** | 10 sprints · ~8–10 SP per sprint |

### All Sprints at a Glance

| Sprint | Stories | SP | Epic(s) | Focus |
|--------|---------|-----|---------|-------|
| Sprint 1 | 1.1, 1.2, 1.3, 1.4 | 10 | E1 | Foundation — scaffold, DB, Docker, scripts |
| Sprint 2 | 2.1, 2.2, 2.3, 2.4 | 9 | E2 | Auth — login, JWT sessions, logout |
| Sprint 3 | 3.1, 3.2, 3.3 | 8 | E3 | Hive basics — list, create, edit |
| Sprint 4 | 3.4, 3.5, 4.1 | 10 | E3, E4 | Hive archive/delete + new inspection form |
| Sprint 5 | 4.2, 4.3, 4.4, 4.5 | 9 | E4 | Inspection features — weather, edit, delete, polish |
| Sprint 6 | 5.1, 5.2, 5.3 | 8 | E5 | Inspection history + health chart + detail view |
| Sprint 7 | 5.4, 6.1, 6.2, 6.3 | 10 | E5, E6 | Date filter + full sting tracker |
| Sprint 8 | 7.1, 7.2, 7.3 | 7 | E7 | PWA manifest, service worker, offline banner |
| Sprint 9 | 7.4, 7.5 | 8 | E7 | Offline entry (IndexedDB) + background sync |
| Sprint 10 | 8.1, 8.2, 8.3 | 7 | E8 | Production deploy — Nginx, TLS, volume, runbook |
| **Total** | **33** | **87** | | |

---

## Definition of Done — Global

Every story in every sprint must satisfy all of the following before it can be marked "Done":

- [ ] All acceptance criteria from the story are met and manually tested
- [ ] No TypeScript compilation errors (`npm run build` passes cleanly)
- [ ] No ESLint errors (`npm run lint` passes cleanly)
- [ ] Code is committed to git with a meaningful, descriptive commit message
- [ ] New API routes are tested via the browser or a REST client (e.g. `curl`)
- [ ] Mobile layout verified on 375px viewport using Chrome DevTools device simulation
- [ ] No `console.error` or unhandled promise rejections visible in the browser console

---

## Sprint Rhythm

You are a solo developer with a day job and other commitments. Formal scrum ceremonies (standups, retrospectives, planning poker) would be overhead without benefit. Use this lightweight rhythm instead.

### Daily Habit (15 minutes or less)
1. Open the sprint plan — check which story you are working on
2. Write one sentence in a scratchpad: "Today I will finish [task X] for story [Y.Z]"
3. Code for however long you have
4. Before stopping: commit what you have, even if it is incomplete (`git commit -m "wip: story 3.2 create hive form partial"`)
5. Update the story status in your head: To Do → In Progress → Done

### Starting a Sprint
- Read all the story ACs for the sprint before writing a single line of code
- Identify any unknowns or new libraries you need to learn — look them up first, not mid-story
- Set up any new npm packages at the start so you do not context-switch mid-implementation

### Ending a Sprint
- Walk through each story's ACs manually — open the app and test them one by one
- Run `npm run build` and `npm run lint` — fix any errors before closing the sprint
- Commit everything with a sprint-closing message: `git commit -m "sprint 3 complete: hive list, create, edit"`
- Briefly note anything that went longer than expected — this calibrates future sprints

### When You Get Stuck
- Timebox research/debugging to 30 minutes
- If still stuck: write a minimal failing reproduction case, then ask for help (docs, forums, Claude)
- Do not abandon a story half-done — either finish it or revert to a known-good state

---

## Sprint 1 — Foundation

### Sprint Goal
Establish a fully working SvelteKit + SQLite + Docker project with all tooling configured, so every subsequent sprint starts from a solid, consistent base.

### Sprint Backlog

| ID | Story | SP | Status |
|----|-------|----|--------|
| 1.1 | SvelteKit Project Scaffold | 2 | To Do |
| 1.2 | Drizzle ORM + SQLite Schema & Migrations | 3 | To Do |
| 1.3 | Docker Dev & Build Setup | 3 | To Do |
| 1.4 | Environment Config & Dev Scripts | 2 | To Do |
| **Total** | | **10** | |

### Definition of Done — Sprint 1
- [ ] `npm run dev` starts the app at `localhost:5173` with no errors
- [ ] `npm run build` produces a clean production build with no TypeScript errors
- [ ] `npm run lint` passes with no errors
- [ ] `npm run db:migrate` creates the SQLite file with all four tables and indexes
- [ ] `docker compose build && docker compose up` starts the app at `localhost:3000`
- [ ] `docker compose down && docker compose up` preserves database contents
- [ ] `npm run create-user -- manuel testpass` creates a hashed user row in the DB

### Key Technical Tasks

**In order — do not skip ahead:**

1. **Scaffold the SvelteKit project** using `npm create svelte@latest` — select TypeScript, ESLint, Prettier. Confirm `npm run dev` works immediately.
2. **Install and configure Drizzle + better-sqlite3.** Create `drizzle.config.ts`, then write the full schema in `src/lib/server/db/schema.ts` — all four tables (`users`, `hives`, `inspections`, `sting_incidents`) with every column from the architecture doc §5. Do this before writing any migration; the schema is the source of truth.
3. **Generate and run the initial migration** with `drizzle-kit generate` + `drizzle-kit migrate`. Verify all tables exist with correct columns using `npm run db:studio`.
4. **Create the Drizzle singleton** in `src/lib/server/db/index.ts` — reads `DATABASE_PATH` from `process.env`, initialises `better-sqlite3`, returns a typed Drizzle instance.
5. **Write the `create-user.ts` script** in `scripts/`. Install `argon2` and `jose` at this point — you will need both in Sprint 2. Test the script locally with `npx tsx scripts/create-user.ts manuel testpass123`.
6. **Write the Dockerfile** (two-stage: `builder` uses `node:20-alpine` to run `npm run build`; `runner` copies `build/` and serves with `node build/index.js`). Non-root user. Test with `docker build .`.
7. **Write `docker-compose.yml`** — `app` service mounts the `app-data` volume at `/data`, sets `DATABASE_PATH=/data/beehivejournal.db`. Verify data persistence with down/up cycle.
8. **Tidy `package.json` scripts** — add `db:migrate`, `db:studio`, `create-user` entries. Write `.env.example` with `DATABASE_PATH`, `JWT_SECRET`, `PORT`. Commit everything.

### Dependencies & Risks

| Item | Detail |
|------|--------|
| **No prior dependencies** | This is sprint zero — nothing blocks it |
| **Risk: Drizzle schema vs migration drift** | Generate the migration immediately after writing the schema; do not hand-edit migration files |
| **Risk: `better-sqlite3` native bindings** | May need `npm rebuild` inside Docker if building on macOS and running on Linux Alpine — test the Docker build early |
| **Risk: SvelteKit adapter** | Use `@sveltejs/adapter-node` from the start — do not use `adapter-auto`. Set this in `svelte.config.ts` before writing any routes |

### End State
The repository has a running SvelteKit application with TypeScript, ESLint, and Prettier. The database schema is defined and migrated. The Docker image builds and runs with a persistent SQLite volume. A `create-user` script exists. There are no app features yet — just the skeleton every other sprint builds on.

---

## Sprint 2 — Authentication

### Sprint Goal
Protect the entire app behind a secure single-user login with rolling 30-day JWT sessions, so Manuel's beekeeping data is private from the very first feature sprint.

### Sprint Backlog

| ID | Story | SP | Status |
|----|-------|----|--------|
| 2.1 | User Setup Script | 2 | To Do |
| 2.2 | Login Page & Form | 2 | To Do |
| 2.3 | JWT Cookie Auth Guard & Session Management | 3 | To Do |
| 2.4 | Logout | 2 | To Do |
| **Total** | | **9** | |

### Definition of Done — Sprint 2
- [ ] `npm run build` and `npm run lint` pass
- [ ] Navigating to `/hives` (or any protected route) without a session redirects to `/login`
- [ ] Logging in with correct credentials sets a session cookie and redirects to `/hives`
- [ ] Invalid credentials show "Invalid username or password" without revealing which field is wrong
- [ ] Browser dev tools confirm the cookie is `httpOnly`, `secure`, and has a 30-day `maxAge`
- [ ] Logging out clears the cookie; back-button navigation to a protected route redirects to `/login`
- [ ] Verified on 375px mobile viewport — form is usable with no horizontal scroll

### Key Technical Tasks

**In order:**

1. **Consolidate the user creation script** (Story 2.1 refines the script from 1.4 to full production quality). Verify it enforces Argon2id with OWASP parameters: `memoryCost: 65536`, `timeCost: 3`, `parallelism: 4`. Test inside Docker with `docker exec`.
2. **Create the auth utility** in `src/lib/server/auth.ts` — export `signJWT(userId, username)`, `verifyJWT(token)`, and `setSessionCookie(event, token)`. Use `jose` for JWT signing with `HS256`. This is shared logic for stories 2.2, 2.3, and 2.4 — write it first.
3. **Create the login route** — `src/routes/login/+page.svelte` (the form UI) and `src/routes/login/+page.server.ts` (the form action that reads username/password, queries the DB, checks Argon2id hash, sets the cookie on success). Keep error messages generic.
4. **Create the root layout server** in `src/routes/+layout.server.ts` — this is the auth guard. On every load, read the `session` cookie, call `verifyJWT`, and `redirect(302, '/login')` if invalid or absent. On success, refresh the cookie (rolling expiry). Exclude `/login` from this guard.
5. **Create the logout action** — a form action on `/settings` (or a standalone endpoint) that deletes the `session` cookie with `maxAge: 0`. The `/settings` page can be a minimal stub for now. Add a Logout button to the temporary `+layout.svelte`.
6. **Add Nginx rate-limiting config** for `/login` — `limit_req_zone` and `limit_req` directives in `nginx/conf.d/app.conf`. Even if Nginx is not running in dev, write the config now while the context is fresh.
7. **Test the full auth flow manually**: fresh browser → visit `/hives` → redirected to `/login` → log in → arrive at `/hives` (even if it's a placeholder page) → log out → verify redirect → verify back-button redirect.

### Dependencies & Risks

| Item | Detail |
|------|--------|
| **Depends on Sprint 1** | Drizzle singleton, `users` table, and `argon2`/`jose` packages must exist |
| **Risk: `httpOnly` cookies in SvelteKit dev** | Cookies with `secure: true` only work over HTTPS in production. In dev (`localhost`), set `secure: false` using an env variable guard: `dev ? false : true`. Use SvelteKit's `$app/environment` `dev` flag |
| **Risk: JWT secret in env** | If `JWT_SECRET` is not set, `signJWT` must throw immediately — do not silently use a default. Add a startup check |
| **Risk: Layout server vs page server auth guard** | The `+layout.server.ts` load function guards all child routes. Test that static assets and the login page itself are excluded — otherwise you get a redirect loop |

### End State
The app is fully locked behind authentication. Any unauthenticated request to any route redirects to `/login`. The login form works on mobile. Sessions persist for 30 days and refresh on every page load. Logout works. The `/hives` route exists but may show a placeholder — the next sprint fills it in.

---

## Sprint 3 — Hive Basics

### Sprint Goal
Allow Manuel to view a list of his active hives, create new hives, and edit existing ones — establishing the core data model all subsequent features depend on.

### Sprint Backlog

| ID | Story | SP | Status |
|----|-------|----|--------|
| 3.1 | Hive List Page | 3 | To Do |
| 3.2 | Create Hive | 3 | To Do |
| 3.3 | Edit Hive | 2 | To Do |
| **Total** | | **8** | |

### Definition of Done — Sprint 3
- [ ] `npm run build` and `npm run lint` pass
- [ ] `/hives` shows active hives in order; empty state message shown when none exist
- [ ] `POST /api/hives` creates a hive and returns `201` — verified with `curl`
- [ ] `PATCH /api/hives/:id` updates a hive and returns the updated object — verified with `curl`
- [ ] Duplicate hive number validation works (inline error, no page reload)
- [ ] 10-hive active limit enforced on create
- [ ] All views tested on 375px mobile viewport

### Key Technical Tasks

**In order:**

1. **Create the `HiveCard` component** (`src/lib/components/HiveCard.svelte`) — accepts a `Hive` object and renders name, number, last inspection date placeholder, and health score badge placeholder. Build the UI component before wiring the data.
2. **Create the hive list page** (`src/routes/hives/+page.svelte` + `+page.server.ts`) — query all `is_active = true` hives ordered by `hive_number ASC NULLS LAST, name ASC`. Add the empty state and "Add Hive" button. Add a stubbed "Archived" link.
3. **Create `GET /api/hives`** (`src/routes/api/hives/+server.ts`) — returns `{ active: Hive[] }` as JSON. This is used by the PWA offline cache later; build it now alongside the page.
4. **Create the hive create form** (`/hives/new`) — form with Name, Number, Description fields. Server action validates, inserts into DB, redirects to `/hives/[newId]`. The hive detail page can be a placeholder stub for now.
5. **Add hive number uniqueness check** in the server action — query existing active hives with the same `hive_number` before inserting. Return a 422-equivalent form error with `fail()`.
6. **Create the hive edit form** (`/hives/[hiveId]/edit`) — pre-filled with current values. Re-use the same validation logic from create. Wire `PATCH /api/hives/:id`. Add the "Edit" button on the hive detail stub page.
7. **Write Drizzle query helpers** for hive operations in `src/lib/server/db/queries/hives.ts` — `getActiveHives()`, `getHiveById(id)`, `createHive(data)`, `updateHive(id, data)`. Keep all Drizzle calls out of route files — routes should only call query helpers.

### Dependencies & Risks

| Item | Detail |
|------|--------|
| **Depends on Sprint 2** | Auth guard must be working — all hive routes are protected |
| **Risk: Route file organisation** | Establish the pattern now — `+page.server.ts` handles form actions; `+server.ts` handles JSON API calls. Do not mix them. This pattern must be consistent across all remaining sprints |
| **Risk: Hive detail page stub** | Stories 3.2 and 3.3 redirect to `/hives/[hiveId]` after success. Create a minimal `src/routes/hives/[hiveId]/+page.svelte` that just shows the hive name so the redirect doesn't 404. Sprint 6 fills it in properly |

### End State
Manuel can log in, see his hive list (or an empty state), create new hives, and edit them. The hive detail page is a stub. No inspection features yet, but the fundamental hive CRUD is complete and all API endpoints are tested.

---

## Sprint 4 — Hive Archive/Delete + Inspection Form

### Sprint Goal
Complete hive lifecycle management (archive, delete) and deliver the core inspection entry form, so Manuel can log his first real inspection by the end of this sprint.

### Sprint Backlog

| ID | Story | SP | Status |
|----|-------|----|--------|
| 3.4 | Archive Hive | 2 | To Do |
| 3.5 | Delete Hive | 3 | To Do |
| 4.1 | New Inspection Form | 5 | To Do |
| **Total** | | **10** | |

### Definition of Done — Sprint 4
- [ ] `npm run build` and `npm run lint` pass
- [ ] Archiving a hive removes it from the active list; it appears in the archived view with an Unarchive option
- [ ] Deleting a hive with N inspections shows the correct count in the confirmation dialog; cascade-deletes all data; sting incidents have `hive_id` set to `null`
- [ ] Delete requires typing the hive name — cannot be bypassed
- [ ] `POST /api/hives/:id/inspections` creates an inspection and returns `201` — verified with `curl`
- [ ] New inspection form completes with ≤ 5 taps (health + queen status pre-selected defaults)
- [ ] Inspection redirects to `/hives/[hiveId]` after save; entry appears in the stub history list
- [ ] Verified on 375px mobile viewport

### Key Technical Tasks

**In order:**

1. **Add archive action** to the hive edit page (`/hives/[hiveId]/edit`). Add a confirmation `<dialog>` element (native HTML, no JS library needed). PATCH `is_active = false`. Add the archived hives section to `/hives` — query `is_active = false`, render in a collapsible or separate section with an Unarchive button.
2. **Add delete action** to the hive edit page. Implement the "type hive name to confirm" UX — a text input inside a `<dialog>` that enables the confirm button only when the text matches. Wire `DELETE /api/hives/:id`. Verify cascade delete via Drizzle schema `onDelete: 'cascade'` on the `hiveId` FK in inspections. Handle sting incidents `hive_id` nullification.
3. **Design the inspection form UI** before wiring any data. Create `src/lib/components/HealthScoreSelector.svelte` (5-button row, touch-friendly, each ≥ 44px) and `src/lib/components/QueenStatusSelector.svelte` (3 toggle buttons). Test these components in isolation before embedding in the form.
4. **Create the inspection form page** (`/hives/[hiveId]/inspect`) with all fields: HealthScoreSelector, QueenStatusSelector, behaviour notes textarea, next inspection note textarea, datetime-local input (defaults to `new Date().toISOString().slice(0,16)`). Wire the server action that validates and inserts into the `inspections` table.
5. **Create Drizzle query helpers** in `src/lib/server/db/queries/inspections.ts` — `createInspection(data)`, `getInspectionsByHiveId(hiveId)`, `getInspectionById(id)`, `updateInspection(id, data)`, `deleteInspection(id)`. Write these helpers now even though some won't be used until later sprints.
6. **Add a "New Inspection" button** to the hive detail stub page, linking to `/hives/[hiveId]/inspect`.
7. **Add `POST /api/hives/:id/inspections` endpoint** alongside the form action. Verify with `curl -X POST` that it returns `201` with the created inspection object.

### Dependencies & Risks

| Item | Detail |
|------|--------|
| **Depends on Sprint 3** | Hive list, create, and edit must be working |
| **Risk: Story 4.1 is 5 SP** | This is the heaviest story in the sprint. Budget most of your time here. Archive/delete (3.4, 3.5) are straightforward — do them first to clear scope, then focus on 4.1 |
| **Risk: `<dialog>` element on iOS Safari** | The native HTML `<dialog>` element has full support in iOS Safari 15.4+. Use it — no need for a JS modal library. Test on a real device or Safari in Xcode simulator |
| **Risk: `datetime-local` input** | The format must be `YYYY-MM-DDTHH:mm` for the `value` attribute. When reading it back in the server action, parse it as a UTC timestamp carefully — decide upfront whether you store UTC or local time in the DB (recommended: Unix epoch UTC always) |

### End State
Hive management is complete — create, edit, archive, unarchive, delete all work. Manuel can now log an inspection for any hive. The inspection saves to the database. The history list on the hive detail page shows a stub with the raw data. Weather capture and edit/delete come next sprint.

---

## Sprint 5 — Inspection Features

### Sprint Goal
Complete the inspection lifecycle with auto-captured weather on entry, edit and delete capabilities, and a polished mobile form experience.

### Sprint Backlog

| ID | Story | SP | Status |
|----|-------|----|--------|
| 4.2 | Auto Weather Capture on Inspection | 3 | To Do |
| 4.3 | Edit Inspection Entry | 2 | To Do |
| 4.4 | Delete Inspection Entry | 2 | To Do |
| 4.5 | Inspection Form Validation & UX Polish | 2 | To Do |
| **Total** | | **9** | |

### Definition of Done — Sprint 5
- [ ] `npm run build` and `npm run lint` pass
- [ ] Opening the inspection form triggers a GPS + Open-Meteo fetch; weather badge appears when resolved
- [ ] Form remains fully interactive during weather fetch (no blocking spinner)
- [ ] Weather unavailable (GPS denied / API timeout) is handled gracefully — form still submits
- [ ] Editing an inspection pre-fills all fields; weather is read-only
- [ ] Deleting an inspection requires confirmation; `DELETE /api/hives/:id/inspections/:inspId` returns `204`
- [ ] Client-side validation prevents submit when health score or queen status is unselected (inline error, not a banner)
- [ ] Submit button shows loading state; no double-submission possible
- [ ] Full form fits on 375px without vertical scrolling (minimal entry: health + queen only)

### Key Technical Tasks

**In order:**

1. **Create a `useWeather` Svelte rune/store** that, on mount, calls `navigator.geolocation.getCurrentPosition` (accepts cached positions up to 5 min old via `maximumAge: 300000`) and then calls `https://api.open-meteo.com/v1/forecast?latitude=X&longitude=Y&current_weather=true` with a 5-second fetch timeout (use `AbortController`). Returns `{ status: 'loading' | 'ready' | 'unavailable', data?: WeatherData }`.
2. **Create `WeatherBadge.svelte`** — three states: loading (spinner), ready (temp + description + wind), unavailable (text "Weather not captured"). Integrate into the inspection form page. The badge is non-blocking — the rest of the form works immediately.
3. **Update the inspection form action** to accept the weather payload fields: `temperature`, `weatherDescription`, `windSpeed`, `wmoCode`, `lat`, `lon`, `weatherUnavailable`. Map these to the `inspections` table columns. Re-test `POST /api/hives/:id/inspections` with weather payload via `curl`.
4. **Create the inspection edit form** (`/hives/[hiveId]/inspections/[inspId]/edit`) — pre-filled via `+page.server.ts` load function. Weather section rendered as read-only. Reuse `HealthScoreSelector` and `QueenStatusSelector` components. Wire `PATCH /api/hives/:id/inspections/:inspId`.
5. **Add delete action** on the inspection detail stub page — confirmation dialog, then `DELETE`. Redirect to `/hives/[hiveId]` after deletion.
6. **UX polish pass (4.5)** — this story should be tackled last as a polish pass over what you've already built:
   - Add `required` client-side validation to HealthScoreSelector and QueenStatusSelector (track `touched` state)
   - Inline error messages next to fields (not top-of-page banners)
   - Submit button: add `loading` state (disable + spinner) once form is submitted; reset on error
   - Auto-resize textareas: `textarea { field-sizing: content; max-height: 12rem }` (CSS-only, no JS needed in modern browsers)
   - Test full form fits on 375px — if not, reduce padding/margins rather than removing fields

### Dependencies & Risks

| Item | Detail |
|------|--------|
| **Depends on Sprint 4** | Story 4.1 (new inspection form) must be complete |
| **Risk: Geolocation on iOS Safari** | `getCurrentPosition` requires HTTPS in production. In dev over HTTP, it may not fire. Test the fallback path (unavailable) thoroughly. Consider using the `onload` event to immediately request GPS — do not wait for user interaction |
| **Risk: Open-Meteo API** | The API is free and has no key. Use `current_weather=true` for simplicity — this returns `temperature`, `windspeed`, and `weathercode` (WMO). Map WMO codes to human-readable descriptions client-side (keep a small lookup table). The full mapping table is available in Open-Meteo docs |
| **Risk: `field-sizing: content`** | This CSS property has broad support (Chrome 123+, Firefox 128+, Safari 17.4+) but is not universally supported. Have a JS fallback using an `input` event listener on the textarea as a safety net |

### End State
The inspection workflow is complete. Manuel can create a full inspection with auto-captured weather in under 2 minutes, edit it if needed, and delete it. The form is polished and mobile-friendly. The history list on the hive detail page shows inspection entries but the full history view and chart are the next sprint.

---

## Sprint 6 — History + Chart

### Sprint Goal
Deliver the per-hive inspection history list, a health timeline chart, and an individual inspection detail view, so Manuel can review his data and spot hive health trends at a glance.

### Sprint Backlog

| ID | Story | SP | Status |
|----|-------|----|--------|
| 5.1 | Per-Hive Inspection History List | 3 | To Do |
| 5.2 | Per-Hive Health Timeline Chart | 3 | To Do |
| 5.3 | Inspection Full Detail View | 2 | To Do |
| **Total** | | **8** | |

### Definition of Done — Sprint 6
- [ ] `npm run build` and `npm run lint` pass
- [ ] `/hives/[hiveId]` shows all inspections ordered newest-first with health badge, queen status, weather summary, and truncated notes
- [ ] Empty state shown when no inspections exist
- [ ] Health timeline chart renders as a Chart.js line chart with colour-coded points (red/amber/green)
- [ ] Tapping a chart point navigates to the correct inspection detail view
- [ ] Chart only loads on this route (code-split) — not in the main bundle
- [ ] Inspection detail view shows all fields including full weather data
- [ ] `GET /api/hives/:id/inspections` returns data ordered by `inspected_at DESC` — verified with `curl`
- [ ] Verified on 375px mobile viewport

### Key Technical Tasks

**In order:**

1. **Build out the hive detail page** (`src/routes/hives/[hiveId]/+page.svelte`). This replaces the stub from Sprint 4. The page has two main sections: the inspection history list (immediately visible) and the health chart (below or in a tab). Load inspections in `+page.server.ts` via `getInspectionsByHiveId()`.
2. **Create `InspectionListItem.svelte`** — renders a single inspection entry in the list: date (formatted as "Mon 12 Jan 2026"), health score badge (coloured circle with number), queen status icon (eye / eye-slash / warning icon), 2-line truncated behaviour notes, and weather summary if available.
3. **Wire the history list** in the hive detail page. Add the empty state. Add the "New Inspection" CTA at the top. Verify the list is correct and scrollable on mobile.
4. **Integrate Chart.js** — install `chart.js`. Use a dynamic import (`import('chart.js')`) inside `onMount` in a `HealthChart.svelte` component to ensure code splitting. The chart receives `inspections` as a prop, maps them to `{ x: date, y: healthScore }` data points. Apply colours per data point using the `pointBackgroundColor` dataset option. Fixed y-axis `min: 0.5`, `max: 5.5`.
5. **Make chart points clickable** — use the Chart.js `onClick` callback to get the clicked data index, look up the inspection ID, and call `goto('/hives/[hiveId]/inspections/[inspId]')`. Test this on both desktop click and mobile tap.
6. **Create the inspection detail view** (`/hives/[hiveId]/inspections/[inspId]/+page.svelte`). Load the full inspection in `+page.server.ts` — return `404` if not found. Display all fields in full. Show the Edit and Delete buttons. The Delete button triggers a confirmation dialog. The Edit button links to the edit route from Sprint 5.
7. **Update `GET /api/hives/:id/inspections`** to ensure ordering by `inspected_at DESC` and test with `curl`.

### Dependencies & Risks

| Item | Detail |
|------|--------|
| **Depends on Sprint 5** | Weather data must be stored in inspections for the detail view to display it |
| **Risk: Chart.js bundle size** | Chart.js is ~180KB minified. The dynamic import (`import('chart.js')`) on `onMount` ensures it is not included in the initial page bundle. Verify this with `npm run build` — check the generated `build/` folder for a separate chunk |
| **Risk: Chart.js in SSR** | `onMount` only runs client-side. Wrap any Chart.js code in `onMount` and guard with `typeof window !== 'undefined'`. Do not import Chart.js at the module level in a `.svelte` file — it will try to run during SSR and fail |
| **Risk: Date formatting** | Decide on a consistent date formatting approach now — use the `Intl.DateTimeFormat` API (no library needed). Create a `src/lib/utils/date.ts` utility with a `formatDate(epoch: number)` function. Use it everywhere |

### End State
The hive detail page is complete. Manuel can see all past inspections in a scrollable list, view a colour-coded health chart with clickable points, and tap any entry to read the full detail. The app now has genuine data review capability. Sprint 7 adds filtering and the sting tracker.

---

## Sprint 7 — Filter + Sting Tracker

### Sprint Goal
Add date range filtering to the inspection history, and deliver the complete sting incident tracker (list, create, delete), enabling Manuel to correlate defensive behaviour with hive health data.

### Sprint Backlog

| ID | Story | SP | Status |
|----|-------|----|--------|
| 5.4 | Inspection History Date Range Filter | 3 | To Do |
| 6.1 | Sting Incident List | 2 | To Do |
| 6.2 | Create Sting Incident | 3 | To Do |
| 6.3 | Delete Sting Incident | 2 | To Do |
| **Total** | | **10** | |

### Definition of Done — Sprint 7
- [ ] `npm run build` and `npm run lint` pass
- [ ] Date range filter updates both the inspection list and chart when applied; "Clear filter" resets to all time
- [ ] `GET /api/hives/:id/inspections?from=<epoch>&to=<epoch>` returns filtered results — verified with `curl`
- [ ] Empty state shown when filter returns zero results
- [ ] `/stings` shows all incidents ordered newest-first; filter by hive dropdown works
- [ ] Creating a sting incident validates body location is present; hive selection is optional
- [ ] Deleting a sting incident requires confirmation; does not affect hive data
- [ ] `POST /api/stings` and `DELETE /api/stings/:id` verified with `curl`
- [ ] Verified on 375px mobile viewport

### Key Technical Tasks

**In order:**

1. **Add date range filter UI** to the hive detail page — two `<input type="date">` fields above the inspection list. Store the filter values in Svelte `$state` variables. The filter should be applied client-side for responsiveness (filter the already-loaded `inspections` array) but also update `GET /api/hives/:id/inspections` query params for correctness.
2. **Filter the chart data** in `HealthChart.svelte` — accept a filtered `inspections` prop. When the parent filter changes, update the chart's dataset via `chart.data.datasets[0].data = ...` and call `chart.update()`.
3. **Update `GET /api/hives/:id/inspections`** to accept `?from` and `?to` query parameters (Unix epoch integers). Add a `WHERE inspected_at BETWEEN ? AND ?` clause in Drizzle. This is needed for the service worker cache strategy in Sprint 8.
4. **Create `src/lib/server/db/queries/stings.ts`** with `getStingIncidents(hiveId?)`, `createStingIncident(data)`, `deleteStingIncident(id)`. Write these before building routes.
5. **Create the sting list page** (`/stings`) — query all incidents ordered by `stung_at DESC`. Render `StingListItem.svelte` (date, hive name, body location, notes preview). Add "Filter by hive" dropdown — populate with distinct hives that have sting incidents. Add "Log Sting" CTA. Empty state message.
6. **Create `GET /api/stings` and `GET /api/stings?hiveId=X`** endpoints alongside the list page. Verify both with `curl`.
7. **Create the sting create form** (`/stings/new`) — Date (required, defaults today), Hive dropdown (optional, lists all active + archived hives), Body Location (required, text), Notes (optional, textarea). Server action validates, inserts, redirects to `/stings`. Add `POST /api/stings` endpoint.
8. **Add delete action** to each sting list entry — inline delete button with confirmation dialog. Wire `DELETE /api/stings/:id`. Return `204`.
9. **Add `/stings` navigation link** to the app's main navigation component (header or bottom nav).

### Dependencies & Risks

| Item | Detail |
|------|--------|
| **Depends on Sprint 6** | History list and chart must exist for the date filter to extend them |
| **Depends on Sprint 3** | Hive list must exist for the sting incident hive dropdown |
| **Risk: Client-side vs server-side filtering** | For the date range filter, do both: filter the already-loaded array for immediate UI response, and update the API call so the service worker cache (Sprint 8) reflects filtered results. Avoid fetching on every filter change — debounce or use a "Apply" button |
| **Risk: Sprint is 10 SP** | This is the heaviest sprint. Story 5.4 (3 SP) and 6.2 (3 SP) are the heavy stories. Tackle 5.4 first (builds on existing code), then start fresh with 6.1→6.2→6.3 as a block |

### End State
The inspection history has date filtering. The sting tracker is fully functional — Manuel can log, review, and delete sting incidents and optionally associate them with a hive. The app's core feature set is now complete as a fully online application. Sprints 8–9 add PWA/offline capability on top.

---

## Sprint 8 — PWA Basics

### Sprint Goal
Make the app installable on iOS and Android home screens and ensure the app shell loads from cache instantly, laying the groundwork for offline entry in Sprint 9.

### Sprint Backlog

| ID | Story | SP | Status |
|----|-------|----|--------|
| 7.1 | PWA Manifest & App Icons | 2 | To Do |
| 7.2 | Service Worker — App Shell Caching | 3 | To Do |
| 7.3 | Offline Indicator | 2 | To Do |
| **Total** | | **7** | |

### Definition of Done — Sprint 8
- [ ] `npm run build` and `npm run lint` pass
- [ ] Lighthouse PWA audit (Chrome DevTools) scores ≥ 80
- [ ] No manifest errors in Chrome DevTools → Application → Manifest
- [ ] "Add to Home Screen" on iOS Safari shows the custom icon and "Hive Journal" name
- [ ] With DevTools "Offline" enabled after first visit, reloading the app serves the shell from cache
- [ ] `/api/hives` is served `NetworkFirst` — verified by checking DevTools → Network tab (shows "(ServiceWorker)" source)
- [ ] Offline banner appears immediately when DevTools → Network → Offline is toggled; disappears on reconnect
- [ ] Verified on 375px mobile viewport

### Key Technical Tasks

**In order:**

1. **Create the app icons** — you need three PNG files: `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`. Generate them using a free tool (e.g. `https://maskable.app/editor` for the maskable variant, or generate all three programmatically with a Node script using the `sharp` npm package). A simple honeycomb SVG converted to PNG is sufficient. Place in `static/icons/`.
2. **Write `static/manifest.webmanifest`** with the exact values from story 7.1 AC1: `name`, `short_name`, `display: "standalone"`, `orientation: "portrait"`, `start_url: "/hives"`, `theme_color: "#f59e0b"`, `background_color: "#fefce8"`, `icons` array with all three sizes. Add `<link rel="manifest" href="/manifest.webmanifest">` to `src/app.html`.
3. **Install `vite-plugin-pwa`** — `npm install -D vite-plugin-pwa`. Add the VitePWA plugin to `vite.config.ts` with: `registerType: 'autoUpdate'`, `workbox.globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}']` for app shell precaching, and the `runtimeCaching` rules for API routes:
   - `GET /api/hives` and `GET /api/hives/*/inspections`: `NetworkFirst` strategy, `networkTimeoutSeconds: 5`, `cacheName: 'api-cache'`, `expiration.maxAgeSeconds: 86400`
   - Open-Meteo URLs: `NetworkOnly` strategy (no caching)
4. **Test service worker in production build** — run `npm run build && npm run preview`. Service workers do not work with `npm run dev`. Open `http://localhost:4173`, check DevTools → Application → Service Workers — confirm it is registered. Toggle DevTools → Network → Offline, reload — confirm the app shell loads from cache.
5. **Create the offline store** (`src/lib/client/stores/offline.ts`) — a Svelte `$state` rune or writable store that initialises from `navigator.onLine` and subscribes to `window.addEventListener('online', ...)` and `window.addEventListener('offline', ...)`. Export as `isOffline`.
6. **Create `OfflineBanner.svelte`** — displays when `isOffline` is `true`. Use a sticky amber bar at the top of the viewport. Text: "You are offline — new entries will sync when you reconnect". Add it to `src/routes/(app)/+layout.svelte`.
7. **Run a Lighthouse audit** — open the production preview build (`npm run preview`), run Lighthouse → PWA audit. Address any reported issues. Common ones: missing `apple-touch-icon` (add to `app.html`), missing `<meta name="theme-color">` (add to `app.html`).

### Dependencies & Risks

| Item | Detail |
|------|--------|
| **Depends on Sprint 3** | Hive list and API must exist for service worker caching to be meaningful |
| **Risk: `vite-plugin-pwa` and SSR** | SvelteKit with adapter-node uses SSR. `vite-plugin-pwa` with `ssr: true` config may be needed. Check the `vite-plugin-pwa` SSR docs — the plugin version matters. Pin to a known-working version |
| **Risk: Service worker only works over HTTPS or localhost** | Test using `npm run preview` on `localhost` only. Do not try to test PWA features in `npm run dev` — they will not work |
| **Risk: Icon generation** | Do not spend more than 30 minutes on this. A simple placeholder honeycomb icon is fine for MVP. You can refine it post-launch |
| **Risk: iOS "Add to Home Screen"** | iOS Safari does not auto-prompt for PWA install — the user must manually tap Share → Add to Home Screen. This is expected behaviour. Verify the icon appears correctly — it uses `apple-touch-icon`, not the manifest icons |

### End State
The app is installable from both iOS Safari and Android Chrome. The app shell (HTML/CSS/JS) loads from cache on subsequent visits. The offline banner appears and disappears correctly. The foundation for offline data entry (Sprint 9) is in place.

---

## Sprint 9 — Offline Entry + Sync

### Sprint Goal
Enable Manuel to create inspection entries while his phone has no internet, and have them automatically sync to the server when connectivity is restored — delivering the final critical field-use feature.

### Sprint Backlog

| ID | Story | SP | Status |
|----|-------|----|--------|
| 7.4 | Offline Entry Creation (IndexedDB Queue) | 3 | To Do |
| 7.5 | Background Sync on Reconnect | 5 | To Do |
| **Total** | | **8** | |

### Definition of Done — Sprint 9
- [ ] `npm run build` and `npm run lint` pass
- [ ] Toggling DevTools → Network → Offline, submitting an inspection form saves to IndexedDB (verify in DevTools → Application → IndexedDB)
- [ ] A "1 pending" badge appears in the navigation after offline save
- [ ] Toggling back online triggers sync; the entry appears in the inspection history within 5 seconds
- [ ] The pending badge disappears after successful sync
- [ ] Submitting the same `clientId` twice to the server returns the existing record (no duplicate)
- [ ] Form is usable offline (hive list loads from service worker cache)
- [ ] Sync failure: entry remains in outbox and retries on next online event

### Key Technical Tasks

**In order:**

1. **Create the IndexedDB layer** (`src/lib/client/offline/db.ts`) — use the `idb` npm package (a lightweight Promise wrapper around IndexedDB). Create a `beehiveJournal-offline` database with an `outbox` object store, `keyPath: 'clientId'`, index on `syncStatus`. Export `addToOutbox(entry)`, `getOutbox()`, `removeFromOutbox(clientId)`.
2. **Add `clientId` generation to the inspection form** — generate a UUID v4 on page load using `crypto.randomUUID()` (built-in, no library needed) and embed it as a hidden input in the form. This ID persists across submissions — generate once on page mount.
3. **Modify the inspection form's submit logic** — wrap the form submission in a try/catch. If `isOffline` is true (from the store in Sprint 8), call `addToOutbox(inspectionData)` instead of POSTing to the API. Show a toast: "Saved offline — will sync when you reconnect". Navigate back to `/hives/[hiveId]` as if the save succeeded.
4. **Create a pending count store** (`src/lib/client/stores/pendingSync.ts`) — a reactive store that reads `getOutbox()` count. Update it after every add/remove from the outbox. Create `PendingSyncBadge.svelte` — shows a small amber badge with the count in the navigation bar. Hide it when count is 0.
5. **Create the sync function** (`src/lib/client/offline/sync.ts`) — `syncOutbox()` reads all entries from the outbox, posts each to `POST /api/hives/:hiveId/inspections`, and on success calls `removeFromOutbox(clientId)`. Handle network errors (keep entry in outbox with `syncStatus: 'failed'`). After all entries processed, trigger a page refresh of the current hive's inspection list (use SvelteKit's `invalidate()` or `invalidateAll()`).
6. **Add server-side `clientId` deduplication** — add a `UNIQUE INDEX` on `inspections.client_id` in a new Drizzle migration. In the create inspection handler, use `INSERT OR IGNORE` (Drizzle's `.onConflictDoNothing()`) and return the existing record if `clientId` already exists.
7. **Wire sync triggers** — in `src/lib/client/offline/sync.ts`, export a `registerSyncListeners()` function that attaches `window.addEventListener('online', syncOutbox)` and `document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncOutbox() })`. Call this in the root layout's `onMount`.
8. **Test the full offline flow manually**: DevTools offline → inspect form → submit → verify IndexedDB entry → verify badge → DevTools online → verify sync → verify badge gone → verify inspection in history.

### Dependencies & Risks

| Item | Detail |
|------|--------|
| **Depends on Sprint 8** | Service worker must be active so the hive list is available offline from cache; offline store must exist |
| **Risk: Story 7.5 is 5 SP** | This is the most complex story in the project. The deduplication, sync retry logic, and UI reactivity all need to work together. Budget at least 2–3 focused sessions. Test each piece (IndexedDB reads/writes, API call, deduplication) in isolation before wiring them together |
| **Risk: `idb` library** | `idb` is well-maintained (Jake Archibald, Google). Pin to the latest version. Alternatively, use raw IndexedDB API if you prefer fewer dependencies — but `idb` reduces the risk of callback hell |
| **Risk: iOS Background Sync API** | `BackgroundSync` API is not available on iOS Safari. The `visibilitychange` trigger is the fallback for iOS. Test this explicitly: put the app in the background with pending entries, bring it to the foreground, and confirm sync fires |
| **Risk: Form intercept vs. SvelteKit form actions** | Intercepting a form action to redirect to IndexedDB instead of the server is non-trivial with SvelteKit's `use:enhance`. The recommended approach: use `use:enhance` with a custom `submit` callback that checks `isOffline` and calls `preventDefault()` when offline, then handles the IndexedDB save manually |

### End State
The app works fully offline for inspection entry creation. Pending entries sync automatically when connectivity returns. This is the last major feature sprint. Only deployment remains.

---

## Sprint 10 — Deployment

### Sprint Goal
Deploy beehiveJournal to the Infomaniak VPS with HTTPS, persistent data storage, daily automated backups, and a complete runbook, so the app is live and maintainable without manual intervention.

### Sprint Backlog

| ID | Story | SP | Status |
|----|-------|----|--------|
| 8.1 | Production Docker Compose + Nginx + Certbot | 3 | To Do |
| 8.2 | Persistent Data Volume & Backup | 2 | To Do |
| 8.3 | Deployment Runbook | 2 | To Do |
| **Total** | | **7** | |

### Definition of Done — Sprint 10
- [ ] `npm run build` and `npm run lint` pass
- [ ] `docker compose up -d` on the VPS starts all three services (app, nginx, certbot)
- [ ] `curl https://journal.yourdomain.com` returns HTTP 200
- [ ] HTTPS certificate is valid (not self-signed); browser shows padlock
- [ ] `docker compose down && docker compose up -d` preserves all database data
- [ ] `docker compose build && docker compose up -d` after a code change preserves all database data
- [ ] `scripts/backup.sh` runs without error and creates a timestamped SQLite backup file
- [ ] `docs/runbook.md` covers all steps; verified by doing a fresh deploy end-to-end
- [ ] The app is installable as a PWA from the production HTTPS URL on iOS Safari

### Key Technical Tasks

**In order:**

1. **Audit the existing `docker-compose.yml`** from Sprint 1. It is a dev compose file — create a separate production `docker-compose.prod.yml` (or use a `.env` override approach). The production compose adds the `nginx` and `certbot` services and removes the dev port exposure on the `app` service.
2. **Write `nginx/conf.d/app.conf`** with the full production config:
   - `server { listen 80; }` block: redirect HTTP → HTTPS, and serve the ACME challenge at `/.well-known/acme-challenge/`
   - `server { listen 443 ssl; }` block: TLS config (TLS 1.2+, strong cipher suites), proxy pass to `http://app:3000`, security headers (HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, CSP with `connect-src 'self' https://api.open-meteo.com`), gzip, rate limiting on `/login`
3. **Issue the Let's Encrypt certificate** — before adding HTTPS to Nginx, run Certbot in standalone mode to get the initial cert, then switch Nginx to webroot mode for renewals. Follow this order: (a) start Nginx on port 80 only, (b) run `docker compose run --rm certbot certonly --webroot ...`, (c) confirm cert files exist, (d) update Nginx config to enable HTTPS and restart.
4. **Verify the app container is not publicly exposed** — check `docker ps` on the VPS; the `app` container should have no published ports. Only `nginx` exposes 80/443.
5. **Verify data persistence** — with live data in the DB, run `docker compose down && docker compose up -d`. Confirm all data is intact. Then run `docker compose build && docker compose up -d` (new image build). Confirm data intact again. This is the most important deployment test.
6. **Write `scripts/backup.sh`**:
   ```bash
   #!/bin/bash
   BACKUP_DIR=/data/backups
   mkdir -p $BACKUP_DIR
   sqlite3 /data/beehivejournal.db ".backup '$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sqlite'"
   find $BACKUP_DIR -name "backup-*.sqlite" -mtime +30 -delete
   ```
   Test inside the running container: `docker exec beehivejournal-app bash /app/scripts/backup.sh`. Set up the cron job on the VPS host (not inside the container): `0 2 * * * docker exec beehivejournal-app bash /app/scripts/backup.sh`.
7. **Write `docs/runbook.md`** — write this last, as you go through the deployment steps yourself. Document what you actually did, not what you planned. Include: prerequisites, exact commands, DNS setup, Certbot issuance, user creation, update procedure, cron setup, and the two recovery scenarios.
8. **Final end-to-end test** — on the live VPS, on your phone: (a) navigate to the HTTPS URL, (b) log in, (c) create a hive, (d) log an inspection with weather, (e) add to home screen, (f) go offline (airplane mode), (g) create an offline inspection, (h) reconnect, (i) confirm sync. This is the MVP acceptance test.

### Dependencies & Risks

| Item | Detail |
|------|--------|
| **Depends on all previous sprints** | The full application must be feature-complete before deployment |
| **Risk: DNS propagation** | Point your domain's A record to the VPS IP *before* starting this sprint. DNS propagation can take up to 48 hours. Certbot will fail if DNS is not pointing at your server |
| **Risk: VPS firewall** | Ensure ports 80 and 443 are open on the VPS host firewall (not just Docker). On Ubuntu/Debian: `ufw allow 80 && ufw allow 443`. On Infomaniak VPS, check the control panel firewall rules |
| **Risk: Certbot and docker compose** | The recommended approach for Docker + Certbot is the Nginx + Certbot + webroot method. The `certbot/certbot` Docker image works well. Reference: `https://github.com/wmnnd/nginx-certbot` for a working reference compose setup |
| **Risk: `sqlite3` CLI in app container** | The Alpine-based Node.js image may not have the `sqlite3` CLI installed. Add `RUN apk add --no-cache sqlite` to the Dockerfile so the backup script can use the `.backup` command. The `.backup` command is WAL-safe and is the correct way to back up a live SQLite database |
| **Risk: Runbook is story 8.3 but must be written last** | Only write the runbook after you have completed the actual deployment. A runbook written before the deployment will have errors. Write it as a log of what you did, then format it as instructions |

### End State
**beehiveJournal is live.** The app is accessible over HTTPS from any device. Manuel can log in, manage hives, log inspections with auto-captured weather, view health charts, track sting incidents, and use the app offline at remote apiaries. Daily backups run automatically. A runbook exists for future updates and recovery. The MVP is complete.

---

*This sprint plan is the authoritative execution guide for beehiveJournal MVP. All sprints trace to stories in the epics-and-stories backlog. Update this document as scope decisions evolve, sprints complete, or estimates prove inaccurate.*
