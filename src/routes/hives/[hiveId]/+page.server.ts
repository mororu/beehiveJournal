// src/routes/hives/[hiveId]/+page.server.ts

import { error, redirect } from '@sveltejs/kit';
import { getHiveById } from '$lib/server/db/queries/hives.js';
import { getInspectionsByHiveId } from '$lib/server/db/queries/inspections.js';
import {
	getTodosByHiveId,
	createTodo,
	toggleTodo,
	deleteTodo,
} from '$lib/server/db/queries/todos.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = ({ params, url }) => {
	const id = parseInt(params.hiveId, 10);
	if (isNaN(id)) error(404, 'Hive not found');

	const hive = getHiveById(id);
	if (!hive) error(404, 'Hive not found');

	const inspections = getInspectionsByHiveId(id);
	const todos = getTodosByHiveId(id);

	// ?saved=1 is appended by the inspect form redirect on success (Story 4.5 toast)
	const justSaved = url.searchParams.get('saved') === '1';

	return { hive, inspections, todos, justSaved };
};

export const actions: Actions = {
	createTodo: async ({ params, request }) => {
		const hiveId = parseInt(params.hiveId, 10);
		if (isNaN(hiveId)) error(404, 'Hive not found');

		const data = await request.formData();
		const title = (data.get('title') as string | null)?.trim();
		if (!title) error(400, 'Titel fehlt');

		createTodo({ hiveId, title });
		redirect(302, `/hives/${hiveId}`);
	},

	toggleTodo: async ({ params, request }) => {
		const hiveId = parseInt(params.hiveId, 10);
		const data = await request.formData();
		const idRaw = data.get('todoId') as string | null;
		const id = idRaw ? parseInt(idRaw, 10) : NaN;
		if (isNaN(id)) error(400, 'Ungültige Todo-ID');
		toggleTodo(id);
		redirect(302, `/hives/${hiveId}`);
	},

	deleteTodo: async ({ params, request }) => {
		const hiveId = parseInt(params.hiveId, 10);
		const data = await request.formData();
		const idRaw = data.get('todoId') as string | null;
		const id = idRaw ? parseInt(idRaw, 10) : NaN;
		if (isNaN(id)) error(400, 'Ungültige Todo-ID');
		deleteTodo(id);
		redirect(302, `/hives/${hiveId}`);
	},
};
