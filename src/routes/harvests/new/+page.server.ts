// src/routes/harvests/new/+page.server.ts

import { fail, redirect } from '@sveltejs/kit';
import { getActiveHives } from '$lib/server/db/queries/hives.js';
import { createHarvestEntry } from '$lib/server/db/queries/honeyHarvests.js';
import { fromDatetimeLocal } from '$lib/client/utils/date.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	return { hives: getActiveHives() };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const hiveIdRaw = (data.get('hiveId') as string | null)?.trim() ?? '';
		const harvestedAtRaw = (data.get('harvestedAt') as string | null)?.trim() ?? '';
		const amountKgRaw = (data.get('amountKg') as string | null)?.trim() ?? '';
		const notes = (data.get('notes') as string | null)?.trim() || null;
		const clientId = (data.get('clientId') as string | null) || null;

		if (!hiveIdRaw) {
			return fail(400, {
				error: 'Bitte einen Bienenstock auswählen',
				hiveIdRaw,
				amountKgRaw,
				notes: notes ?? '',
			});
		}
		const hiveId = parseInt(hiveIdRaw, 10);
		if (isNaN(hiveId)) {
			return fail(400, {
				error: 'Ungültige Bienenstock-Auswahl',
				hiveIdRaw,
				amountKgRaw,
				notes: notes ?? '',
			});
		}

		if (!amountKgRaw) {
			return fail(400, {
				error: 'Ungültige Menge (0.1–9999 kg)',
				hiveIdRaw,
				amountKgRaw,
				notes: notes ?? '',
			});
		}
		const amountKg = parseFloat(amountKgRaw);
		if (isNaN(amountKg) || amountKg <= 0 || amountKg > 9999) {
			return fail(400, {
				error: 'Ungültige Menge (0.1–9999 kg)',
				hiveIdRaw,
				amountKgRaw,
				notes: notes ?? '',
			});
		}

		const harvestedAt = harvestedAtRaw
			? fromDatetimeLocal(harvestedAtRaw)
			: Math.floor(Date.now() / 1000);

		createHarvestEntry({ hiveId, harvestedAt, amountKg, notes, clientId });
		redirect(302, '/harvests');
	},
};
