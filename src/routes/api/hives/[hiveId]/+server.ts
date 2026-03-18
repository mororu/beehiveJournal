// src/routes/api/hives/[hiveId]/+server.ts
// GET    /api/hives/:id  — get a single hive
// PATCH  /api/hives/:id  — update a hive
// DELETE /api/hives/:id  — delete a hive

import { json, error } from '@sveltejs/kit';
import {
	getHiveById,
	updateHive,
	deleteHive,
	countActiveHives,
	activeHiveWithNumberExists,
} from '$lib/server/db/queries/hives.js';
import type { RequestHandler } from './$types.js';

const MAX_ACTIVE_HIVES = 10;

function parseId(params: Record<string, string>): number {
	const id = parseInt(params.hiveId, 10);
	if (isNaN(id)) error(400, { message: 'Invalid hive ID' });
	return id;
}

export const GET: RequestHandler = ({ params }) => {
	const id = parseId(params);
	const hive = getHiveById(id);
	if (!hive) error(404, { message: 'Hive not found' });
	return json(hive);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = parseId(params);
	const hive = getHiveById(id);
	if (!hive) error(404, { message: 'Hive not found' });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, { message: 'Invalid JSON body' });
	}

	const { name, number, description, isActive } = body as {
		name?: unknown;
		number?: unknown;
		description?: unknown;
		isActive?: unknown;
	};

	const updates: Parameters<typeof updateHive>[1] = {};

	if (name !== undefined) {
		if (typeof name !== 'string' || name.trim() === '') {
			error(400, { message: 'Hive name cannot be empty' });
		}
		updates.name = name.trim();
	}

	if (number !== undefined) {
		if (number === null || number === '') {
			updates.number = null;
		} else {
			const n = Number(number);
			if (!Number.isInteger(n) || n < 1) {
				error(400, { message: 'Hive number must be a positive integer' });
			}
			if (activeHiveWithNumberExists(n, id)) {
				error(422, { message: `A hive with number ${n} already exists` });
			}
			updates.number = n;
		}
	}

	if (description !== undefined) {
		updates.description = typeof description === 'string' ? description.trim() || null : null;
	}

	if (isActive !== undefined) {
		if (typeof isActive !== 'boolean') {
			error(400, { message: 'isActive must be a boolean' });
		}
		// Enforce active hive limit when unarchiving
		if (isActive && !hive.isActive && countActiveHives() >= MAX_ACTIVE_HIVES) {
			error(422, { message: 'Maximum of 10 active hives reached' });
		}
		updates.isActive = isActive;
	}

	const updated = updateHive(id, updates);
	if (!updated) error(404, { message: 'Hive not found' });
	return json(updated);
};

export const DELETE: RequestHandler = ({ params }) => {
	const id = parseId(params);
	const hive = getHiveById(id);
	if (!hive) error(404, { message: 'Hive not found' });
	deleteHive(id);
	return new Response(null, { status: 204 });
};
