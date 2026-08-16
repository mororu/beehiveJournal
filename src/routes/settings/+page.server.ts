// src/routes/settings/+page.server.ts

import { fail, redirect } from '@sveltejs/kit';
import { getUserById, updateUserPassword } from '$lib/server/db/queries/users.js';
import { getSessionUser } from '$lib/server/auth.js';
import { hashPassword, verifyPassword, validatePassword } from '$lib/server/password.js';
import type { Actions, PageServerLoad } from './$types.js';

// Note: we read the session from the cookie directly rather than relying on
// `locals.user`. The root layout guard sets `locals.user`, but layout and page
// load functions run in parallel, and form actions run before any load at all —
// so `locals.user` is not reliably populated here.

export const load: PageServerLoad = async ({ cookies }) => {
	const session = await getSessionUser(cookies);
	if (!session) redirect(302, '/login');

	return { username: session.username };
};

export const actions: Actions = {
	/**
	 * Changes the password of the currently logged-in user.
	 *
	 * Requires the current password — this prevents someone with access to an
	 * unlocked, already-logged-in device from silently taking over the account.
	 */
	changePassword: async ({ request, cookies }) => {
		const session = await getSessionUser(cookies);
		if (!session) redirect(302, '/login');

		const data = await request.formData();
		const currentPassword = (data.get('currentPassword') as string | null) ?? '';
		const newPassword = (data.get('newPassword') as string | null) ?? '';
		const confirmPassword = (data.get('confirmPassword') as string | null) ?? '';

		if (!currentPassword) {
			return fail(400, { error: 'Bitte aktuelles Passwort eingeben' });
		}

		// Validate the new password against the policy
		const policyError = validatePassword(newPassword);
		if (policyError) {
			return fail(400, { error: policyError });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { error: 'Die neuen Passwörter stimmen nicht überein' });
		}

		if (newPassword === currentPassword) {
			return fail(400, { error: 'Das neue Passwort muss sich vom aktuellen unterscheiden' });
		}

		const user = getUserById(session.userId);
		if (!user) {
			return fail(400, { error: 'Benutzer nicht gefunden' });
		}

		// Verify the current password before allowing the change
		const currentValid = await verifyPassword(user.passwordHash, currentPassword);
		if (!currentValid) {
			return fail(400, { error: 'Aktuelles Passwort ist falsch' });
		}

		try {
			const newHash = await hashPassword(newPassword);
			updateUserPassword(session.userId, newHash);
		} catch (err) {
			console.error('[settings] Failed to change password:', err);
			return fail(500, { error: 'Passwort konnte nicht geändert werden' });
		}

		// The JWT does not embed the password, so the current session stays valid.
		return { success: true };
	},
};
