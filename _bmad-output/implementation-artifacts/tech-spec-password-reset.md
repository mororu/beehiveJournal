---
title: 'Password Reset and Change'
slug: 'password-reset'
created: '2026-08-16'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
commit: 'a3d025b'
tech_stack:
  [
    'SvelteKit 2',
    'Svelte 5 Runes',
    'TypeScript strict',
    'Drizzle ORM',
    'SQLite (better-sqlite3)',
    'Argon2id (argon2)',
    'tsx CLI scripts',
  ]
files_to_modify:
  - package.json
  - scripts/create-user.ts
  - src/routes/login/+page.server.ts
  - src/routes/+layout.svelte
files_to_create:
  - scripts/reset-password.ts
  - src/lib/server/password.ts
  - src/lib/server/db/queries/users.ts
  - src/routes/settings/+page.server.ts
  - src/routes/settings/+page.svelte
code_patterns:
  [
    'query-layer-no-drizzle-in-routes',
    'fail-redirect-form-actions',
    'named-form-actions',
    'cli-script-standalone-sqlite',
    'session-from-cookie',
  ]
test_patterns: ['manual browser test at 375px', 'npm run build', 'npm run lint', 'tsc --noEmit']
---

# Tech-Spec: Password Reset and Change

**Created:** 2026-08-16
**Status:** Implemented in commit `a3d025b`

## Overview

### Problem Statement

There was no way to recover from a forgotten password. `create-user.ts` deliberately refuses to overwrite an existing user, no password-change UI existed, and no email address is stored so a self-service reset link is impossible. The only workaround was deleting the user row by hand in SQLite and re-running `create-user` — error-prone and undocumented.

### Solution

Two complementary paths: a `reset-password` CLI script for the locked-out case (operator has server access), and a `/settings` page for changing the password while logged in (requires the current password). Both share one hashing module so parameters can never drift apart.

### Scope

**In Scope:**

- `scripts/reset-password.ts` — replaces the password hash of an existing user; refuses unknown usernames and lists the known ones to help
- `src/lib/server/password.ts` — single source of truth for Argon2id parameters, verification and the password policy; deliberately free of SvelteKit imports so CLI scripts can import it
- `src/lib/server/db/queries/users.ts` — user query layer (`getUserByUsername`, `getUserById`, `updateUserPassword`)
- `/settings` — shows the logged-in username and a change-password form (current + new + confirmation)
- Nav: username in the desktop bar links to `/settings`; an "Einstellungen" entry added to the mobile menu
- `create-user.ts` and `login/+page.server.ts` refactored onto the shared modules

**Out of Scope:**

- Session invalidation on password change — the JWT carries no password material, so existing sessions stay valid (documented below and surfaced in the CLI output)
- Rate limiting / lockout on repeated failed attempts
- Password strength rules beyond a minimum length
- Username change, additional users, or any registration UI
- Two-factor authentication

---

## Context for Development

### Codebase Patterns

- **Query layer**: `src/lib/server/db/queries/*.ts` owns all Drizzle calls. The login route was the sole violator, calling `db.query.users.findFirst` inline; it now uses `getUserByUsername`.
- **Named form actions**: `/settings` uses `changePassword` rather than `default`, matching the `?/delete` convention on the inspection detail page and leaving room for future settings actions.
- **CLI scripts**: `scripts/*.ts` run through `tsx` with `dotenv -e .env.local`, open `better-sqlite3` directly (no Drizzle, no SvelteKit), validate arguments before touching the DB, and exit non-zero with a usage block on misuse. `reset-password.ts` mirrors `create-user.ts` structurally.
- **Auth**: `getSessionUser(cookies)` from `src/lib/server/auth.ts` is the single entry point for reading a session.

### Files to Reference

- `scripts/create-user.ts` — structural template for the reset script
- `src/routes/login/+page.server.ts` — the pattern for reading a session and verifying a password
- `src/lib/server/db/queries/hives.ts` — query-file conventions
- `src/routes/hives/[hiveId]/inspections/[inspectionId]/edit/+page.svelte` — form styling conventions (`.field`, `.field-input`, `.form-error`, `.btn--primary`)

