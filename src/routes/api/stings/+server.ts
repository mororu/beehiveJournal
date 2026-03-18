// src/routes/api/stings/+server.ts
// GET  /api/stings          — list all sting incidents (optional ?hiveId=X filter)
// POST /api/stings          — create a new sting incident

import { json, error } from '@sveltejs/kit';
import { getStingIncidents, createStingIncident } from '$lib/server/db/queries/stings.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = ({ url }) => {
	const hiveIdParam = url.searchParams.get('hiveId');
	const hiveId = hiveIdParam ? parseInt(hiveIdParam, 10) : undefined;
	if (hiveIdParam && isNaN(hiveId!)) {
		error(400, { message: 'Invalid hiveId' });
	}
	return json(getStingIncidents({ hiveId }));
};

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, { message: 'Invalid JSON body' });
	}

	const b = body as Record<string, unknown>;

	const bodyLocation = typeof b.bodyLocation === 'string' ? b.bodyLocation.trim() : '';
	if (!bodyLocation) {
		error(400, { message: 'bodyLocation is required' });
	}

	const stungAt =
		b.stungAt !== undefined ? Math.floor(Number(b.stungAt)) : Math.floor(Date.now() / 1000);

	let hiveId: number | null = null;
	if (b.hiveId !== undefined && b.hiveId !== null && b.hiveId !== '') {
		hiveId = parseInt(String(b.hiveId), 10);
		if (isNaN(hiveId)) error(400, { message: 'Invalid hiveId' });
	}

	const sting = createStingIncident({
		stungAt,
		bodyLocation,
		hiveId,
		notes: typeof b.notes === 'string' ? b.notes.trim() || null : null,
		clientId: typeof b.clientId === 'string' ? b.clientId || null : null,
	});

	return json(sting, { status: 201 });
};
