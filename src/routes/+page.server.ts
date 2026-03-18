// src/routes/+page.server.ts
// Redirect the root URL to the hives list.
// The auth guard in +layout.server.ts redirects to /login if unauthenticated.

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	redirect(302, '/hives');
};