### Technical Decisions

**`password.ts` has no SvelteKit imports.** `auth.ts` imports `$app/environment`, which cannot resolve when a file is executed by `tsx` outside the SvelteKit build. The hashing helpers therefore live in their own module that both the app and the CLI scripts can import. This removed the duplicated Argon2 option block that previously existed in `create-user.ts` and the login route — the two had to be kept in sync manually, and a drift would have silently produced unverifiable hashes.

**The settings route reads the session from the cookie, not `locals.user`.** The root layout guard assigns `locals.user`, but SvelteKit runs layout and page load functions **in parallel**, and form actions run **before** any load. Relying on `locals.user` produced a 500 (`Cannot read properties of undefined`) on first load during development. No `hooks.server.ts` exists in this project, and no other route depended on `locals.user`, so the fix was to call `getSessionUser(cookies)` directly — consistent with the login route. Introducing a `handle` hook to populate `locals` centrally would be the more thorough fix and is a reasonable future refactor.

**Changing the password requires the current one.** Without it, anyone with brief access to an unlocked, already-logged-in phone could take over the account permanently. This is the main realistic threat for a single-user field app.

**Sessions survive a password change.** The JWT contains only `sub` and `username`; it is signed with `JWT_SECRET` and carries no password hash, so changing the password cannot invalidate it. Rather than add a token-version column, this is documented: rotating `JWT_SECRET` and restarting is the "log out everywhere" lever. The CLI prints this hint after a successful reset.

**The reset script requires the user to exist.** It is a reset tool, not an upsert; silently creating a user on a typo would be worse than failing. On an unknown username it prints the known usernames, which also covers the "I forgot which username I used" case.

---

## Implementation Plan

### Tasks

1. **Password module** — Create `src/lib/server/password.ts` exporting `MIN_PASSWORD_LENGTH`, `hashPassword`, `verifyPassword` (returns `false` instead of throwing on malformed hashes) and `validatePassword` (returns an error string or `null`). OWASP 2023 Argon2id parameters: `memoryCost 65536`, `timeCost 3`, `parallelism 4`.
2. **User query layer** — Create `src/lib/server/db/queries/users.ts` with `getUserByUsername`, `getUserById`, `updateUserPassword(id, passwordHash)`. The update function takes a hash, never plaintext.
3. **Reset script** — Create `scripts/reset-password.ts`: validate args → validate password policy → open DB → assert `users` table exists → assert the user exists (else list known usernames) → hash → `UPDATE users SET password_hash`. Register `reset-password` in `package.json` scripts.
4. **Refactor create-user** — Replace the inline argon2 block and the hard-coded length check with `hashPassword` / `validatePassword`.
5. **Settings server** — `load` returns the username; the `changePassword` action validates current password presence, new-password policy, confirmation match, and that the new password differs from the current one, then verifies the current password against the stored hash before writing the new one.
6. **Settings page** — Account card plus a three-field form with `autocomplete` hints (`current-password` / `new-password`), inline error and success banners, and a note documenting the CLI reset path. Reset the form fields on success.
7. **Navigation** — Turn the desktop username into a link to `/settings`; add an "Einstellungen" entry to the mobile menu.
8. **Refactor login** — Use `getUserByUsername` and `verifyPassword`; drop the direct Drizzle and argon2 imports.

### Acceptance Criteria

- [x] **AC1 — CLI resets an existing user's password**
  - Given: User `manuel` exists
  - When: `npm run reset-password -- manuel <newpass>` is run
  - Then: A success message is printed and the stored hash verifies against the new password

- [x] **AC2 — CLI refuses an unknown user**
  - Given: No user named `nichtexistierend`
  - When: The script is run with that username
  - Then: It exits non-zero, states that no such user exists, and lists the known usernames

- [x] **AC3 — CLI enforces the password policy**
  - Given: A password shorter than 8 characters
  - When: The script is run
  - Then: It exits before touching the DB with "Passwort muss mindestens 8 Zeichen lang sein"

