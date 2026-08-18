// src/routes/honey/containers/[containerId]/edit/+page.server.ts

import { error, fail, redirect } from '@sveltejs/kit';
import {
	getContainerSizeById,
	updateContainerSize,
} from '$lib/server/db/queries/containerSizes.js';
import type { Actions, PageServerLoad } from './$types.js';

const MAX_NAME_LEN = 60;
const MIN_SIZE_G = 1;
const MAX_SIZE_G = 5000;

export const load: PageServerLoad = ({ params }) => {
	const id = parseInt(params.containerId, 10);
	if (isNaN(id)) error(404, 'Behältergröße nicht gefunden');
	const container = getContainerSizeById(id);
	if (!container) error(404, 'Behältergröße nicht gefunden');
	return { container };
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const id = parseInt(params.containerId, 10);
		if (isNaN(id)) error(400, 'Ungültige Behältergrößen-ID');
		const existing = getContainerSizeById(id);
		if (!existing) error(404, 'Behältergröße nicht gefunden');

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

		updateContainerSize(id, { name, sizeG });
		redirect(302, '/honey/containers');
	},
};
