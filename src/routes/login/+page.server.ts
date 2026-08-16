// src/routes/login/+page.server.ts

import { fail, redirect } from '@sveltejs/kit';
import { getUserByUsername } from '$lib/server/db/queries/users.js';
import { verifyPassword } from '$lib/server/password.js';
import { signJWT, setSessionCookie, getSessionUser } from '$lib/server/auth.js';
import type { Actions, PageServerLoad } from './$types.js';

// ─── Load ─────────────────────────────────────────────────────────────────────

/**
 * Redirect already-authenticated users away from the login page.
 * If the user already has a valid session cookie, visiting /login is redundant.
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
	 * On failure: returns a generic error — never reveals which field was wrong.
	 */
	default: async ({ request, cookies }) => {
		let username: string;
		let password: string;

		try {
			const data = await request.formData();
			username = (data.get('username') as string | null)?.trim() ?? '';
			password = (data.get('password') as string | null) ?? '';
		} catch {
			return fail(400, { error: 'Ungültige Formularübermittlung' });
		}

		// Basic presence validation — do not reveal which field is missing
		if (!username || !password) {
			return fail(400, { error: 'Ungültiger Benutzername oder Passwort' });
		}

		try {
			// Query the users table for the given username
			const user = getUserByUsername(username);

			// User not found — return the same generic error as wrong password
			// This prevents username enumeration
			if (!user) {
				return fail(400, { error: 'Ungültiger Benutzername oder Passwort' });
			}

			// Verify password using argon2 — CPU-intensive by design
			const passwordValid = await verifyPassword(user.passwordHash, password);

			if (!passwordValid) {
				return fail(400, { error: 'Ungültiger Benutzername oder Passwort' });
			}

			// Credentials valid — sign a JWT and set the session cookie
			const token = await signJWT({
				sub: user.id.toString(),
				username: user.username,
			});

			setSessionCookie(cookies, token);

			// Redirect to the main app — throws internally (SvelteKit design)
			redirect(302, '/hives');
		} catch (err) {
			// Re-throw SvelteKit redirects — they must not be caught here
			if (
				err instanceof Response ||
				(typeof err === 'object' &&
					err !== null &&
					'status' in err &&
					(err as { status: number }).status === 302)
			) {
				throw err;
			}

			// Log unexpected errors server-side only — never expose internals to the client
			console.error('[login] Unexpected error:', err);
			return fail(500, { error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.' });
		}
	},
};
