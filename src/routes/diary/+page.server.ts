// src/routes/diary/+page.server.ts

import { error, redirect } from '@sveltejs/kit';
import {
	getDiaryEntries,
	getDiaryEntryById,
	deleteDiaryEntry,
} from '$lib/server/db/queries/diary.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = ({ url }) => {
	const q = url.searchParams.get('q')?.trim() || '';
	return { entries: getDiaryEntries({ search: q || undefined }), q };
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const data = await request.formData();
		const idRaw = data.get('entryId') as string | null;
		const id = idRaw ? parseInt(idRaw, 10) : NaN;
		if (isNaN(id)) error(400, 'Ungültige Eintrags-ID');
		const entry = getDiaryEntryById(id);
		if (!entry) error(404, 'Eintrag nicht gefunden');
		deleteDiaryEntry(id);
		redirect(302, '/diary');
	},
};
