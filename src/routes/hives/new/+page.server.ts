// src/routes/hives/new/+page.server.ts

import { fail, redirect } from '@sveltejs/kit';
import {
	createHive,
	countActiveHives,
	activeHiveWithNumberExists,
} from '$lib/server/db/queries/hives.js';
import type { Actions, PageServerLoad } from './$types.js';

const MAX_ACTIVE_HIVES = 10;

export const load: PageServerLoad = () => {
	// Pre-check: if already at limit, surface it immediately
	if (countActiveHives() >= MAX_ACTIVE_HIVES) {
		return { atLimit: true };
	}
	return { atLimit: false };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const name = (data.get('name') as string | null)?.trim() ?? '';
		const numberRaw = (data.get('number') as string | null)?.trim() ?? '';
		const description = (data.get('description') as string | null)?.trim() ?? '';

		// Validate name
		if (!name) {
			return fail(400, { error: 'Hive name is required', name, numberRaw, description });
		}

		// Validate number
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
		}

		// Enforce active hive limit
		if (countActiveHives() >= MAX_ACTIVE_HIVES) {
			return fail(422, {
				error: 'Maximum of 10 active hives reached',
				name,
				numberRaw,
				description,
			});
		}

		// Check number uniqueness
		if (number !== null && activeHiveWithNumberExists(number)) {
			return fail(422, {
				error: `A hive with number ${number} already exists`,
				name,
				numberRaw,
				description,
			});
		}

		const hive = createHive({
			name,
			number,
			description: description || null,
		});

		redirect(302, `/hives/${hive.id}`);
	},
};
