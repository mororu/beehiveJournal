// src/routes/hives/[hiveId]/+page.server.ts
// Hive detail page — Sprint 6 fills in inspection history + chart.
// For now: load the hive, verify it exists, return basic data.

import { error } from '@sveltejs/kit';
import { getHiveById } from '$lib/server/db/queries/hives.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = ({ params }) => {
	const id = parseInt(params.hiveId, 10);
	if (isNaN(id)) error(404, 'Hive not found');

	const hive = getHiveById(id);
	if (!hive) error(404, 'Hive not found');

	return { hive };
};
