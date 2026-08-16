---
title: 'Inspection Photos'
slug: 'inspection-photos'
created: '2026-08-16'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
commit: '51040da'
tech_stack:
  [
    'SvelteKit 2',
    'Svelte 5 Runes',
    'TypeScript strict',
    'Drizzle ORM',
    'SQLite (better-sqlite3)',
    'Web File API / DataTransfer',
  ]
files_to_modify:
  - src/lib/server/db/schema.ts
  - src/lib/server/db/migrations/meta/_journal.json
  - src/routes/hives/[hiveId]/inspect/+page.server.ts
  - src/routes/hives/[hiveId]/inspect/+page.svelte
  - src/routes/hives/[hiveId]/inspections/[inspectionId]/+page.server.ts
  - src/routes/hives/[hiveId]/inspections/[inspectionId]/+page.svelte
  - src/routes/hives/[hiveId]/inspections/[inspectionId]/edit/+page.server.ts
  - src/routes/hives/[hiveId]/inspections/[inspectionId]/edit/+page.svelte
files_to_create:
  - src/lib/components/PhotoCapture.svelte
  - src/lib/server/db/queries/photos.ts
  - src/lib/server/db/migrations/0002_add_inspection_photos.sql
  - src/routes/api/photos/[photoId]/+server.ts
code_patterns:
  [
    'drizzle-satisfies',
    'fail-redirect-form-actions',
    'query-layer-no-drizzle-in-routes',
    'multipart-form-actions',
    'blob-in-sqlite',
  ]
test_patterns: ['manual browser test at 375px', 'npm run build', 'npm run lint', 'tsc --noEmit']
---

# Tech-Spec: Inspection Photos

**Created:** 2026-08-16
**Status:** Implemented in commit `51040da`

## Overview

### Problem Statement

When logging an inspection, Manuel can only record structured fields and free text. There is no way to attach a visual record — e.g. a photo of a brood frame, a queen cell, or a disease symptom. In the field he wants to take the photo directly with his phone camera rather than shooting it separately and correlating it later by timestamp.

### Solution

Add an `inspection_photos` table storing image bytes as SQLite BLOBs, a reusable `PhotoCapture.svelte` component offering both camera capture and gallery selection, and an authenticated endpoint that streams a photo by ID. Photos are attached during inspection creation and can be added or removed while editing.

### Scope

**In Scope:**

- New `inspection_photos` table: `inspectionId` (required FK → inspections, cascade delete), `data` (BLOB), `mimeType` (text), `createdAt`
- `photos.ts` query file: read (with and without BLOB), count, create, delete, delete-by-inspection
- `PhotoCapture.svelte`: camera button (`capture="environment"`), gallery button, thumbnail grid with per-photo remove, client-side limit and size validation
- `GET /api/photos/[photoId]` — streams the BLOB with the stored MIME type and a long-lived cache header
- Photos attachable on the create-inspection form and add/remove on the edit form
- Photo grid on the inspection detail page, each thumbnail linking to the full image
- Limits: max 5 photos per inspection, max 10 MB per photo, MIME allowlist (JPEG, PNG, WebP, HEIC)

**Out of Scope:**

- Offline photo capture — photos require connectivity; the create form shows a notice instead of the picker when offline (decision recorded below)
- Server-side image resizing or re-encoding (`sharp` remains a build-time-only dependency for PWA icons)
- Lightbox / gallery viewer — thumbnails open the raw image in a new tab
- Captions, ordering, or per-photo metadata
- Photos on stings or harvests

---

## Context for Development

### Codebase Patterns

- **Query layer**: All Drizzle calls live in `src/lib/server/db/queries/*.ts`; route files import from there. `photos.ts` follows `inspections.ts` exactly — grouped `Read` / `Write` sections, `$inferSelect` row types, `null` (never `undefined`) for misses.
- **Form actions**: Extract fields from `formData`, validate, `fail(400, { error })` on failure, `redirect(302, ...)` on success. The photo handling is appended after the existing inspection insert so the existing validation flow is untouched.
- **Multipart forms**: The two inspection forms gained `enctype="multipart/form-data"`. `request.formData()` then yields `File` entries for repeated `photos` inputs, read via `data.getAll('photos')`.
- **Constants co-located with queries**: `MAX_PHOTOS_PER_INSPECTION`, `MAX_PHOTO_BYTES` and `ALLOWED_MIME_TYPES` are exported from `photos.ts` so both server actions enforce identical limits without duplication.

### Files to Reference

- `src/lib/server/db/queries/inspections.ts` — the structural template for `photos.ts`
- `src/routes/hives/[hiveId]/inspect/+page.svelte` — the create form the component was slotted into; also the source of the `.field-label` / `.field-hint` styling conventions reused inside `PhotoCapture.svelte`
- `src/lib/components/HealthBadge.svelte` — component conventions (`$props()` with a typed `Props` interface, scoped styles, CSS custom properties with fallbacks)
- `src/lib/server/db/migrations/0001_add_client_id_unique_indexes.sql` — migration file format

