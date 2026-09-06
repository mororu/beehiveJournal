// src/routes/stats/+page.server.ts
//
// Landing hub for the statistics pages. No data to load — auth guard is handled
// by the root layout, which redirects unauthenticated visitors to /login.

import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	return {};
};
