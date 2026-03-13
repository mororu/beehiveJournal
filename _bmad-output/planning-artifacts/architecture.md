# Architecture Document — beehiveJournal

**Author:** Manuel (BMAD Architecture Agent)
**Date:** 2026-03-13
**Based on PRD:** 2026-03-11
**Status:** Approved for development

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture Diagram](#3-system-architecture-diagram)
4. [Component Architecture](#4-component-architecture)
5. [Data Model](#5-data-model)
6. [API Design](#6-api-design)
7. [Authentication Flow](#7-authentication-flow)
8. [Offline Architecture](#8-offline-architecture)
9. [Weather Integration](#9-weather-integration)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Security Considerations](#11-security-considerations)
12. [Development Setup](#12-development-setup)
13. [Key Architectural Decisions (ADRs)](#13-key-architectural-decisions-adrs)

---

## 1. Architecture Overview

beehiveJournal is a single-user, self-hosted Progressive Web App. The architecture is deliberately simple: one SvelteKit application handles both the frontend UI and the backend API, backed by a SQLite database on disk. Everything runs in a single Docker container behind an Nginx reverse proxy.

### Key Architectural Decisions at a Glance

| Concern | Decision |
|---|---|
| Framework | SvelteKit (fullstack — UI + API routes in one app) |
| Database | SQLite via Drizzle ORM |
| Auth | JWT in httpOnly cookie, 30-day rolling expiry |
| Offline | Workbox service worker, IndexedDB queue |
| Weather | Open-Meteo API (free, no key, no PII) |
| Deployment | Single Docker container + Nginx + Certbot |
| State management | SvelteKit's built-in load functions + Svelte stores |

### Design Principles

1. **Single container, single process.** No microservices. One Docker container runs the SvelteKit Node.js server. Nginx terminates TLS outside the container. SQLite lives in a mounted volume.
2. **Server is the source of truth.** The client syncs to the server; the server never depends on the client's state.
3. **Offline is an enhancement, not the foundation.** Build the online path first. The service worker + IndexedDB sync layer is added as a hardening step once core features work.
4. **No build-time complexity.** SvelteKit's adapter-node produces a standard Node.js app. No Webpack customisation, no complex build pipelines.
5. **Fail open on non-critical fetches.** If weather fails, the inspection still saves. No feature should block core data entry.

---

## 2. Technology Stack

### Frontend

| Technology | Version | Justification |
|---|---|---|
| **SvelteKit** | 2.x | Handles routing, SSR, API routes, and PWA build in one framework. Svelte produces the smallest JS bundles of any major framework — critical for 3s load target on 4G. Excellent DX for a solo developer. |
| **Svelte** | 5.x | Component authoring. Runes syntax (Svelte 5) is the current stable approach. No virtual DOM overhead. |
| **TypeScript** | 5.x | Type safety across the entire codebase — both UI and API routes. Catches bugs at compile time, not at 2am in production. |
| **Vite** | 5.x | Dev server and bundler (built into SvelteKit). Near-instant HMR, fast cold starts. |
| **Chart.js** | 4.x | Health timeline chart. Lightweight (~60KB), no framework dependency, excellent mobile touch support. Recharts and D3 are both heavier without adding value for a single chart type. |
| **Workbox** | 7.x | Service worker management. `@vite-plugin-pwa` integrates Workbox directly into the SvelteKit build. Handles precaching, runtime caching strategies, and background sync. |

### Backend (SvelteKit API Routes)

| Technology | Version | Justification |
|---|---|---|
| **SvelteKit server routes** | — | `+server.ts` files provide REST API endpoints inside the same SvelteKit project. No separate Express app needed. Eliminates CORS configuration, separate port, separate Dockerfile layer. |
| **Node.js** | 20 LTS | Runtime. LTS for stability on a self-hosted server that won't be updated frequently. |
| **Drizzle ORM** | 0.30.x | Lightweight TypeScript ORM for SQLite. Schema-as-code, zero-overhead type inference on queries, simple migrations. Significantly simpler than Prisma (no engine binary, no separate migration server). |
| **better-sqlite3** | 9.x | Synchronous SQLite driver for Node.js. Works correctly with SvelteKit's server-side rendering. `better-sqlite3` is synchronous (unlike `sqlite3`) which is fine for a single-user app and avoids async complexity with SQLite's single-writer model. |
| **jose** | 5.x | JWT creation and verification. A modern, standards-compliant library with no native dependencies. Used for auth token signing. |
| **argon2** | 0.31.x | Password hashing. Argon2id is the current OWASP-recommended algorithm. Faster to deploy than setting up bcrypt with native bindings, and more resistant to GPU attacks. |

### Database

| Technology | Version | Justification |
|---|---|---|
| **SQLite** | 3.x (via better-sqlite3) | Single-user app. Maximum expected data: 10 hives × 52 inspections/year × 5 years = 2,600 rows in the main inspections table. SQLite handles millions of rows without breaking a sweat. No separate database container, no connection pooling needed, zero ops overhead. File stored in Docker volume. |

### Deployment

| Technology | Version | Justification |
|---|---|---|
| **Docker** | 24.x+ | Reproducible builds and deployment. Single container image. |
| **Docker Compose** | 2.x | Orchestrates the app container + Nginx container + volume definitions. Sufficient for single-server deployment. |
| **Nginx** | 1.25 (Alpine) | Reverse proxy. Terminates TLS, adds security headers, rate limiting. Runs in its own lightweight container. |
| **Certbot** | latest | Let's Encrypt certificate issuance and renewal. Runs as a one-shot container for initial issuance and as a cron renewal job. |
| **`adapter-node`** | — | SvelteKit's Node.js adapter. Produces a standard `node build/index.js` server. |

### Not Used (and why)

| Rejected Option | Reason |
|---|---|
| Next.js / Nuxt | Heavier, more opinionated on React/Vue than necessary. SvelteKit matches the stack better. |
| Prisma ORM | Requires a binary engine shipped in Docker, adds ~40MB to image, more complexity for a simple schema. |
| PostgreSQL | Zero justification for multi-user DB on a single-user app. SQLite is correct here. |
| Redis | No session store, no queue, no pub/sub needed. JWT in cookie is stateless. |
| React Query / SWR | SvelteKit's `load` functions and Svelte's reactive stores handle data fetching cleanly without an additional library. |
| Capacitor / Ionic | PWA is sufficient. No app store submission needed. |

---

## 3. System Architecture Diagram

### Production Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                   Infomaniak VPS Lite                       │
│                 (1vCPU, 2GB RAM, 20GB)                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Docker Compose Network                 │   │
│  │                                                     │   │
│  │  ┌──────────────┐       ┌──────────────────────┐   │   │
│  │  │    Nginx     │       │   SvelteKit App      │   │   │
│  │  │  (Alpine)    │       │   (Node.js 20 LTS)   │   │   │
│  │  │              │──────▶│                      │   │   │
│  │  │  Port 80/443 │       │  Port 3000           │   │   │
│  │  │  TLS termination     │  (localhost only)    │   │   │
│  │  │  Rate limiting│      │                      │   │   │
│  │  │  Gzip        │       │  /app routes (SSR)   │   │   │
│  │  │  Security    │       │  /api/* routes (REST)│   │   │
│  │  │  headers     │       │                      │   │   │
│  │  └──────────────┘       └──────────┬───────────┘   │   │
│  │                                    │               │   │
│  │                         ┌──────────▼───────────┐   │   │
│  │                         │   Docker Volume      │   │   │
│  │                         │   /data/db.sqlite    │   │   │
│  │                         │   (persists across   │   │   │
│  │                         │    container updates)│   │   │
│  │                         └──────────────────────┘   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │   Certbot (one-shot + cron renewal)                 │   │
│  │   /etc/letsencrypt volume (shared with Nginx)       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │ HTTPS (443)                  │
         ▼                              ▼
┌──────────────────┐          ┌──────────────────────┐
│   Mobile Browser │          │  Open-Meteo API      │
│  (iOS Safari /   │          │  api.open-meteo.com  │
│  Android Chrome) │          │  (outbound from app) │
│                  │          │  lat/lon only        │
│  Service Worker  │          └──────────────────────┘
│  IndexedDB       │
│  (offline cache) │
└──────────────────┘
```

### Request Flow (Online)

```
Browser → HTTPS → Nginx → SvelteKit (port 3000) → Drizzle → SQLite file
                                    │
                                    └── (on new inspection) → Open-Meteo API
```

### Request Flow (Offline Entry)

```
Browser (offline)
  → New inspection form fills from cached hive data (IndexedDB)
  → Entry saved to IndexedDB outbox queue
  → User sees "saved offline" confirmation

Browser (reconnects)
  → Service worker Background Sync fires
  → Outbox queue entries POST to /api/inspections
  → Server saves to SQLite
  → Outbox entry removed from IndexedDB
```

---

## 4. Component Architecture

### Directory Structure

```
beehiveJournal/
├── src/
│   ├── app.html                    # HTML shell template
│   ├── app.css                     # Global CSS variables, resets
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/
│   │   │   │   ├── index.ts        # Drizzle instance (singleton)
│   │   │   │   ├── schema.ts       # All table definitions
│   │   │   │   └── migrations/     # Drizzle migration files
│   │   │   ├── auth.ts             # JWT sign/verify, cookie helpers
│   │   │   └── weather.ts          # Open-Meteo fetch function
│   │   ├── client/
│   │   │   ├── stores/
│   │   │   │   ├── auth.ts         # Authenticated user store
│   │   │   │   └── offline.ts      # Online/offline status store
│   │   │   ├── offline/
│   │   │   │   ├── db.ts           # IndexedDB wrapper (idb-keyval or custom)
│   │   │   │   └── sync.ts         # Outbox read/write, sync trigger
│   │   │   └── utils/
│   │   │       ├── date.ts         # Date formatting helpers
│   │   │       └── health.ts       # Health score colour/label helpers
│   │   └── components/
│   │       ├── HiveCard.svelte     # Hive summary card on list view
│   │       ├── HealthBadge.svelte  # Colour-coded 1-5 score display
│   │       ├── HealthChart.svelte  # Chart.js health timeline wrapper
│   │       ├── InspectionForm.svelte # New/edit inspection entry form
│   │       ├── StingForm.svelte    # New sting incident entry form
│   │       ├── WeatherBadge.svelte # Compact weather display on entries
│   │       ├── OfflineBanner.svelte # "You are offline" status bar
│   │       ├── PendingSyncBadge.svelte # "X entries pending sync" indicator
│   │       └── ConfirmDialog.svelte # Reusable delete confirmation modal
│   ├── routes/
│   │   ├── +layout.svelte          # Root layout: nav, offline banner
│   │   ├── +layout.server.ts       # Auth guard: redirect to /login if no session
│   │   ├── login/
│   │   │   ├── +page.svelte        # Login form
│   │   │   └── +page.server.ts     # Login form action (POST)
│   │   ├── (app)/                  # Auth-protected route group
│   │   │   ├── +layout.svelte      # App shell with bottom nav
│   │   │   ├── hives/
│   │   │   │   ├── +page.svelte            # Hive list
│   │   │   │   ├── +page.server.ts         # Load hives
│   │   │   │   ├── new/
│   │   │   │   │   ├── +page.svelte        # Create hive form
│   │   │   │   │   └── +page.server.ts     # Create hive action
│   │   │   │   └── [hiveId]/
│   │   │   │       ├── +page.svelte        # Hive detail: history + chart
│   │   │   │       ├── +page.server.ts     # Load hive + inspections
│   │   │   │       ├── edit/
│   │   │   │       │   ├── +page.svelte    # Edit hive form
│   │   │   │       │   └── +page.server.ts # Edit hive action
│   │   │   │       └── inspect/
│   │   │   │           ├── +page.svelte    # New inspection form
│   │   │   │           └── +page.server.ts # Save inspection action
│   │   │   ├── stings/
│   │   │   │   ├── +page.svelte            # Sting incident log
│   │   │   │   ├── +page.server.ts         # Load sting incidents
│   │   │   │   └── new/
│   │   │   │       ├── +page.svelte        # New sting form
│   │   │   │       └── +page.server.ts     # Save sting action
│   │   │   └── settings/
│   │   │       ├── +page.svelte            # App settings (logout button)
│   │   │       └── +page.server.ts         # Logout action
│   │   └── api/
│   │       ├── auth/
│   │       │   └── logout/
│   │       │       └── +server.ts          # POST /api/auth/logout
│   │       ├── hives/
│   │       │   ├── +server.ts              # GET /api/hives, POST /api/hives
│   │       │   └── [hiveId]/
│   │       │       ├── +server.ts          # GET, PATCH, DELETE /api/hives/:id
│   │       │       └── inspections/
│   │       │           ├── +server.ts      # GET, POST /api/hives/:id/inspections
│   │       │           └── [inspectionId]/
│   │       │               └── +server.ts  # GET, PATCH, DELETE
│   │       └── stings/
│   │           ├── +server.ts              # GET, POST /api/stings
│   │           └── [stingId]/
│   │               └── +server.ts          # DELETE /api/stings/:id
├── static/
│   ├── manifest.webmanifest        # PWA manifest
│   ├── icons/                      # PWA icons (192px, 512px, maskable)
│   └── sw.js                       # Thin service worker entry (delegates to Workbox)
├── drizzle.config.ts               # Drizzle CLI config
├── vite.config.ts                  # Vite + vite-plugin-pwa config
├── svelte.config.ts                # SvelteKit config (adapter-node)
├── docker-compose.yml
├── Dockerfile
└── nginx/
    ├── nginx.conf
    └── conf.d/
        └── app.conf
```

### Page-Level Components (Routes)

| Route | Component Responsibility |
|---|---|
| `/login` | Username/password form, POST to server action, redirect on success |
| `/hives` | List of active hive cards; link to archived hives |
| `/hives/new` | Create hive form (name, number, optional description) |
| `/hives/[id]` | Hive detail: tabs for History (inspection list) and Timeline (chart); "New Inspection" CTA |
| `/hives/[id]/edit` | Edit hive name, number, description; mark inactive/active; delete hive |
| `/hives/[id]/inspect` | New inspection form; weather pre-filled; offline-capable |
| `/stings` | Chronological sting log; filter by hive |
| `/stings/new` | New sting entry: date, hive selector, body location, notes |
| `/settings` | Logout button; (post-MVP: change password) |

### Reusable Components

| Component | Props | Purpose |
|---|---|---|
| `HiveCard` | `hive: Hive` | Displays hive name, number, last inspection date, health score |
| `HealthBadge` | `score: 1-5` | Coloured badge (red→green) for health score |
| `HealthChart` | `inspections: Inspection[]` | Chart.js line chart of health scores over time |
| `InspectionForm` | `hiveId, weather?, offline: boolean` | Full inspection entry form with all fields |
| `WeatherBadge` | `weather: WeatherSnapshot \| null` | Compact "18°C ☀️ Light wind" display |
| `OfflineBanner` | — | Sticks to top of viewport when `navigator.onLine === false` |
| `PendingSyncBadge` | `count: number` | Shows pending offline entry count in nav |
| `ConfirmDialog` | `message, onConfirm, onCancel` | Modal for destructive actions |

---

## 5. Data Model

### Schema (SQLite via Drizzle ORM)

All tables use integer primary keys. All timestamps are stored as Unix epoch integers (seconds) — simpler than ISO strings in SQLite, correct sorting, no timezone ambiguity.

```typescript
// src/lib/server/db/schema.ts

import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// ─── Users ───────────────────────────────────────────────────────────────────
// Single row — single-user app. Created by setup script at deploy time.
export const users = sqliteTable('users', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  username:     text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),       // Argon2id hash
  createdAt:    integer('created_at').notNull(),        // Unix epoch
});

// ─── Hives ───────────────────────────────────────────────────────────────────
export const hives = sqliteTable('hives', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  name:        text('name').notNull(),                 // e.g. "Juniper"
  number:      integer('number'),                      // optional display number
  description: text('description'),                    // optional notes about hive
  isActive:    integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt:   integer('created_at').notNull(),
  updatedAt:   integer('updated_at').notNull(),
});

// ─── Inspections ─────────────────────────────────────────────────────────────
export const inspections = sqliteTable('inspections', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  hiveId:          integer('hive_id').notNull().references(() => hives.id, { onDelete: 'cascade' }),
  inspectedAt:     integer('inspected_at').notNull(),  // Unix epoch; defaults to creation time
  healthScore:     integer('health_score').notNull(),  // 1-5
  queenStatus:     text('queen_status').notNull(),     // 'seen' | 'not_seen' | 'cells_present'
  behaviourNotes:  text('behaviour_notes'),            // free text; nullable
  nextInspectNote: text('next_inspect_note'),          // free text; nullable
  // Weather snapshot (all nullable — weather fetch may fail)
  weatherTemp:     real('weather_temp'),               // °C
  weatherDesc:     text('weather_desc'),               // e.g. "Partly cloudy"
  weatherWindSpeed: real('weather_wind_speed'),        // km/h
  weatherCode:     integer('weather_code'),            // WMO weather code from Open-Meteo
  weatherLat:      real('weather_lat'),                // GPS lat used for fetch
  weatherLon:      real('weather_lon'),                // GPS lon used for fetch
  weatherUnavailable: integer('weather_unavailable', { mode: 'boolean' }).default(false),
  // Offline sync tracking
  clientId:        text('client_id'),                  // UUID generated on client for dedup
  createdAt:       integer('created_at').notNull(),
  updatedAt:       integer('updated_at').notNull(),
});

// ─── Sting Incidents ─────────────────────────────────────────────────────────
export const stingIncidents = sqliteTable('sting_incidents', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  hiveId:       integer('hive_id').references(() => hives.id, { onDelete: 'set null' }),
  stungAt:      integer('stung_at').notNull(),         // Unix epoch
  bodyLocation: text('body_location').notNull(),       // e.g. "Left forearm", "Right hand"
  notes:        text('notes'),                         // free text; nullable
  clientId:     text('client_id'),                     // UUID for offline dedup
  createdAt:    integer('created_at').notNull(),
});
```

### Relationships

```
users          (1) ─── (app is single-user; no FK from other tables to users)
hives          (1) ──< (many) inspections       [cascade delete]
hives          (1) ──< (many) sting_incidents   [set null on delete]
```

### Indexes

```sql
-- Query patterns: get inspections for a hive ordered by date
CREATE INDEX idx_inspections_hive_date ON inspections(hive_id, inspected_at DESC);

-- Query pattern: get sting incidents for a hive
CREATE INDEX idx_stings_hive ON sting_incidents(hive_id);

-- Deduplication on offline sync
CREATE UNIQUE INDEX idx_inspections_client_id ON inspections(client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX idx_stings_client_id ON sting_incidents(client_id) WHERE client_id IS NOT NULL;
```

### Data Volume Estimates

| Table | Rows after 5 years | Size estimate |
|---|---|---|
| `users` | 1 | Negligible |
| `hives` | ~15 (10 active + archived) | Negligible |
| `inspections` | ~2,600 (10 hives × 52/yr × 5yr) | ~2MB |
| `sting_incidents` | ~200 | ~50KB |
| **Total** | | **< 5MB** |

SQLite with WAL mode handles this trivially. No vacuuming or maintenance needed.

---

## 6. API Design

All API routes live under `/api/`. All requests and responses use JSON. All routes require authentication (JWT cookie) except `/login`.

### Authentication

| Method | Path | Description |
|---|---|---|
| `POST` | `/login` | SvelteKit form action — not a JSON API endpoint. Authenticates user, sets JWT cookie, redirects to `/hives`. |
| `POST` | `/api/auth/logout` | Clears the JWT cookie. |

### Hives

| Method | Path | Description | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/api/hives` | List hives | `?active=true\|false\|all` (default: `true`) | `Hive[]` |
| `POST` | `/api/hives` | Create hive | `{ name, number?, description? }` | `Hive` (201) |
| `GET` | `/api/hives/:id` | Get single hive | — | `Hive` |
| `PATCH` | `/api/hives/:id` | Update hive | `{ name?, number?, description?, isActive? }` | `Hive` |
| `DELETE` | `/api/hives/:id` | Delete hive + all inspections | — | `204` |

### Inspections

| Method | Path | Description | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/api/hives/:id/inspections` | List inspections for hive | `?from=epoch&to=epoch` (optional date range) | `Inspection[]` ordered by `inspectedAt DESC` |
| `POST` | `/api/hives/:id/inspections` | Create inspection | See below | `Inspection` (201) |
| `GET` | `/api/hives/:id/inspections/:inspId` | Get single inspection | — | `Inspection` |
| `PATCH` | `/api/hives/:id/inspections/:inspId` | Edit inspection | Partial inspection fields | `Inspection` |
| `DELETE` | `/api/hives/:id/inspections/:inspId` | Delete inspection | — | `204` |

**POST /api/hives/:id/inspections — Request Body:**

```typescript
{
  inspectedAt: number;         // Unix epoch (defaults to Date.now() / 1000 on client)
  healthScore: 1 | 2 | 3 | 4 | 5;
  queenStatus: 'seen' | 'not_seen' | 'cells_present';
  behaviourNotes?: string;
  nextInspectNote?: string;
  // Weather fields (all optional; sent by client after GPS fetch)
  weatherTemp?: number;
  weatherDesc?: string;
  weatherWindSpeed?: number;
  weatherCode?: number;
  weatherLat?: number;
  weatherLon?: number;
  weatherUnavailable?: boolean;
  clientId?: string;           // UUID for offline dedup
}
```

**Offline Sync — Idempotency:**
When syncing offline entries, the client sends `clientId` (a UUID generated at entry creation time). The server uses `INSERT OR IGNORE` semantics via the unique index on `client_id` — duplicate submissions from a retry are silently ignored and the existing record is returned.

### Sting Incidents

| Method | Path | Description | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/api/stings` | List all sting incidents | `?hiveId=id` (optional filter) | `StingIncident[]` ordered by `stungAt DESC` |
| `POST` | `/api/stings` | Create sting incident | `{ stungAt, hiveId?, bodyLocation, notes?, clientId? }` | `StingIncident` (201) |
| `DELETE` | `/api/stings/:id` | Delete sting incident | — | `204` |

### Error Responses

All errors return:
```json
{ "error": "Human-readable message" }
```

| HTTP Status | When |
|---|---|
| `400 Bad Request` | Validation failure (missing required field, value out of range) |
| `401 Unauthorized` | No valid JWT cookie |
| `404 Not Found` | Resource doesn't exist |
| `409 Conflict` | Duplicate `clientId` on sync (handled silently by server — returns existing record) |
| `500 Internal Server Error` | Unhandled server error |

### Input Validation

Use Zod schemas for all API request body validation. Define schemas once in `src/lib/server/validation.ts` and reuse in both API routes and SvelteKit form actions.

```typescript
// Example
import { z } from 'zod';

export const createInspectionSchema = z.object({
  inspectedAt: z.number().int().positive(),
  healthScore: z.number().int().min(1).max(5),
  queenStatus: z.enum(['seen', 'not_seen', 'cells_present']),
  behaviourNotes: z.string().max(2000).optional(),
  nextInspectNote: z.string().max(1000).optional(),
  clientId: z.string().uuid().optional(),
  // ... weather fields
});
```

---

## 7. Authentication Flow

### Overview

Single-user JWT authentication using an httpOnly cookie. No registration UI — the user account is created via a setup script run once at deployment time.

### Login Flow

```
1. User visits app (e.g. https://journal.example.com/)
2. +layout.server.ts checks for JWT cookie
3. No valid cookie → redirect to /login
4. User enters username + password → POST to /login (SvelteKit form action)
5. Server:
   a. Look up user by username in SQLite
   b. Verify password with argon2.verify(hash, provided_password)
   c. If invalid → return 400 with error message
   d. If valid → sign JWT with jose:
      - payload: { sub: userId, username }
      - expiry: 30 days
      - algorithm: HS256
      - secret: env var JWT_SECRET (32+ byte random string)
   e. Set cookie: 
      - name: session
      - value: JWT string
      - httpOnly: true
      - secure: true (HTTPS only)
      - sameSite: 'lax'
      - maxAge: 30 * 24 * 60 * 60 (seconds)
      - path: /
6. Redirect to /hives
```

### Auth Guard (All Protected Routes)

```typescript
// src/routes/+layout.server.ts
export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const token = cookies.get('session');
  if (!token) throw redirect(303, '/login');
  
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    // Refresh cookie on every request (rolling 30-day expiry)
    setSessionCookie(cookies, token);
    return { user: { id: payload.sub, username: payload.username } };
  } catch {
    cookies.delete('session', { path: '/' });
    throw redirect(303, '/login');
  }
};
```

### Logout Flow

```
1. User taps "Logout" in settings
2. POST to /api/auth/logout (or SvelteKit form action)
3. Server deletes the 'session' cookie
4. Redirect to /login
```

### Session Management Details

- **Rolling expiry:** The JWT `maxAge` is reset on every authenticated request. If Manuel doesn't use the app for 30 days, the session expires and he must log in again.
- **JWT Secret:** Stored in `.env` as `JWT_SECRET`. Generated at deploy time with `openssl rand -base64 32`. Never committed to the repository.
- **Token storage:** httpOnly cookie — not accessible to JavaScript. No `localStorage` for auth tokens.
- **No refresh tokens:** Single-user app. If the session expires, the user just logs in again. Refresh token complexity is not justified.

### Initial User Setup Script

```bash
# scripts/create-user.ts (run once at deployment)
# Usage: node scripts/create-user.js <username> <password>
import argon2 from 'argon2';
import Database from 'better-sqlite3';

const [,, username, password] = process.argv;
const hash = await argon2.hash(password, { type: argon2.argon2id });
const db = new Database(process.env.DATABASE_PATH);
db.prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)')
  .run(username, hash, Math.floor(Date.now() / 1000));
console.log(`User '${username}' created.`);
```

---

## 8. Offline Architecture

### Strategy

The offline strategy uses two complementary mechanisms:
1. **Workbox service worker** — caches the app shell and static assets for instant loading without network
2. **IndexedDB outbox queue** — stores new entries created while offline and syncs them when connectivity is restored

Building order: implement online-first, then add the service worker layer.

### Service Worker (Workbox via vite-plugin-pwa)

**Caching Strategies:**

| Asset Type | Strategy | TTL |
|---|---|---|
| App shell (HTML, CSS, JS bundles) | `CacheFirst` (precached at install) | Until new deploy |
| PWA icons, manifest | `CacheFirst` (precached) | Until new deploy |
| `/api/hives` (GET) | `NetworkFirst` with cache fallback | 24 hours |
| `/api/hives/:id/inspections` (GET) | `NetworkFirst` with cache fallback | 24 hours |
| `/api/stings` (GET) | `NetworkFirst` with cache fallback | 24 hours |
| Open-Meteo weather API | `NetworkOnly` (no cache — fresh data or nothing) | — |

**vite.config.ts PWA configuration:**

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    sveltekit(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/(hives|stings)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxAgeSeconds: 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: 'beehiveJournal',
        short_name: 'Hive Journal',
        theme_color: '#f59e0b',   // amber — beekeeper colour
        background_color: '#fefce8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/hives',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
```

### IndexedDB Outbox Queue

When the user submits a new inspection or sting entry while offline, the client stores the entry in an IndexedDB "outbox" store instead of (or before) hitting the API.

**IndexedDB Store Schema:**

```
Database: beehiveJournal-offline
  Store: outbox
    keyPath: clientId (UUID)
    indexes: [type, syncStatus]
    
  Record shape:
  {
    clientId: string;          // UUID v4, generated at creation time
    type: 'inspection' | 'sting';
    hiveId: number | null;
    payload: object;           // Full request body for POST /api/...
    createdAt: number;         // Unix epoch
    syncStatus: 'pending' | 'syncing' | 'failed';
    attempts: number;
  }
```

**Sync Flow:**

```typescript
// src/lib/client/offline/sync.ts

export async function syncOutbox(): Promise<void> {
  const db = await openIDB();
  const pending = await db.getAll('outbox');
  
  for (const entry of pending) {
    if (entry.syncStatus !== 'pending') continue;
    
    const url = entry.type === 'inspection'
      ? `/api/hives/${entry.hiveId}/inspections`
      : '/api/stings';
    
    try {
      await db.put('outbox', { ...entry, syncStatus: 'syncing' });
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.payload),
      });
      if (res.ok) {
        await db.delete('outbox', entry.clientId);
      } else {
        await db.put('outbox', { ...entry, syncStatus: 'failed', attempts: entry.attempts + 1 });
      }
    } catch {
      await db.put('outbox', { ...entry, syncStatus: 'pending', attempts: entry.attempts + 1 });
    }
  }
}

// Triggered on:
// 1. window 'online' event
// 2. Service worker Background Sync (where supported — not available on iOS)
// 3. App focus / visibility change
window.addEventListener('online', syncOutbox);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') syncOutbox();
});
```

**iOS Safari Limitation:** Background Sync API is not available on iOS Safari. The sync above fires on window.online and visibility change, which covers the practical use case (user opens the app after reconnecting).

### Offline Entry Form Behaviour

When creating a new inspection while offline:

1. Weather fetch is skipped; form shows "Weather unavailable (offline)" notice
2. Form collects all other data normally
3. On submit: entry stored to IndexedDB outbox; user sees "Saved offline — will sync when online"
4. `PendingSyncBadge` in nav shows pending count
5. On next online event: `syncOutbox()` fires, entries POST to server, outbox cleared

### Offline-Aware Hive Data

The `GET /api/hives` and `GET /api/hives/:id/inspections` responses are cached by the service worker with a `NetworkFirst` strategy. This means:

- If online: fresh data from server
- If offline: last cached response served (up to 24h old)

The new inspection form needs the hive list (to confirm which hive is being inspected). Since hives are loaded in the app shell and cached, this works offline.

---

## 9. Weather Integration

### API: Open-Meteo

**Why Open-Meteo:**
- Completely free, no API key required
- High availability (commercial service with free tier)
- No PII transmitted — only GPS coordinates
- Returns WMO weather codes which map cleanly to human descriptions

**Endpoint used:**

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}
  &longitude={lon}
  &current=temperature_2m,weather_code,wind_speed_10m
  &wind_speed_unit=kmh
  &temperature_unit=celsius
  &timezone=auto
```

**Example response:**

```json
{
  "current": {
    "time": "2026-05-15T10:00",
    "temperature_2m": 17.8,
    "weather_code": 2,
    "wind_speed_10m": 12.5
  }
}
```

### Weather Fetch Flow

```typescript
// src/lib/server/weather.ts — server-side weather fetch
// (Called from /api/hives/:id/inspections POST handler on the server,
//  OR called client-side and embedded in the form submission)

// ⚠️ Design choice: weather is fetched CLIENT-SIDE at form open time.
// Rationale: GPS is available on the client. The server cannot access the 
// client's GPS. The client fetches weather and sends it as part of the 
// form submission. The server trusts the client data.

// src/lib/client/weather.ts (client-side)
export interface WeatherSnapshot {
  temp: number;
  desc: string;
  windSpeed: number;
  code: number;
  lat: number;
  lon: number;
}

export async function fetchWeatherForCurrentLocation(): Promise<WeatherSnapshot | null> {
  try {
    const { lat, lon } = await getGPS();   // see below
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&wind_speed_unit=kmh&timezone=auto`,
      { signal: AbortSignal.timeout(5000) }   // 5s timeout
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      temp: data.current.temperature_2m,
      desc: wmoCodeToDescription(data.current.weather_code),
      windSpeed: data.current.wind_speed_10m,
      code: data.current.weather_code,
      lat,
      lon,
    };
  } catch {
    return null;   // Fail silently — weather is non-blocking
  }
}

async function getGPS(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not available'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }  // Accept cached GPS up to 5 min old
    );
  });
}
```

### WMO Code to Description Mapping

```typescript
// src/lib/client/wmo-codes.ts
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Freezing fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
  95: 'Thunderstorm',
  // ... add codes as needed
};

export function wmoCodeToDescription(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? `Weather code ${code}`;
}
```

### Fallback Behaviour

| Failure mode | Behaviour |
|---|---|
| GPS permission denied | Weather badge shows "Location unavailable" — form still submits, `weatherUnavailable: true` |
| GPS timeout | Same as above; GPS timeout set to 8 seconds |
| Open-Meteo API error / timeout | Weather badge shows "Weather unavailable" — form still submits, `weatherUnavailable: true` |
| App is offline | Weather fetch skipped entirely; `weatherUnavailable: true` |

**In all failure cases:** The inspection entry is always saved. Weather is supplementary data.

### When Weather is Fetched

Weather is fetched when the inspection form is opened (not on submit). This gives the user time to fill in the form while weather loads in the background. The `InspectionForm.svelte` component:

1. On mount: calls `fetchWeatherForCurrentLocation()` (async, non-blocking)
2. Shows a subtle loading indicator in the weather field
3. When resolved: populates weather badge; weather data stored in local form state
4. On submit: includes weather fields in POST body

---

## 10. Deployment Architecture

### Docker Compose Setup

**File: `docker-compose.yml`**

```yaml
version: '3.9'

services:
  app:
    build: .
    container_name: beehivejournal-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/data/db.sqlite
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3000
    volumes:
      - app-data:/data
    networks:
      - internal
    expose:
      - "3000"

  nginx:
    image: nginx:1.25-alpine
    container_name: beehivejournal-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - certbot-certs:/etc/letsencrypt:ro
      - certbot-webroot:/var/www/certbot:ro
    networks:
      - internal
    depends_on:
      - app

  certbot:
    image: certbot/certbot:latest
    container_name: beehivejournal-certbot
    volumes:
      - certbot-certs:/etc/letsencrypt
      - certbot-webroot:/var/www/certbot
    # Run manually for initial cert, then via cron for renewal

volumes:
  app-data:        # SQLite database file — persists across container updates
  certbot-certs:   # Let's Encrypt certificates
  certbot-webroot: # ACME challenge files

networks:
  internal:
    driver: bridge
```

**File: `Dockerfile`**

```dockerfile
# ── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production stage ─────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Only copy the built output and production dependencies
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/scripts ./scripts

RUN npm ci --omit=dev

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p /data && chown appuser:appgroup /data
USER appuser

VOLUME ["/data"]

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/db.sqlite

EXPOSE 3000

CMD ["node", "build/index.js"]
```

### Nginx Configuration

**File: `nginx/conf.d/app.conf`**

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name journal.example.com;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name journal.example.com;

    ssl_certificate     /etc/letsencrypt/live/journal.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/journal.example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.open-meteo.com;" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Rate limiting (basic brute-force protection on login)
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    location /login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # Static asset caching
    location ~* \.(js|css|png|jpg|ico|svg|webp|woff2)$ {
        proxy_pass http://app:3000;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

### Let's Encrypt Initial Setup

```bash
# Run once on the VPS before starting the full stack
# 1. Start nginx alone (for ACME challenge)
docker compose up nginx -d

# 2. Issue certificate
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d journal.example.com

# 3. Start full stack
docker compose up -d
```

### Certificate Renewal (Cron)

```bash
# /etc/cron.d/certbot-renew on the VPS host
0 3 * * * root docker compose -f /opt/beehivejournal/docker-compose.yml run --rm certbot renew --quiet && docker compose -f /opt/beehivejournal/docker-compose.yml exec nginx nginx -s reload
```

### Environment Variables

Create a `.env` file on the VPS (never committed to git):

```bash
# /opt/beehivejournal/.env
JWT_SECRET=<output of: openssl rand -base64 32>
```

### VPS Directory Structure

```
/opt/beehivejournal/
├── docker-compose.yml
├── Dockerfile
├── .env                    # JWT_SECRET — never committed to git
├── nginx/
│   └── conf.d/
│       └── app.conf
└── (Docker volumes managed by Docker in /var/lib/docker/volumes/)
```

### Database Backup

```bash
# /etc/cron.d/sqlite-backup on VPS host
# Daily backup at 2am — copies SQLite file while app is running (WAL mode is safe)
0 2 * * * root docker exec beehivejournal-app sqlite3 /data/db.sqlite ".backup /data/db-backup-$(date +\%Y\%m\%d).sqlite" && find /opt/beehivejournal/backups -name "db-backup-*.sqlite" -mtime +30 -delete
```

### Deployment Runbook (Summary)

```bash
# Initial deployment
git clone <repo> /opt/beehivejournal
cd /opt/beehivejournal
cp .env.example .env && nano .env   # Set JWT_SECRET
docker compose build
docker compose up -d nginx          # Start nginx for ACME challenge
# Issue Let's Encrypt cert (see above)
docker compose up -d                # Start all services
# Create initial user
docker exec beehivejournal-app node scripts/create-user.js manuel <password>

# Update to new version
cd /opt/beehivejournal
git pull
docker compose build
docker compose up -d                # Rolling restart — old container stops, new starts
# Data volume is preserved across updates

# Check logs
docker logs beehivejournal-app --tail=100 -f
docker logs beehivejournal-nginx --tail=50

# Emergency rollback
docker compose up -d --no-recreate  # Keep existing containers
docker compose pull                  # Or: tag previous image and update compose file
```

---

## 11. Security Considerations

### HTTPS / TLS

- All traffic is HTTPS via Nginx + Let's Encrypt (TLS 1.2+)
- HTTP port 80 only used for ACME challenge; all other traffic redirected to HTTPS
- `Strict-Transport-Security` header set with 1-year max-age
- The SvelteKit app listens only on `localhost:3000` inside the Docker network — never exposed to the internet directly

### Password Storage

- Passwords hashed with **Argon2id** (via `argon2` npm package)
- Default parameters: memory=65536, iterations=3, parallelism=4 (OWASP recommended)
- Hash stored in `users.password_hash`
- Plaintext passwords never logged or stored

### JWT / Session Security

- JWT signed with HS256, secret is a 32-byte random string stored in `.env`
- Stored in **httpOnly cookie** — not accessible to JavaScript (XSS-resistant)
- `secure: true` — only sent over HTTPS
- `sameSite: 'lax'` — CSRF protection for navigation requests
- 30-day rolling expiry — reset on every authenticated request

### CSRF Protection

- SvelteKit form actions use `sameSite: lax` cookie which prevents cross-origin form submissions
- JSON API routes (for offline sync) require the `Content-Type: application/json` header — browsers don't send this cross-origin without CORS preflight, which the server does not allow for foreign origins
- No `<form>` action targets from third-party pages (no need for CSRF tokens)

### Content Security Policy

CSP header set in Nginx (see nginx config):
- `default-src 'self'` — blocks all external resource loading by default
- `connect-src 'self' https://api.open-meteo.com` — only allows fetch to own server + Open-Meteo
- No `unsafe-eval` — eliminates XSS via script injection

### Rate Limiting

- Nginx `limit_req_zone` on `/login`: 5 requests/minute per IP, burst 3
- Prevents brute-force password attacks on the login endpoint
- No rate limiting needed on other routes (single user, all authenticated)

### Input Validation

- All API request bodies validated with Zod schemas server-side before database interaction
- Health score validated to integer 1-5; queen status validated as enum; free text fields have max length
- Parameterised queries via Drizzle ORM — no raw SQL string interpolation (SQL injection prevention)

### Data Privacy

- All data stored on Manuel's VPS — no third-party data storage
- Open-Meteo API calls include only GPS lat/lon — no username, no session token, no hive data
- No analytics, telemetry, or error reporting to external services
- No cookies other than the session cookie

### Docker / System Security

- App container runs as non-root user (`appuser`)
- No host-level bind mounts except for nginx config and certs
- Docker socket not exposed to app container
- VPS firewall: only ports 80 and 443 open externally (manage via Infomaniak control panel or `ufw`)

---

## 12. Development Setup

### Prerequisites

- Node.js 20 LTS
- npm 10+
- Git
- Docker Desktop (for testing containerised deployment locally)

### Local Development (Without Docker)

```bash
# Clone
git clone <repo> beehiveJournal
cd beehiveJournal

# Install dependencies
npm install

# Create local environment file
cp .env.example .env.local
# Edit .env.local:
#   DATABASE_PATH=./data/dev.sqlite
#   JWT_SECRET=dev-secret-change-in-production

# Run database migrations
npm run db:migrate

# Create dev user
node scripts/create-user.js manuel password123

# Start dev server
npm run dev
# → http://localhost:5173
```

### Available Scripts

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "lint": "prettier --check . && eslint .",
    "format": "prettier --write ."
  }
}
```

### Drizzle Migration Workflow

```bash
# After editing src/lib/server/db/schema.ts:

# 1. Generate migration SQL
npm run db:generate

# 2. Review the generated file in src/lib/server/db/migrations/

# 3. Apply migration to local database
npm run db:migrate

# In production:
# Migrations run automatically on container start via a startup script
# (The app reads DATABASE_PATH and runs pending migrations before starting the server)
```

**Startup migration in `src/lib/server/db/index.ts`:**

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { DATABASE_PATH } from '$env/static/private';

const sqlite = new Database(DATABASE_PATH);
sqlite.pragma('journal_mode = WAL');   // Required for concurrent reads with backup
sqlite.pragma('foreign_keys = ON');    // Enforce FK constraints

export const db = drizzle(sqlite);

// Run pending migrations on startup
migrate(db, { migrationsFolder: 'src/lib/server/db/migrations' });
```

### Local HTTPS (Optional)

PWA features (service worker, installability) require HTTPS. For local testing:

```bash
# Install mkcert
brew install mkcert
mkcert -install
mkcert localhost

# Add to vite.config.ts:
server: {
  https: {
    key: fs.readFileSync('./localhost-key.pem'),
    cert: fs.readFileSync('./localhost.pem'),
  }
}
```

### Project Tooling

| Tool | Purpose |
|---|---|
| ESLint + `eslint-plugin-svelte` | Linting Svelte components |
| Prettier + `prettier-plugin-svelte` | Code formatting |
| `svelte-check` | Svelte template type checking |
| `drizzle-kit` | Schema migration generation and management |
| `drizzle-kit studio` | GUI database browser for local dev |

---

## 13. Key Architectural Decisions (ADRs)

### ADR-001: SvelteKit as Fullstack Framework (Frontend + API)

**Status:** Accepted

**Decision:** Use SvelteKit for both the UI and the REST API (via `+server.ts` routes), compiled to a single Node.js process.

**Rationale:**
- Eliminates a separate backend service, a second Dockerfile, CORS configuration, and separate dependency management
- SvelteKit's adapter-node produces a standard Node.js server — no framework lock-in at runtime
- Svelte's reactivity model produces the smallest JS bundles of major frameworks — directly supports the 3s load target
- The fullstack integration (shared TypeScript types between server routes and client components) reduces boilerplate and prevents type drift

**Rejected alternatives:**
- Express/Fastify + separate SvelteKit/React frontend: two services, more operational complexity for zero benefit in a single-user app
- Next.js: React overhead, larger bundles, more opinionated deployment

**Consequences:** All code lives in one repository and one container. This is a feature, not a limitation.

---

### ADR-002: SQLite over PostgreSQL

**Status:** Accepted

**Decision:** Use SQLite (via `better-sqlite3`) as the sole database.

**Rationale:**
- The entire 5-year dataset fits comfortably in <5MB. SQLite handles gigabytes without issue.
- No separate database container, no connection string management, no database daemon to maintain
- The SQLite file lives in a Docker volume — backup is `cp` or `sqlite3 .backup`
- WAL mode enables safe concurrent reads and hot backups without locking the writer
- `better-sqlite3` is synchronous, which is appropriate for a single-writer app and avoids the complexity of async SQLite drivers

**Rejected alternatives:**
- PostgreSQL: justified for multi-user or high-concurrency apps; adds a second container, connection pooling, and backup complexity that is completely unjustified here
- MySQL/MariaDB: same reasoning as PostgreSQL

**Consequences:** If the app ever becomes multi-user (out of scope for v1), a migration to PostgreSQL would be needed. The Drizzle ORM schema is compatible with PostgreSQL — this migration would involve changing the driver and connection config, not the schema code.

---

### ADR-003: JWT in httpOnly Cookie (not localStorage)

**Status:** Accepted

**Decision:** Store the JWT session token in an httpOnly, secure, sameSite=lax cookie set by the server.

**Rationale:**
- `httpOnly` cookies are not accessible via JavaScript — XSS attacks cannot steal the token
- `secure` ensures the cookie is never sent over HTTP (only HTTPS)
- `sameSite=lax` prevents CSRF for navigation-triggered requests
- SvelteKit's server-side rendering can read the cookie on every request for server-side auth checks — no client-side auth state flickering

**Rejected alternatives:**
- JWT in `localStorage`: accessible to JavaScript — XSS vulnerability
- Server-side sessions with a session store (Redis): unnecessary complexity; JWT is stateless and sufficient

---

### ADR-004: Offline-First via IndexedDB Outbox (Not Background Sync API)

**Status:** Accepted

**Decision:** Implement offline entry creation by writing to an IndexedDB outbox queue on the client and syncing via `window.online` / `visibilitychange` events. Do not rely on the Background Sync API as the primary mechanism.

**Rationale:**
- Background Sync API is not available on iOS Safari — the primary platform for field use
- The "reconnects and opens app" behaviour (visibilitychange) covers 95% of real-world usage
- IndexedDB is available on all target browsers
- The complexity of Background Sync is not justified given the iOS limitation

**Consequences:**
- Sync happens when the user opens the app or the tab becomes visible — not silently in the background on iOS
- This is acceptable: entries created offline will sync within seconds of the user next opening the app
- Add Background Sync as a progressive enhancement for Android Chrome if desired post-MVP

---

### ADR-005: Weather Fetched Client-Side

**Status:** Accepted

**Decision:** Fetch weather data from Open-Meteo on the client at form open time, then include the weather snapshot in the POST body when submitting the inspection.

**Rationale:**
- GPS is a browser API — not available on the server
- Fetching weather client-side means the server never needs to call an external API, keeping the server's external dependency surface minimal
- The client can display a weather loading state and allow the form to proceed while weather loads
- The server simply stores what the client sends — no server-side Open-Meteo integration needed

**Rejected alternatives:**
- Server-side weather fetch: requires the client to send GPS coordinates to the server first, then the server fetches weather — adds a round trip with no benefit
- Asking user to enter weather manually: violates the "auto weather capture" core feature requirement

---

### ADR-006: Drizzle ORM over Prisma

**Status:** Accepted

**Decision:** Use Drizzle ORM for database access and schema management.

**Rationale:**
- Drizzle has no binary engine — Prisma ships a ~40MB engine that must be included in the Docker image and re-downloaded per platform
- Drizzle's schema-as-code in TypeScript is simpler to understand and debug than Prisma's SDL schema + generated client
- Drizzle's query API is close to SQL — easier to reason about what's happening
- Drizzle migrations are plain SQL files — inspectable and portable

**Consequences:**
- Drizzle is a newer library than Prisma; documentation and community support are smaller. For this simple schema this is not a concern.

---

### ADR-007: No State Management Library (Svelte Stores Only)

**Status:** Accepted

**Decision:** Use Svelte's built-in stores and SvelteKit's `load` functions for all state management. No Pinia, Zustand, Jotai, or similar library.

**Rationale:**
- Single-user app with no real-time collaboration means no complex shared state problems
- SvelteKit's `load` functions handle data fetching per-page with automatic invalidation
- Svelte's writable/readable stores cover the two global state needs: auth status and online/offline status
- Adding a state management library would add configuration, documentation, and a learning curve for zero benefit

---

### ADR-008: Chart.js for Health Timeline

**Status:** Accepted

**Decision:** Use Chart.js (with `svelte-chartjs` wrapper) for the health score timeline chart.

**Rationale:**
- ~60KB gzipped — significantly smaller than D3 (~250KB) or Recharts (~140KB)
- Excellent mobile touch support
- Sufficient feature set for a single line chart with date X-axis and 1-5 Y-axis
- Well-documented and stable

**Consequences:** If complex visualisations are added post-MVP (weather correlation overlay, multi-hive comparison), Chart.js can handle them. A migration to D3 would only be needed if custom SVG rendering is required.

---

*Architecture document complete. This document, together with the PRD, provides sufficient specification to begin development. Start with: `npm create svelte@latest beehiveJournal`, configure TypeScript + Drizzle + `vite-plugin-pwa`, and implement authentication + hive CRUD before offline capabilities.*
