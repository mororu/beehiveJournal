// src/routes/+layout.server.ts

import { redirect } from '@sveltejs/kit';
import { signJWT, getSessionUser, setSessionCookie } from '$lib/server/auth.js';
import type { LayoutServerLoad } from './$types.js';

// ─── Auth Guard ───────────────────────────────────────────────────────────────

/**
 * Root layout load function — runs before every page's own load function.
 *
 * For every request:
 * 1. Skip the guard for /login (unauthenticated access is required there)
 * 2. Read and verify the session cookie
 * 3. If no valid session: redirect to /login
 * 4. If valid session: refresh the cookie (rolling 30-day expiry) and set locals.user
 * 5. Return { user } so child layouts and pages can access it via `data.user`
 */
export const load: LayoutServerLoad = async ({ cookies, url, locals }) => {
	// Allow unauthenticated access to /login (and any /login/* sub-paths).
	// Also skip the guard for /logout — it handles its own cookie clearing.
	if (
		url.pathname === '/login' ||
		url.pathname.startsWith('/login/') ||
		url.pathname === '/logout'
	) {
		return {};
	}

	// Attempt to read and verify the session cookie
	const user = await getSessionUser(cookies);

	// No valid session — redirect to login
	if (!user) {
		redirect(302, '/login');
	}

	// Valid session — refresh the cookie for rolling 30-day expiry.
	// As long as Manuel uses the app at least once every 30 days,
	// he will never be logged out involuntarily.
	const freshToken = await signJWT({
		sub: user.userId.toString(),
		username: user.username,
	});
	setSessionCookie(cookies, freshToken);

	// Set locals.user so child load functions can access the authenticated user
	// without re-reading the cookie.
	locals.user = user;

	return { user };
};
