// src/routes/honey/containers/new/+page.server.ts

import { fail, redirect } from '@sveltejs/kit';
import { createContainerSize } from '$lib/server/db/queries/containerSizes.js';
import type { Actions } from './$types.js';

const MAX_NAME_LEN = 60;
const MIN_SIZE_G = 1;
const MAX_SIZE_G = 5000;

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const name = ((data.get('name') as string | null) ?? '').trim();
		const sizeGRaw = ((data.get('sizeG') as string | null) ?? '').trim();

		if (!name) {
			return fail(400, { error: 'Name ist erforderlich', name, sizeGRaw });
		}
		if (name.length > MAX_NAME_LEN) {
			return fail(400, {
				error: `Name darf höchstens ${MAX_NAME_LEN} Zeichen enthalten`,
				name,
				sizeGRaw,
			});
		}

		const sizeG = parseInt(sizeGRaw, 10);
		if (!Number.isFinite(sizeG) || sizeG < MIN_SIZE_G || sizeG > MAX_SIZE_G) {
			return fail(400, {
				error: `Größe muss zwischen ${MIN_SIZE_G} und ${MAX_SIZE_G} g liegen`,
				name,
				sizeGRaw,
			});
		}

		createContainerSize({ name, sizeG });
		redirect(302, '/honey/containers');
	},
};
