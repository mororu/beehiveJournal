---
project_name: 'beehiveJournal'
user_name: 'Manuel'
date: '2026-05-14'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 42
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **SvelteKit** 2.50.2 + **Svelte** 5.51.0 (Runes mode)
- **TypeScript** 5.9.3 — strict mode enabled
- **Drizzle ORM** 0.45.1 + **better-sqlite3** 12.6.2 (synchronous)
- **Vite** 7.3.1 + **vite-plugin-pwa** 1.2.0
- **@sveltejs/adapter-node** 5.5.4 (Node.js SSR — never adapter-auto)
- **jose** 6.2.1 (JWT HS256 signing/verification)
- **argon2** 0.44.0 (Argon2id password hashing)
- **chart.js** 4.5.1
- **workbox-window** 7.4.0
- **ESLint** 10.0.3 + **Prettier** 3.8.1 + eslint-plugin-svelte 3.15.2
- **dotenv-cli** 11.0.0 (for local dev scripts with `.env.local`)
- **tsx** 4.21.0 (for running TypeScript scripts directly)
- **sharp** 0.34.5 (icon generation — dev only)
- No test framework is configured

## Critical Implementation Rules

### Language-Specific Rules

- **ESM imports always use `.js` extension** — import local `.ts` files as `.js`
  (e.g., `import { db } from '../index.js'`, never `'../index'` or `'../index.ts'`).
  Required by `"moduleResolution": "bundler"` + Node ESM output.
- **TypeScript strict mode is on** — no implicit `any`, no unchecked nulls.
  All function parameters and return types must be inferrable or explicitly typed.
- **Schema types are the source of truth** — always use Drizzle's `$inferSelect` /
  `$inferInsert` for DB row types. Never write manual interfaces for DB tables.
- **`satisfies` for insert values** — use `satisfies NewHive` (etc.) on insert
  `.values({...})` calls to catch schema mismatches at compile time (see `hives.ts`).
- **`$lib` alias** — use `$lib/...` for all imports from `src/lib/`. Never use
  relative paths that cross the `src/lib` boundary.
- **Error handling in API routes** — use SvelteKit's `error(statusCode, { message })`
  helper, never `throw new Error(...)` directly in route files.
- **No top-level `await` in route files** — SvelteKit server files are synchronous
  module-level; async logic lives inside `load` / `RequestHandler` functions only.

### Framework-Specific Rules

**Svelte 5 Runes (enforced for all app code):**
- **Always use Runes syntax** — `$props()`, `$state()`, `$derived()`, `$effect()`.
  `runes: true` is set in `svelte.config.js` via `dynamicCompileOptions` for all
  non-`node_modules` files. Legacy `export let`, `$:` reactive statements, and
  `svelte/store` writables are forbidden in `.svelte` files.
- **Props declaration** — `let { data }: { data: PageData } = $props();`
  Always destructure with explicit TypeScript type annotation.

**SvelteKit Route Conventions:**
- **Strict route file separation** — form actions go in `+page.server.ts` only;
  JSON API handlers go in `+server.ts` only. Never mix them.
- **Auth guard is root-only** — `src/routes/+layout.server.ts` guards all routes.
  Individual page `load` functions access `event.locals.user` (never re-verify the
  cookie themselves). `locals.user` type is `{ userId: number; username: string } | null`
  as declared in `src/app.d.ts`.
- **`/login` and `/logout` are excluded from the guard** — the layout server
  explicitly checks `url.pathname` before running auth. New public routes must be
  added to that check.
- **DB query helpers only in routes** — routes import from
  `$lib/server/db/queries/*.ts`. Never write Drizzle calls directly in route files.
- **`use:enhance` for forms** — all `<form method="POST">` elements use
  `use:enhance` from `$app/forms` for progressive enhancement (no full-page reload).

**Data & Timestamps:**
- **All timestamps are Unix epoch seconds** — use `Math.floor(Date.now() / 1000)`
  for `now`. DB integer columns store seconds, not milliseconds. Never store ISO
  strings or Date objects in the database.
- **Date formatting via utility** — always use `formatDate()`, `formatDateTime()`,
  `toDatetimeLocal()`, `fromDatetimeLocal()` from
  `$lib/client/utils/date.ts`. Never inline `Intl.DateTimeFormat` in components.

**DB Layer:**
- **`better-sqlite3` is synchronous by design** — all query helper functions return
  values directly (not Promises). Never add `async`/`await` to DB query functions.
  SQLite single-writer model means async provides no benefit for this single-user app.
