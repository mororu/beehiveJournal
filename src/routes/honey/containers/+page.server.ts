// src/routes/honey/containers/+page.server.ts

import { error, fail, redirect } from '@sveltejs/kit';
import { deleteContainerSize, getContainerSizes } from '$lib/server/db/queries/containerSizes.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	return { sizes: getContainerSizes() };
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const data = await request.formData();
		const idRaw = data.get('containerId') as string | null;
		const id = idRaw ? parseInt(idRaw, 10) : NaN;
		if (isNaN(id)) error(400, 'Ungültige Behältergrößen-ID');

		const result = deleteContainerSize(id);
		if (!result.ok) {
			return fail(409, {
				error: 'Behältergröße wird von Verkäufen verwendet und kann nicht gelöscht werden.',
			});
		}
		redirect(302, '/honey/containers');
	},
};
