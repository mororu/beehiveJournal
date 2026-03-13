# Epics & Stories — beehiveJournal

**Author:** Manuel (BMAD Product Owner Agent)
**Date:** 2026-03-13
**Based on:** PRD (2026-03-11), Architecture (2026-03-13)
**Status:** Ready for sprint planning

---

## Table of Contents

1. [Epic Summary Table](#epic-summary-table)
2. [Dependency Map](#dependency-map)
3. [Epic 1: Project Foundation & Dev Setup](#epic-1-project-foundation--dev-setup)
4. [Epic 2: Authentication](#epic-2-authentication)
5. [Epic 3: Hive Management](#epic-3-hive-management)
6. [Epic 4: Inspection Entry](#epic-4-inspection-entry)
7. [Epic 5: Inspection History & Timeline](#epic-5-inspection-history--timeline)
8. [Epic 6: Sting Incident Tracker](#epic-6-sting-incident-tracker)
9. [Epic 7: PWA & Offline](#epic-7-pwa--offline)
10. [Epic 8: Deployment & Operations](#epic-8-deployment--operations)
11. [Post-MVP Stories](#post-mvp-stories)
12. [Story Point Summary](#story-point-summary)

---

## Epic Summary Table

| Epic | Title | MVP Stories | MVP Story Points | Status |
|------|-------|-------------|-----------------|--------|
| E1 | Project Foundation & Dev Setup | 4 | 10 | MVP |
| E2 | Authentication | 4 | 9 | MVP |
| E3 | Hive Management | 5 | 13 | MVP |
| E4 | Inspection Entry | 5 | 16 | MVP |
| E5 | Inspection History & Timeline | 4 | 11 | MVP |
| E6 | Sting Incident Tracker | 3 | 8 | MVP |
| E7 | PWA & Offline | 5 | 13 | MVP |
| E8 | Deployment & Operations | 3 | 7 | MVP |
| **Total** | | **33** | **87** | |

> **Note:** 87 story points is within the target range of 60–90 SP for a solo developer. This is a realistic estimate for a focused greenfield project with well-defined scope.

---

## Dependency Map

Stories must be completed in dependency order. Parallel work is possible where no dependency exists.

```
E1.1 (SvelteKit scaffold)
  └─► E1.2 (Drizzle + SQLite schema)
        └─► E1.3 (Docker dev setup)
              └─► E2.1 (User setup script)
                    └─► E2.2 (Login page)
                          └─► E2.3 (JWT auth guard)
                                └─► E2.4 (Logout)
                                      │
                          ┌───────────┘
                          ▼
                    E3.1 (Hive list)
                    ├─► E3.2 (Create hive)
                    ├─► E3.3 (Edit hive)
                    └─► E3.4 (Archive hive)
                          └─► E3.5 (Delete hive)
                                │
                    ┌───────────┘
                    ▼
              E4.1 (New inspection form)          ◄── depends on E3.1, E3.2
              ├─► E4.2 (Auto weather capture)
              ├─► E4.3 (Edit inspection)
              └─► E4.4 (Delete inspection)
                    │
                    ▼
              E5.1 (Inspection history list)      ◄── depends on E4.1
              ├─► E5.2 (Health timeline chart)
              ├─► E5.3 (Inspection detail view)
              └─► E5.4 (Date range filter)
                    │
                    ▼
              E6.1 (Sting incident list)          ◄── depends on E3.1 (hive list)
              ├─► E6.2 (Create sting incident)
              └─► E6.3 (Delete sting incident)

E1.3 (Docker dev setup)
  └─► E8.1 (Production Docker Compose)
        └─► E8.2 (Persistent data volume)
              └─► E8.3 (Deployment runbook)

E1.1 + E3.1 (scaffold + hive list)
  └─► E7.1 (PWA manifest + icons)
        └─► E7.2 (Service worker caching)
              └─► E7.3 (Offline indicator)
                    └─► E7.4 (Offline entry creation)
                          └─► E7.5 (Background sync)
```

**Critical path (longest dependency chain):**
E1.1 → E1.2 → E1.3 → E2.1 → E2.2 → E2.3 → E3.1 → E3.2 → E4.1 → E4.2 → E5.1 → E5.2

**Stories that can be parallelised once E2.3 is done:**
- E3.x (Hive management) and E7.1 (PWA manifest) can begin simultaneously
- E6.x (Sting tracker) can begin once E3.1 is done, in parallel with E4.x and E5.x

---

## Epic 1: Project Foundation & Dev Setup

**Goal:** Establish a working, runnable SvelteKit + SQLite codebase with all tooling configured. No features yet — just a solid foundation that every other story builds on.

**Covers:** FR37 (Docker), architecture decisions (SvelteKit, Drizzle, TypeScript, Vite).

---

### Story 1.1: SvelteKit Project Scaffold

**As** Manuel, **I want** a SvelteKit project with TypeScript, Vite, ESLint, and Prettier configured, **so that** I have a clean, consistent starting point for all development with proper tooling from day one.

**Acceptance Criteria:**
- [ ] AC1: `npm create svelte@latest` initialised with TypeScript and SvelteKit 2.x / Svelte 5.x
- [ ] AC2: `npm run dev` starts the dev server at `localhost:5173` with no errors
- [ ] AC3: `npm run build` produces a production build in `build/` with no TypeScript errors
- [ ] AC4: ESLint and Prettier are configured; `npm run lint` and `npm run format` run without errors on the initial scaffold
- [ ] AC5: `.env.example` file exists with `DATABASE_PATH`, `JWT_SECRET`, and `PORT` variables documented
- [ ] AC6: `.gitignore` excludes `.env`, `build/`, `node_modules/`, and `*.sqlite` files
- [ ] AC7: `README.md` contains a "Getting started" section with dev setup instructions

**Story Points:** 2
**Priority:** High
**Dependencies:** None

---

### Story 1.2: Drizzle ORM + SQLite Schema & Migrations

**As** Manuel, **I want** a Drizzle ORM setup with the full database schema defined and an initial migration applied, **so that** all features have a consistent, type-safe database layer to build on.

**Acceptance Criteria:**
- [ ] AC1: `better-sqlite3` and `drizzle-orm` are installed; `drizzle.config.ts` exists and points to the dev SQLite file
- [ ] AC2: `src/lib/server/db/schema.ts` defines all four tables: `users`, `hives`, `inspections`, `sting_incidents` with all columns from the architecture doc (§5)
- [ ] AC3: `src/lib/server/db/index.ts` exports a singleton Drizzle instance that connects to `DATABASE_PATH` from the environment
- [ ] AC4: `npm run db:migrate` applies the initial migration and creates the SQLite file with all tables
- [ ] AC5: All database indexes defined in the architecture doc (§5) are present in the migration
- [ ] AC6: TypeScript types for all tables are inferred correctly from the schema (no `any` types in db queries)
- [ ] AC7: Running `npm run db:migrate` twice is idempotent — no errors on re-run

**Story Points:** 3
**Priority:** High
**Dependencies:** 1.1

---

### Story 1.3: Docker Dev & Build Setup

**As** Manuel, **I want** a Dockerfile and Docker Compose configuration that builds and runs the app locally, **so that** I can validate the production container works before deploying to the VPS.

**Acceptance Criteria:**
- [ ] AC1: `Dockerfile` uses a two-stage build (builder + runner) with Node.js 20 Alpine, matching the architecture doc (§10)
- [ ] AC2: The production image runs as a non-root user (`appuser`)
- [ ] AC3: `docker compose build && docker compose up` starts the app accessible at `http://localhost:3000`
- [ ] AC4: The SQLite database file is stored in a Docker volume (`app-data`) and not inside the container layer
- [ ] AC5: `docker compose down && docker compose up` preserves database contents from the previous run
- [ ] AC6: Container logs are viewable with `docker logs beehivejournal-app`
- [ ] AC7: `docker compose up` exits cleanly if `JWT_SECRET` is not set in `.env` (app fails fast with a clear error message)

**Story Points:** 3
**Priority:** High
**Dependencies:** 1.2

---

### Story 1.4: Environment Config & Dev Scripts

**As** Manuel, **I want** npm scripts for all common dev tasks (dev server, migrate, build, lint, format), **so that** I have a single consistent interface for working on the project and never have to remember long commands.

**Acceptance Criteria:**
- [ ] AC1: `package.json` contains scripts: `dev`, `build`, `preview`, `lint`, `format`, `db:migrate`, `db:studio` (Drizzle Studio)
- [ ] AC2: `npm run dev` loads environment variables from `.env.local` automatically (via Vite's env loading or `dotenv`)
- [ ] AC3: `npm run db:studio` opens Drizzle Studio at `localhost:4983` for local database inspection
- [ ] AC4: A `scripts/create-user.ts` file exists that accepts `<username> <password>` args, hashes the password with Argon2id, and inserts the user into `users` table
- [ ] AC5: Running `npm run create-user -- manuel password123` creates a user in the dev database with a hashed password (not plaintext)
- [ ] AC6: `argon2` and `jose` npm packages are installed and importable with no TypeScript errors

**Story Points:** 2
**Priority:** High
**Dependencies:** 1.2

---

## Epic 2: Authentication

**Goal:** Protect the self-hosted app behind a single-user login. No registration UI — the user is created at deploy time. Session persists for 30 days on a rolling basis.

**Covers:** FR30, FR31, FR32, FR33, NFR6, NFR7, NFR8, NFR9.

---

### Story 2.1: User Setup Script

**As** Manuel, **I want** a CLI script that creates the initial user account with a securely hashed password, **so that** I can set up my account at deployment time without needing a registration form in the app.

**Acceptance Criteria:**
- [ ] AC1: `scripts/create-user.ts` (compiled to `scripts/create-user.js`) accepts two positional args: `<username>` and `<password>`
- [ ] AC2: Password is hashed using Argon2id with OWASP-recommended parameters (memory=65536, iterations=3, parallelism=4)
- [ ] AC3: User row is inserted into the `users` table with `username`, `password_hash`, and `created_at` (Unix epoch)
- [ ] AC4: Script prints `User 'manuel' created.` on success
- [ ] AC5: If a user with the same username already exists, the script exits with a clear error message and code 1 — it does not overwrite
- [ ] AC6: Script can be run inside the Docker container: `docker exec beehivejournal-app node scripts/create-user.js manuel <password>`
- [ ] AC7: Running the script with no arguments prints usage instructions

**Story Points:** 2
**Priority:** High
**Dependencies:** 1.2, 1.4

---

### Story 2.2: Login Page & Form

**As** Manuel, **I want** a login page with a username and password form, **so that** I can authenticate and access my journal from any device.

**Acceptance Criteria:**
- [ ] AC1: `GET /login` renders a login page with username input, password input, and a submit button
- [ ] AC2: Form submits via `POST` to a SvelteKit form action (not a JSON API call)
- [ ] AC3: Invalid credentials (wrong username or password) show a generic error message: "Invalid username or password" — no field-specific hints
- [ ] AC4: On successful login, the user is redirected to `/hives`
- [ ] AC5: Input fields have proper `autocomplete` attributes: `username` and `current-password`
- [ ] AC6: The login page is accessible without a session cookie (no auth redirect loop)
- [ ] AC7: The login form is usable on a 375px mobile viewport — no horizontal scrolling, touch targets ≥ 44px
- [ ] AC8: Nginx rate-limiting (5 req/min per IP) is configured in `nginx/conf.d/app.conf` on the `/login` path

**Story Points:** 2
**Priority:** High
**Dependencies:** 2.1

---

### Story 2.3: JWT Cookie Auth Guard & Session Management

**As** Manuel, **I want** my session to be maintained in a secure httpOnly cookie and all app routes to be protected, **so that** my beekeeping data is private and I stay logged in without re-entering my password every visit.

**Acceptance Criteria:**
- [ ] AC1: On successful login, a `session` cookie is set: `httpOnly: true`, `secure: true`, `sameSite: 'lax'`, `maxAge: 30 days`, `path: /`
- [ ] AC2: JWT payload contains `{ sub: userId, username }` and is signed with `HS256` using `JWT_SECRET` from environment
- [ ] AC3: `src/routes/+layout.server.ts` checks for a valid JWT cookie on every request; if absent or invalid, it redirects to `/login`
- [ ] AC4: The JWT `maxAge` is refreshed (rolling expiry) on every authenticated page load — the cookie is re-set with a new 30-day window
- [ ] AC5: Accessing `/hives`, `/stings`, or any protected route without a valid session redirects to `/login`
- [ ] AC6: The `/login` route itself is excluded from the auth guard (no redirect loop)
- [ ] AC7: An expired or tampered JWT cookie is deleted and the user is redirected to `/login`
- [ ] AC8: `src/lib/server/auth.ts` exports `signJWT`, `verifyJWT`, and `setSessionCookie` helper functions

**Story Points:** 3
**Priority:** High
**Dependencies:** 2.2

---

### Story 2.4: Logout

**As** Manuel, **I want** to be able to log out explicitly, **so that** I can close my session on a shared device or when I want to re-authenticate.

**Acceptance Criteria:**
- [ ] AC1: A "Logout" button is accessible from the app's settings page (`/settings`)
- [ ] AC2: Tapping logout submits a form action that deletes the `session` cookie server-side
- [ ] AC3: After logout, the user is redirected to `/login`
- [ ] AC4: After logout, navigating back (browser back button) to a protected route redirects to `/login` — the session is truly cleared
- [ ] AC5: A `POST /api/auth/logout` API endpoint also exists (for future programmatic use) and returns `200` on success

**Story Points:** 2
**Priority:** High
**Dependencies:** 2.3

---

## Epic 3: Hive Management

**Goal:** Allow Manuel to manage his hives — create, view, edit, archive, and delete. All other features depend on hives existing.

**Covers:** FR1, FR2, FR3, FR4, FR5, FR6.

---

### Story 3.1: Hive List Page

**As** Manuel, **I want** to see a list of all my active hives on the home screen of the app, **so that** I can quickly find any hive and navigate to its detail or start a new inspection.

**Acceptance Criteria:**
- [ ] AC1: `GET /hives` loads and renders a list of all hives where `is_active = true`, ordered by hive number then name
- [ ] AC2: Each hive card (`HiveCard.svelte`) displays: hive name, hive number (if set), last inspection date (or "No inspections yet"), and last health score badge
- [ ] AC3: Tapping a hive card navigates to `/hives/[hiveId]`
- [ ] AC4: A prominent "Add Hive" button is visible on the page and links to `/hives/new`
- [ ] AC5: If no hives exist, an empty state message is shown: "No hives yet — add your first hive" with a link to `/hives/new`
- [ ] AC6: An "Archived" link/button is visible to navigate to the archived hives view (can be a filter or separate section on the same page)
- [ ] AC7: The page loads in ≤ 1 second on first render with up to 10 hives
- [ ] AC8: `GET /api/hives?active=true` returns the same active hive list as JSON (used for offline cache)

**Story Points:** 3
**Priority:** High
**Dependencies:** 2.3

---

### Story 3.2: Create Hive

**As** Manuel, **I want** to create a new hive with a name and optional number and description, **so that** I can add each of my physical hives to the app.

**Acceptance Criteria:**
- [ ] AC1: `GET /hives/new` renders a form with: Name (required, text), Number (optional, integer), Description (optional, textarea)
- [ ] AC2: Form submission POSTs to a SvelteKit form action that validates input server-side (name required, number must be a positive integer if provided)
- [ ] AC3: On success, the user is redirected to `/hives/[newHiveId]` (the new hive's detail page)
- [ ] AC4: If name is blank, form shows an inline error: "Hive name is required" without a full page reload
- [ ] AC5: If a hive with the same number already exists among active hives, form shows: "A hive with number [N] already exists"
- [ ] AC6: The new hive appears in the hive list at `/hives` immediately after creation
- [ ] AC7: `POST /api/hives` with `{ name, number?, description? }` creates the hive and returns `201` with the created `Hive` object
- [ ] AC8: A maximum of 10 active hives is enforced — if the limit is reached, the create form shows: "Maximum of 10 active hives reached"

**Story Points:** 3
**Priority:** High
**Dependencies:** 3.1

---

### Story 3.3: Edit Hive

**As** Manuel, **I want** to edit a hive's name, number, and description, **so that** I can correct mistakes or update hive details as my apiary evolves.

**Acceptance Criteria:**
- [ ] AC1: `GET /hives/[hiveId]/edit` renders a pre-filled form with the hive's current name, number, and description
- [ ] AC2: Submitting the form PATCHes the hive and redirects to `/hives/[hiveId]`
- [ ] AC3: All validation rules from Story 3.2 apply (name required, number uniqueness among active hives excluding the current hive)
- [ ] AC4: `PATCH /api/hives/:id` accepts partial updates and returns the updated `Hive` object
- [ ] AC5: An "Edit" link/button is accessible from the hive detail page (`/hives/[hiveId]`)
- [ ] AC6: The updated name/number appears on the hive list and detail page immediately after saving

**Story Points:** 2
**Priority:** Medium
**Dependencies:** 3.1

---

### Story 3.4: Archive Hive

**As** Manuel, **I want** to archive a hive that is no longer active, **so that** it disappears from my main hive list but I keep all its historical inspection data for reference.

**Acceptance Criteria:**
- [ ] AC1: An "Archive Hive" action is accessible from the hive edit page (`/hives/[hiveId]/edit`)
- [ ] AC2: Tapping "Archive Hive" shows a confirmation dialog: "Archive [Hive Name]? It will be hidden from the active list but all inspection data will be kept."
- [ ] AC3: Confirming sets `is_active = false` on the hive and redirects to `/hives`
- [ ] AC4: Archived hives no longer appear in the active hive list
- [ ] AC5: Archived hives are visible at `/hives?archived=true` (or equivalent) — listed separately with an "Unarchive" option
- [ ] AC6: Unarchiving a hive (setting `is_active = true`) restores it to the active list, subject to the 10-hive active limit
- [ ] AC7: `PATCH /api/hives/:id` with `{ isActive: false }` archives the hive; `{ isActive: true }` unarchives it

**Story Points:** 2
**Priority:** Medium
**Dependencies:** 3.3

---

### Story 3.5: Delete Hive

**As** Manuel, **I want** to permanently delete a hive and all its data, **so that** I can remove a hive I added by mistake or that no longer needs any record.

**Acceptance Criteria:**
- [ ] AC1: A "Delete Hive" action is accessible from the hive edit page (`/hives/[hiveId]/edit`)
- [ ] AC2: Tapping "Delete Hive" shows a strong confirmation dialog: "Permanently delete [Hive Name]? This will delete all [N] inspection entries and cannot be undone."
- [ ] AC3: The confirmation dialog requires the user to type the hive name to confirm deletion (prevents accidental taps on mobile)
- [ ] AC4: On confirmation, the hive and all associated inspection entries are deleted (cascade delete per schema)
- [ ] AC5: The user is redirected to `/hives` after deletion
- [ ] AC6: `DELETE /api/hives/:id` returns `204` and the hive no longer appears in any list
- [ ] AC7: Sting incidents linked to the deleted hive have their `hive_id` set to `null` (not deleted)

**Story Points:** 3
**Priority:** Medium
**Dependencies:** 3.4

---

## Epic 4: Inspection Entry

**Goal:** Allow Manuel to create, edit, and delete inspection entries for any hive, with auto-captured weather data. This is the core daily use case.

**Covers:** FR7–FR18, NFR2, NFR3, NFR5, NFR19.

---

### Story 4.1: New Inspection Form

**As** Manuel, **I want** to create a new inspection entry for a hive by filling in a simple form, **so that** I can log every inspection in under 2 minutes while standing at the apiary.

**Acceptance Criteria:**
- [ ] AC1: `GET /hives/[hiveId]/inspect` renders a form with all required fields: Health Score (1–5 selector), Queen Status (seen / not seen / cells present), Behaviour Notes (textarea, optional), Next Inspection Note (textarea, optional), Inspection Date/Time (defaults to now, editable)
- [ ] AC2: Health score is displayed as a 5-star or 5-button selector — touch-friendly with targets ≥ 44px each
- [ ] AC3: Queen status is displayed as three clearly labelled toggle buttons: "Seen", "Not Seen", "Cells Present"
- [ ] AC4: Date/time field defaults to the current date and time; the user can edit it (useful for backdating)
- [ ] AC5: The form can be completed with default values (health=3, queen=not seen, blank notes) in ≤ 5 taps
- [ ] AC6: Submitting the form POSTs to a server action that validates and saves the inspection; user is redirected to `/hives/[hiveId]` on success
- [ ] AC7: `POST /api/hives/:id/inspections` with all required fields returns `201` with the created `Inspection` object
- [ ] AC8: The new inspection appears at the top of the hive's inspection history immediately after saving

**Story Points:** 5
**Priority:** High
**Dependencies:** 3.2

---

### Story 4.2: Auto Weather Capture on Inspection

**As** Manuel, **I want** the weather conditions at my location to be automatically fetched and attached to a new inspection entry when I open the form, **so that** I never have to manually enter weather data.

**Acceptance Criteria:**
- [ ] AC1: When the inspection form page loads, the app requests GPS permission and begins fetching weather from Open-Meteo in the background
- [ ] AC2: A weather loading indicator is shown while the fetch is in progress — the rest of the form is fully interactive during the wait
- [ ] AC3: When weather resolves, a `WeatherBadge` displays: temperature (°C), weather description, wind speed (km/h)
- [ ] AC4: Weather data (temp, description, wind speed, WMO code, lat, lon) is included in the form submission payload
- [ ] AC5: If GPS permission is denied, the weather section shows "Location unavailable" and the form submits with `weatherUnavailable: true`
- [ ] AC6: If the Open-Meteo API call fails or times out (5s timeout), the form shows "Weather unavailable" and the form still submits — `weatherUnavailable: true`
- [ ] AC7: Weather that has been fetched is displayed on the saved inspection entry in the history view
- [ ] AC8: The GPS lookup accepts a cached position up to 5 minutes old (does not block on fresh GPS fix)

**Story Points:** 3
**Priority:** High
**Dependencies:** 4.1

---

### Story 4.3: Edit Inspection Entry

**As** Manuel, **I want** to edit an existing inspection entry, **so that** I can correct a mistake I noticed after saving.

**Acceptance Criteria:**
- [ ] AC1: An "Edit" button is accessible from the full inspection detail view
- [ ] AC2: The edit form is pre-filled with all current values of the inspection
- [ ] AC3: All fields are editable: health score, queen status, behaviour notes, next inspection note, and inspection date/time
- [ ] AC4: Weather data is displayed as read-only on the edit form (not re-fetched; it was captured at creation time)
- [ ] AC5: Saving the edit PATCHes the entry and redirects back to the inspection detail view
- [ ] AC6: `PATCH /api/hives/:id/inspections/:inspId` with partial fields returns the updated `Inspection` object
- [ ] AC7: Health score validation still applies on edit: value must be 1–5 integer

**Story Points:** 2
**Priority:** Medium
**Dependencies:** 4.1

---

### Story 4.4: Delete Inspection Entry

**As** Manuel, **I want** to delete an inspection entry, **so that** I can remove an entry I created by mistake (e.g. duplicate entry).

**Acceptance Criteria:**
- [ ] AC1: A "Delete" button is accessible from the full inspection detail view
- [ ] AC2: Tapping "Delete" shows a confirmation dialog: "Delete this inspection entry? This cannot be undone."
- [ ] AC3: On confirmation, the entry is deleted and the user is redirected to `/hives/[hiveId]`
- [ ] AC4: `DELETE /api/hives/:id/inspections/:inspId` returns `204`
- [ ] AC5: The deleted entry no longer appears in the hive history or affects the health timeline chart

**Story Points:** 2
**Priority:** Medium
**Dependencies:** 4.1

---

### Story 4.5: Inspection Form Validation & UX Polish

**As** Manuel, **I want** the inspection form to provide clear feedback when I make an error and to feel fast and native on mobile, **so that** I never get stuck at the apiary trying to figure out why my entry won't save.

**Acceptance Criteria:**
- [ ] AC1: Client-side validation runs before form submission: health score must be selected (no default blank state), queen status must be selected
- [ ] AC2: Validation errors are displayed inline, next to the relevant field — not as a top-of-page banner
- [ ] AC3: After a successful save, a brief success toast or confirmation message is shown before the redirect
- [ ] AC4: The form submit button shows a loading state while the server request is in flight — prevents double-submission
- [ ] AC5: Behaviour notes and next inspection note textareas grow vertically as the user types (auto-resize) up to a max height
- [ ] AC6: The inspection date/time picker is mobile-native (uses `<input type="datetime-local">`)
- [ ] AC7: The full form fits on a 375px mobile viewport without vertical scrolling for the minimal entry (health + queen status only)

**Story Points:** 2
**Priority:** Medium
**Dependencies:** 4.1

---

## Epic 5: Inspection History & Timeline

**Goal:** Allow Manuel to review past inspections for each hive, see health trends as a chart, drill into individual entry details, and filter by date range.

**Covers:** FR19, FR20, FR21, FR22, NFR4.

---

### Story 5.1: Per-Hive Inspection History List

**As** Manuel, **I want** to see a chronological list of all past inspection entries for a specific hive, **so that** I can review what I observed on previous visits before entering the apiary.

**Acceptance Criteria:**
- [ ] AC1: The hive detail page (`/hives/[hiveId]`) displays a list of all inspection entries ordered by `inspected_at` descending (most recent first)
- [ ] AC2: Each entry in the list shows: date, health score badge, queen status icon, and a truncated (2-line max) behaviour note
- [ ] AC3: Weather summary is shown on each list entry if available: temperature + weather description
- [ ] AC4: Tapping an entry navigates to the full inspection detail view
- [ ] AC5: `GET /api/hives/:id/inspections` returns all inspections for that hive ordered by `inspected_at DESC`
- [ ] AC6: If no inspections exist for the hive, an empty state shows: "No inspections yet — tap 'New Inspection' to start"
- [ ] AC7: The hive name and number are displayed prominently at the top of the page
- [ ] AC8: A "New Inspection" button is always visible at the top of this page (primary CTA)

**Story Points:** 3
**Priority:** High
**Dependencies:** 4.1

---

### Story 5.2: Per-Hive Health Timeline Chart

**As** Manuel, **I want** to see a line chart of health scores over time for each hive, **so that** I can spot trends, dips, and recoveries at a glance without reading through every entry.

**Acceptance Criteria:**
- [ ] AC1: A "Timeline" tab or section on the hive detail page renders a Chart.js line chart of health scores (y-axis: 1–5, x-axis: inspection dates)
- [ ] AC2: The chart renders for up to 200 data points in ≤ 2 seconds
- [ ] AC3: Each data point on the chart is tappable/clickable — tapping a point navigates to that inspection's detail view
- [ ] AC4: The y-axis is fixed from 1 to 5; gridlines at each integer level
- [ ] AC5: Data points are colour-coded by score: red (1–2), amber (3), green (4–5)
- [ ] AC6: The chart is responsive — fills the full width of the viewport on mobile with no horizontal scrolling
- [ ] AC7: If fewer than 2 inspections exist, the chart area shows: "Add at least 2 inspections to see the health timeline"
- [ ] AC8: Chart.js is loaded only on the hive detail route (code-split, not included in main bundle)

**Story Points:** 3
**Priority:** High
**Dependencies:** 5.1

---

### Story 5.3: Inspection Full Detail View

**As** Manuel, **I want** to tap any inspection entry and see its complete details on a dedicated page, **so that** I can read the full behaviour notes, weather conditions, and next-inspection reminder from a specific visit.

**Acceptance Criteria:**
- [ ] AC1: `GET /hives/[hiveId]/inspections/[inspectionId]` (or equivalent route/modal) renders all inspection fields in full
- [ ] AC2: Displayed fields: date/time, health score (badge + numeric), queen status, full behaviour notes, full next inspection note, and full weather details (temp, description, wind, lat/lon)
- [ ] AC3: If weather was unavailable, the weather section shows "Weather not captured"
- [ ] AC4: "Edit" and "Delete" action buttons are accessible from this view
- [ ] AC5: A "Back" link returns to the hive detail page (`/hives/[hiveId]`)
- [ ] AC6: The next inspection note (if present) is visually prominent — it is the most important field for pre-inspection review

**Story Points:** 2
**Priority:** High
**Dependencies:** 5.1

---

### Story 5.4: Inspection History Date Range Filter

**As** Manuel, **I want** to filter the inspection history list and timeline chart by a date range, **so that** I can focus on a specific season or period without scrolling through years of data.

**Acceptance Criteria:**
- [ ] AC1: A date range filter (start date + end date inputs) is accessible above the inspection list on the hive detail page
- [ ] AC2: Applying the filter updates both the inspection list and the health timeline chart to show only entries within the selected range
- [ ] AC3: `GET /api/hives/:id/inspections?from=<epoch>&to=<epoch>` returns only inspections within the range
- [ ] AC4: The filter defaults to "All time" (no filter applied) on initial page load
- [ ] AC5: A "Clear filter" button resets the date range to "All time"
- [ ] AC6: Date inputs use the mobile-native date picker (`<input type="date">`)
- [ ] AC7: If the filtered range returns zero results, the list shows: "No inspections in this date range"

**Story Points:** 3
**Priority:** Medium
**Dependencies:** 5.2

---

## Epic 6: Sting Incident Tracker

**Goal:** Allow Manuel to log sting incidents with date, hive, body location, and notes. This enables him to correlate defensive behaviour with hive health data over a season.

**Covers:** FR23, FR24, FR25, FR26.

---

### Story 6.1: Sting Incident List

**As** Manuel, **I want** to see a chronological log of all sting incidents, **so that** I can review sting history and notice patterns over time (e.g., which hive is most defensive).

**Acceptance Criteria:**
- [ ] AC1: `GET /stings` renders a list of all sting incidents ordered by `stung_at` descending
- [ ] AC2: Each entry in the list shows: date, hive name (or "Unknown hive" if `hive_id` is null), body location, and a truncated notes preview
- [ ] AC3: A "Filter by hive" dropdown allows filtering the list to show only stings from a specific hive
- [ ] AC4: `GET /api/stings` returns all incidents; `GET /api/stings?hiveId=X` returns filtered results
- [ ] AC5: A "Log Sting" button at the top links to `/stings/new`
- [ ] AC6: If no sting incidents exist, an empty state shows: "No sting incidents logged yet"
- [ ] AC7: The filter dropdown lists only hives that have at least one sting incident, plus an "All hives" option

**Story Points:** 2
**Priority:** Medium
**Dependencies:** 3.1

---

### Story 6.2: Create Sting Incident

**As** Manuel, **I want** to log a sting incident with the date, which hive stung me, where on my body, and any notes, **so that** I have a record to correlate with hive health data.

**Acceptance Criteria:**
- [ ] AC1: `GET /stings/new` renders a form with: Date (required, defaults to today), Hive (optional, dropdown of active + archived hives), Body Location (required, free text, e.g. "Left forearm"), Notes (optional, textarea)
- [ ] AC2: Form submits via SvelteKit form action; on success, user is redirected to `/stings`
- [ ] AC3: Body location is required — submitting without it shows: "Body location is required"
- [ ] AC4: Hive selection is optional — stings can be logged without associating a hive
- [ ] AC5: `POST /api/stings` with `{ stungAt, hiveId?, bodyLocation, notes?, clientId? }` returns `201` with the created `StingIncident`
- [ ] AC6: The new sting incident appears at the top of the sting list immediately after creation

**Story Points:** 3
**Priority:** Medium
**Dependencies:** 6.1

---

### Story 6.3: Delete Sting Incident

**As** Manuel, **I want** to delete a sting incident I logged by mistake, **so that** my log stays accurate without incorrect entries.

**Acceptance Criteria:**
- [ ] AC1: A "Delete" button is accessible from each sting incident entry in the list (or from a detail view/swipe action)
- [ ] AC2: Tapping "Delete" shows a confirmation dialog: "Delete this sting entry? This cannot be undone."
- [ ] AC3: On confirmation, the entry is deleted and removed from the list
- [ ] AC4: `DELETE /api/stings/:id` returns `204`
- [ ] AC5: Deleting a sting incident does not affect the associated hive's data

**Story Points:** 2
**Priority:** Medium
**Dependencies:** 6.2

---

## Epic 7: PWA & Offline

**Goal:** Make the app installable on mobile and usable without internet. Offline entry creation is critical for field use at remote apiaries.

**Covers:** FR27, FR28, FR29, FR34, FR35, FR36, NFR15, NFR16, NFR17.

---

### Story 7.1: PWA Manifest & App Icons

**As** Manuel, **I want** the app to have a proper web manifest and custom icon, **so that** when I add it to my phone's home screen it looks and feels like a native app.

**Acceptance Criteria:**
- [ ] AC1: `static/manifest.webmanifest` exists with: `name: "beehiveJournal"`, `short_name: "Hive Journal"`, `display: "standalone"`, `orientation: "portrait"`, `start_url: "/hives"`, `theme_color: "#f59e0b"`, `background_color: "#fefce8"`
- [ ] AC2: Three icon sizes exist in `static/icons/`: `icon-192.png` (192×192), `icon-512.png` (512×512), and `icon-512-maskable.png` (512×512 maskable with safe zone)
- [ ] AC3: Icons use a beehive / honeycomb visual theme appropriate for the app
- [ ] AC4: "Add to Home Screen" on iOS Safari 16+ shows the custom icon and "Hive Journal" as the app name
- [ ] AC5: "Add to Home Screen" on Android Chrome 108+ installs the app with the custom icon and standalone display
- [ ] AC6: The `<link rel="manifest">` tag is present in `src/app.html`
- [ ] AC7: Chrome DevTools / Lighthouse PWA audit reports no manifest errors

**Story Points:** 2
**Priority:** High
**Dependencies:** 1.1

---

### Story 7.2: Service Worker — App Shell Caching

**As** Manuel, **I want** the app shell (HTML, CSS, JavaScript) to be cached by a service worker, **so that** the app loads instantly from the home screen even when my connection is slow.

**Acceptance Criteria:**
- [ ] AC1: `vite-plugin-pwa` and `workbox-window` are installed; Workbox is configured in `vite.config.ts` per the architecture doc (§8)
- [ ] AC2: `registerType: 'autoUpdate'` is set — the service worker updates automatically on new deploys
- [ ] AC3: All app shell assets (JS bundles, CSS, HTML, icons) are precached at service worker install time using glob patterns `**/*.{js,css,html,ico,png,svg,webp}`
- [ ] AC4: On second visit (PWA from home screen), the app shell loads from cache without network — verified by toggling "Offline" in DevTools and reloading
- [ ] AC5: `GET /api/hives` and `GET /api/hives/:id/inspections` are served with `NetworkFirst` caching strategy with a 5-second network timeout and 24-hour cache TTL
- [ ] AC6: Open-Meteo API calls are `NetworkOnly` — never served from cache (weather must be fresh or unavailable)
- [ ] AC7: Lighthouse PWA audit in Chrome DevTools scores ≥ 80 overall

**Story Points:** 3
**Priority:** High
**Dependencies:** 7.1

---

### Story 7.3: Offline Indicator

**As** Manuel, **I want** to see a clear indicator when the app is running in offline mode, **so that** I know my entries will be queued for sync and I don't worry about losing data.

**Acceptance Criteria:**
- [ ] AC1: `src/lib/client/stores/offline.ts` exports a reactive Svelte store that tracks `navigator.onLine` status
- [ ] AC2: The store updates in real-time on `window.addEventListener('online', ...)` and `window.addEventListener('offline', ...)`
- [ ] AC3: `OfflineBanner.svelte` is displayed at the top of the viewport when the store is `false` (offline) — it is sticky and always visible while offline
- [ ] AC4: The banner text reads: "You are offline — new entries will sync when you reconnect"
- [ ] AC5: The banner disappears immediately when connectivity is restored
- [ ] AC6: The offline banner is included in the root layout (`src/routes/(app)/+layout.svelte`) so it appears on all protected pages
- [ ] AC7: The banner is visually distinct (amber/yellow background matching the app theme) and does not obscure any primary content

**Story Points:** 2
**Priority:** High
**Dependencies:** 7.2

---

### Story 7.4: Offline Entry Creation (IndexedDB Queue)

**As** Manuel, **I want** to create inspection entries while my phone has no internet connection, **so that** I can log inspections at a remote apiary and have them sync automatically when I'm back in signal range.

**Acceptance Criteria:**
- [ ] AC1: `src/lib/client/offline/db.ts` creates and manages a `beehiveJournal-offline` IndexedDB database with an `outbox` store (keyPath: `clientId`)
- [ ] AC2: When the user submits a new inspection form while offline, the entry is saved to the IndexedDB outbox instead of being sent to the API
- [ ] AC3: A unique `clientId` (UUID v4) is generated client-side for every new entry — used for deduplication on sync
- [ ] AC4: The user sees a confirmation message after offline save: "Saved offline — will sync when you reconnect"
- [ ] AC5: Weather fetch is skipped when offline; the entry is saved with `weatherUnavailable: true`
- [ ] AC6: A `PendingSyncBadge` in the navigation bar shows the count of pending offline entries (e.g. "2 pending")
- [ ] AC7: The hive list used to pre-fill the inspection form is served from the service worker `NetworkFirst` cache — the form is usable offline using last-cached hive data
- [ ] AC8: In-progress form state is not lost if the network changes during entry — the form submits correctly whether online or offline at the moment of submission

**Story Points:** 3
**Priority:** High
**Dependencies:** 7.3

---

### Story 7.5: Background Sync on Reconnect

**As** Manuel, **I want** offline entries to sync to the server automatically when my phone reconnects to the internet, **so that** I never have to manually push data — it just appears in my journal when I'm back online.

**Acceptance Criteria:**
- [ ] AC1: `src/lib/client/offline/sync.ts` exports a `syncOutbox()` function that reads pending entries from IndexedDB and POSTs them to the appropriate API endpoint
- [ ] AC2: `syncOutbox()` is triggered automatically on the `window 'online'` event
- [ ] AC3: `syncOutbox()` is also triggered when the app gains focus (`document.visibilitychange` to `'visible'`) — covers iOS Safari where Background Sync API is not available
- [ ] AC4: On successful sync of an entry, it is removed from the IndexedDB outbox
- [ ] AC5: The server uses `clientId` deduplication (unique index + `INSERT OR IGNORE`) — submitting the same `clientId` twice returns the existing record without creating a duplicate
- [ ] AC6: If a sync attempt fails (network error or server error), the entry remains in the outbox with `syncStatus: 'pending'` and retries on the next sync trigger
- [ ] AC7: After all entries are synced, the `PendingSyncBadge` count returns to 0 and disappears
- [ ] AC8: Synced entries appear in the hive inspection history within 5 seconds of reconnection (UI refreshes after sync completes)

**Story Points:** 5
**Priority:** High
**Dependencies:** 7.4

---

## Epic 8: Deployment & Operations

**Goal:** Deploy the app to the Infomaniak VPS with HTTPS, persistent data, and a documented runbook. The app must be self-maintainable without external support.

**Covers:** FR37, FR38, FR39, FR40, NFR6, NFR11, NFR12, NFR14.

---

### Story 8.1: Production Docker Compose + Nginx + Certbot

**As** Manuel, **I want** a production Docker Compose configuration with Nginx reverse proxy and Let's Encrypt TLS, **so that** the app is accessible over HTTPS from the internet on my VPS.

**Acceptance Criteria:**
- [ ] AC1: `docker-compose.yml` defines three services: `app` (SvelteKit Node.js), `nginx` (Alpine), `certbot` (one-shot + cron renewal)
- [ ] AC2: `nginx/conf.d/app.conf` includes: HTTP→HTTPS redirect, ACME challenge path, TLS config (TLS 1.2+), security headers (HSTS, X-Frame-Options, CSP, X-Content-Type-Options), gzip compression, and rate limiting on `/login` (5 req/min)
- [ ] AC3: The CSP header includes `connect-src 'self' https://api.open-meteo.com` to permit the weather API fetch
- [ ] AC4: The SvelteKit app container is not exposed on any public port — it listens only on the internal Docker network at port 3000
- [ ] AC5: `docker compose up -d` on the VPS starts all services; `curl https://journal.example.com` returns HTTP 200
- [ ] AC6: Let's Encrypt certificate is successfully issued using the Certbot webroot method and is valid for the configured domain
- [ ] AC7: `docker compose restart: unless-stopped` is set on the `app` and `nginx` services

**Story Points:** 3
**Priority:** High
**Dependencies:** 1.3

---

### Story 8.2: Persistent Data Volume & Backup

**As** Manuel, **I want** the SQLite database to persist in a Docker volume across container updates and restarts, and have a daily automated backup, **so that** I never lose inspection data due to a deployment or container crash.

**Acceptance Criteria:**
- [ ] AC1: The `app-data` Docker volume is defined in `docker-compose.yml` and mounted at `/data` in the app container
- [ ] AC2: `docker compose down && docker compose up -d` (container recreation) preserves all database contents
- [ ] AC3: `docker compose build && docker compose up -d` (image rebuild) preserves all database contents — the database is never inside the container image layer
- [ ] AC4: A cron job script exists in `scripts/backup.sh` that copies the SQLite file using `.backup` command (WAL-safe) to a timestamped filename
- [ ] AC5: The backup script retains only the last 30 daily backups (deletes older files)
- [ ] AC6: `scripts/backup.sh` is documented in the runbook with instructions for scheduling via cron on the VPS host
- [ ] AC7: Application logs (`docker logs beehivejournal-app`) include structured request logs for each API call (method, path, status code, response time)

**Story Points:** 2
**Priority:** High
**Dependencies:** 8.1

---

### Story 8.3: Deployment Runbook

**As** Manuel, **I want** a complete written runbook covering initial deployment, updates, and basic recovery steps, **so that** I can set up the app on a fresh VPS and recover from common issues without relying on my memory.

**Acceptance Criteria:**
- [ ] AC1: `docs/runbook.md` (or equivalent) covers: prerequisites (VPS OS, Docker install, DNS setup), initial deployment steps (clone, .env setup, cert issuance, first run, user creation), and a checklist format for first-time setup
- [ ] AC2: Runbook includes the exact commands for issuing a Let's Encrypt certificate via Certbot webroot method
- [ ] AC3: Runbook includes update procedure: `git pull`, `docker compose build`, `docker compose up -d` — with note that data volume is preserved
- [ ] AC4: Runbook includes at least two recovery scenarios: (a) app container crash/restart, (b) failed database migration requiring rollback
- [ ] AC5: Runbook includes the command for creating the initial user: `docker exec beehivejournal-app node scripts/create-user.js <username> <password>`
- [ ] AC6: Runbook includes cron job configuration for certificate renewal and daily database backup
- [ ] AC7: Runbook is verified by performing a full deploy from scratch on the target VPS (Infomaniak VPS Lite) and confirming all steps work as documented

**Story Points:** 2
**Priority:** Medium
**Dependencies:** 8.2

---

## Post-MVP Stories

These stories are **out of scope for the MVP** but are defined here for backlog planning and to avoid architectural decisions that would block them later.

---

### Post-MVP Story A: Honey Harvest Tracker

**As** Manuel, **I want** to log honey harvests per hive with date, weight, and notes, **so that** I can track my seasonal yield per colony.

**Story Points:** 5
**Priority:** Low
**Dependencies:** 3.1

---

### Post-MVP Story B: Photo Attachments on Inspections

**As** Manuel, **I want** to attach up to 3 photos to an inspection entry, **so that** I have visual records of unusual findings (e.g. queen cells, disease signs).

**Story Points:** 8
**Priority:** Low
**Dependencies:** 4.1

---

### Post-MVP Story C: Multi-Hive Comparison Dashboard

**As** Manuel, **I want** to compare health scores across all my active hives on a single chart, **so that** I can see at a glance which colonies are thriving and which need attention.

**Story Points:** 5
**Priority:** Low
**Dependencies:** 5.2

---

### Post-MVP Story D: Data Export (JSON/CSV)

**As** Manuel, **I want** to download all my hive and inspection data as a JSON or CSV file, **so that** I have a portable backup independent of the app.

**Story Points:** 3
**Priority:** Low
**Dependencies:** 5.1

---

### Post-MVP Story E: Seasonal Summary View

**As** Manuel, **I want** an auto-generated end-of-season summary per hive showing inspection count, average health score, queen status history, and sting incidents, **so that** I can reflect on each colony's season without manually compiling data.

**Story Points:** 5
**Priority:** Low
**Dependencies:** 5.4, 6.1

---

### Post-MVP Story F: Medication & Treatment Log

**As** Manuel, **I want** to log treatments and medications applied to each hive with date, product name, and dosage, **so that** I maintain a complete health record for each colony.

**Story Points:** 5
**Priority:** Low
**Dependencies:** 3.1

---

## Story Point Summary

### MVP Story Points by Epic

| Epic | Stories | Story Points |
|------|---------|--------------|
| E1: Project Foundation & Dev Setup | 4 | 10 |
| E2: Authentication | 4 | 9 |
| E3: Hive Management | 5 | 13 |
| E4: Inspection Entry | 5 | 16 |
| E5: Inspection History & Timeline | 4 | 11 |
| E6: Sting Incident Tracker | 3 | 8 |
| E7: PWA & Offline | 5 | 13 |
| E8: Deployment & Operations | 3 | 7 |
| **Total MVP** | **33** | **87** |

### Story Priority Distribution

| Priority | Count | Story Points |
|----------|-------|--------------|
| High | 20 | 62 |
| Medium | 13 | 25 |

### Suggested Sprint Order (Solo Developer, ~8–10 SP per sprint)

| Sprint | Stories | SP | Focus |
|--------|---------|-----|-------|
| Sprint 1 | 1.1, 1.2, 1.3, 1.4 | 10 | Foundation |
| Sprint 2 | 2.1, 2.2, 2.3, 2.4 | 9 | Auth |
| Sprint 3 | 3.1, 3.2, 3.3 | 8 | Hive basics |
| Sprint 4 | 3.4, 3.5, 4.1 | 10 | Hive archive/delete + Inspection form |
| Sprint 5 | 4.2, 4.3, 4.4, 4.5 | 9 | Inspection features |
| Sprint 6 | 5.1, 5.2, 5.3 | 8 | History + chart |
| Sprint 7 | 5.4, 6.1, 6.2, 6.3 | 10 | Filter + sting tracker |
| Sprint 8 | 7.1, 7.2, 7.3 | 7 | PWA basics |
| Sprint 9 | 7.4, 7.5 | 8 | Offline entry + sync |
| Sprint 10 | 8.1, 8.2, 8.3 | 7 | Deployment |
| **Total** | **33** | **87** | |

> Each sprint is self-contained and produces working, testable functionality. The critical path (foundation → auth → hives → inspections → deployment) is prioritised. PWA/offline is built last, on top of a fully working online system — per the architecture principle: "Offline is an enhancement, not the foundation."

---

*This document is the authoritative story backlog for beehiveJournal MVP. All stories trace to functional requirements in the PRD. Story points are Fibonacci estimates for a solo developer. Update this document as scope decisions evolve.*