- **WAL mode + foreign keys** — enabled at startup in `src/lib/server/db/index.ts`.
  Do not add `PRAGMA` statements to migration files.
- **Auto-migrate on startup** — `migrate()` is called in `db/index.ts`. New tables
  require a new Drizzle migration file (`npm run db:generate`), never hand-edited.
- **Fail-fast env vars** — `DATABASE_PATH` and `JWT_SECRET` throw immediately at
  module load if unset. All new required env vars must follow this same pattern.

### Testing Rules

- **No test framework is currently configured** — there are no unit, integration,
  or E2E tests in this project. `test-artifacts/` exists but is empty.
- **Manual testing is the current standard** — the Definition of Done for all
  sprints required manual browser testing at 375px mobile viewport and `curl`
  verification of API endpoints.
- **Before adding a test framework** — run `/bmad-tea-testarch-framework` to
  scaffold it properly (supports Playwright and Cypress). Do not add ad-hoc test
  configs without going through that workflow.
- **`npm run build` and `npm run lint` are the CI gates** — both must pass cleanly
  before any story is considered done. These are the only automated quality checks
  currently in place.
- **PWA/service worker testing requires production build** — `npm run preview`
  (not `npm run dev`). The service worker is disabled in dev mode
  (`devOptions.enabled: false` in `vite.config.ts`).

### Code Quality & Style Rules

**Linting & Formatting:**
- **Prettier + ESLint must both pass** — run `npm run lint` (checks both).
  Fix with `npm run format` for Prettier issues, then fix ESLint manually.
- **`eslint-plugin-svelte` is active** — Svelte-specific lint rules apply.
  Do not suppress Svelte lint warnings without understanding why they fire.

**UI & CSS Conventions:**
- **German UI throughout** — all user-facing text (labels, buttons, nav items,
  empty states, error messages, page titles) must be in German. `<html lang="de">`.
- **CSS custom properties for all colours** — never hardcode hex values in
  component `<style>` blocks. Use:
  - `--color-accent: #f59e0b` (amber — primary CTA, title bar)
  - `--color-accent-hover: #d97706`
  - `--color-text: #1a1a1a`
  - `--color-text-muted: #6b7280`
  - `--color-border: #e5e7eb`
  - `--color-surface: #ffffff`
  - `--color-hover: #f3f4f6`
  - `--color-bg: #f3f4f6`
- **Scoped styles** — all component CSS lives in `<style>` blocks (scoped by
  default in Svelte). No global stylesheet exists beyond `app.html` resets.
- **Font** — Inter loaded from Google Fonts in `app.html`. Already available
  globally; do not re-import it in components.
- **Mobile-first, 44px touch targets** — all interactive elements (buttons, links
  acting as buttons) must have `min-height: 44px`. Content pages use
  `max-width: 600px; margin: 0 auto`.

**Naming Conventions:**
- **Components** — PascalCase `.svelte` files in `src/lib/components/`
  (e.g., `HiveCard.svelte`, `HealthBadge.svelte`).
- **Route files** — SvelteKit conventions only (`+page.svelte`, `+page.server.ts`,
  `+server.ts`, `+layout.svelte`, `+layout.server.ts`).
- **Query files** — camelCase, domain-named: `hives.ts`, `inspections.ts`,
  `stings.ts`, `photos.ts`, `todos.ts` in `src/lib/server/db/queries/`.
- **Client utilities** — camelCase in `src/lib/client/utils/` or
  `src/lib/client/stores/` or `src/lib/client/offline/`.

**Comments:**
- Comments explain non-obvious decisions, not what the code does. Follow the
  existing JSDoc-style block comments on exported functions (`@param` / `@returns`
  only where the signature is not self-explanatory).

### Development Workflow Rules

**Local Development:**
- **`.env.local` for dev secrets** — `DATABASE_PATH` and `JWT_SECRET` go in
  `.env.local` (gitignored). All `npm run db:*` and `npm run create-user` scripts
  use `dotenv -e .env.local --` prefix. Never commit `.env.local`.
- **Dev server** — `npm run dev` (port 5173). Does not run service worker.
- **DB commands** — `npm run db:generate` (after schema changes), `npm run db:migrate`
  (apply pending migrations), `npm run db:studio` (Drizzle Studio GUI).
