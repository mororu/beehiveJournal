// src/routes/hives/[hiveId]/harvests/new/+page.server.ts

import { error, fail, redirect } from '@sveltejs/kit';
import { getHiveById } from '$lib/server/db/queries/hives.js';
import { createHarvestEntry } from '$lib/server/db/queries/honeyHarvests.js';
import { fromDatetimeLocal } from '$lib/client/utils/date.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = ({ params }) => {
	const id = parseInt(params.hiveId, 10);
	if (isNaN(id)) error(404, 'Bienenstock nicht gefunden');
	const hive = getHiveById(id);
	if (!hive) error(404, 'Bienenstock nicht gefunden');
	return { hive };
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const id = parseInt(params.hiveId, 10);
		if (isNaN(id)) error(404, 'Bienenstock nicht gefunden');

		const data = await request.formData();
		const harvestedAtRaw = (data.get('harvestedAt') as string | null)?.trim() ?? '';
		const amountKgRaw = (data.get('amountKg') as string | null)?.trim() ?? '';
		const notes = (data.get('notes') as string | null)?.trim() || null;
		const clientId = (data.get('clientId') as string | null) || null;

		if (!amountKgRaw) {
			return fail(400, { error: 'Ungültige Menge (0.1–9999 kg)', amountKgRaw, notes: notes ?? '' });
		}

		const amountKg = parseFloat(amountKgRaw);
		if (isNaN(amountKg) || amountKg <= 0 || amountKg > 9999) {
			return fail(400, { error: 'Ungültige Menge (0.1–9999 kg)', amountKgRaw, notes: notes ?? '' });
		}

		const harvestedAt = harvestedAtRaw
			? fromDatetimeLocal(harvestedAtRaw)
			: Math.floor(Date.now() / 1000);

		createHarvestEntry({ hiveId: id, harvestedAt, amountKg, notes, clientId });
		redirect(302, '/harvests');
	},
};
