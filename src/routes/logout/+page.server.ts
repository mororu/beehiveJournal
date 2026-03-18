// src/routes/logout/+page.server.ts
//
// Logout action. Clears the session cookie and redirects to /login.
// The nav bar submits a POST form to /logout to trigger this action.
// Using a dedicated route (rather than ?/logout on the root layout) because
// SvelteKit only allows `actions` exports in +page.server.ts, not +layout.server.ts.

import { redirect } from '@sveltejs/kit';
import { clearSessionCookie } from '$lib/server/auth.js';
import type { Actions } from './$types.js';

export const actions: Actions = {
	default: async ({ cookies }) => {
		clearSessionCookie(cookies);
		redirect(302, '/login');
	},
};
