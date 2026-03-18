// src/routes/hives/[hiveId]/inspections/[inspectionId]/+page.server.ts

import { error, redirect } from '@sveltejs/kit';
import { getHiveById } from '$lib/server/db/queries/hives.js';
import { getInspectionById, deleteInspection } from '$lib/server/db/queries/inspections.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = ({ params }) => {
	const hiveId = parseInt(params.hiveId, 10);
	const inspId = parseInt(params.inspectionId, 10);
	if (isNaN(hiveId) || isNaN(inspId)) error(404, 'Not found');

	const hive = getHiveById(hiveId);
	if (!hive) error(404, 'Hive not found');

	const inspection = getInspectionById(inspId);
	if (!inspection || inspection.hiveId !== hiveId) error(404, 'Inspection not found');

	return { hive, inspection };
};

export const actions: Actions = {
	delete: async ({ params }) => {
		const hiveId = parseInt(params.hiveId, 10);
		const inspId = parseInt(params.inspectionId, 10);
		if (isNaN(hiveId) || isNaN(inspId)) error(404, 'Not found');

		const inspection = getInspectionById(inspId);
		if (!inspection || inspection.hiveId !== hiveId) error(404, 'Inspection not found');

		deleteInspection(inspId);
		redirect(302, `/hives/${hiveId}`);
	},
};