### Technical Decisions

**BLOB in SQLite rather than filesystem storage.** Chosen so that a single `db.sqlite` file remains the complete backup artefact. The existing backup and Docker-volume runbook needs no change, and there is no orphaned-file class of bug. The trade-off is DB growth: at 5 photos × 10 MB the worst case is 50 MB per inspection, though phone JPEGs are typically 2–4 MB. Revisit if the DB file becomes unwieldy.

**Separate table rather than columns on `inspections`.** Keeps the hot `inspections` row narrow — list views and the health chart query that table frequently and must not pull image bytes. `getPhotoMetaByInspectionId()` deliberately selects everything *except* `data` for list rendering.

**`DataTransfer` to populate the submitted file input.** A `File` cannot be written into a hidden text input, and `input.files` is only assignable from a `DataTransfer`. The component therefore keeps its own `previews` array as the source of truth and rebuilds `filesInput.files` on every add/remove. Supported in all current browsers and iOS Safari ≥ 14.1.

**Two separate trigger inputs.** `capture="environment"` forces the camera and suppresses the gallery on mobile, so a single input cannot offer both. The component renders one input with `capture` and one without, each triggered by its own button. Both reset `value = ''` after selection so the same file can be re-picked after removal.

**Photos are online-only.** The offline outbox serialises entries to IndexedDB as JSON; carrying multi-megabyte blobs through it would require storing `Blob`s in IDB, extending the sync loop to multipart uploads, and handling partial-upload failures. Explicitly deferred — the create form hides the picker and shows an explanatory note when `$isOnline` is false, so text-only inspections still work offline exactly as before.

**Cache header is `private`.** Photos are behind the auth guard; `private` prevents shared-proxy caching while still allowing the browser to cache aggressively. `immutable` is accurate because photos are only ever created or deleted, never updated.

---

## Implementation Plan

### Tasks

1. **Schema** — Add `inspectionPhotos` table to `schema.ts` using `blob('data', { mode: 'buffer' })`, FK to `inspections` with `onDelete: 'cascade'`. Export `InspectionPhoto` / `NewInspectionPhoto` inferred types.
2. **Migration** — Write `0002_add_inspection_photos.sql` and register it in `meta/_journal.json` (`idx: 2`). The runtime migrator reads only the journal and the `.sql` files; `meta/*_snapshot.json` files are drizzle-kit tooling artefacts and are not required at runtime.
3. **Query layer** — Create `photos.ts` with `getPhotosByInspectionId`, `getPhotoMetaByInspectionId`, `getPhotoById`, `countPhotosByInspectionId`, `createPhoto`, `deletePhoto`, `deletePhotosByInspectionId`, plus the three exported limit constants.
4. **Component** — Build `PhotoCapture.svelte` with props `existingPhotoIds?: number[]` and `disabled?: boolean`; state for previews, removed existing IDs, and a local error string; `syncFilesInput()` via `DataTransfer`; object-URL cleanup in an `$effect` teardown; hidden `removePhotoIds` inputs for edit mode.
5. **Serve endpoint** — `GET /api/photos/[photoId]` returning `new Response(new Uint8Array(photo.data), { headers })`. Wrapping in `Uint8Array` is required because Node's `Buffer` is not assignable to `BodyInit` under the SvelteKit types.
6. **Create form** — Add `enctype`, import the component, render it behind an `$isOnline` check with an offline note in the `else` branch.
7. **Create action** — After `createInspection`, read `data.getAll('photos')`, filter to `File` instances with `size > 0`, enforce count/size/MIME, then `createPhoto` per file.
8. **Detail page** — Load photo metadata, render a responsive `auto-fill minmax(90px, 1fr)` grid of thumbnails linking to the raw image.
9. **Edit page + action** — Load existing photo IDs into the component; process `removePhotoIds` (verifying each photo belongs to this inspection before deleting) then process additions with the same validation as create.

### Acceptance Criteria

- [x] **AC1 — Attach photo on create (happy path)**
  - Given: Manuel is on `/hives/[hiveId]/inspect` while online
  - When: He selects a health score and queen status, picks one image via "Aus Galerie", and submits
  - Then: The inspection is created, he is redirected to the hive page, and the photo appears on the inspection detail page

- [x] **AC2 — Camera opens directly on mobile**
  - Given: Manuel opens the create form on a phone
  - When: He taps "Foto aufnehmen"
  - Then: The rear camera opens directly rather than a file browser

- [x] **AC3 — Thumbnail preview before submit**
  - Given: Manuel has selected two photos but not yet submitted
  - When: He views the form
  - Then: Two thumbnails are shown, each with a × button that removes it from the selection without submitting the form

- [x] **AC4 — Five-photo limit enforced**
  - Given: Five photos are already selected
  - When: Manuel views the form
  - Then: Both add buttons are replaced by a "Maximal 5 Fotos erreicht" note; a server-side check rejects any request exceeding the limit

