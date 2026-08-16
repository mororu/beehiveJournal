// src/routes/harvests/new/+page.server.ts

import { fail, redirect } from '@sveltejs/kit';
import { createHarvestEntry } from '$lib/server/db/queries/honeyHarvests.js';
import { fromDateInput, formatLot } from '$lib/client/utils/date.js';
import type { Actions } from './$types.js';

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const harvestedAtRaw = (data.get('harvestedAt') as string | null)?.trim() ?? '';
		const amountKgRaw = (data.get('amountKg') as string | null)?.trim() ?? '';
		const notes = (data.get('notes') as string | null)?.trim() || null;
		const clientId = (data.get('clientId') as string | null) || null;

		if (notes !== null && notes.length > 2000) {
			return fail(400, {
				error: 'Notizen dürfen höchstens 2000 Zeichen enthalten',
				amountKgRaw: '',
				notes: notes.slice(0, 2000),
			});
		}

		if (!amountKgRaw) {
			return fail(400, { error: 'Ungültige Menge (0.1–9999 kg)', amountKgRaw, notes: notes ?? '' });
		}
		const amountKg = parseFloat(amountKgRaw);
		if (isNaN(amountKg) || amountKg <= 0 || amountKg > 9999) {
			return fail(400, { error: 'Ungültige Menge (0.1–9999 kg)', amountKgRaw, notes: notes ?? '' });
		}

		let harvestedAt: number;
		if (harvestedAtRaw) {
			harvestedAt = fromDateInput(harvestedAtRaw);
			if (isNaN(harvestedAt)) {
				return fail(400, { error: 'Ungültiges Erntedatum', amountKgRaw, notes: notes ?? '' });
			}
		} else {
			// Fallback = today at local noon (matches fromDateInput's DST-safe anchor)
			const d = new Date();
			d.setHours(12, 0, 0, 0);
			harvestedAt = Math.floor(d.getTime() / 1000);
		}

		const lot = formatLot(harvestedAt);
		createHarvestEntry({ harvestedAt, amountKg, lot, notes, clientId });
		redirect(302, '/harvests');
	},
};
