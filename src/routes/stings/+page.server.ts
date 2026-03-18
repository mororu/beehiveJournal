// src/routes/stings/+page.server.ts

import { error, redirect } from '@sveltejs/kit';
import {
	getStingIncidents,
	getStingById,
	getHivesWithStings,
	deleteStingIncident,
} from '$lib/server/db/queries/stings.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = ({ url }) => {
	const hiveIdParam = url.searchParams.get('hiveId');
	let hiveId: number | undefined;

	if (hiveIdParam) {
		hiveId = parseInt(hiveIdParam, 10);
		if (isNaN(hiveId)) error(400, 'Invalid hiveId filter');
	}

	const stings = getStingIncidents({ hiveId });
	const hivesWithStings = getHivesWithStings();

	return { stings, hivesWithStings, activeHiveFilter: hiveId ?? null };
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const data = await request.formData();
		const idRaw = data.get('stingId') as string | null;
		const id = idRaw ? parseInt(idRaw, 10) : NaN;

		if (isNaN(id)) error(400, 'Invalid sting ID');

		const sting = getStingById(id);
		if (!sting) error(404, 'Sting incident not found');

		deleteStingIncident(id);
		redirect(302, '/stings');
	},
};
