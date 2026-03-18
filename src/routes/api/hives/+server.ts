// src/routes/api/hives/+server.ts
// GET /api/hives  — returns active (or all) hives as JSON
// POST /api/hives — creates a new hive

import { json, error } from '@sveltejs/kit';
import {
	getActiveHives,
	getArchivedHives,
	createHive,
	countActiveHives,
	activeHiveWithNumberExists,
} from '$lib/server/db/queries/hives.js';
import type { RequestHandler } from './$types.js';

const MAX_ACTIVE_HIVES = 10;

// GET /api/hives?active=true|false|all
export const GET: RequestHandler = ({ url }) => {
	const activeParam = url.searchParams.get('active') ?? 'true';

	if (activeParam === 'false') {
		return json(getArchivedHives());
	}
	if (activeParam === 'all') {
		return json([...getActiveHives(), ...getArchivedHives()]);
	}
	// Default: active=true
	return json(getActiveHives());
};

// POST /api/hives
export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, { message: 'Invalid JSON body' });
	}

	const { name, number, description } = body as {
		name?: unknown;
		number?: unknown;
		description?: unknown;
	};

	if (!name || typeof name !== 'string' || name.trim() === '') {
		error(400, { message: 'Hive name is required' });
	}

	let parsedNumber: number | null = null;
	if (number !== undefined && number !== null && number !== '') {
		parsedNumber = Number(number);
		if (!Number.isInteger(parsedNumber) || parsedNumber < 1) {
			error(400, { message: 'Hive number must be a positive integer' });
		}
	}

	if (countActiveHives() >= MAX_ACTIVE_HIVES) {
		error(422, { message: 'Maximum of 10 active hives reached' });
	}

	if (parsedNumber !== null && activeHiveWithNumberExists(parsedNumber)) {
		error(422, { message: `A hive with number ${parsedNumber} already exists` });
	}

	const hive = createHive({
		name: name.trim(),
		number: parsedNumber,
		description: typeof description === 'string' ? description.trim() || null : null,
	});

	return json(hive, { status: 201 });
};
