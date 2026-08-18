// src/routes/honey/+page.server.ts
//
// Landing hub for honey-related pages. No data to load — auth guard is handled
// by the root layout, which redirects unauthenticated visitors to /login.

import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	return {};
};
