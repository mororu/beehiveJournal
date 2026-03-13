# Sprint 1 Dev Stories — beehiveJournal

**Author:** BMAD Developer Story Agent
**Date:** 2026-03-13
**Sprint Goal:** Establish a fully working SvelteKit + SQLite + Docker project with all tooling configured, so every subsequent sprint starts from a solid, consistent base.
**Total Story Points:** 10 SP
**Status:** Ready for development

---

## Table of Contents

1. [Story 1.1 — SvelteKit Project Scaffold (2 SP)](#story-11--sveltekit-project-scaffold-2-sp)
2. [Story 1.2 — Drizzle ORM + SQLite Schema & Migrations (3 SP)](#story-12--drizzle-orm--sqlite-schema--migrations-3-sp)
3. [Story 1.3 — Docker Dev & Build Setup (3 SP)](#story-13--docker-dev--build-setup-3-sp)
4. [Story 1.4 — Environment Config & Dev Scripts (2 SP)](#story-14--environment-config--dev-scripts-2-sp)
5. [Sprint 1 End State & Definition of Done](#sprint-1-end-state--definition-of-done)

---

## Story 1.1 — SvelteKit Project Scaffold (2 SP)

### Story Header

| Field | Value |
|-------|-------|
| **ID** | 1.1 |
| **Title** | SvelteKit Project Scaffold |
| **Story Points** | 2 SP |
| **Priority** | High |
| **Dependencies** | None — this is the first story |
| **Sprint Goal Contribution** | Creates the project skeleton all other stories build on |

**User Story:** As Manuel, I want a SvelteKit project with TypeScript, Vite, ESLint, and Prettier configured, so that I have a clean, consistent starting point for all development with proper tooling from day one.

---

### Context & Why

This story creates the repository foundation. Every other story in Sprint 1 — and all 32 stories that follow — builds directly on this scaffold. Getting this right means:

- TypeScript is enforced from line 1. Type errors caught here, not in production at 2am.
- ESLint and Prettier are configured once and run in every sprint. Consistent code style costs nothing after this story.
- `@sveltejs/adapter-node` is set from the start. Switching adapters mid-project is painful and error-prone. The architecture calls for a standard Node.js server — configure it now.
- The `.env` pattern is established. Every developer (currently: just Manuel) knows where env vars come from and what they are named.

Do not skip or rush this story. A messy scaffold creates friction for every hour of development that follows.

---

### Pre-conditions

- Node.js 20 LTS is installed: `node --version` should print `v20.x.x`
- npm 10+ is installed: `npm --version` should print `10.x.x` or higher
- Git is installed and the working directory is the project root (`beehiveJournal/`)
- The repository is initialised (already done — this file is inside it)

---

### Implementation Steps

#### Step 1 — Initialise the SvelteKit project

Run the SvelteKit scaffolding tool. When prompted, select the options listed below — do not accept defaults blindly.

```bash
npm create svelte@latest .
```

**Select these options when prompted:**

```
Which Svelte app template?          → Skeleton project
Add type checking with TypeScript?  → Yes, using TypeScript syntax
Add ESLint for code linting?        → Yes
Add Prettier for code formatting?   → Yes
Add Playwright for browser testing? → No  (out of scope for MVP)
Add Vitest for unit testing?        → No  (out of scope for MVP)
```

> **Why skeleton, not a demo app?** The demo app includes example routes, components, and styles that must then be deleted. The skeleton project is cleaner — you add only what the architecture calls for.

After the command completes, verify the initial structure:

```bash
ls -la
```

Expected output includes: `package.json`, `svelte.config.js` (will be renamed), `vite.config.ts`, `src/`, `static/`, `.eslintrc.cjs`, `.prettierrc`.

#### Step 2 — Install dependencies

```bash
npm install
```

Verify the install completed without errors. The `node_modules/` directory should exist.

#### Step 3 — Install `@sveltejs/adapter-node`

The architecture requires `adapter-node` (standard Node.js server output). The scaffold defaults to `adapter-auto`. Replace it now.

```bash
npm install -D @sveltejs/adapter-node
```

#### Step 4 — Write `svelte.config.ts`

The scaffold creates `svelte.config.js`. Replace it with a TypeScript version that uses `adapter-node`.

Delete the generated file and create this exact file at `svelte.config.ts`:

```typescript
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      // Output directory for the Node.js build
      out: 'build',
      // Precompress static assets (gzip + brotli) for faster serving through Nginx
      precompress: true,
    }),

    // Alias for cleaner imports — $lib resolves to src/lib
    alias: {
      $lib: 'src/lib',
    },
  },
};

export default config;
```

> **Why TypeScript for config?** Consistency. All project configuration files are TypeScript. The type-checking on the config itself has caught real misconfigurations.

Delete `svelte.config.js` if it still exists:

```bash
rm -f svelte.config.js
```

#### Step 5 — Verify `vite.config.ts`

The scaffold creates `vite.config.ts`. Confirm it imports from `@sveltejs/kit/vite` and uses `sveltekit()`. It should look like this — leave it as-is for now (Story 1.3 and later sprints will extend it):

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
});
```

#### Step 6 — Create `.env.example`

Create this file at the project root. It documents all environment variables the app needs. The actual `.env` file is never committed — this template is.

```bash
# .env.example
# Copy this file to .env.local for local development.
# On the VPS, copy to .env and fill in real values.
#
# Generate JWT_SECRET with: openssl rand -base64 32

# Path to the SQLite database file
# Local dev: ./data/dev.sqlite
# Production (Docker volume): /data/db.sqlite
DATABASE_PATH=./data/dev.sqlite

# JSON Web Token signing secret
# Must be at least 32 characters of random data
# NEVER commit the real value. Generate with: openssl rand -base64 32
JWT_SECRET=replace-this-with-a-real-secret-minimum-32-chars

# Port the Node.js server listens on
# Default: 3000 (used in Docker). Vite dev server uses 5173 regardless of this setting.
PORT=3000

# Node environment
# Values: development | production
NODE_ENV=development
```

#### Step 7 — Verify and update `.gitignore`

The scaffold creates a `.gitignore`. Confirm these entries exist, and add the missing ones. Open `.gitignore` and ensure it contains at minimum:

```gitignore
# Dependencies
node_modules/

# Build output
build/
.svelte-kit/

# Environment — NEVER commit these
.env
.env.local
.env.*.local

# SQLite database files — data lives in Docker volumes, not the repo
*.sqlite
*.sqlite-journal
*.sqlite-wal
*.sqlite-shm
data/

# OS artefacts
.DS_Store
Thumbs.db

# IDE
.vscode/settings.json
.idea/

# Logs
*.log
npm-debug.log*
```

> **Why exclude `data/`?** The local dev database lives in `./data/dev.sqlite` (set by `DATABASE_PATH` in `.env.local`). The entire `data/` directory must be gitignored so the dev database is never committed. The production database lives in a Docker volume — never in the repo.

#### Step 8 — Verify the dev server starts

```bash
npm run dev
```

Expected output:

```
  VITE v5.x.x  ready in Xms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open `http://localhost:5173` in a browser. You should see the SvelteKit skeleton page ("Welcome to SvelteKit"). No errors in the terminal or browser console.

Stop the dev server with `Ctrl+C`.

#### Step 9 — Verify ESLint and Prettier run cleanly

```bash
npm run lint
npm run format
```

Both commands should complete with no errors on the freshly scaffolded code.

#### Step 10 — Verify TypeScript build

```bash
npm run build
```

Expected output ends with something like:

```
✓ built in Xs
```

No TypeScript errors. The `build/` directory is created.

#### Step 11 — Create the `src/lib/server/` directory structure

Create the directory skeleton that later stories will populate. This prevents confusion about where server-only code lives.

```bash
mkdir -p src/lib/server/db/migrations
mkdir -p src/lib/client
mkdir -p src/lib/components
```

Create placeholder files so git tracks the directories:

```bash
touch src/lib/server/db/.gitkeep
touch src/lib/client/.gitkeep
touch src/lib/components/.gitkeep
```

#### Step 12 — Initial git commit

```bash
git add -A
git commit -m "feat(sprint-1): SvelteKit scaffold with adapter-node, TypeScript, ESLint, Prettier"
```

---

### Files Created / Modified

| File | Action | Notes |
|------|--------|-------|
| `package.json` | Modified | SvelteKit + adapter-node installed |
| `package-lock.json` | Modified | Lock file updated |
| `svelte.config.ts` | Created | Replaces `svelte.config.js`; uses adapter-node |
| `svelte.config.js` | Deleted | Replaced by TypeScript version |
| `vite.config.ts` | Verified | Left as-is; extended in later stories |
| `.env.example` | Created | Documents all env vars |
| `.gitignore` | Modified | Added `.env`, `data/`, `*.sqlite` entries |
| `src/lib/server/db/migrations/.gitkeep` | Created | Tracks empty directory |
| `src/lib/client/.gitkeep` | Created | Tracks empty directory |
| `src/lib/components/.gitkeep` | Created | Tracks empty directory |

---

### Acceptance Criteria Checklist

- [ ] **AC1** `npm create svelte@latest` initialised with TypeScript and SvelteKit 2.x / Svelte 5.x
- [ ] **AC2** `npm run dev` starts the dev server at `localhost:5173` with no errors
- [ ] **AC3** `npm run build` produces a production build in `build/` with no TypeScript errors
- [ ] **AC4** ESLint and Prettier are configured; `npm run lint` and `npm run format` run without errors on the initial scaffold
- [ ] **AC5** `.env.example` file exists with `DATABASE_PATH`, `JWT_SECRET`, and `PORT` variables documented
- [ ] **AC6** `.gitignore` excludes `.env`, `build/`, `node_modules/`, and `*.sqlite` files
- [ ] **AC7** `README.md` contains a "Getting started" section with dev setup instructions

> **Note on AC7:** The BMAD framework's CLAUDE.md covers setup at the repo level. Create a minimal `README.md` at the project root documenting: prerequisites (Node 20, Docker), local dev steps (`npm install`, `cp .env.example .env.local`, `npm run dev`), and a link to the sprint plan. Keep it short — this is not public documentation.

---

### Verification Steps

1. Run `node --version` — confirm `v20.x.x`
2. Run `npm run dev` — confirm dev server at `localhost:5173`, no errors
3. Run `npm run build` — confirm no TypeScript errors, `build/` directory created
4. Run `npm run lint` — confirm no ESLint errors
5. Run `npm run format` — confirm no Prettier errors
6. Confirm `.env.example` exists with all three variables: `DATABASE_PATH`, `JWT_SECRET`, `PORT`
7. Confirm `.gitignore` contains `*.sqlite` and `data/`
8. Confirm `svelte.config.ts` (not `.js`) imports `adapter-node`

---

### Common Pitfalls

**Pitfall 1: Using `adapter-auto` instead of `adapter-node`**
The scaffold's default is `adapter-auto`, which detects the deployment environment at runtime. This is convenient for Vercel/Netlify but wrong for a self-hosted Docker deployment. If `adapter-auto` is left in place, the Docker build will produce an incompatible output. Double-check `svelte.config.ts` imports from `@sveltejs/adapter-node`.

**Pitfall 2: Committing `.env.local` or `data/`**
Run `git status` before committing. If `.env.local` or any `*.sqlite` file appears in the untracked list, stop and verify the `.gitignore` is correct. Once a secret is committed to git history, it requires a full history rewrite to remove — not worth the risk.

**Pitfall 3: Leaving `svelte.config.js` alongside `svelte.config.ts`**
SvelteKit reads config files in a defined priority order. If both `.js` and `.ts` versions exist, behaviour is undefined. Delete `svelte.config.js` immediately after creating `svelte.config.ts`.

---

---

## Story 1.2 — Drizzle ORM + SQLite Schema & Migrations (3 SP)

### Story Header

| Field | Value |
|-------|-------|
| **ID** | 1.2 |
| **Title** | Drizzle ORM + SQLite Schema & Migrations |
| **Story Points** | 3 SP |
| **Priority** | High |
| **Dependencies** | Story 1.1 must be complete |
| **Sprint Goal Contribution** | Establishes the type-safe database layer all features depend on |

**User Story:** As Manuel, I want a Drizzle ORM setup with the full database schema defined and an initial migration applied, so that all features have a consistent, type-safe database layer to build on.

---

### Context & Why

The database schema is the most critical architectural decision in the whole project. Every feature story in Sprints 2–9 reads from and writes to this schema. Getting it right now — with all columns, all constraints, and all indexes — eliminates migration headaches later.

Drizzle ORM is chosen because:
- Schema-as-TypeScript-code: one source of truth for both the DB structure and the TypeScript types
- Zero-overhead type inference: query results are typed automatically
- `drizzle-kit` generates SQL migrations from schema changes — no hand-written SQL
- `better-sqlite3` is synchronous — correct for a single-user app and avoids async complexity

The Drizzle singleton (`src/lib/server/db/index.ts`) must be implemented carefully. SvelteKit's SSR means the database module is loaded on every server-side request. The singleton pattern ensures only one `better-sqlite3` connection is created per process, regardless of how many times the module is imported.

---

### Pre-conditions

- Story 1.1 is complete: `npm run dev` and `npm run build` pass
- The `src/lib/server/db/` directory structure exists (created in Story 1.1)
- `.env.example` exists with `DATABASE_PATH` documented

---

### Implementation Steps

#### Step 1 — Install database packages

```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3
```

Verify installations:

```bash
npm list drizzle-orm better-sqlite3 drizzle-kit
```

Expected output confirms all three are installed.

#### Step 2 — Create local environment file

Before running any database commands, create a local env file so `DATABASE_PATH` is available:

```bash
cp .env.example .env.local
```

Edit `.env.local` to set a local dev database path:

```bash
DATABASE_PATH=./data/dev.sqlite
JWT_SECRET=dev-only-not-secure-change-in-production
PORT=3000
NODE_ENV=development
```

Create the `data/` directory (gitignored):

```bash
mkdir -p data
```

#### Step 3 — Write `drizzle.config.ts`

Create this file at the project root:

```typescript
import { defineConfig } from 'drizzle-kit';

// Load DATABASE_PATH from environment (set in .env.local for dev, .env for production)
const databasePath = process.env.DATABASE_PATH;
if (!databasePath) {
  throw new Error('DATABASE_PATH environment variable is not set. Check your .env.local file.');
}

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/lib/server/db/schema.ts',
  out: './src/lib/server/db/migrations',
  dbCredentials: {
    url: databasePath,
  },
  // Verbose output during migration — helpful for debugging
  verbose: true,
  // Strict mode — fail on any ambiguity rather than making assumptions
  strict: true,
});
```

#### Step 4 — Write `src/lib/server/db/schema.ts`

This is the complete, authoritative schema. Write it exactly as specified — every column, every constraint, every index comment. Do not add, rename, or omit anything.

```typescript
import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// ─── Users ───────────────────────────────────────────────────────────────────
// Single row — single-user app. Created by setup script at deploy time.
// No registration UI — the create-user.ts script handles initial setup.
export const users = sqliteTable('users', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  username:     text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),       // Argon2id hash
  createdAt:    integer('created_at').notNull(),        // Unix epoch (seconds)
});

// ─── Hives ───────────────────────────────────────────────────────────────────
// Represents a physical beehive. Up to 10 can be active simultaneously.
// Archived hives (is_active = false) retain all inspection history.
export const hives = sqliteTable('hives', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  name:        text('name').notNull(),                 // e.g. "Juniper", "Lavender Blue"
  number:      integer('number'),                      // optional display number; unique among active hives
  description: text('description'),                    // optional notes about this hive
  isActive:    integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt:   integer('created_at').notNull(),        // Unix epoch
  updatedAt:   integer('updated_at').notNull(),        // Unix epoch
});

// ─── Inspections ─────────────────────────────────────────────────────────────
// A single inspection visit log for a hive. Core data entry record.
// Weather fields are all nullable — a failed weather fetch is not a failed inspection.
export const inspections = sqliteTable('inspections', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  hiveId:          integer('hive_id').notNull().references(() => hives.id, { onDelete: 'cascade' }),
  inspectedAt:     integer('inspected_at').notNull(),  // Unix epoch; defaults to creation time on client
  healthScore:     integer('health_score').notNull(),  // 1–5 integer scale
  queenStatus:     text('queen_status').notNull(),     // 'seen' | 'not_seen' | 'cells_present'
  behaviourNotes:  text('behaviour_notes'),            // free text; nullable; max 2000 chars enforced in app layer
  nextInspectNote: text('next_inspect_note'),          // reminder for next visit; nullable; max 1000 chars

  // Weather snapshot — all nullable; captured client-side via GPS + Open-Meteo at form open time
  weatherTemp:        real('weather_temp'),            // °C from Open-Meteo
  weatherDesc:        text('weather_desc'),            // e.g. "Partly cloudy" (from WMO code mapping)
  weatherWindSpeed:   real('weather_wind_speed'),      // km/h from Open-Meteo
  weatherCode:        integer('weather_code'),         // WMO weather code from Open-Meteo API
  weatherLat:         real('weather_lat'),             // GPS latitude used for the weather fetch
  weatherLon:         real('weather_lon'),             // GPS longitude used for the weather fetch
  weatherUnavailable: integer('weather_unavailable', { mode: 'boolean' }).default(false),

  // Offline sync deduplication — UUID generated on client at entry creation time
  clientId:    text('client_id'),                      // UUID v4; unique index prevents duplicate syncs

  createdAt:   integer('created_at').notNull(),        // Unix epoch
  updatedAt:   integer('updated_at').notNull(),        // Unix epoch
});

// ─── Sting Incidents ─────────────────────────────────────────────────────────
// Log of times Manuel was stung. Optionally linked to a hive.
// hive_id is nullable (set null on delete) — sting records survive hive deletion.
export const stingIncidents = sqliteTable('sting_incidents', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  hiveId:       integer('hive_id').references(() => hives.id, { onDelete: 'set null' }),
  stungAt:      integer('stung_at').notNull(),         // Unix epoch
  bodyLocation: text('body_location').notNull(),       // e.g. "Left forearm", "Right hand"
  notes:        text('notes'),                         // optional free text
  clientId:     text('client_id'),                     // UUID v4 for offline dedup; nullable

  createdAt:    integer('created_at').notNull(),        // Unix epoch
});

// ─── Inferred Types ──────────────────────────────────────────────────────────
// Export inferred TypeScript types for use throughout the app.
// These types are the single source of truth — never define manual interfaces for DB rows.
export type User          = typeof users.$inferSelect;
export type NewUser       = typeof users.$inferInsert;
export type Hive          = typeof hives.$inferSelect;
export type NewHive       = typeof hives.$inferInsert;
export type Inspection    = typeof inspections.$inferSelect;
export type NewInspection = typeof inspections.$inferInsert;
export type StingIncident    = typeof stingIncidents.$inferSelect;
export type NewStingIncident = typeof stingIncidents.$inferInsert;
```

#### Step 5 — Write `src/lib/server/db/index.ts`

This is the Drizzle singleton. It must:
- Read `DATABASE_PATH` from the environment and fail fast if absent
- Use `better-sqlite3` for the SQLite connection
- Enable WAL mode (Write-Ahead Logging) — critical for performance with concurrent reads
- Return a typed Drizzle instance reused across the application

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

// Fail fast if DATABASE_PATH is not configured.
// This is checked at module load time — if the env var is missing,
// the server will crash immediately on startup, not silently later.
const databasePath = process.env.DATABASE_PATH;
if (!databasePath) {
  throw new Error(
    'DATABASE_PATH environment variable is not set.\n' +
    'For local development, create a .env.local file with:\n' +
    '  DATABASE_PATH=./data/dev.sqlite\n' +
    'For production, set DATABASE_PATH=/data/db.sqlite'
  );
}

// Singleton pattern: one Database connection per Node.js process.
// better-sqlite3 is synchronous — this is correct and intentional for a
// single-user app. SQLite's single-writer model means async adds no benefit.
const sqlite = new Database(databasePath);

// Enable WAL mode for better concurrent read performance.
// WAL allows reads to proceed while a write is in progress.
// This persists across connections — run once at startup.
sqlite.pragma('journal_mode = WAL');

// Enable foreign key constraints — SQLite disables them by default.
// This ensures cascade deletes and set-null references work correctly.
sqlite.pragma('foreign_keys = ON');

// Create and export the typed Drizzle ORM instance.
// The schema object maps table names to Drizzle table definitions,
// enabling fully type-safe queries throughout the application.
export const db = drizzle(sqlite, { schema });

// Export the raw sqlite connection for use cases that need it
// (e.g., the create-user script running outside SvelteKit context).
export { sqlite };
```

#### Step 6 — Generate the initial migration

With the schema and config in place, generate the first SQL migration:

```bash
DATABASE_PATH=./data/dev.sqlite npx drizzle-kit generate
```

This creates files in `src/lib/server/db/migrations/`. Inspect the generated SQL to confirm it matches the schema:

```bash
ls src/lib/server/db/migrations/
```

You should see a file like `0000_initial_schema.sql` (name varies). Open it and verify:
- Four `CREATE TABLE` statements: `users`, `hives`, `inspections`, `sting_incidents`
- All columns match the schema exactly
- Foreign key constraints are present

#### Step 7 — Add the indexes to the migration

The generated migration from Drizzle may not include all custom indexes defined in the architecture. Check the generated SQL. If the following indexes are missing, add them manually to the generated migration file.

Open the generated migration file and ensure these statements are present at the end:

```sql
-- Query patterns: get inspections for a hive ordered by date (most common read path)
CREATE INDEX IF NOT EXISTS `idx_inspections_hive_date` ON `inspections` (`hive_id`, `inspected_at` DESC);

-- Query pattern: get sting incidents for a specific hive
CREATE INDEX IF NOT EXISTS `idx_stings_hive` ON `sting_incidents` (`hive_id`);

-- Offline sync deduplication: prevent duplicate submissions from the same client
-- Partial index — only indexes rows where client_id is not null
CREATE UNIQUE INDEX IF NOT EXISTS `idx_inspections_client_id` ON `inspections` (`client_id`) WHERE `client_id` IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS `idx_stings_client_id` ON `sting_incidents` (`client_id`) WHERE `client_id` IS NOT NULL;
```

> **Important:** Once you have manually edited a migration file, do not regenerate it with `drizzle-kit generate` — that would overwrite your edits. Treat the migration file as the final artifact once the indexes are added.

#### Step 8 — Apply the migration

```bash
DATABASE_PATH=./data/dev.sqlite npx drizzle-kit migrate
```

Expected output confirms the migration applied successfully. The file `./data/dev.sqlite` is created.

Verify the database was created:

```bash
ls -la data/
```

You should see `dev.sqlite`.

#### Step 9 — Verify the schema with Drizzle Studio

```bash
DATABASE_PATH=./data/dev.sqlite npx drizzle-kit studio
```

Open `http://localhost:4983` in a browser. You should see:
- Four tables: `users`, `hives`, `inspections`, `sting_incidents`
- Each table's columns match the schema definition

Stop Drizzle Studio with `Ctrl+C`.

#### Step 10 — Verify migration idempotency

Run the migration command a second time to confirm it is safe to re-run:

```bash
DATABASE_PATH=./data/dev.sqlite npx drizzle-kit migrate
```

Expected output: no changes applied, no errors. This confirms AC7.

#### Step 11 — Git commit

```bash
git add -A
git commit -m "feat(sprint-1): Drizzle ORM schema, migrations, and singleton db instance"
```

---

### Files Created / Modified

| File | Action | Notes |
|------|--------|-------|
| `drizzle.config.ts` | Created | Drizzle CLI config; reads `DATABASE_PATH` from env |
| `src/lib/server/db/schema.ts` | Created | Full schema: users, hives, inspections, sting_incidents with inferred types |
| `src/lib/server/db/index.ts` | Created | Drizzle singleton; WAL mode; foreign keys enabled |
| `src/lib/server/db/migrations/0000_*.sql` | Created | Initial migration generated by drizzle-kit |
| `.env.local` | Created | Local dev env vars (gitignored) |
| `data/dev.sqlite` | Created | Local dev database (gitignored) |
| `package.json` | Modified | `drizzle-orm`, `better-sqlite3`, `drizzle-kit` added |

---

### Acceptance Criteria Checklist

- [ ] **AC1** `better-sqlite3` and `drizzle-orm` are installed; `drizzle.config.ts` exists and points to the dev SQLite file
- [ ] **AC2** `src/lib/server/db/schema.ts` defines all four tables: `users`, `hives`, `inspections`, `sting_incidents` with all columns from the architecture doc (§5)
- [ ] **AC3** `src/lib/server/db/index.ts` exports a singleton Drizzle instance that connects to `DATABASE_PATH` from the environment
- [ ] **AC4** `npm run db:migrate` applies the initial migration and creates the SQLite file with all tables (script added in Story 1.4)
- [ ] **AC5** All database indexes defined in the architecture doc (§5) are present in the migration
- [ ] **AC6** TypeScript types for all tables are inferred correctly from the schema (no `any` types in db queries)
- [ ] **AC7** Running `npm run db:migrate` twice is idempotent — no errors on re-run

> **Note on AC4:** The `npm run db:migrate` script is defined in Story 1.4. For now, run migrations directly with `DATABASE_PATH=./data/dev.sqlite npx drizzle-kit migrate`.

---

### Verification Steps

1. Run `DATABASE_PATH=./data/dev.sqlite npx drizzle-kit migrate` — confirm no errors
2. Run `DATABASE_PATH=./data/dev.sqlite npx drizzle-kit studio` — confirm all four tables appear at `localhost:4983`
3. Run `DATABASE_PATH=./data/dev.sqlite npx drizzle-kit migrate` again — confirm idempotent (no errors, no changes)
4. Run `npm run build` — confirm no TypeScript errors (the schema types must be valid)
5. Run `npm run lint` — confirm no ESLint errors

---

### Common Pitfalls

**Pitfall 1: Schema drift from the migration file**
The schema in `schema.ts` is the source of truth. The migration file is generated from it once. If you modify `schema.ts` after generating the migration (e.g., to add a column), do not manually edit the migration file — run `drizzle-kit generate` again to create a new incremental migration. For Sprint 1, the schema should be complete and final from the start.

**Pitfall 2: Foreign keys not enabled at runtime**
SQLite disables foreign key enforcement by default. Without `sqlite.pragma('foreign_keys = ON')` in `index.ts`, the cascade delete on `hive_id` in `inspections` and the set-null on `hive_id` in `sting_incidents` will silently do nothing. The DB init code already includes this pragma — verify it is there before moving to Sprint 2.

**Pitfall 3: `better-sqlite3` native binding mismatch in Docker**
`better-sqlite3` uses native C++ bindings compiled for the host OS. If you develop on macOS and run in a Linux Alpine Docker container, the bindings will not work. This is solved in Story 1.3 by building the image from scratch inside Docker. Do not pre-build `node_modules/` locally and copy them in — always run `npm ci` inside the Docker build stage.

---

---

## Story 1.3 — Docker Dev & Build Setup (3 SP)

### Story Header

| Field | Value |
|-------|-------|
| **ID** | 1.3 |
| **Title** | Docker Dev & Build Setup |
| **Story Points** | 3 SP |
| **Priority** | High |
| **Dependencies** | Story 1.2 must be complete |
| **Sprint Goal Contribution** | Validates the production container locally before any VPS deployment |

**User Story:** As Manuel, I want a Dockerfile and Docker Compose configuration that builds and runs the app locally, so that I can validate the production container works before deploying to the VPS.

---

### Context & Why

Building and verifying the Docker setup in Sprint 1 — before any application features exist — is a deliberate strategy. It means:

- Every subsequent sprint can be verified in Docker, not just in the dev server. There is no "works on my machine, not in production" problem.
- The native binding issue with `better-sqlite3` on macOS → Linux Alpine is caught now, not on the day of deployment.
- Data persistence via Docker volumes is established and tested from the start. Losing data on a container restart is not a Sprint 10 surprise.
- Story 1.3 establishes the Nginx config skeleton that Story 8.1 (Production Docker Compose) extends with TLS. The sprint 10 story adds HTTPS on top — it does not rewrite the Nginx config from scratch.

The Dockerfile is a two-stage build:
- **Builder stage:** Node.js 20 Alpine, installs all deps, runs `npm run build`
- **Runner stage:** Node.js 20 Alpine, copies only the build output and production deps, runs as a non-root user

This keeps the production image lean. The builder's devDependencies, source files, and build tooling never make it into the final image.

---

### Pre-conditions

- Story 1.2 is complete: schema migrated, Drizzle singleton in place
- Docker Desktop is installed and running: `docker --version` should print `24.x.x` or later
- `docker compose version` should print `Docker Compose version v2.x.x`

---

### Implementation Steps

#### Step 1 — Write the `Dockerfile`

Create this exact file at the project root:

```dockerfile
# =============================================================================
# Stage 1: Builder
# Installs all dependencies (including devDependencies) and compiles the app.
# The builder output is copied to the runner stage; the builder itself is
# discarded, keeping the final image lean.
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching.
# If package.json and package-lock.json have not changed, this layer is cached
# and `npm ci` does not re-run on subsequent builds.
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies) needed for the build.
# --ignore-scripts prevents post-install scripts from running in the wrong context.
# We explicitly rebuild native modules in the runner stage instead.
RUN npm ci

# Copy the full source tree.
COPY . .

# Build the SvelteKit app using adapter-node.
# Output goes to the `build/` directory.
RUN npm run build

# =============================================================================
# Stage 2: Runner
# Minimal production image. Only the compiled build output and production
# dependencies are present. No source files. No devDependencies. No build tools.
# =============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Copy only what is needed to run the production server.
# The build/ directory contains the compiled SvelteKit Node.js server.
COPY --from=builder /app/build ./build

# Copy package manifests for production dependency install.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Copy the scripts directory — needed for create-user.ts and backup.sh
# which are run via `docker exec` after the container starts.
COPY --from=builder /app/scripts ./scripts

# Install only production dependencies.
# This rebuilds native modules (better-sqlite3) from source for the Alpine Linux
# target architecture — critical for macOS build → Linux run compatibility.
RUN npm ci --omit=dev

# Install sqlite3 CLI for the backup script (see scripts/backup.sh).
# The sqlite3 binary is needed for the WAL-safe `.backup` command.
RUN apk add --no-cache sqlite

# ── Security: non-root user ──────────────────────────────────────────────────
# Running as root in a container is a security risk. Create a dedicated
# non-root user and group for the app process.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create the /data directory for the SQLite volume mount.
# The directory must exist before Docker mounts the volume, and must be
# owned by the app user so the Node.js process can write to it.
RUN mkdir -p /data && chown appuser:appgroup /data

# Switch to the non-root user for all subsequent commands and the runtime process.
USER appuser

# Declare the volume mount point for the SQLite database.
# This does not create the volume — docker-compose.yml does that.
# This declaration documents that /data is expected to be externally mounted.
VOLUME ["/data"]

# ── Environment defaults ──────────────────────────────────────────────────────
# These are defaults — override at runtime via docker-compose.yml environment section.
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/db.sqlite

# Expose the port the SvelteKit Node.js server listens on.
# This is an internal port — Nginx proxies to it. It is not mapped to the host.
EXPOSE 3000

# Start the compiled SvelteKit server.
CMD ["node", "build/index.js"]
```

#### Step 2 — Write `docker-compose.yml`

Create this file at the project root. This is the dev/staging compose file — it does not include the Nginx service (added in Sprint 10 for production). For local testing, the app port is mapped directly to `localhost:3000`.

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: beehivejournal-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/data/db.sqlite
      # JWT_SECRET is loaded from the .env file in the project root.
      # Never hardcode secrets in docker-compose.yml.
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3000
    volumes:
      # Named volume for SQLite persistence.
      # The database survives container recreation, image rebuilds, and restarts.
      # Managed by Docker — lives in /var/lib/docker/volumes/beehivejournal_app-data/
      - app-data:/data
    ports:
      # Map container port 3000 to host port 3000 for local testing.
      # In production (Sprint 10), this mapping is removed — only Nginx has public ports.
      - "3000:3000"
    healthcheck:
      # Verify the Node.js server is responding before marking the container healthy.
      # wget is used instead of curl because it is available in Alpine by default.
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

volumes:
  # Named volume for the SQLite database file.
  # Persists across: container restarts, `docker compose down`, image rebuilds.
  # NOT persisted across: `docker compose down -v` (explicitly deletes volumes).
  app-data:
    driver: local

# NOTE: The nginx and certbot services are added in Sprint 10 (Story 8.1).
# This compose file is intentionally minimal for local dev/staging validation.
```

#### Step 3 — Write the Nginx configuration skeleton

Create the Nginx directory structure and configuration files. The full HTTPS config comes in Sprint 10 — this sprint creates the skeleton that Sprint 10 extends. Writing it now means the architecture decisions about the directory structure, file names, and proxy config are locked in.

```bash
mkdir -p nginx/conf.d
```

**Write `nginx/nginx.conf`:**

```nginx
# nginx/nginx.conf
# Global Nginx configuration.
# This file configures Nginx worker processes and event handling.
# Kept minimal — all site-specific config lives in conf.d/app.conf.

user  nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    # Maximum simultaneous connections per worker process.
    # 1024 is more than sufficient for a single-user app.
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    keepalive_timeout  65;

    # Include all site-specific configuration files.
    include /etc/nginx/conf.d/*.conf;
}
```

**Write `nginx/conf.d/app.conf`:**

This is the HTTP-only development configuration. It proxies all traffic directly to the SvelteKit app container. Sprint 10 replaces this with the full HTTPS production configuration including TLS, security headers, rate limiting, and gzip.

```nginx
# nginx/conf.d/app.conf
# Development / staging HTTP configuration.
# Proxies all traffic to the SvelteKit Node.js app on port 3000.
#
# NOTE: This is HTTP-only — for local development and staging validation.
# Sprint 10 (Story 8.1) replaces this with the full HTTPS production config:
#   - HTTP → HTTPS redirect
#   - TLS 1.2+ with Let's Encrypt certificate
#   - Security headers (HSTS, X-Frame-Options, CSP, X-Content-Type-Options)
#   - Rate limiting on /login (5 req/min per IP)
#   - Gzip compression
#   - Static asset cache headers

# Rate limiting zone — pre-declared here so Sprint 10 can enable it
# by simply uncommenting the limit_req directive in the location blocks.
# 10MB zone tracks ~160,000 unique IPs. Rate: 5 requests/minute on /login.
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

server {
    listen 80;
    # Replace with your actual domain when deploying to production.
    # In dev, this matches any hostname (localhost, 127.0.0.1, etc.)
    server_name _;

    # Maximum request body size — supports form submissions and future file uploads.
    client_max_body_size 10M;

    # Proxy all requests to the SvelteKit Node.js app.
    # In Docker Compose, 'app' resolves to the app container's IP via Docker DNS.
    location / {
        proxy_pass http://app:3000;

        # Pass the original host and client IP to the SvelteKit app.
        # SvelteKit uses these for request logging and for setting secure cookies.
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout for the proxied connection.
        # 30s is sufficient for all app operations.
        proxy_read_timeout 30s;
        proxy_connect_timeout 5s;
    }
}
```

#### Step 4 — Build the Docker image

```bash
docker compose build
```

This will:
1. Pull `node:20-alpine`
2. Run `npm ci` (installs all deps including devDependencies)
3. Run `npm run build` (compiles the SvelteKit app)
4. Create a new layer with only production deps and the `build/` output
5. Set up the non-root user and `/data` directory

Expected output ends with:
```
=> exporting to image
=> => writing image sha256:...
=> => naming to docker.io/library/beehivejournal-app
```

If the build fails, the most common cause is a TypeScript error in the source code. Fix the error and rebuild.

#### Step 5 — Create a minimal `.env` file for Docker testing

Docker Compose loads environment variables from a `.env` file in the project root. Create one for testing:

```bash
# .env (gitignored — this is for local Docker testing only)
JWT_SECRET=docker-local-test-secret-change-before-production
```

> **Important:** The `.env` file at the project root is gitignored. This is distinct from `.env.local` (used by Vite's dev server). Docker Compose reads `.env`; Vite reads `.env.local`. Both are gitignored.

#### Step 6 — Start the container

```bash
docker compose up
```

Watch the logs. Expected output:

```
beehivejournal-app  | NODE_ENV: production
beehivejournal-app  | Listening on 0.0.0.0:3000
```

Open `http://localhost:3000` in a browser. You should see the SvelteKit app loading (or a 404/redirect — the app has no routes yet, but the server responds).

Verify the container is healthy:

```bash
docker ps
```

The `STATUS` column should show `Up X seconds (healthy)` after 15 seconds.

#### Step 7 — Verify the app runs as a non-root user

```bash
docker exec beehivejournal-app whoami
```

Expected output: `appuser`

#### Step 8 — Verify data persistence across restarts

The database migration needs to run inside the container before testing persistence. We'll add the `db:migrate` script in Story 1.4, but for now, trigger a migration manually inside the container to create the database file:

```bash
docker exec beehivejournal-app sh -c "DATABASE_PATH=/data/db.sqlite node -e \"
const Database = require('better-sqlite3');
const db = new Database('/data/db.sqlite');
db.pragma('journal_mode = WAL');
console.log('Database created at /data/db.sqlite');
db.close();
\""
```

This creates the SQLite file in the volume. Now test persistence:

```bash
# Stop and remove the container (but NOT the volume)
docker compose down

# Restart
docker compose up -d

# Verify the database file still exists in the volume
docker exec beehivejournal-app ls -la /data/
```

Expected: `db.sqlite` still exists. The volume survived the container restart.

#### Step 9 — Verify logs are accessible

```bash
docker logs beehivejournal-app --tail=50
```

Container logs should be visible. This confirms AC6.

#### Step 10 — Test that missing `JWT_SECRET` is caught

Edit `.env` to remove or blank out `JWT_SECRET`:

```bash
# Temporarily break the JWT_SECRET
echo "JWT_SECRET=" > .env
docker compose down
docker compose up 2>&1 | head -30
```

The app should fail with a clear error message referencing the missing `JWT_SECRET`. Restore the file afterwards:

```bash
echo "JWT_SECRET=docker-local-test-secret-change-before-production" > .env
```

> **Note:** The JWT_SECRET validation is added in Sprint 2 when `src/lib/server/auth.ts` is created. For now, verify that the `DATABASE_PATH` check in `src/lib/server/db/index.ts` fires correctly if the env var is missing.

#### Step 11 — Git commit

Stop the container first:

```bash
docker compose down
```

Then commit:

```bash
git add -A
git commit -m "feat(sprint-1): Dockerfile multi-stage build, docker-compose, Nginx config skeleton"
```

---

### Files Created / Modified

| File | Action | Notes |
|------|--------|-------|
| `Dockerfile` | Created | Two-stage build; builder + runner; non-root appuser |
| `docker-compose.yml` | Created | App service with app-data volume; port 3000 mapped for dev |
| `nginx/nginx.conf` | Created | Global Nginx config |
| `nginx/conf.d/app.conf` | Created | HTTP dev proxy config; HTTPS added in Sprint 10 |
| `.env` | Created | Local Docker secrets (gitignored) |

---

### Acceptance Criteria Checklist

- [ ] **AC1** `Dockerfile` uses a two-stage build (builder + runner) with Node.js 20 Alpine, matching the architecture doc (§10)
- [ ] **AC2** The production image runs as a non-root user (`appuser`)
- [ ] **AC3** `docker compose build && docker compose up` starts the app accessible at `http://localhost:3000`
- [ ] **AC4** The SQLite database file is stored in a Docker volume (`app-data`) and not inside the container layer
- [ ] **AC5** `docker compose down && docker compose up` preserves database contents from the previous run
- [ ] **AC6** Container logs are viewable with `docker logs beehivejournal-app`
- [ ] **AC7** `docker compose up` exits cleanly if `JWT_SECRET` is not set in `.env` (app fails fast with a clear error message)

---

### Verification Steps

1. Run `docker compose build` — confirm no build errors
2. Run `docker compose up -d` — confirm container starts
3. Open `http://localhost:3000` — confirm app responds (even if no UI yet)
4. Run `docker exec beehivejournal-app whoami` — confirm output is `appuser`
5. Run `docker compose down && docker compose up -d` — confirm container restarts
6. Run `docker exec beehivejournal-app ls /data/` — confirm database file survives restart
7. Run `docker logs beehivejournal-app --tail=20` — confirm logs are accessible
8. Run `docker compose down`

---

### Common Pitfalls

**Pitfall 1: `better-sqlite3` native binding mismatch**
If you see an error like `Error: Could not locate the bindings file` or `node_modules/better-sqlite3/build/Release/better_sqlite3.node is not a valid ELF file`, the native bindings were compiled for macOS and copied into the Linux container. The fix is in the Dockerfile: the runner stage runs `npm ci --omit=dev` which recompiles native bindings for Alpine Linux. Ensure you did not inadvertently `COPY --from=builder /app/node_modules ./node_modules` — the runner stage must install its own `node_modules`.

**Pitfall 2: Volume data not persisting — using `docker compose down -v`**
The `-v` flag on `docker compose down` deletes named volumes. Running `docker compose down` (without `-v`) preserves the `app-data` volume. Verify your terminal habits — never use `-v` in development unless you intentionally want to reset the database.

**Pitfall 3: Port 3000 already in use**
If another process (e.g., the Vite dev server or a previous container) is using port 3000, `docker compose up` will fail with `Bind for 0.0.0.0:3000 failed: port is already allocated`. Stop the conflicting process or change the host port in `docker-compose.yml` to `"3001:3000"` for local testing.

---

---

## Story 1.4 — Environment Config & Dev Scripts (2 SP)

### Story Header

| Field | Value |
|-------|-------|
| **ID** | 1.4 |
| **Title** | Environment Config & Dev Scripts |
| **Story Points** | 2 SP |
| **Priority** | High |
| **Dependencies** | Story 1.2 must be complete (Drizzle + schema) |
| **Sprint Goal Contribution** | Provides the single consistent interface for all development tasks |

**User Story:** As Manuel, I want npm scripts for all common dev tasks (dev server, migrate, build, lint, format), so that I have a single consistent interface for working on the project and never have to remember long commands.

---

### Context & Why

This story ties the sprint together. Every interaction with the project — running the dev server, migrating the database, creating users, opening Drizzle Studio — happens through `npm run <script>`. Having named scripts means:

- Zero cognitive overhead. `npm run dev` is always the dev server. `npm run db:migrate` always runs migrations.
- No reliance on remembering full commands with env var prefixes.
- Sprint 2's auth work depends on `create-user` working correctly. The `scripts/create-user.ts` written here is the foundation — Sprint 2's Story 2.1 extends it to full production quality.

`argon2` and `jose` are installed in this story because:
- `argon2` is needed immediately for the create-user script
- `jose` is needed in Sprint 2 Story 2.3 for JWT auth
- Installing both now keeps the package install step out of Sprint 2's critical path

---

### Pre-conditions

- Story 1.2 is complete: schema migrated, Drizzle singleton works
- `.env.local` exists with `DATABASE_PATH=./data/dev.sqlite`
- The `data/dev.sqlite` file exists (created when you ran `drizzle-kit migrate` in Story 1.2)

---

### Implementation Steps

#### Step 1 — Install `argon2` and `jose`

```bash
npm install argon2 jose
```

Verify installation:

```bash
npm list argon2 jose
```

> **Note on `argon2`:** This package uses native C++ bindings (like `better-sqlite3`). It compiles during `npm install`. On macOS, Xcode Command Line Tools must be installed. If compilation fails, install them with `xcode-select --install`.

#### Step 2 — Install `tsx` for running TypeScript scripts directly

The `create-user.ts` script is TypeScript. Rather than compiling it first, use `tsx` to run TypeScript files directly in Node.js — no build step required.

```bash
npm install -D tsx
```

#### Step 3 — Update `package.json` scripts

Open `package.json` and update the `scripts` section. The existing scaffold scripts (`dev`, `build`, `preview`, `lint`, `format`, `check`) remain. Add the new ones:

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
    "lint": "prettier --check . && eslint .",
    "format": "prettier --write .",
    "db:migrate": "dotenv -e .env.local -- drizzle-kit migrate",
    "db:generate": "dotenv -e .env.local -- drizzle-kit generate",
    "db:studio": "dotenv -e .env.local -- drizzle-kit studio",
    "db:drop": "dotenv -e .env.local -- drizzle-kit drop",
    "create-user": "dotenv -e .env.local -- tsx scripts/create-user.ts"
  }
}
```

> **`dotenv -e .env.local --`:** This prefix loads environment variables from `.env.local` before running the command. It requires the `dotenv-cli` package. Install it in the next step.

#### Step 4 — Install `dotenv-cli`

```bash
npm install -D dotenv-cli
```

This package provides the `dotenv` CLI command used in the npm scripts to load `.env.local` variables.

Verify the scripts work:

```bash
npm run db:migrate
```

Expected: no errors, no new migrations applied (schema already migrated in Story 1.2).

```bash
npm run db:studio
```

Expected: Drizzle Studio opens at `localhost:4983`. Stop with `Ctrl+C`.

#### Step 5 — Write `scripts/create-user.ts`

Create the `scripts/` directory and the user creation script:

```bash
mkdir -p scripts
```

```typescript
#!/usr/bin/env tsx
/**
 * scripts/create-user.ts
 *
 * Creates a new user in the beehiveJournal database with a securely hashed password.
 * This script is run once at deployment time — there is no registration UI.
 *
 * Usage (local dev):
 *   npm run create-user -- <username> <password>
 *   e.g.: npm run create-user -- manuel mysecretpassword
 *
 * Usage (inside Docker container):
 *   docker exec beehivejournal-app node scripts/create-user.js <username> <password>
 *
 * The compiled JS version (create-user.js) is produced by the Docker build
 * via tsx --outDir or a separate compile step if needed.
 * For Docker use, tsx is not available — use the precompiled JS.
 */

import argon2 from 'argon2';
import Database from 'better-sqlite3';
import path from 'path';

// ── Argument validation ───────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: npm run create-user -- <username> <password>');
  console.error('');
  console.error('Examples:');
  console.error('  npm run create-user -- manuel mysecretpassword');
  console.error('  docker exec beehivejournal-app node scripts/create-user.js manuel mysecretpassword');
  process.exit(1);
}

if (args.length < 2) {
  console.error('Error: Both <username> and <password> are required.');
  console.error('Usage: npm run create-user -- <username> <password>');
  process.exit(1);
}

const [username, password] = args;

if (!username || username.trim().length === 0) {
  console.error('Error: Username cannot be empty.');
  process.exit(1);
}

if (!password || password.length < 8) {
  console.error('Error: Password must be at least 8 characters long.');
  process.exit(1);
}

// ── Database connection ───────────────────────────────────────────────────────

const databasePath = process.env.DATABASE_PATH;
if (!databasePath) {
  console.error('Error: DATABASE_PATH environment variable is not set.');
  console.error('For local dev: ensure .env.local contains DATABASE_PATH=./data/dev.sqlite');
  console.error('For Docker: DATABASE_PATH is set in docker-compose.yml');
  process.exit(1);
}

const resolvedPath = path.resolve(databasePath);
console.log(`Connecting to database at: ${resolvedPath}`);

let db: Database.Database;
try {
  db = new Database(resolvedPath);
} catch (error) {
  console.error(`Error: Cannot open database at ${resolvedPath}`);
  console.error('Has the database been initialised? Run: npm run db:migrate');
  process.exit(1);
}

// Enable foreign keys (good practice even in scripts)
db.pragma('foreign_keys = ON');

// ── Check if users table exists ───────────────────────────────────────────────

const tableCheck = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
  .get();

if (!tableCheck) {
  console.error('Error: The `users` table does not exist in the database.');
  console.error('Run the database migration first: npm run db:migrate');
  db.close();
  process.exit(1);
}

// ── Check for existing username ───────────────────────────────────────────────

const existingUser = db
  .prepare('SELECT id FROM users WHERE username = ?')
  .get(username);

if (existingUser) {
  console.error(`Error: A user with username '${username}' already exists.`);
  console.error('The create-user script does not overwrite existing users.');
  console.error('To change a password, use a database migration or a password-reset script.');
  db.close();
  process.exit(1);
}

// ── Hash the password ─────────────────────────────────────────────────────────

console.log('Hashing password with Argon2id...');

let passwordHash: string;
try {
  passwordHash = await argon2.hash(password, {
    // Argon2id is the OWASP-recommended variant.
    // It combines Argon2i (side-channel resistant) and Argon2d (GPU resistant).
    type: argon2.argon2id,

    // OWASP recommended parameters for Argon2id (2023):
    // Memory cost: 64 MB (65536 KB)
    memoryCost: 65536,
    // Time cost (iterations): 3
    timeCost: 3,
    // Parallelism: 4 threads
    parallelism: 4,
  });
} catch (error) {
  console.error('Error: Failed to hash password:', error);
  db.close();
  process.exit(1);
}

// ── Insert the user ───────────────────────────────────────────────────────────

const now = Math.floor(Date.now() / 1000); // Unix epoch in seconds

try {
  db.prepare(
    'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)'
  ).run(username, passwordHash, now);

  console.log(`\nSuccess! User '${username}' created.`);
  console.log(`Database: ${resolvedPath}`);
  console.log(`Created at: ${new Date(now * 1000).toISOString()}`);
} catch (error) {
  console.error('Error: Failed to insert user into database:', error);
  db.close();
  process.exit(1);
} finally {
  db.close();
}
```

> **Note on `async` top-level:** The script uses top-level `await` for `argon2.hash()`. This requires the file to be treated as an ES module (the `tsx` runner handles this transparently). The compiled `create-user.js` used in Docker is handled in the Dockerfile's build step — see Step 7.

#### Step 6 — Compile `scripts/create-user.ts` for Docker use

Inside the Docker container, `tsx` is not available (it is a devDependency). The container runs the compiled `scripts/create-user.js`. Add a compilation step to the Dockerfile's runner stage.

Update the `Dockerfile` runner stage. After `COPY --from=builder /app/scripts ./scripts`, add:

```dockerfile
# Compile the create-user TypeScript script to JavaScript for Docker use.
# tsx is a devDependency, not available in the runner stage.
# We use npx tsx (available from builder node_modules) to pre-compile.
COPY --from=builder /app/node_modules ./node_modules_build_temp
RUN npx --prefix /app/node_modules_build_temp tsx --tsconfig /dev/null \
    --outDir /app/scripts_compiled /app/scripts/create-user.ts 2>/dev/null || true
RUN mv /app/scripts_compiled/create-user.js /app/scripts/create-user.js 2>/dev/null || true
RUN rm -rf /app/node_modules_build_temp /app/scripts_compiled
```

> **Simpler alternative:** Instead of the above multi-step approach, update the Dockerfile builder stage to pre-compile the script. Add after `npm run build` in the builder stage:
>
> ```dockerfile
> RUN npx tsx --tsconfig tsconfig.json scripts/create-user.ts --help 2>&1 || true
> RUN node -e "require('esbuild').buildSync({entryPoints:['scripts/create-user.ts'],bundle:true,platform:'node',outfile:'scripts/create-user.js',external:['better-sqlite3','argon2']})" 2>/dev/null || npx tsc scripts/create-user.ts --outDir scripts --esModuleInterop 2>/dev/null || true
> ```

**Practical recommendation:** Use esbuild (already installed as a Vite dependency) to compile the script in the builder stage. Add to the Dockerfile builder stage, after `RUN npm run build`:

```dockerfile
# Compile create-user.ts to CJS for use in the runner stage (no tsx available there)
RUN node_modules/.bin/esbuild scripts/create-user.ts \
    --bundle \
    --platform=node \
    --format=cjs \
    --outfile=scripts/create-user.js \
    --external:better-sqlite3 \
    --external:argon2
```

And update the runner stage `COPY` for scripts to pick up the compiled JS:

```dockerfile
COPY --from=builder /app/scripts/create-user.js ./scripts/create-user.js
```

This is the cleanest approach. Update the `Dockerfile` accordingly.

#### Step 7 — Test the create-user script locally

```bash
npm run create-user -- manuel testpassword123
```

Expected output:

```
Connecting to database at: /path/to/beehiveJournal/data/dev.sqlite
Hashing password with Argon2id...

Success! User 'manuel' created.
Database: /path/to/beehiveJournal/data/dev.sqlite
Created at: 2026-03-13T...Z
```

Verify the user was created:

```bash
npm run db:studio
```

Open `http://localhost:4983`, navigate to the `users` table. You should see one row with `username: manuel` and a non-empty `password_hash`.

The `password_hash` value should start with `$argon2id$` — confirming Argon2id was used.

#### Step 8 — Test duplicate user rejection

```bash
npm run create-user -- manuel testpassword123
```

Expected output:

```
Error: A user with username 'manuel' already exists.
The create-user script does not overwrite existing users.
```

Exit code should be 1. Verify with:

```bash
echo $?
```

Expected: `1`

#### Step 9 — Test missing argument handling

```bash
npm run create-user
```

Expected output: usage instructions, exit code 1.

#### Step 10 — Verify `argon2` and `jose` are importable with no TypeScript errors

Create a temporary test file to verify the packages are correctly typed:

```bash
cat > /tmp/test-imports.ts << 'EOF'
import argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';

// These types should resolve without errors
const _argon2Type: typeof argon2.argon2id = argon2.argon2id;
const _SignJWT: typeof SignJWT = SignJWT;
const _jwtVerify: typeof jwtVerify = jwtVerify;

console.log('All imports resolved correctly');
EOF

npx tsx /tmp/test-imports.ts
rm /tmp/test-imports.ts
```

Expected output: `All imports resolved correctly` — no TypeScript errors.

#### Step 11 — Run a full verification pass

```bash
npm run lint
npm run build
npm run db:migrate
```

All three should pass with no errors.

#### Step 12 — Git commit

```bash
git add -A
git commit -m "feat(sprint-1): npm scripts, create-user script with Argon2id, argon2 + jose installed"
```

---

### Files Created / Modified

| File | Action | Notes |
|------|--------|-------|
| `package.json` | Modified | Added `db:migrate`, `db:generate`, `db:studio`, `db:drop`, `create-user` scripts |
| `scripts/create-user.ts` | Created | Full Argon2id user creation with validation, error handling, and usage docs |
| `Dockerfile` | Modified | Added esbuild step to compile create-user.ts for runner stage |

---

### Acceptance Criteria Checklist

- [ ] **AC1** `package.json` contains scripts: `dev`, `build`, `preview`, `lint`, `format`, `db:migrate`, `db:studio` (Drizzle Studio)
- [ ] **AC2** `npm run dev` loads environment variables from `.env.local` automatically (via Vite's env loading or `dotenv`)
- [ ] **AC3** `npm run db:studio` opens Drizzle Studio at `localhost:4983` for local database inspection
- [ ] **AC4** A `scripts/create-user.ts` file exists that accepts `<username> <password>` args, hashes the password with Argon2id, and inserts the user into the `users` table
- [ ] **AC5** Running `npm run create-user -- manuel password123` creates a user in the dev database with a hashed password (not plaintext)
- [ ] **AC6** `argon2` and `jose` npm packages are installed and importable with no TypeScript errors

**Additional acceptance criteria from Story 2.1 (partially implemented here):**
- [ ] Password is hashed with Argon2id, `memoryCost: 65536`, `timeCost: 3`, `parallelism: 4`
- [ ] Duplicate username is rejected with a clear error message and exit code 1
- [ ] Running the script with no arguments prints usage instructions

---

### Verification Steps

1. Run `npm run db:migrate` — confirm no errors
2. Run `npm run db:studio` — confirm Drizzle Studio opens at `localhost:4983`; stop with Ctrl+C
3. Run `npm run create-user -- testuser Password123` — confirm user created
4. Open Drizzle Studio and verify the `users` table has one row; `password_hash` starts with `$argon2id$`
5. Run `npm run create-user -- testuser Password123` again — confirm duplicate rejection with exit code 1
6. Run `npm run create-user` — confirm usage message and exit code 1
7. Run `npm run lint` — no errors
8. Run `npm run build` — no TypeScript errors

---

### Common Pitfalls

**Pitfall 1: `argon2` native compilation fails on first install**
On macOS, `argon2` requires Xcode Command Line Tools. If `npm install argon2` fails with a compilation error, run `xcode-select --install` and retry. On Linux/Docker, the Alpine image has the necessary build tools (gcc, g++) available if `apk add --no-cache build-base python3` is added to the Dockerfile builder stage — though typically it works without this on the latest `node:20-alpine`.

**Pitfall 2: `dotenv-cli` not found when running `npm run db:migrate`**
The `dotenv -e .env.local --` prefix in npm scripts requires `dotenv-cli` to be installed. If you see `sh: dotenv: command not found`, verify `npm install -D dotenv-cli` succeeded and check `package.json` devDependencies. Run `npm install` to reinstall if needed.

**Pitfall 3: Top-level `await` in `create-user.ts` requires ESM or tsx**
The `argon2.hash()` call uses `await` at the top level. This works with `tsx` (which handles the module format automatically). However, if you try to run the compiled `.js` file with plain `node`, you may get a syntax error. The esbuild compile step in the Dockerfile handles this by bundling with CJS format. Verify the compiled `scripts/create-user.js` runs correctly with `node scripts/create-user.js --help`.

---

---

## Sprint 1 End State & Definition of Done

### What Exists After Sprint 1

At the end of Sprint 1, the repository contains:

```
beehiveJournal/
├── src/
│   ├── app.html                          # SvelteKit app shell (from scaffold)
│   ├── lib/
│   │   ├── server/
│   │   │   └── db/
│   │   │       ├── index.ts              # Drizzle singleton (Story 1.2)
│   │   │       ├── schema.ts             # Full schema with types (Story 1.2)
│   │   │       └── migrations/
│   │   │           └── 0000_*.sql        # Initial migration (Story 1.2)
│   │   ├── client/                       # Empty (populated from Sprint 3+)
│   │   └── components/                   # Empty (populated from Sprint 3+)
│   └── routes/
│       └── +page.svelte                  # Default SvelteKit skeleton page
├── scripts/
│   └── create-user.ts                    # User creation script (Story 1.4)
├── data/
│   └── dev.sqlite                        # Local dev database (gitignored)
├── nginx/
│   ├── nginx.conf                        # Nginx global config (Story 1.3)
│   └── conf.d/
│       └── app.conf                      # HTTP proxy config; HTTPS in Sprint 10 (Story 1.3)
├── drizzle.config.ts                     # Drizzle CLI config (Story 1.2)
├── svelte.config.ts                      # SvelteKit config with adapter-node (Story 1.1)
├── vite.config.ts                        # Vite config (scaffold; extended in Sprint 8)
├── docker-compose.yml                    # App + volume config (Story 1.3)
├── Dockerfile                            # Two-stage build (Story 1.3)
├── .env.example                          # Env var documentation (Story 1.1)
├── .env.local                            # Local dev env vars (gitignored)
├── .env                                  # Docker env vars (gitignored)
├── .gitignore                            # Updated with *.sqlite, data/, .env (Story 1.1)
└── package.json                          # All deps + npm scripts (Stories 1.1–1.4)
```

### Sprint 1 Definition of Done Checklist

All of the following must be true before Sprint 1 is marked complete:

- [ ] `npm run dev` starts the app at `localhost:5173` with no errors
- [ ] `npm run build` produces a clean production build with no TypeScript errors
- [ ] `npm run lint` passes with no errors
- [ ] `npm run db:migrate` creates the SQLite file with all four tables and all indexes
- [ ] `npm run db:migrate` is idempotent (safe to run twice)
- [ ] `npm run db:studio` opens Drizzle Studio at `localhost:4983` showing all four tables
- [ ] `npm run create-user -- manuel testpass` creates a user in the dev database
- [ ] The created user's `password_hash` starts with `$argon2id$`
- [ ] Duplicate username rejection works with exit code 1
- [ ] `docker compose build` succeeds with no errors
- [ ] `docker compose up` starts the app at `localhost:3000`
- [ ] `docker exec beehivejournal-app whoami` returns `appuser`
- [ ] `docker compose down && docker compose up` preserves database contents
- [ ] `docker logs beehivejournal-app` shows readable container logs
- [ ] `.env` and `.env.local` are gitignored (run `git status` to verify)
- [ ] `*.sqlite` files are gitignored

### Packages Installed at End of Sprint 1

**Production dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `@sveltejs/adapter-node` | latest | SvelteKit Node.js adapter |
| `drizzle-orm` | 0.30.x | ORM for SQLite |
| `better-sqlite3` | 9.x | Synchronous SQLite driver |
| `argon2` | 0.31.x | Argon2id password hashing |
| `jose` | 5.x | JWT signing/verification (used in Sprint 2) |

**Dev dependencies (additional):**

| Package | Version | Purpose |
|---------|---------|---------|
| `drizzle-kit` | 0.20.x | Drizzle CLI: generate, migrate, studio |
| `@types/better-sqlite3` | latest | TypeScript types for better-sqlite3 |
| `tsx` | latest | Run TypeScript files directly (for scripts/) |
| `dotenv-cli` | latest | Load .env.local in npm scripts |

### What Sprint 2 Receives from Sprint 1

Sprint 2 (Authentication) starts with:
- ✅ A running SvelteKit app with TypeScript enforced
- ✅ A `users` table in SQLite with `username`, `password_hash`, `created_at`
- ✅ A Drizzle singleton (`db`) importable from `$lib/server/db/index.ts`
- ✅ `argon2` installed and verified working
- ✅ `jose` installed and verified importable
- ✅ A test user (`manuel`) already in the dev database for testing the login form
- ✅ `npm run create-user` working for creating real users in Docker
- ✅ Docker container running, accessible at `localhost:3000`

Sprint 2 only needs to: write `auth.ts`, build the login page, add the JWT guard to `+layout.server.ts`, and implement logout. No dependency management or infrastructure work remains.

---

*This document is the authoritative implementation guide for Sprint 1 of beehiveJournal. All stories trace to Epic 1 (Project Foundation & Dev Setup) in the epics-and-stories backlog. Implementation decisions follow the architecture document (2026-03-13).*
