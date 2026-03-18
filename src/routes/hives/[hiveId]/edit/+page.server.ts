// src/routes/hives/[hiveId]/edit/+page.server.ts

import { error, fail, redirect } from '@sveltejs/kit';
import {
	getHiveById,
	updateHive,
	activeHiveWithNumberExists,
} from '$lib/server/db/queries/hives.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = ({ params }) => {
	const id = parseInt(params.hiveId, 10);
	if (isNaN(id)) error(404, 'Hive not found');

	const hive = getHiveById(id);
	if (!hive) error(404, 'Hive not found');

	return { hive };
};

export const actions: Actions = {
	update: async ({ params, request }) => {
		const id = parseInt(params.hiveId, 10);
		if (isNaN(id)) error(404, 'Hive not found');

		const hive = getHiveById(id);
		if (!hive) error(404, 'Hive not found');

		const data = await request.formData();
		const name = (data.get('name') as string | null)?.trim() ?? '';
		const numberRaw = (data.get('number') as string | null)?.trim() ?? '';
		const description = (data.get('description') as string | null)?.trim() ?? '';

		if (!name) {
			return fail(400, { error: 'Hive name is required', name, numberRaw, description });
		}

		let number: number | null = null;
		if (numberRaw !== '') {
			number = parseInt(numberRaw, 10);
			if (isNaN(number) || number < 1) {
				return fail(400, {
					error: 'Hive number must be a positive integer',
					name,
					numberRaw,
					description,
				});
			}
			// Uniqueness check — exclude current hive from the check
			if (activeHiveWithNumberExists(number, id)) {
				return fail(422, {
					error: `A hive with number ${number} already exists`,
					name,
					numberRaw,
					description,
				});
			}
		}

		updateHive(id, {
			name,
			number,
			description: description || null,
		});

		redirect(302, `/hives/${id}`);
	},
};
