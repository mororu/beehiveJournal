// src/routes/harvests/+page.server.ts

import { error, redirect } from '@sveltejs/kit';
import {
	getHarvestEntries,
	getHarvestById,
	deleteHarvestEntry,
} from '$lib/server/db/queries/honeyHarvests.js';
import { getActiveHives } from '$lib/server/db/queries/hives.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = ({ url }) => {
	const hiveIdParam = url.searchParams.get('hiveId');
	let hiveId: number | undefined;

	if (hiveIdParam) {
		hiveId = parseInt(hiveIdParam, 10);
		if (isNaN(hiveId)) error(400, 'Invalid hiveId filter');
	}

	const harvests = getHarvestEntries({ hiveId });
	const hives = getActiveHives();

	return { harvests, hives, activeHiveFilter: hiveId ?? null };
};

export const actions: Actions = {
	delete: async ({ request, url }) => {
		const data = await request.formData();
		const idRaw = data.get('harvestId') as string | null;
		const id = idRaw ? parseInt(idRaw, 10) : NaN;

		if (isNaN(id)) error(400, 'Invalid harvest ID');

		const harvest = getHarvestById(id);
		if (!harvest) error(404, 'Ernte nicht gefunden');

		deleteHarvestEntry(id);

		const hiveIdParam = url.searchParams.get('hiveId');
		const activeHiveFilter = hiveIdParam ? parseInt(hiveIdParam, 10) : null;
		redirect(
			302,
			activeHiveFilter && !isNaN(activeHiveFilter)
				? `/harvests?hiveId=${activeHiveFilter}`
				: '/harvests'
		);
	},
};