- **User creation** — `npm run create-user -- <username> <password>` (runs
  `scripts/create-user.ts` via tsx).

**Git Conventions (from commit history):**
- **Conventional commits** — `feat:`, `fix:`, `chore:`, `refactor:` prefixes.
  Sprint-level commits use `feat(sprint-N):` format.
- **WIP commits are acceptable** — `wip: story X.Y partial` for in-progress work.

**Production:**
- **`docker compose up -d`** on the Infomaniak VPS (`beeard.ch`).
- **Production compose** — `docker-compose.prod.yml` (separate from dev).
- **Nginx + Certbot** — TLS termination at Nginx; app container is never
  publicly exposed (no published ports on the `app` service).
- **Backups** — `scripts/backup.sh` runs via cron on the VPS host at 02:00 daily.
  Uses SQLite `.backup` command (WAL-safe). Keeps 30 days of backups.
- **Body size limit** — set via `BODY_SIZE_LIMIT=10MB` environment variable
  (runtime config, not build config) to support photo uploads.
- **Runbook** — `docs/runbook.md` covers full deploy, update, and recovery
  procedures. Update it when deployment procedures change.

### Critical Don't-Miss Rules

**Anti-Patterns to Avoid:**
- **Never write Drizzle calls in route files** — always go through
  `$lib/server/db/queries/*.ts`. This is the single most important architecture rule.
- **Never use `async`/`await` on DB query functions** — `better-sqlite3` is
  synchronous. Adding async wrappers breaks nothing silently but is wrong and
  misleading.
- **Never use Svelte legacy syntax** — no `export let`, no `$:`, no
  `writable()`/`readable()` from `svelte/store` in `.svelte` files. Runes only.
- **Never use `adapter-auto`** — `adapter-node` is set explicitly. Do not change it.
- **Never hardcode color values** — use CSS custom properties (see Style Rules).
- **Never store millisecond timestamps** — all DB timestamps are Unix epoch
  *seconds*. Using `Date.now()` without `Math.floor(/ 1000)` is a silent bug.
- **Never hand-edit migration files** — always use `npm run db:generate` after
  modifying `schema.ts`. Drizzle migrations are append-only.

**Photos & File Storage:**
- **Photos are BLOBs in SQLite** — `inspection_photos.data` is a raw buffer.
  Served via `/api/photos/[photoId]` with the stored `mimeType`. No filesystem
  paths, no S3, no static folder. Max 5 photos per inspection (enforced at app layer).

**Offline / PWA:**
- **IndexedDB uses raw browser API** — no `idb` library. Follow the pattern in
  `src/lib/client/offline/db.ts` (Promise-wrapped callbacks, `db.close()` in
  `oncomplete`).
- **`clientId` deduplication** — `inspections` and `sting_incidents` have a
  `UNIQUE INDEX` on `client_id`. Server insert uses `.onConflictDoNothing()`.
  Client generates `crypto.randomUUID()` once on form mount (not on every submit).
- **`invalidateAll()` after sync** — after offline entries sync, call
  `invalidateAll()` from `$app/navigation` to refresh SvelteKit page data.

**Security:**
- **Auth cookie is `httpOnly`, `sameSite: lax`, `secure: !dev`** — never set the
  session cookie directly in page files. Always use `setSessionCookie()` /
  `clearSessionCookie()` from `$lib/server/auth.ts`.
- **Never reveal which credential is wrong** — login errors must always say
  "Invalid username or password" (not "user not found" vs "wrong password").
- **JWT secret must be set** — `getJwtSecret()` throws if `JWT_SECRET` is unset.
  Never add a fallback default value.

**Edge Cases:**
- **Hive number uniqueness is among active hives only** — archived hives may
  share a number with an active hive. The uniqueness check uses
  `activeHiveWithNumberExists()` which filters by `is_active = true`.
- **Sting incidents survive hive deletion** — `hive_id` is `SET NULL` on hive
  delete (not cascade). Do not change this FK behaviour.
- **`clientId` on sting incidents** — same offline dedup pattern as inspections;
  `UNIQUE INDEX` on `client_id` in `sting_incidents` table.

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code in this project
- Follow ALL rules exactly as documented — they reflect real decisions made during development
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge during implementation

**For Manuel:**
- Update when the technology stack changes (e.g., Svelte or Drizzle upgrades)
- Add new patterns here as they are established during extension work
- Review after each major feature sprint for outdated rules

_Last Updated: 2026-05-14_