- [x] **AC4 — Settings page is auth-guarded**
  - Given: No session cookie
  - When: `/settings` is requested
  - Then: The response is a 302 to `/login`

- [x] **AC5 — Settings page shows the logged-in user**
  - Given: Manuel is logged in
  - When: He opens `/settings`
  - Then: "Angemeldet als" and his username are shown alongside the change-password form

- [x] **AC6 — Wrong current password rejected**
  - Given: Manuel is logged in
  - When: He submits the form with an incorrect current password
  - Then: "Aktuelles Passwort ist falsch" is shown and the stored hash is unchanged

- [x] **AC7 — Mismatched confirmation rejected**
  - Given: New password and confirmation differ
  - When: The form is submitted
  - Then: "Die neuen Passwörter stimmen nicht überein" is shown

- [x] **AC8 — Short new password rejected**
  - Given: A new password shorter than 8 characters
  - When: The form is submitted
  - Then: The minimum-length error is shown

- [x] **AC9 — Reusing the current password rejected**
  - Given: The new password equals the current one
  - When: The form is submitted
  - Then: "Das neue Passwort muss sich vom aktuellen unterscheiden" is shown

- [x] **AC10 — Successful change takes effect at login**
  - Given: A valid change is submitted
  - When: The success banner appears and Manuel logs out
  - Then: The old password is rejected at login and the new one is accepted

- [x] **AC11 — Navigation entry points**
  - Given: Manuel is logged in
  - When: He views the desktop nav or opens the mobile menu
  - Then: The username links to `/settings` (desktop) and an "Einstellungen" entry is present (mobile)

- [x] **AC12 — Build, typecheck and lint pass**
  - Given: All tasks completed
  - When: `npm run build`, `npx tsc --noEmit` and `npm run lint` are run
  - Then: All complete without new errors

---

## Additional Context

### Dependencies

- No new npm packages — `argon2` and `better-sqlite3` were already dependencies
- No DB migration required; the `users` table is unchanged
- New npm script: `reset-password`

### Testing Strategy

Manual and CLI testing steps:

1. `npm run reset-password` with no arguments → usage block, exit 1
2. `npm run reset-password -- unknownuser pass12345` → error plus list of known usernames
3. `npm run reset-password -- manuel short` → policy error before any DB write
4. `npm run reset-password -- manuel <newpass>` → success; verify with `verifyPassword` against the stored hash
5. `curl -s -o /dev/null -w "%{http_code}" /settings` without a cookie → 302 to `/login`
6. Log in, open `/settings` → username and form visible
7. Submit with a wrong current password → error, hash unchanged
8. Submit with mismatched confirmation → error
9. Submit with a 4-character new password → error
10. Submit with new equal to current → error
11. Submit a valid change → success banner; then log in with the old password (rejected) and the new one (accepted)
12. Mobile viewport (375px) — form and "Einstellungen" menu entry
13. `npm run build`, `npx tsc --noEmit`, `npm run lint`

Steps 5–11 were additionally driven end-to-end over HTTP with `curl` against the dev server using the `x-sveltekit-action: true` header to exercise the form action directly and assert on the returned action results.

### Notes

- **Deployment:** `docker exec beehivejournal-app node scripts/reset-password.js <user> <pass>` — the compiled `.js` path, mirroring the documented `create-user` invocation.
- **Shell quoting:** passwords containing spaces, `$`, `!` or `#` must be wrapped in single quotes. Double quotes would let the shell expand `$` and `!`.
- **Password change does not end other sessions** (see Technical Decisions). To force a global logout, rotate `JWT_SECRET` and restart the server; every existing cookie then fails verification.
- The password policy is a bare minimum length. `validatePassword` is the single place to extend if complexity rules are ever wanted — both the CLI scripts and the settings action route through it.
- Introducing a `hooks.server.ts` with a `handle` hook that populates `locals.user` would let routes rely on `locals` safely and remove the repeated `getSessionUser(cookies)` calls. Out of scope here, but the parallel-load pitfall documented above is the reason it would be worth doing.
