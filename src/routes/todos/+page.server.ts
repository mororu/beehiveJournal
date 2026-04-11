// src/routes/todos/+page.server.ts

import { error, redirect } from '@sveltejs/kit';
import { getAllTodos, createTodo, toggleTodo, deleteTodo } from '$lib/server/db/queries/todos.js';
import { getActiveHives } from '$lib/server/db/queries/hives.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	const todos = getAllTodos();
	const hives = getActiveHives();
	return { todos, hives };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const title = (data.get('title') as string | null)?.trim();
		const hiveIdRaw = data.get('hiveId') as string | null;
		const hiveId = hiveIdRaw ? parseInt(hiveIdRaw, 10) : null;

		if (!title) error(400, 'Titel fehlt');
		if (hiveId !== null && isNaN(hiveId)) error(400, 'Ungültige Bienenstock-ID');

		createTodo({ hiveId, title });
		redirect(302, '/todos');
	},

	toggle: async ({ request }) => {
		const data = await request.formData();
		const idRaw = data.get('todoId') as string | null;
		const id = idRaw ? parseInt(idRaw, 10) : NaN;
		if (isNaN(id)) error(400, 'Ungültige Todo-ID');
		toggleTodo(id);
		redirect(302, '/todos');
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const idRaw = data.get('todoId') as string | null;
		const id = idRaw ? parseInt(idRaw, 10) : NaN;
		if (isNaN(id)) error(400, 'Ungültige Todo-ID');
		deleteTodo(id);
		redirect(302, '/todos');
	},
};