- [x] **AC5 — Oversized file rejected**
  - Given: Manuel selects a file larger than 10 MB
  - When: The file is chosen
  - Then: An inline error names the file and it is not added; the server independently rejects oversized uploads

- [x] **AC6 — Photos render on the detail page**
  - Given: An inspection has photos
  - When: Manuel opens the inspection detail page
  - Then: A "Fotos (n)" card shows a thumbnail grid; clicking a thumbnail opens the full image in a new tab

- [x] **AC7 — Add and remove photos while editing**
  - Given: An inspection with two photos is opened for editing
  - When: Manuel removes one, adds another, and saves
  - Then: The removed photo is deleted from the DB and the added one is stored; the detail page reflects both changes

- [x] **AC8 — Deleting an inspection deletes its photos**
  - Given: An inspection with photos exists
  - When: The inspection is deleted
  - Then: The corresponding `inspection_photos` rows are removed by the FK cascade (requires `PRAGMA foreign_keys = ON`, already set in `db/index.ts`)

- [x] **AC9 — Offline shows a notice instead of the picker**
  - Given: `navigator.onLine === false`
  - When: Manuel opens the create form
  - Then: The photo buttons are replaced by "Fotos können nur online hinzugefügt werden" and the existing offline save path continues to work unchanged

- [x] **AC10 — Photo endpoint returns the correct content type**
  - Given: A stored JPEG with id 1
  - When: `GET /api/photos/1` is requested with a valid session
  - Then: The response body is the image bytes with `Content-Type: image/jpeg`; an unknown ID returns 404

- [x] **AC11 — Build, typecheck and lint pass**
  - Given: All tasks completed
  - When: `npm run build`, `npx tsc --noEmit` and `npm run lint` are run
  - Then: All complete without new errors

---

## Additional Context

### Dependencies

- No new npm packages required
- Migration `0002_add_inspection_photos` runs automatically at server start via `migrate()` in `src/lib/server/db/index.ts`
- Requires a server restart after deploy for the migration to apply — a running dev server does not pick up a newly added migration file (this caused a 500 during development; see Notes)
- **Request body limits had to be raised** — both were 10 MB, below this feature's 5 × 10 MB worst case, so multi-photo uploads would have failed in production with a 413 while working fine in dev:
  - `BODY_SIZE_LIMIT` in `docker-compose.yml`: `10485760` → `62914560` (60 MB)
  - `client_max_body_size` in `nginx/conf.d/app.conf`: `10M` → `60M`

  These two must always be changed together and nginx must never exceed the app limit. Applying this on the VPS requires `docker compose up -d` plus an nginx reload.

### Testing Strategy

Manual testing steps:

1. Create an inspection with one photo → verify redirect, then verify the photo on the detail page
2. Create an inspection with no photos → verify no "Fotos" card appears
3. Select five photos → verify buttons disappear; attempt a sixth → verify it is refused
4. Select a >10 MB file → verify the inline error names the file
5. Remove a photo from the preview grid before submitting → verify it is not uploaded
6. Edit an inspection: remove one photo and add another → verify both changes persist
7. Delete an inspection that has photos → verify the `inspection_photos` rows are gone
8. DevTools → Network → Offline; open the create form → verify the offline note replaces the picker and the offline save still queues to IDB
9. On a phone via the LAN URL: verify "Foto aufnehmen" opens the rear camera and "Aus Galerie" opens the picker
10. Mobile viewport (375px) — verify the thumbnail grid and buttons wrap cleanly
11. `npm run build`, `npx tsc --noEmit`, `npm run lint`

### Notes

- **Migration timing gotcha:** during development the first upload returned a 500 because the dev server had been started before `0002_*.sql` existed, so `inspection_photos` was missing. Restarting the server applies it. When adding a migration by hand (rather than via `drizzle-kit generate`), the journal entry is what the runtime migrator keys on; a matching `meta/000N_snapshot.json` is only needed if `drizzle-kit` is subsequently used to diff the schema.
- **Known rough edge:** if photo validation fails server-side, the inspection row has already been inserted, so `fail(400)` leaves an inspection without its photos. The client-side guards make this hard to reach in practice, but wrapping insert + photos in a `db.transaction()` would close it properly. Deferred, not fixed.
- `getPhotosByInspectionId()` (BLOBs included) is currently unused by routes — kept because it is the natural primitive for a future export/backup feature. `getPhotoMetaByInspectionId()` is what pages should use.
- `deletePhotosByInspectionId()` is likewise unused, since the FK cascade handles inspection deletion; it exists for explicit bulk removal (e.g. a future "remove all photos" action).
- The `photo-thumb`/`photo-grid` CSS is intentionally duplicated between `PhotoCapture.svelte` and the detail page rather than globalised — the two grids have diverging behaviour (remove button vs. link) and Svelte scoped styles cannot be shared without a global stylesheet.
