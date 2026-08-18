// src/routes/sells/+page.server.ts

import { error, redirect } from '@sveltejs/kit';
import {
	deleteHoneySale,
	getHoneySaleById,
	getHoneySales,
} from '$lib/server/db/queries/honeySales.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	return { sales: getHoneySales() };
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const data = await request.formData();
		const idRaw = data.get('sellId') as string | null;
		const id = idRaw ? parseInt(idRaw, 10) : NaN;
		if (isNaN(id)) error(400, 'Ungültige Verkaufs-ID');
		const sale = getHoneySaleById(id);
		if (!sale) error(404, 'Verkauf nicht gefunden');
		deleteHoneySale(id);
		redirect(302, '/sells');
	},
};
