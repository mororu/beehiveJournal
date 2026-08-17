// src/routes/diary/[entryId]/+page.server.ts

import { error, redirect } from '@sveltejs/kit';
import { getDiaryEntryById, deleteDiaryEntry } from '$lib/server/db/queries/diary.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = ({ params }) => {
	const id = parseInt(params.entryId, 10);
	if (isNaN(id)) error(404, 'Eintrag nicht gefunden');
	const entry = getDiaryEntryById(id);
	if (!entry) error(404, 'Eintrag nicht gefunden');
	return { entry };
};

export const actions: Actions = {
	delete: async ({ params }) => {
		const id = parseInt(params.entryId, 10);
		if (isNaN(id)) error(400, 'Ungültige Eintrags-ID');
		const entry = getDiaryEntryById(id);
		if (!entry) error(404, 'Eintrag nicht gefunden');
		deleteDiaryEntry(id);
		redirect(302, '/diary');
	},
};
