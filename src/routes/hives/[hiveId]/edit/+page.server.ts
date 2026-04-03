// src/routes/hives/[hiveId]/edit/+page.server.ts

import { error, fail, redirect } from '@sveltejs/kit';
import {
	getHiveById,
	updateHive,
	deleteHive,
	activeHiveWithNumberExists,
	countActiveHives,
} from '$lib/server/db/queries/hives.js';
import { countInspectionsByHiveId } from '$lib/server/db/queries/inspections.js';
import type { Actions, PageServerLoad } from './$types.js';

const MAX_ACTIVE_HIVES = 10;

export const load: PageServerLoad = ({ params }) => {
	const id = parseInt(params.hiveId, 10);
	if (isNaN(id)) error(404, 'Bienenstock nicht gefunden');

	const hive = getHiveById(id);
	if (!hive) error(404, 'Bienenstock nicht gefunden');

	const inspectionCount = countInspectionsByHiveId(id);

	return { hive, inspectionCount };
};

export const actions: Actions = {
	// ── Update name/number/description ────────────────────────────────────────
	update: async ({ params, request }) => {
		const id = parseInt(params.hiveId, 10);
		if (isNaN(id)) error(404, 'Bienenstock nicht gefunden');

		const hive = getHiveById(id);
		if (!hive) error(404, 'Bienenstock nicht gefunden');

		const data = await request.formData();
		const name = (data.get('name') as string | null)?.trim() ?? '';
		const numberRaw = (data.get('number') as string | null)?.trim() ?? '';
		const description = (data.get('description') as string | null)?.trim() ?? '';

		if (!name) {
			return fail(400, {
				action: 'update',
				error: 'Name des Bienenstocks ist erforderlich',
				name,
				numberRaw,
				description,
			});
		}

		let number: number | null = null;
		if (numberRaw !== '') {
			number = parseInt(numberRaw, 10);
			if (isNaN(number) || number < 1) {
				return fail(400, {
					action: 'update',
					error: 'Hive number must be a positive integer',
					name,
					numberRaw,
					description,
				});
			}
			if (activeHiveWithNumberExists(number, id)) {
				return fail(422, {
					action: 'update',
					error: `A hive with number ${number} already exists`,
					name,
					numberRaw,
					description,
				});
			}
		}

		updateHive(id, { name, number, description: description || null });
		redirect(302, `/hives/${id}`);
	},

	// ── Archive ───────────────────────────────────────────────────────────────
	archive: async ({ params }) => {
		const id = parseInt(params.hiveId, 10);
		if (isNaN(id)) error(404, 'Bienenstock nicht gefunden');

		const hive = getHiveById(id);
		if (!hive) error(404, 'Bienenstock nicht gefunden');

		updateHive(id, { isActive: false });
		redirect(302, '/hives');
	},

	// ── Unarchive ─────────────────────────────────────────────────────────────
	unarchive: async ({ params }) => {
		const id = parseInt(params.hiveId, 10);
		if (isNaN(id)) error(404, 'Bienenstock nicht gefunden');

		const hive = getHiveById(id);
		if (!hive) error(404, 'Bienenstock nicht gefunden');

		if (countActiveHives() >= MAX_ACTIVE_HIVES) {
			return fail(422, {
				action: 'unarchive',
				error: 'Maximum of 10 active hives reached. Archive another hive first.',
			});
		}

		updateHive(id, { isActive: true });
		redirect(302, `/hives/${id}`);
	},

	// ── Delete ────────────────────────────────────────────────────────────────
	delete: async ({ params, request }) => {
		const id = parseInt(params.hiveId, 10);
		if (isNaN(id)) error(404, 'Bienenstock nicht gefunden');

		const hive = getHiveById(id);
		if (!hive) error(404, 'Bienenstock nicht gefunden');

		// Require the user to type the hive name to confirm
		const data = await request.formData();
		const confirmName = (data.get('confirmName') as string | null)?.trim() ?? '';

		if (confirmName !== hive.name) {
			return fail(400, {
				action: 'delete',
				error: 'Hive name does not match. Deletion cancelled.',
			});
		}

		deleteHive(id);
		redirect(302, '/hives');
	},
};
