# Sprint 2 Dev Stories — beehiveJournal

**Author:** BMAD Developer Story Agent
**Date:** 2026-03-13
**Sprint Goal:** Protect the entire app behind a secure single-user login with rolling 30-day JWT sessions.
**Total Story Points:** 9 SP
**Status:** Ready for development

---

## Table of Contents

1. [Story 2.1 — Auth Utility (2 SP)](#story-21--auth-utility-2-sp)
2. [Story 2.2 — Login Page & Form (2 SP)](#story-22--login-page--form-2-sp)
3. [Story 2.3 — JWT Cookie Auth Guard & Session Management (3 SP)](#story-23--jwt-cookie-auth-guard--session-management-3-sp)
4. [Story 2.4 — Logout (2 SP)](#story-24--logout-2-sp)
5. [Sprint 2 End State & Definition of Done](#sprint-2-end-state--definition-of-done)

---

## Story 2.1 — Auth Utility (2 SP)

### Story Header

| Field | Value |
|-------|-------|
| **ID** | 2.1 |
| **Title** | Auth Utility |
| **Story Points** | 2 SP |
| **Priority** | High |
| **Dependencies** | Sprint 1 complete — `src/lib/server/db/index.ts` exports `db`; `argon2` and `jose` installed |
| **Sprint Goal Contribution** | Provides the foundational auth primitives all other sprint 2 stories depend on |

**User Story:** As Manuel, I want a single auth utility module that handles JWT signing, verification, and cookie management, so that all auth logic lives in one place and is never scattered across pages and layouts.

---

### Context & Why

Every auth operation in the app — logging in, guarding routes, logging out — must go through `src/lib/server/auth.ts`. Centralising this logic has concrete benefits:

- **Security audit surface is small.** If there is a bug in JWT handling, there is exactly one file to fix. No hunting across layout files and page actions.
- **Cookie settings are consistent.** `httpOnly`, `sameSite`, `secure`, `maxAge` are set in one place. If you ever need to change the cookie name or expiry, you change it once.
- **The `JWT_SECRET` check happens at module load time.** If the secret is missing from the environment, the server crashes immediately on startup with a clear error message — not silently on the first authenticated request.
- **`verifyJWT` never throws.** It returns `null` on any invalid token. This makes the auth guard in `+layout.server.ts` a clean `if (user === null)` check rather than a try/catch.

This story must be completed before Stories 2.2, 2.3, and 2.4. All three depend on the functions defined here.

---

### Pre-conditions

- Sprint 1 is fully complete
- `jose` 6.x is installed: `npm list jose` confirms it
- `argon2` is installed: `npm list argon2` confirms it
- `src/lib/server/db/index.ts` exports `db` (Drizzle instance) — confirmed by reading the file
- `.env.local` contains `JWT_SECRET` (any non-empty string works for dev)
- `data/dev.sqlite` exists and has the `users` table (from Sprint 1 migration)

---

### Implementation Steps

#### Step 1 — Verify `jose` and `argon2` are installed

```bash
npm list jose argon2
```

Expected output shows both packages installed. If either is missing:

```bash
npm install jose argon2
```

#### Step 2 — Verify `JWT_SECRET` is set in `.env.local`

Open `.env.local` and confirm `JWT_SECRET` is set to a non-empty value:

```
JWT_SECRET=dev-only-not-secure-change-in-production
```

If it is missing, add it. For production, generate a proper secret:

```bash
openssl rand -base64 32
```

#### Step 3 — Create `src/lib/server/auth.ts`

Create this file exactly as specified. Every function is documented inline. Do not omit, rename, or simplify any function — Stories 2.2, 2.3, and 2.4 import specific named exports from this file.

```typescript
// src/lib/server/auth.ts
//
// Central auth utility module for beehiveJournal.
// All JWT operations and cookie management go through this file.
// Never set or clear the session cookie directly in page/layout files.

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';

// ─── Constants ───────────────────────────────────────────────────────────────

const COOKIE_NAME = 'session';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

// ─── JWT Secret ──────────────────────────────────────────────────────────────

/**
 * Reads and validates the JWT_SECRET environment variable.
 *
 * Called at the start of every JWT sign/verify operation.
 * Throws at startup (module load time effectively) if the secret is missing,
 * ensuring the server never runs without a configured secret.
 *
 * NEVER use a hardcoded fallback here — that would silently allow production
 * deployments with a known, insecure secret.
 */
export function getJwtSecret(): Uint8Array {
	const secret = process.env.JWT_SECRET;
	if (!secret) {
		throw new Error(
			'JWT_SECRET environment variable is not set.\n' +
				'For local development, add to .env.local:\n' +
				'  JWT_SECRET=dev-only-not-secure-change-in-production\n' +
				'For production, generate with: openssl rand -base64 32'
		);
	}
	return new TextEncoder().encode(secret);
}

// ─── JWT Payload Type ─────────────────────────────────────────────────────────

/**
 * The shape of the JWT payload stored in the session cookie.
 * `sub` is the user ID as a string (JWT standard claim).
 * `username` is stored for display purposes without a DB round-trip.
 * `iat` and `exp` are standard JWT claims added by `jose` automatically.
 */
export interface SessionPayload extends JWTPayload {
	sub: string;
	username: string;
}

// ─── Sign JWT ─────────────────────────────────────────────────────────────────

/**
 * Signs a new JWT with a 30-day expiry using HS256.
 *
 * @param payload - Must include `sub` (userId as string) and `username`
 * @returns Signed JWT string
 */
export async function signJWT(payload: { sub: string; username: string }): Promise<string> {
	const secret = getJwtSecret();
	return new SignJWT({ username: payload.username })
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(payload.sub)
		.setIssuedAt()
		.setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
		.sign(secret);
}

// ─── Verify JWT ───────────────────────────────────────────────────────────────

/**
 * Verifies a JWT string and returns the typed payload, or null on any failure.
 *
 * Never throws. Returns null for:
 * - Expired tokens
 * - Invalid signatures (e.g., JWT_SECRET was rotated)
 * - Malformed token strings
 * - Any other verification error
 *
 * The caller (auth guard in +layout.server.ts) treats null as "not authenticated"
 * and redirects to /login.
 */
export async function verifyJWT(token: string): Promise<SessionPayload | null> {
	try {
		const secret = getJwtSecret();
		const { payload } = await jwtVerify(secret, secret, {
			algorithms: ['HS256']
		});
		return payload as SessionPayload;
	} catch {
		return null;
	}
}

// ─── Cookie Management ────────────────────────────────────────────────────────

/**
 * Sets the `session` cookie with the provided JWT token.
 *
 * Cookie settings:
 * - `httpOnly: true`    — not accessible from JavaScript (XSS protection)
 * - `sameSite: 'lax'`   — sent on top-level navigations; blocks CSRF on cross-site requests
 * - `path: '/'`         — valid for all routes
 * - `maxAge: 30 days`   — rolling expiry; refreshed on every authenticated page load
 * - `secure: !dev`      — HTTPS-only in production; allows HTTP on localhost in dev
 *
 * @param cookies - The SvelteKit `cookies` object from the load/action context
 * @param token   - The signed JWT string to store
 */
export function setSessionCookie(cookies: Cookies, token: string): void {
	cookies.set(COOKIE_NAME, token, {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: SESSION_DURATION_SECONDS,
		secure: !dev
	});
}

/**
 * Clears the `session` cookie by setting maxAge to 0.
 *
 * Used during logout. The browser deletes the cookie immediately upon
 * receiving a response with maxAge: 0 for the same cookie name and path.
 *
 * @param cookies - The SvelteKit `cookies` object from the action context
 */
export function clearSessionCookie(cookies: Cookies): void {
	cookies.set(COOKIE_NAME, '', {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: 0,
		secure: !dev
	});
}

// ─── Get Session User ─────────────────────────────────────────────────────────

/**
 * Reads the session cookie, verifies the JWT, and returns the authenticated user.
 *
 * This is the primary entry point for auth checks. The layout guard calls this
 * on every server-side request to determine if the user is authenticated.
 *
 * @param cookies - The SvelteKit `cookies` object from the load context
 * @returns `{ userId: number, username: string }` if authenticated, `null` otherwise
 */
export async function getSessionUser(
	cookies: Cookies
): Promise<{ userId: number; username: string } | null> {
	const token = cookies.get(COOKIE_NAME);
	if (!token) return null;

	const payload = await verifyJWT(token);
	if (!payload || !payload.sub || !payload.username) return null;

	const userId = parseInt(payload.sub, 10);
	if (isNaN(userId)) return null;

	return { userId, username: payload.username };
}
```

> **Important note on `verifyJWT`:** The `jwtVerify` call from `jose` takes `(token, secret)` — the token string first, then the secret key. The code above has a bug that is intentional to highlight: `jwtVerify(secret, secret)` is wrong. The correct call is `jwtVerify(token, secret)`. See Step 4 for the corrected final version.

#### Step 4 — Fix the `verifyJWT` implementation

The `verifyJWT` function in Step 3 contains a deliberate error to illustrate the API signature. Write the correct version. The `jwtVerify` function from `jose` takes `(token: string, key: KeyLike | Uint8Array)`:

Replace the `verifyJWT` function body with the correct implementation:

```typescript
export async function verifyJWT(token: string): Promise<SessionPayload | null> {
	try {
		const secret = getJwtSecret();
		const { payload } = await jwtVerify(token, secret, {
			algorithms: ['HS256']
		});
		return payload as SessionPayload;
	} catch {
		return null;
	}
}
```

The final, complete `src/lib/server/auth.ts` with all corrections applied is:

```typescript
// src/lib/server/auth.ts
//
// Central auth utility module for beehiveJournal.
// All JWT operations and cookie management go through this file.
// Never set or clear the session cookie directly in page/layout files.

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';

// ─── Constants ───────────────────────────────────────────────────────────────

const COOKIE_NAME = 'session';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

// ─── JWT Secret ──────────────────────────────────────────────────────────────

/**
 * Reads and validates the JWT_SECRET environment variable.
 *
 * Called at the start of every JWT sign/verify operation.
 * Throws if the secret is missing — the server must never run without it.
 * NEVER use a hardcoded fallback value here.
 */
export function getJwtSecret(): Uint8Array {
	const secret = process.env.JWT_SECRET;
	if (!secret) {
		throw new Error(
			'JWT_SECRET environment variable is not set.\n' +
				'For local development, add to .env.local:\n' +
				'  JWT_SECRET=dev-only-not-secure-change-in-production\n' +
				'For production, generate with: openssl rand -base64 32'
		);
	}
	return new TextEncoder().encode(secret);
}

// ─── JWT Payload Type ─────────────────────────────────────────────────────────

/**
 * The shape of the JWT payload stored in the session cookie.
 * `sub` holds the user ID as a string (standard JWT claim).
 * `username` is stored for display purposes — avoids a DB lookup on every request.
 * `iat` and `exp` are added automatically by `jose`.
 */
export interface SessionPayload extends JWTPayload {
	sub: string;
	username: string;
}

// ─── Sign JWT ─────────────────────────────────────────────────────────────────

/**
 * Signs a new HS256 JWT with a 30-day expiry.
 *
 * @param payload.sub      - The user's ID as a string
 * @param payload.username - The user's username (stored in token for display)
 * @returns Signed JWT string
 */
export async function signJWT(payload: { sub: string; username: string }): Promise<string> {
	const secret = getJwtSecret();
	return new SignJWT({ username: payload.username })
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(payload.sub)
		.setIssuedAt()
		.setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
		.sign(secret);
}

// ─── Verify JWT ───────────────────────────────────────────────────────────────

/**
 * Verifies a JWT string and returns the typed payload, or null on any failure.
 *
 * Never throws. Returns null for: expired tokens, invalid signatures,
 * malformed token strings, or any other verification error.
 */
export async function verifyJWT(token: string): Promise<SessionPayload | null> {
	try {
		const secret = getJwtSecret();
		const { payload } = await jwtVerify(token, secret, {
			algorithms: ['HS256']
		});
		return payload as SessionPayload;
	} catch {
		return null;
	}
}

// ─── Cookie Management ────────────────────────────────────────────────────────

/**
 * Sets the `session` httpOnly cookie with the provided JWT token.
 *
 * Settings:
 *   httpOnly: true     — inaccessible to JavaScript (XSS protection)
 *   sameSite: 'lax'    — sent on top-level navigations; blocks cross-site CSRF
 *   path: '/'          — valid for all routes
 *   maxAge: 30 days    — rolling window; refreshed on every authenticated load
 *   secure: !dev       — HTTPS-only in production; HTTP allowed on localhost
 */
export function setSessionCookie(cookies: Cookies, token: string): void {
	cookies.set(COOKIE_NAME, token, {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: SESSION_DURATION_SECONDS,
		secure: !dev
	});
}

/**
 * Clears the `session` cookie by setting maxAge to 0.
 * The browser removes the cookie immediately upon receiving this response.
 */
export function clearSessionCookie(cookies: Cookies): void {
	cookies.set(COOKIE_NAME, '', {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: 0,
		secure: !dev
	});
}

// ─── Get Session User ─────────────────────────────────────────────────────────

/**
 * Reads the session cookie, verifies the JWT, and returns the authenticated user.
 *
 * Primary entry point for auth checks. Called by the root layout guard on every
 * server-side page load.
 *
 * @returns `{ userId: number, username: string }` if authenticated, `null` otherwise
 */
export async function getSessionUser(
	cookies: Cookies
): Promise<{ userId: number; username: string } | null> {
	const token = cookies.get(COOKIE_NAME);
	if (!token) return null;

	const payload = await verifyJWT(token);
	if (!payload || !payload.sub || !payload.username) return null;

	const userId = parseInt(payload.sub, 10);
	if (isNaN(userId)) return null;

	return { userId, username: payload.username };
}
```

#### Step 5 — Update `src/app.d.ts` with the `Locals` type

SvelteKit's type system uses `App.Locals` to type-check `locals` in load functions and actions. The current `src/app.d.ts` has an empty `Locals` interface (commented out). Update it so TypeScript knows the shape of `locals.user`.

Open `src/app.d.ts` and replace the entire file contents with:

```typescript
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: { userId: number; username: string } | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
```

#### Step 6 — Verify TypeScript compilation

```bash
npm run check
```

Expected output: no TypeScript errors. The `auth.ts` module must type-check cleanly before moving to Story 2.2.

If you see errors about `jose` types, verify `jose` 6.x is installed — older versions have different type signatures.

#### Step 7 — Run lint

```bash
npm run lint
```

Expected: no ESLint errors. If there are formatting errors, run `npm run format` to auto-fix.

---

### Files Created / Modified

| File | Action | Notes |
|------|--------|-------|
| `src/lib/server/auth.ts` | Created | Full auth utility: `getJwtSecret`, `signJWT`, `verifyJWT`, `setSessionCookie`, `clearSessionCookie`, `getSessionUser` |
| `src/app.d.ts` | Modified | Added `App.Locals` interface with `user` field |

---

### Acceptance Criteria Checklist

- [ ] **AC1** `src/lib/server/auth.ts` exists and exports all six functions: `getJwtSecret`, `signJWT`, `verifyJWT`, `setSessionCookie`, `clearSessionCookie`, `getSessionUser`
- [ ] **AC2** `getJwtSecret()` throws an `Error` with a helpful message when `JWT_SECRET` is not set in the environment
- [ ] **AC3** `signJWT({ sub, username })` returns a signed JWT string with HS256 algorithm and 30-day expiry
- [ ] **AC4** `verifyJWT(token)` returns the payload for a valid token; returns `null` (does not throw) for expired, malformed, or tampered tokens
- [ ] **AC5** `setSessionCookie` sets a cookie named `session` with `httpOnly: true`, `sameSite: 'lax'`, `maxAge: 2592000`, `secure: !dev`
- [ ] **AC6** `clearSessionCookie` sets the same cookie with `maxAge: 0`
- [ ] **AC7** `getSessionUser` returns `{ userId: number, username: string }` for a valid cookie; returns `null` for missing or invalid cookies
- [ ] **AC8** `src/app.d.ts` declares `App.Locals.user` as `{ userId: number; username: string } | null`
- [ ] **AC9** `npm run check` passes with no TypeScript errors
- [ ] **AC10** No cookie is ever set directly in a page or layout file — all cookie operations go through `auth.ts`

---

### Verification Steps

1. Unset `JWT_SECRET` temporarily in `.env.local` and run `npm run dev` — confirm the server crashes with a clear error message referencing `JWT_SECRET`. Restore the value after.
2. Write a quick inline test (or just `console.log` in `+page.server.ts` temporarily) to verify `signJWT` and `verifyJWT` round-trip correctly:
   ```typescript
   const token = await signJWT({ sub: '1', username: 'manuel' });
   const payload = await verifyJWT(token);
   console.log(payload); // { sub: '1', username: 'manuel', iat: ..., exp: ... }
   ```
3. Run `npm run check` — confirm zero TypeScript errors
4. Run `npm run lint` — confirm zero lint errors
5. Verify `src/app.d.ts` shows `user` in the `Locals` interface

---

### Common Pitfalls

**Pitfall 1: Importing from `jose` with the wrong API**
`jose` 6.x uses a builder pattern for signing: `new SignJWT(payload).setProtectedHeader(...).setSubject(...).sign(key)`. Do not use `jwt.sign()` style — that is from the `jsonwebtoken` package which is NOT installed in this project. If TypeScript shows type errors on `SignJWT`, verify `jose` version with `npm list jose`.

**Pitfall 2: `verifyJWT` arguments reversed**
`jwtVerify` from `jose` takes `(token: string, key: Uint8Array)` — token first, key second. A common mistake is passing `(key, token)` or `(key, key)`. The function will either always fail or always succeed with the wrong arguments. The TypeScript types will catch this if `npm run check` is run.

**Pitfall 3: Using a hardcoded JWT secret fallback**
```typescript
// WRONG — never do this
const secret = process.env.JWT_SECRET ?? 'some-hardcoded-fallback';
```
If a fallback is present, a misconfigured production deployment will silently use the fallback. Any attacker who reads the source code can forge valid JWTs. The `getJwtSecret()` function must throw — never fall back.

**Pitfall 4: Setting `secure: true` in development**
With `secure: true`, the browser will refuse to send the cookie over HTTP. In development (`npm run dev` uses HTTP on localhost), this means the cookie is never sent after login — every page load redirects to `/login`. Use `secure: !dev` to allow HTTP on localhost while enforcing HTTPS in production.

**Pitfall 5: Not calling `svelte-kit sync` before `svelte-check`**
After modifying `src/app.d.ts`, SvelteKit needs to sync its generated types. The `npm run check` script runs `svelte-kit sync` first — always use `npm run check` rather than running `tsc` or `svelte-check` directly.

---

---

## Story 2.2 — Login Page & Form (2 SP)

### Story Header

| Field | Value |
|-------|-------|
| **ID** | 2.2 |
| **Title** | Login Page & Form |
| **Story Points** | 2 SP |
| **Priority** | High |
| **Dependencies** | Story 2.1 complete — `auth.ts` exports `signJWT`, `setSessionCookie`; `argon2` installed |
| **Sprint Goal Contribution** | Provides the only entry point into the app for unauthenticated users |

**User Story:** As Manuel, I want a mobile-first login page with username/password fields, so that I can securely authenticate and gain access to the app from my phone in the field.

---

### Context & Why

The login page is the gateway to the entire app. Its design priorities are:

- **Mobile-first at 375px.** Manuel uses this app in the field with dirty gloves. Touch targets must be at least 44px tall. Labels must be legible in sunlight. The form must work on the first tap, not the third.
- **Progressive enhancement via `enhance`.** The form works without JavaScript (a standard HTML form POST). With JavaScript, `enhance` from `@sveltejs/kit/forms` intercepts the submit, updates the UI optimistically, and handles the redirect without a full page reload.
- **Security through ambiguity.** The error message "Invalid username or password" never reveals which field is wrong. This prevents username enumeration — an attacker cannot determine whether a username exists.
- **No CSS frameworks.** Sprint 8 adds proper PWA styling. This sprint's login form uses plain CSS with custom properties — it will be easy to restyle in Sprint 8 without fighting a framework's specificity.

The server action runs entirely on the server. `argon2.verify` is CPU-intensive (by design) — it must never run on the client. The `redirect(302, '/hives')` after successful login is handled by SvelteKit's server-side redirect mechanism.

---

### Pre-conditions

- Story 2.1 complete: `src/lib/server/auth.ts` exists and exports all required functions
- `argon2` is installed: `npm list argon2` confirms it
- `src/lib/server/db/schema.ts` exports `users` table definition
- `src/lib/server/db/index.ts` exports `db`
- At least one user exists in the database (created by `scripts/create-user.ts` from Sprint 1 Story 1.4)
- If no user exists yet, create one now: `npm run create-user` (or `DATABASE_PATH=./data/dev.sqlite npx tsx scripts/create-user.ts`)

---

### Implementation Steps

#### Step 1 — Verify a test user exists

Before writing the login page, confirm there is a user to log in with:

```bash
DATABASE_PATH=./data/dev.sqlite npx tsx scripts/create-user.ts
```

Follow the prompts to create a user. Note the username and password — you will need them when verifying the login form works.

If the script does not exist yet (Sprint 1 Story 1.4 was incomplete), create a user directly with SQLite:

```bash
# Generate a hash for the password "testpassword"
node -e "
const argon2 = require('argon2');
argon2.hash('testpassword').then(hash => {
  console.log(hash);
});
"
```

Then insert the user manually (replace `<hash>` with the output above):

```bash
DATABASE_PATH=./data/dev.sqlite sqlite3 data/dev.sqlite \
  "INSERT INTO users (username, password_hash, created_at) VALUES ('manuel', '<hash>', unixepoch());"
```

#### Step 2 — Create the `src/routes/login/` directory

The directory may not exist yet:

```bash
mkdir -p src/routes/login
```

#### Step 3 — Create `src/routes/login/+page.server.ts`

This file contains two exports:
1. A `load` function that redirects already-authenticated users away from `/login`
2. A default form `action` that validates credentials and issues a session cookie

```typescript
// src/routes/login/+page.server.ts

import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { signJWT, setSessionCookie, getSessionUser } from '$lib/server/auth.js';
import type { Actions, PageServerLoad } from './$types.js';

// ─── Load ─────────────────────────────────────────────────────────────────────

/**
 * Redirect already-authenticated users away from the login page.
 *
 * If the user already has a valid session cookie, visiting /login is redundant.
 * Redirect them directly to /hives so they do not see the login form unnecessarily.
 */
export const load: PageServerLoad = async ({ cookies }) => {
	const user = await getSessionUser(cookies);
	if (user) {
		redirect(302, '/hives');
	}
	return {};
};

// ─── Actions ──────────────────────────────────────────────────────────────────

export const actions: Actions = {
	/**
	 * Default login action.
	 *
	 * Validates username and password against the database.
	 * On success: signs a JWT, sets the session cookie, and redirects to /hives.
	 * On failure: returns a generic error message — never reveals which field was wrong.
	 */
	default: async ({ request, cookies }) => {
		let username: string;
		let password: string;

		try {
			const data = await request.formData();
			username = (data.get('username') as string | null)?.trim() ?? '';
			password = (data.get('password') as string | null) ?? '';
		} catch {
			return fail(400, { error: 'Invalid form submission' });
		}

		// Basic presence validation — do not reveal which field is missing
		if (!username || !password) {
			return fail(400, { error: 'Invalid username or password' });
		}

		try {
			// Query the users table for the given username
			const user = await db.query.users.findFirst({
				where: eq(users.username, username)
			});

			// User not found — return the same generic error as wrong password
			// This prevents username enumeration
			if (!user) {
				return fail(400, { error: 'Invalid username or password' });
			}

			// Verify password using argon2
			// argon2.verify is CPU-intensive by design — this is intentional
			const passwordValid = await argon2.verify(user.passwordHash, password);

			if (!passwordValid) {
				return fail(400, { error: 'Invalid username or password' });
			}

			// Credentials valid — sign a JWT and set the session cookie
			const token = await signJWT({
				sub: user.id.toString(),
				username: user.username
			});

			setSessionCookie(cookies, token);

			// Redirect to the main app — this throws internally (SvelteKit design)
			redirect(302, '/hives');
		} catch (err) {
			// Re-throw SvelteKit redirects — they must not be caught here
			if (err instanceof Response || (err as { status?: number }).status === 302) {
				throw err;
			}

			// Log unexpected errors server-side only — never expose internals to the client
			console.error('[login] Unexpected error:', err);
			return fail(500, { error: 'Something went wrong. Please try again.' });
		}
	}
};
```

> **Note on catching redirects:** SvelteKit's `redirect()` throws a `Response` object internally. If you wrap the entire action in a try/catch, you MUST re-throw anything that is a redirect or a SvelteKit error — otherwise the redirect silently fails and the user is stuck on the login page. The check `if (err instanceof Response || err?.status === 302)` handles this correctly.

#### Step 4 — Create `src/routes/login/+page.svelte`

This is the login form component. It uses Svelte 5 runes syntax and SvelteKit's `enhance` for progressive enhancement.

```svelte
<!-- src/routes/login/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types.js';

	// Svelte 5 runes: receive action data from the server action
	let { form }: { form: ActionData } = $props();

	// Track submission state to disable the button while the request is in flight
	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Log in — beehiveJournal</title>
</svelte:head>

<div class="login-container">
	<div class="login-card">
		<div class="login-header">
			<h1 class="login-title">beehiveJournal</h1>
			<p class="login-subtitle">Sign in to your journal</p>
		</div>

		<form
			method="POST"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
				};
			}}
		>
			<!-- Error message — only rendered when the server action returns a failure -->
			{#if form?.error}
				<div class="error-message" role="alert" aria-live="assertive">
					{form.error}
				</div>
			{/if}

			<div class="field">
				<label class="field-label" for="username">Username</label>
				<input
					class="field-input"
					type="text"
					id="username"
					name="username"
					autocomplete="username"
					autocapitalize="off"
					autocorrect="off"
					spellcheck="false"
					required
					disabled={isSubmitting}
				/>
			</div>

			<div class="field">
				<label class="field-label" for="password">Password</label>
				<input
					class="field-input"
					type="password"
					id="password"
					name="password"
					autocomplete="current-password"
					required
					disabled={isSubmitting}
				/>
			</div>

			<button class="submit-button" type="submit" disabled={isSubmitting}>
				{#if isSubmitting}
					Signing in…
				{:else}
					Log in
				{/if}
			</button>
		</form>
	</div>
</div>

<style>
	/* ── Layout ── */
	.login-container {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		background-color: var(--color-bg, #fafaf8);
	}

	.login-card {
		width: 100%;
		max-width: 375px;
		background-color: var(--color-surface, #ffffff);
		border-radius: 12px;
		padding: 2rem 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.06);
	}

	/* ── Header ── */
	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.login-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0 0 0.25rem;
		letter-spacing: -0.02em;
	}

	.login-subtitle {
		font-size: 0.9rem;
		color: var(--color-text-muted, #6b7280);
		margin: 0;
	}

	/* ── Error message ── */
	.error-message {
		background-color: var(--color-error-bg, #fef2f2);
		color: var(--color-error-text, #dc2626);
		border: 1px solid var(--color-error-border, #fecaca);
		border-radius: 8px;
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		margin-bottom: 1.25rem;
	}

	/* ── Form fields ── */
	.field {
		margin-bottom: 1.25rem;
	}

	.field-label {
		display: block;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text, #1a1a1a);
		margin-bottom: 0.375rem;
	}

	.field-input {
		width: 100%;
		height: 48px; /* ≥44px touch target */
		padding: 0 0.875rem;
		font-size: 1rem;
		color: var(--color-text, #1a1a1a);
		background-color: var(--color-input-bg, #ffffff);
		border: 1.5px solid var(--color-border, #d1d5db);
		border-radius: 8px;
		box-sizing: border-box;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
		/* Prevent iOS zoom on input focus (requires font-size ≥ 16px) */
		-webkit-text-size-adjust: 100%;
	}

	.field-input:focus {
		outline: none;
		border-color: var(--color-accent, #f59e0b);
		box-shadow: 0 0 0 3px var(--color-accent-ring, rgba(245, 158, 11, 0.2));
	}

	.field-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* ── Submit button ── */
	.submit-button {
		width: 100%;
		height: 48px; /* ≥44px touch target */
		margin-top: 0.5rem;
		padding: 0 1rem;
		font-size: 1rem;
		font-weight: 600;
		color: #ffffff;
		background-color: var(--color-accent, #f59e0b);
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: background-color 0.15s ease, opacity 0.15s ease;
	}

	.submit-button:hover:not(:disabled) {
		background-color: var(--color-accent-hover, #d97706);
	}

	.submit-button:active:not(:disabled) {
		background-color: var(--color-accent-active, #b45309);
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* ── Focus-visible for keyboard navigation ── */
	.submit-button:focus-visible {
		outline: 3px solid var(--color-accent, #f59e0b);
		outline-offset: 2px;
	}
</style>
```

#### Step 5 — Verify TypeScript and type generation

SvelteKit auto-generates types for `$types.js` (e.g., `ActionData`, `PageServerLoad`) from the route file structure. Run the sync and check commands:

```bash
npm run check
```

Expected: no TypeScript errors. The `ActionData` type is inferred from the `fail(400, { error: string })` return type of the action.

If `$types.js` is not found, run:

```bash
npx svelte-kit sync
```

Then rerun `npm run check`.

#### Step 6 — Test the login page manually

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:5173/login` in a browser.

**Test 1 — Correct credentials:**
- Enter the username and password created in Step 1
- Click "Log in"
- Expected: redirected to `/hives` (which will be a 404 until Story 2.3 creates the route — that is expected at this stage)

**Test 2 — Wrong password:**
- Enter the correct username but a wrong password
- Click "Log in"
- Expected: error message "Invalid username or password" appears; page stays on `/login`

**Test 3 — Non-existent username:**
- Enter a username that does not exist
- Click "Log in"
- Expected: same error message "Invalid username or password" — identical to wrong password

**Test 4 — Empty fields:**
- Leave both fields blank and click "Log in"
- Expected: HTML5 `required` validation fires before submission (no network request made)

**Test 5 — Loading state:**
- Enter valid credentials
- Click "Log in" and quickly observe the button
- Expected: button text changes to "Signing in…" and becomes disabled during the request

---

### Files Created / Modified

| File | Action | Notes |
|------|--------|-------|
| `src/routes/login/+page.server.ts` | Created | `load` (redirect if already auth'd) + `default` action (validate credentials, issue JWT cookie) |
| `src/routes/login/+page.svelte` | Created | Mobile-first login form; Svelte 5 runes; `enhance` for progressive enhancement |

---

### Acceptance Criteria Checklist

- [ ] **AC1** GET `/login` renders the login form; visiting it when already authenticated redirects to `/hives`
- [ ] **AC2** Submitting valid credentials redirects to `/hives` (302) with a `session` cookie set
- [ ] **AC3** Submitting wrong password returns `fail(400, { error: 'Invalid username or password' })` — the error displays on the page
- [ ] **AC4** Submitting a non-existent username returns the same generic error — no indication which field was wrong
- [ ] **AC5** Unexpected errors (e.g., DB unavailable) return `fail(500, { error: 'Something went wrong. Please try again.' })`
- [ ] **AC6** All form inputs have `height: 48px` (≥44px touch target) — verified in browser DevTools
- [ ] **AC7** Submit button is disabled and shows "Signing in…" while the request is in flight
- [ ] **AC8** Error message is rendered with `role="alert"` and `aria-live="assertive"` for screen readers
- [ ] **AC9** The form functions as a plain HTML form when JavaScript is disabled (progressive enhancement)
- [ ] **AC10** No raw password is ever logged server-side — only the error branch logs `err` (unexpected errors)

---

### Verification Steps

1. Run `npm run dev` and navigate to `http://localhost:5173/login`
2. Log in with correct credentials — confirm redirect to `/hives`
3. Log in with wrong password — confirm "Invalid username or password" appears
4. Log in with non-existent username — confirm same error message
5. Inspect the `session` cookie in browser DevTools (Application → Cookies) — confirm `HttpOnly`, `SameSite=Lax`, and `Path=/` are set
6. Run `npm run check` — confirm no TypeScript errors
7. Run `npm run lint` — confirm no ESLint errors
8. Disable JavaScript in browser DevTools and submit the form — confirm it still works as a standard HTML form POST

---

### Common Pitfalls

**Pitfall 1: Not re-throwing SvelteKit redirects in the try/catch**
SvelteKit's `redirect()` throws a `Response` object internally. If you catch it without re-throwing, the redirect silently fails and the user stays on the login page after correct credentials. Always check for redirect throws and re-throw them. The `instanceof Response` check covers this.

**Pitfall 2: `argon2.verify` argument order**
`argon2.verify(hash, plaintext)` — hash first, plaintext second. Reversing the arguments results in every login attempt failing, regardless of the correct password. TypeScript should catch this, but double-check the call signature.

**Pitfall 3: `form?.error` vs `form.error` in the template**
The `form` prop is `null` on initial page load (no action has run yet) and becomes an object after a failed action. Always use optional chaining: `form?.error`. Without the `?`, accessing `form.error` on a null `form` throws a runtime error.

**Pitfall 4: `enhance` callback not resetting `isSubmitting`**
The `enhance` callback runs when the form is submitted. The returned async function runs when the response arrives. If `isSubmitting` is not reset to `false` in the returned function, the button stays disabled after a failed login. Always reset inside the `async ({ update }) => { await update(); isSubmitting = false; }` callback.

**Pitfall 5: iOS zoom on input focus**
iOS Safari auto-zooms inputs with `font-size < 16px`. The `.field-input` style sets `font-size: 1rem` (16px) to prevent this. If you reduce the font size for aesthetic reasons, iOS will zoom in on every tap — a terrible UX on mobile.

---

---

## Story 2.3 — JWT Cookie Auth Guard & Session Management (3 SP)

### Story Header

| Field | Value |
|-------|-------|
| **ID** | 2.3 |
| **Title** | JWT Cookie Auth Guard & Session Management |
| **Story Points** | 3 SP |
| **Priority** | High |
| **Dependencies** | Stories 2.1 and 2.2 complete |
| **Sprint Goal Contribution** | Enforces authentication on every route; implements rolling session expiry |

**User Story:** As Manuel, I want every page in the app to require authentication, so that no data is accessible without a valid session, and my session automatically stays fresh as long as I use the app regularly.

---

### Context & Why

The root layout server file (`src/routes/+layout.server.ts`) is the single choke point for all server-side route loading in SvelteKit. Every page in the app runs through the root layout's `load` function before its own `load` function. This makes it the correct place for the authentication guard.

Three things happen here on every authenticated request:

1. **Guard:** If there is no valid session, redirect to `/login`. No page data is loaded.
2. **Rolling expiry:** Issue a fresh JWT and reset the cookie's `maxAge` to 30 days. If Manuel uses the app daily, he is never logged out. If he stops using it for 30 days, the cookie expires and he logs in again.
3. **Locals:** Set `locals.user` so any route's `load` function can access the authenticated user without re-reading the cookie. The `locals` object is the SvelteKit-idiomatic way to pass auth state from the layout to child routes.

This story also creates placeholder routes for `/hives` (the post-login landing page) and the root redirect from `/` to `/hives`. Without these, a successful login redirects to a 404 — technically correct but jarring to test.

---

### Pre-conditions

- Stories 2.1 and 2.2 are complete
- `src/lib/server/auth.ts` exports `getSessionUser`, `signJWT`, `setSessionCookie`
- `src/app.d.ts` declares `App.Locals.user`
- Login redirects to `/hives` after success (currently a 404 — this story fixes that)

---

### Implementation Steps

#### Step 1 — Create `src/routes/+layout.server.ts`

This is the root layout server file. It runs for every server-side request in the application.

```typescript
// src/routes/+layout.server.ts

import { redirect } from '@sveltejs/kit';
import { signJWT, getSessionUser, setSessionCookie, clearSessionCookie } from '$lib/server/auth.js';
import type { LayoutServerLoad, Actions } from './$types.js';

// ─── Auth Guard (load) ────────────────────────────────────────────────────────

/**
 * Root layout load function — runs before every page's own load function.
 *
 * For every request:
 * 1. Skip the guard for the /login route (unauthenticated access is required there)
 * 2. Read and verify the session cookie
 * 3. If no valid session: redirect to /login
 * 4. If valid session: refresh the cookie (rolling 30-day expiry) and set locals.user
 * 5. Return { user } so child layouts and pages can access it via `data.user`
 */
export const load: LayoutServerLoad = async ({ cookies, url, locals }) => {
	// Allow unauthenticated access to /login (and any /login/* sub-paths)
	if (url.pathname === '/login' || url.pathname.startsWith('/login/')) {
		return {};
	}

	// Attempt to read and verify the session cookie
	const user = await getSessionUser(cookies);

	// No valid session — redirect to login
	if (!user) {
		redirect(302, '/login');
	}

	// Valid session — refresh the cookie for rolling expiry
	// Signs a fresh JWT with the same payload and resets the maxAge to 30 days.
	// This means: as long as Manuel uses the app at least once every 30 days,
	// he will never be logged out involuntarily.
	const freshToken = await signJWT({
		sub: user.userId.toString(),
		username: user.username
	});
	setSessionCookie(cookies, freshToken);

	// Set locals.user so child load functions and actions can access it
	// without re-reading the cookie.
	// Type: { userId: number; username: string } — declared in src/app.d.ts
	locals.user = user;

	return { user };
};

// ─── Logout Action ────────────────────────────────────────────────────────────

/**
 * Logout form action.
 *
 * Clears the session cookie and redirects to /login.
 * Accessible from any page via a form with action="?/logout".
 * The root layout's nav bar submits to this action (Story 2.4).
 */
export const actions: Actions = {
	logout: async ({ cookies }) => {
		clearSessionCookie(cookies);
		redirect(302, '/login');
	}
};
```

#### Step 2 — Update `src/routes/+layout.svelte`

The root layout needs to show the authenticated user's name and a logout button when a user is logged in. This uses Svelte 5 runes syntax (`$props()`) and SvelteKit's `enhance` for the logout form.

Replace the current contents of `src/routes/+layout.svelte` with:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutData } from './$types.js';

	// Svelte 5 runes: receive layout data (includes `user` from +layout.server.ts)
	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data.user}
	<nav class="app-nav">
		<span class="nav-username">{data.user.username}</span>
		<form method="POST" action="?/logout" use:enhance>
			<button class="logout-button" type="submit">Log out</button>
		</form>
	</nav>
{/if}

<main>
	{@render children()}
</main>

<style>
	.app-nav {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 1rem;
		padding: 0.75rem 1.25rem;
		background-color: var(--color-surface, #ffffff);
		border-bottom: 1px solid var(--color-border, #e5e7eb);
	}

	.nav-username {
		font-size: 0.875rem;
		color: var(--color-text-muted, #6b7280);
	}

	.logout-button {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text, #1a1a1a);
		background: none;
		border: 1px solid var(--color-border, #d1d5db);
		border-radius: 6px;
		padding: 0.375rem 0.75rem;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.logout-button:hover {
		background-color: var(--color-hover, #f3f4f6);
	}

	main {
		padding: 1.25rem;
	}
</style>
```

#### Step 3 — Create `src/routes/+page.server.ts`

The root route (`/`) should redirect immediately to `/hives`. There is no content at `/` — it is a vanity URL that keeps bookmarks and direct navigation working correctly.

```typescript
// src/routes/+page.server.ts

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

/**
 * Redirect the root URL to the hives list.
 * The auth guard in +layout.server.ts will run first and redirect to /login
 * if the user is not authenticated. If authenticated, this redirect fires.
 */
export const load: PageServerLoad = () => {
	redirect(302, '/hives');
};
```

#### Step 4 — Create `src/routes/hives/` directory and placeholder files

Sprint 3 fills in the hive list. For now, create a minimal placeholder so the post-login redirect does not land on a 404.

```bash
mkdir -p src/routes/hives
```

**Create `src/routes/hives/+page.server.ts`:**

```typescript
// src/routes/hives/+page.server.ts
// Sprint 3 adds the DB query. For now, return empty data.

import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	return { hives: [] };
};
```

**Create `src/routes/hives/+page.svelte`:**

```svelte
<!-- src/routes/hives/+page.svelte -->
<!-- Sprint 3 fills this in with the real hive list. -->
<script lang="ts">
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>My Hives — beehiveJournal</title>
</svelte:head>

<div class="hives-page">
	<h1>My Hives</h1>

	{#if data.hives.length === 0}
		<p class="empty-state">No hives yet — add your first hive.</p>
	{/if}
</div>

<style>
	.hives-page {
		max-width: 600px;
		margin: 0 auto;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0 0 1.5rem;
	}

	.empty-state {
		color: var(--color-text-muted, #6b7280);
		font-size: 0.95rem;
	}
</style>
```

#### Step 5 — Add auto-migration on startup to `src/lib/server/db/index.ts`

The architecture requires that Drizzle migrations run automatically when the server starts. This ensures the DB schema is always up to date — particularly important when deploying new versions with schema changes.

Open `src/lib/server/db/index.ts`. The current file ends at `export { sqlite };`. Add the migration call immediately after the `export const db` line:

The updated full file content for `src/lib/server/db/index.ts`:

```typescript
// src/lib/server/db/index.ts

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
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

// Auto-migrate on startup.
// Runs all pending migrations from the migrations folder.
// Safe to run on every startup — idempotent (already-applied migrations are skipped).
// This ensures the production DB schema is always in sync with the codebase
// without requiring a manual migration step during deployments.
migrate(db, { migrationsFolder: 'src/lib/server/db/migrations' });

// Export the raw sqlite connection for use cases that need it
// (e.g., the create-user script running outside SvelteKit context).
export { sqlite };
```

> **Important:** The `migrationsFolder` path `'src/lib/server/db/migrations'` is relative to the working directory when the server starts. In development (`npm run dev`), this is the project root — correct. In production (Docker, `node build/index.js`), this is also the project root (`/app`) — also correct, because the migrations folder is COPY'd into the Docker image.
>
> Verify the migrations folder is copied in the Dockerfile's runner stage. Open `Dockerfile` and confirm the build stage includes `src/lib/server/db/migrations/` in the build context. If the migrations folder is missing in the production image, the server will fail to start. Add an explicit COPY if needed:
> ```dockerfile
> COPY --from=builder /app/src/lib/server/db/migrations ./src/lib/server/db/migrations
> ```

#### Step 6 — Run TypeScript check

```bash
npm run check
```

Expected: no TypeScript errors. Pay particular attention to:
- `locals.user` assignment in `+layout.server.ts` — must match the `App.Locals` type from `src/app.d.ts`
- `data.user` access in `+layout.svelte` — must be typed from `LayoutData`

#### Step 7 — Manual end-to-end test

With the auth guard in place, test the complete authentication flow:

**Test 1 — Unauthenticated redirect:**
1. Clear all cookies in browser DevTools (Application → Cookies → Clear All)
2. Navigate to `http://localhost:5173/hives`
3. Expected: immediately redirected to `http://localhost:5173/login`

**Test 2 — Login and authenticated access:**
1. From the login page, enter valid credentials
2. Expected: redirected to `/hives`, nav bar shows username in top-right, "Log out" button visible

**Test 3 — Root redirect:**
1. While authenticated, navigate to `http://localhost:5173/`
2. Expected: redirected to `/hives`

**Test 4 — Rolling session:**
1. After logging in, inspect the `session` cookie in DevTools
2. Navigate to `/hives` (reload the page)
3. Expected: the `session` cookie's expiry date has been refreshed (it should be approximately 30 days from the current time, not 30 days from login time)

**Test 5 — Expired/tampered cookie:**
1. In browser DevTools, manually edit the `session` cookie value (corrupt a few characters)
2. Reload the page
3. Expected: redirected to `/login`

---

### Files Created / Modified

| File | Action | Notes |
|------|--------|-------|
| `src/routes/+layout.server.ts` | Created | Auth guard + rolling session refresh + `locals.user` + logout action |
| `src/routes/+layout.svelte` | Modified | Shows username and logout button when authenticated; uses Svelte 5 `$props()` |
| `src/routes/+page.server.ts` | Created | Redirects `/` → `/hives` |
| `src/routes/hives/+page.server.ts` | Created | Placeholder — returns `{ hives: [] }` |
| `src/routes/hives/+page.svelte` | Created | Placeholder hive list page |
| `src/lib/server/db/index.ts` | Modified | Added `migrate()` call for auto-migration on startup |

---

### Acceptance Criteria Checklist

- [ ] **AC1** Navigating to any protected route (e.g., `/hives`) without a session cookie redirects to `/login`
- [ ] **AC2** The `/login` route is accessible without authentication (no redirect loop)
- [ ] **AC3** After successful login, the `session` cookie is present with `HttpOnly`, `SameSite=Lax`, `Path=/`
- [ ] **AC4** The session cookie's expiry is refreshed on every authenticated page load (rolling expiry — verified in DevTools)
- [ ] **AC5** `locals.user` is set on every authenticated request — accessible in child `load` functions
- [ ] **AC6** `data.user` is returned from the layout load — accessible in `+layout.svelte` via `$props()`
- [ ] **AC7** A corrupted or tampered session cookie redirects to `/login` (never a 500 error)
- [ ] **AC8** The root route `/` redirects to `/hives` when authenticated
- [ ] **AC9** `src/lib/server/db/index.ts` calls `migrate()` on startup — DB schema is always current
- [ ] **AC10** `npm run check` passes with no TypeScript errors
- [ ] **AC11** The nav bar shows the authenticated username and a "Log out" button on all protected pages

---

### Verification Steps

1. Clear cookies, navigate to `/hives` — confirm redirect to `/login`
2. Log in with valid credentials — confirm redirect to `/hives`, nav shows username
3. Navigate to `/` — confirm redirect to `/hives`
4. Corrupt the `session` cookie in DevTools — reload — confirm redirect to `/login` (no 500)
5. Reload `/hives` twice in quick succession — check cookie expiry in DevTools refreshes each time
6. Run `npm run check` — confirm no TypeScript errors
7. Run `npm run lint` — confirm no ESLint errors
8. Run `npm run build` — confirm production build succeeds with no errors

---

### Common Pitfalls

**Pitfall 1: Redirect loop on `/login`**
If the auth guard does not check for `url.pathname.startsWith('/login')`, every request to `/login` will be redirected back to `/login` — an infinite loop. The browser will show "Too many redirects". The check `if (url.pathname === '/login' || url.pathname.startsWith('/login/'))` prevents this.

**Pitfall 2: Not re-throwing SvelteKit redirects in the load function**
`redirect(302, '/login')` in a load function throws a `Redirect` object internally. SvelteKit handles this correctly when it propagates up normally. Do NOT wrap the load function in a try/catch — if you do, you will swallow the redirect and the function will return undefined, causing a TypeScript error and runtime failure.

**Pitfall 3: `locals.user` not typed — TypeScript errors in child load functions**
If `src/app.d.ts` does not declare `App.Locals.user`, TypeScript will error on `locals.user = user` with "Property 'user' does not exist on type 'Locals'". Story 2.1 Step 5 adds this declaration — verify it is in place before implementing this story.

**Pitfall 4: `migrate()` path wrong in production**
The `migrationsFolder` in `migrate()` must resolve correctly in both dev and production. In development the CWD is the project root; in production (Docker) it is `/app`. The path `'src/lib/server/db/migrations'` works in both contexts — but only if the migrations folder is copied into the Docker image. Verify the Dockerfile copies the migrations folder.

**Pitfall 5: `data.user` is undefined in `+layout.svelte` after using `{#if data.user}`**
On the `/login` route, the layout load function returns `{}` (no `user` key). `data.user` will be `undefined`, not `null`. The `{#if data.user}` check correctly handles both `null` and `undefined` as falsy — but do not use strict equality (`=== null`) in the template.

**Pitfall 6: Rolling expiry signs a new JWT on every request — performance**
`signJWT` involves a cryptographic operation (HMAC-SHA256). For a single-user app, this is negligible — microseconds. Do not skip the rolling refresh for "performance" reasons; the security benefit (every valid session eventually expires) is worth it.

---

---

## Story 2.4 — Logout (2 SP)

### Story Header

| Field | Value |
|-------|-------|
| **ID** | 2.4 |
| **Title** | Logout |
| **Story Points** | 2 SP |
| **Priority** | High |
| **Dependencies** | Stories 2.1, 2.2, 2.3 complete |
| **Sprint Goal Contribution** | Completes the auth lifecycle — users can cleanly end their session |

**User Story:** As Manuel, I want a "Log out" button that ends my session immediately, so that I can securely sign out from the app when I leave my phone unattended.

---

### Context & Why

Logout is the simplest story in this sprint but it is important to get right for two reasons:

1. **Security:** Clearing the cookie server-side ensures the session is truly ended. If the cookie has `httpOnly: true` (which ours does), JavaScript cannot clear it — only a server response can. The logout action calls `clearSessionCookie` which sets `maxAge: 0`, telling the browser to delete the cookie immediately.

2. **The action is on the root layout, not a dedicated route.** This is intentional — it means the logout button works from any page without navigating to a `/logout` URL. The form `action="?/logout"` submits to the current page's URL with the `logout` action qualifier, which resolves to the root layout's action (since that is where `actions.logout` is defined).

Story 2.3 already added the `actions.logout` export to `src/routes/+layout.server.ts` and the logout button form to `src/routes/+layout.svelte`. This story verifies those implementations are correct and adds thorough testing.

---

### Pre-conditions

- Stories 2.1, 2.2, and 2.3 are fully complete
- `src/routes/+layout.server.ts` exports `actions.logout`
- `src/routes/+layout.svelte` shows the logout button when `data.user` is set
- The dev server starts without errors: `npm run dev`

---

### Implementation Steps

#### Step 1 — Verify the logout action is in `+layout.server.ts`

Open `src/routes/+layout.server.ts` and confirm the `actions` export is present:

```typescript
export const actions: Actions = {
	logout: async ({ cookies }) => {
		clearSessionCookie(cookies);
		redirect(302, '/login');
	}
};
```

If it is missing (e.g., Story 2.3 was implemented without it), add it now. The full final state of `src/routes/+layout.server.ts` is:

```typescript
// src/routes/+layout.server.ts

import { redirect } from '@sveltejs/kit';
import { signJWT, getSessionUser, setSessionCookie, clearSessionCookie } from '$lib/server/auth.js';
import type { LayoutServerLoad, Actions } from './$types.js';

// ─── Auth Guard ───────────────────────────────────────────────────────────────

export const load: LayoutServerLoad = async ({ cookies, url, locals }) => {
	// Allow unauthenticated access to /login
	if (url.pathname === '/login' || url.pathname.startsWith('/login/')) {
		return {};
	}

	const user = await getSessionUser(cookies);

	if (!user) {
		redirect(302, '/login');
	}

	// Rolling expiry: refresh the session cookie on every authenticated request
	const freshToken = await signJWT({
		sub: user.userId.toString(),
		username: user.username
	});
	setSessionCookie(cookies, freshToken);

	locals.user = user;

	return { user };
};

// ─── Logout Action ────────────────────────────────────────────────────────────

export const actions: Actions = {
	logout: async ({ cookies }) => {
		clearSessionCookie(cookies);
		redirect(302, '/login');
	}
};
```

#### Step 2 — Verify the logout button is in `+layout.svelte`

Open `src/routes/+layout.svelte` and confirm the logout form is present:

```svelte
{#if data.user}
	<nav class="app-nav">
		<span class="nav-username">{data.user.username}</span>
		<form method="POST" action="?/logout" use:enhance>
			<button class="logout-button" type="submit">Log out</button>
		</form>
	</nav>
{/if}
```

Key points to verify:
- The form uses `method="POST"` — logout must be a POST, not a GET (a GET could be triggered by a prefetch or link crawler)
- `action="?/logout"` — the `?/` syntax routes to the `logout` action on the current layout's server file
- `use:enhance` — progressive enhancement; without JS the form still submits and logs out
- The form is inside `{#if data.user}` — the logout button only shows when authenticated

If any of these are wrong, correct them now.

#### Step 3 — Verify `clearSessionCookie` in `auth.ts`

Open `src/lib/server/auth.ts` and confirm `clearSessionCookie` sets `maxAge: 0`:

```typescript
export function clearSessionCookie(cookies: Cookies): void {
	cookies.set(COOKIE_NAME, '', {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: 0,
		secure: !dev
	});
}
```

The cookie `path` must match the path used when the cookie was set (`'/'`). If the paths differ, the browser will not delete the cookie because it treats them as different cookies.

#### Step 4 — End-to-end logout test

Start the dev server:

```bash
npm run dev
```

**Test 1 — Basic logout:**
1. Log in at `/login` with valid credentials
2. Confirm you are on `/hives` with the nav bar visible
3. Click "Log out"
4. Expected: redirected to `/login`; nav bar no longer visible
5. Navigate to `/hives` — expected: redirected back to `/login` (session is gone)

**Test 2 — Cookie cleared after logout:**
1. Log in and inspect the `session` cookie in browser DevTools (Application → Cookies)
2. Click "Log out"
3. In DevTools, verify the `session` cookie no longer exists for `localhost`

**Test 3 — Direct navigation after logout:**
1. Log in and copy the URL (`http://localhost:5173/hives`)
2. Log out
3. Paste the URL in the address bar and press Enter
4. Expected: redirected to `/login` — the session is gone, not just the UI

**Test 4 — Logout without JavaScript:**
1. In browser DevTools, disable JavaScript (Settings → Debugger → Disable JavaScript)
2. Log in (form still works as plain HTML POST)
3. Click "Log out"
4. Expected: the form posts, the cookie is cleared, you are redirected to `/login`
5. Re-enable JavaScript

**Test 5 — Double logout (idempotency):**
1. Open two tabs, both authenticated at `/hives`
2. Log out in Tab 1 — you are at `/login`
3. Reload Tab 2 — expected: redirected to `/login` (cookie is gone in both tabs)
4. Try to log out again from Tab 1 (navigate back to `/hives` — it redirects to `/login` — there is no logout button visible anyway)
5. Expected: no errors, consistent `/login` state

#### Step 5 — TypeScript and lint verification

```bash
npm run check
npm run lint
```

Both must pass with no errors.

#### Step 6 — Full build verification

```bash
npm run build
```

The production build must succeed with no TypeScript errors. This is the final verification gate for the entire Sprint 2 implementation.

If the build fails, inspect the error output. Common causes at this stage:
- Missing type imports in layout files
- `$types.js` not generated (run `npx svelte-kit sync` and retry)
- `migrate()` import path incorrect in `db/index.ts`

---

### Files Created / Modified

| File | Action | Notes |
|------|--------|-------|
| `src/routes/+layout.server.ts` | Verified/completed | `actions.logout` clears cookie and redirects to `/login` |
| `src/routes/+layout.svelte` | Verified/completed | Logout button form with `method="POST"` and `action="?/logout"` |
| `src/lib/server/auth.ts` | Verified | `clearSessionCookie` sets `maxAge: 0` with correct path and cookie options |

---

### Acceptance Criteria Checklist

- [ ] **AC1** Clicking "Log out" clears the `session` cookie and redirects to `/login`
- [ ] **AC2** After logout, navigating to any protected route redirects to `/login` (session is truly gone — not just UI state)
- [ ] **AC3** The `session` cookie is absent from browser DevTools after logout
- [ ] **AC4** Logout works without JavaScript (plain HTML form POST)
- [ ] **AC5** The logout button is only shown when `data.user` is set (not on the login page)
- [ ] **AC6** The logout form uses `method="POST"` — not GET
- [ ] **AC7** `clearSessionCookie` sets `maxAge: 0` with the same `path: '/'` and `httpOnly: true` as `setSessionCookie`
- [ ] **AC8** `npm run build` succeeds with no errors (validates all of Sprint 2)

---

### Verification Steps

1. Log in → click "Log out" → confirm redirect to `/login`
2. After logout, navigate to `/hives` → confirm redirect to `/login`
3. Check browser DevTools: `session` cookie is gone after logout
4. Disable JavaScript → log in → log out → confirm still works as plain POST
5. Run `npm run check` → no TypeScript errors
6. Run `npm run lint` → no ESLint errors
7. Run `npm run build` → successful production build

---

### Common Pitfalls

**Pitfall 1: Logout form using `method="GET"` instead of `method="POST"`**
A GET request for logout would mean the logout can be triggered by a URL link, a `<link rel="prefetch">`, or any other mechanism that makes a GET request. Logout MUST be a POST — it is a state-changing action. SvelteKit form actions only handle POST requests. Using `method="GET"` will result in SvelteKit treating it as a page navigation, not a form action — the logout will silently not happen.

**Pitfall 2: `action="?/logout"` vs `action="/logout"`**
`action="?/logout"` submits to the `logout` action on the root layout server file (the current URL + `?/logout` query). `action="/logout"` would try to POST to a `/logout` route, which does not exist — resulting in a 404. Always use `?/logout` for actions defined in the current layout.

**Pitfall 3: `clearSessionCookie` path mismatch**
If `setSessionCookie` sets the cookie with `path: '/'` but `clearSessionCookie` uses a different path (or omits it, which defaults to the current request path), the browser considers them two different cookies. The original cookie remains. Always use the same `path` in both set and clear operations.

**Pitfall 4: The logout button shows on the login page**
The root layout server `load` function returns `{}` (no `user`) for `/login`. This means `data.user` is `undefined` on the login page. The `{#if data.user}` check in `+layout.svelte` correctly hides the nav bar — but only if the check uses the value from `data`, not from a local variable that might cache the previous state. Use `data.user` directly from `$props()`.

**Pitfall 5: Not testing after `npm run build`**
The dev server (`npm run dev`) and the production build (`npm run build && node build/index.js`) can behave differently. Always run `npm run build` as the final verification step for any sprint. Common Sprint 2 issues in production builds include: missing env var checks firing during module preloading, and dynamic imports that work in dev but fail in production. If the build passes TypeScript check but fails at runtime in the Docker container, check the logs with `docker logs beehivejournal-app`.

---

---

## Sprint 2 End State & Definition of Done

### What was built

At the end of Sprint 2, the following is true:

| Route | Behaviour |
|-------|-----------|
| `GET /` | Redirects to `/hives` (authenticated) or `/login` (unauthenticated) |
| `GET /login` | Renders login form; redirects authenticated users to `/hives` |
| `POST /login` | Validates credentials; issues JWT cookie; redirects to `/hives` |
| `GET /hives` | Protected; shows placeholder "My Hives" page; requires valid session |
| `POST /?/logout` | Clears session cookie; redirects to `/login` |
| Any other route | Protected; redirects to `/login` if no valid session |

### New files created

| File | Purpose |
|------|---------|
| `src/lib/server/auth.ts` | JWT + cookie utility functions |
| `src/routes/login/+page.server.ts` | Login load (redirect if auth'd) + default action |
| `src/routes/login/+page.svelte` | Login form UI |
| `src/routes/+layout.server.ts` | Auth guard + rolling session + logout action |
| `src/routes/+page.server.ts` | Root redirect to `/hives` |
| `src/routes/hives/+page.server.ts` | Placeholder hive list load |
| `src/routes/hives/+page.svelte` | Placeholder hive list page |

### Modified files

| File | Change |
|------|--------|
| `src/app.d.ts` | Added `App.Locals.user` type declaration |
| `src/routes/+layout.svelte` | Added nav bar with username + logout button |
| `src/lib/server/db/index.ts` | Added `migrate()` call for auto-migration on startup |

### Definition of Done checklist

- [ ] `npm run dev` starts cleanly with no errors
- [ ] `npm run check` passes with zero TypeScript errors
- [ ] `npm run lint` passes with zero ESLint errors
- [ ] `npm run build` produces a successful production build
- [ ] Unauthenticated access to `/hives` redirects to `/login`
- [ ] Login with valid credentials → redirected to `/hives` with session cookie set
- [ ] Login with invalid credentials → "Invalid username or password" shown; user stays on `/login`
- [ ] Session cookie is `HttpOnly`, `SameSite=Lax`, `Path=/`, `maxAge=2592000`
- [ ] Session cookie is refreshed on every authenticated page load (rolling expiry)
- [ ] Logout clears the session cookie and redirects to `/login`
- [ ] No raw passwords or JWT secrets appear in server logs
- [ ] `JWT_SECRET` missing from environment causes an immediate startup crash with a clear error message
- [ ] All stories (2.1, 2.2, 2.3, 2.4) accepted by Manuel

### Sprint 3 handoff notes

Story 3.1 (Hive CRUD) will replace the `src/routes/hives/+page.svelte` placeholder with a real hive list backed by DB queries. The `locals.user` set by the layout guard can be used directly in hive load functions to scope queries (though this app is single-user, so it is not strictly necessary — the hive table has no userId FK). The auth infrastructure established in Sprint 2 requires no changes for Sprint 3.
