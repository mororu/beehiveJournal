// src/routes/hives/[hiveId]/+page.server.ts

import { error } from '@sveltejs/kit';
import { getHiveById } from '$lib/server/db/queries/hives.js';
import { getInspectionsByHiveId } from '$lib/server/db/queries/inspections.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = ({ params, url }) => {
	const id = parseInt(params.hiveId, 10);
	if (isNaN(id)) error(404, 'Hive not found');

	const hive = getHiveById(id);
	if (!hive) error(404, 'Hive not found');

	const inspections = getInspectionsByHiveId(id);

	// ?saved=1 is appended by the inspect form redirect on success (Story 4.5 toast)
	const justSaved = url.searchParams.get('saved') === '1';

	return { hive, inspections, justSaved };
};
