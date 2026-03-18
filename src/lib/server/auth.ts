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
			algorithms: ['HS256'],
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
		secure: !dev,
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
		secure: !dev,
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
