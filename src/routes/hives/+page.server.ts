// src/routes/hives/+page.server.ts

import { getActiveHives, getArchivedHives } from '$lib/server/db/queries/hives.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	const activeHives = getActiveHives();
	const archivedHives = getArchivedHives();
	return { activeHives, archivedHives };
};
