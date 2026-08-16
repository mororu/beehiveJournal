// src/routes/harvests/+page.server.ts

import { error, redirect } from '@sveltejs/kit';
import {
	getHarvestEntries,
	getHarvestById,
	deleteHarvestEntry,
} from '$lib/server/db/queries/honeyHarvests.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	return { harvests: getHarvestEntries() };
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const data = await request.formData();
		const idRaw = data.get('harvestId') as string | null;
		const id = idRaw ? parseInt(idRaw, 10) : NaN;

		if (isNaN(id)) error(400, 'Invalid harvest ID');

		const harvest = getHarvestById(id);
		if (!harvest) error(404, 'Ernte nicht gefunden');

		deleteHarvestEntry(id);

		redirect(302, '/harvests');
	},
};
