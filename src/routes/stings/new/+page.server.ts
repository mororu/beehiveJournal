// src/routes/stings/new/+page.server.ts

import { fail, redirect } from '@sveltejs/kit';
import { getActiveHives, getArchivedHives } from '$lib/server/db/queries/hives.js';
import { createStingIncident } from '$lib/server/db/queries/stings.js';
import { fromDatetimeLocal } from '$lib/client/utils/date.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	// Provide all hives (active + archived) for the optional hive dropdown
	const activeHives = getActiveHives();
	const archivedHives = getArchivedHives();
	return { activeHives, archivedHives };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		const bodyLocation = (data.get('bodyLocation') as string | null)?.trim() ?? '';
		const stungAtRaw = (data.get('stungAt') as string | null)?.trim() ?? '';
		const hiveIdRaw = (data.get('hiveId') as string | null)?.trim() ?? '';
		const notes = (data.get('notes') as string | null)?.trim() || null;
		const clientId = (data.get('clientId') as string | null) || null;

		if (!bodyLocation) {
			return fail(400, {
				error: 'Body location is required',
				bodyLocation,
				hiveIdRaw,
				notes: notes ?? '',
			});
		}

		const stungAt = stungAtRaw ? fromDatetimeLocal(stungAtRaw) : Math.floor(Date.now() / 1000);

		let hiveId: number | null = null;
		if (hiveIdRaw !== '') {
			hiveId = parseInt(hiveIdRaw, 10);
			if (isNaN(hiveId)) {
				return fail(400, {
					error: 'Invalid hive selection',
					bodyLocation,
					hiveIdRaw,
					notes: notes ?? '',
				});
			}
		}

		createStingIncident({ stungAt, bodyLocation, hiveId, notes, clientId });

		redirect(302, '/stings');
	},
};
