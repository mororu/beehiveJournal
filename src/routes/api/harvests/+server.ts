// src/routes/api/harvests/+server.ts
// GET  /api/harvests   — list all honey harvests (optional ?hiveId=X filter)
// POST /api/harvests   — create a new honey harvest (used by offline sync)

import { json, error } from '@sveltejs/kit';
import { getHarvestEntries, createHarvestEntry } from '$lib/server/db/queries/honeyHarvests.js';
import type { HoneyHarvest } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = ({ url }) => {
	const hiveIdParam = url.searchParams.get('hiveId');
	const hiveId = hiveIdParam ? parseInt(hiveIdParam, 10) : undefined;
	if (hiveIdParam && isNaN(hiveId!)) {
		error(400, { message: 'Invalid hiveId' });
	}
	return json(getHarvestEntries({ hiveId }));
};

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, { message: 'Invalid JSON' });
	}

	const b = body as Record<string, unknown>;

	if (b.hiveId === undefined || b.hiveId === null || b.hiveId === '') {
		error(400, { message: 'hiveId is required' });
	}
	const hiveId = typeof b.hiveId === 'number' ? b.hiveId : parseInt(String(b.hiveId), 10);
	if (isNaN(hiveId)) {
		error(400, { message: 'hiveId must be a valid integer' });
	}

	if (b.amountKg === undefined || b.amountKg === null || b.amountKg === '') {
		error(400, { message: 'amountKg is required' });
	}
	const amountKg = typeof b.amountKg === 'number' ? b.amountKg : parseFloat(String(b.amountKg));
	if (isNaN(amountKg) || amountKg <= 0 || amountKg > 9999) {
		error(400, { message: 'amountKg must be a number between 0.1 and 9999' });
	}

	const harvestedAt =
		b.harvestedAt !== undefined ? Math.floor(Number(b.harvestedAt)) : Math.floor(Date.now() / 1000);
	if (isNaN(harvestedAt)) {
		error(400, { message: 'harvestedAt must be a valid timestamp' });
	}

	const notes = typeof b.notes === 'string' ? b.notes.trim() || null : null;
	const clientId = typeof b.clientId === 'string' ? b.clientId || null : null;

	let result: HoneyHarvest | undefined;
	try {
		result = createHarvestEntry({ hiveId, harvestedAt, amountKg, notes, clientId });
	} catch (err) {
		const msg = err instanceof Error ? err.message : '';
		if (msg.includes('FOREIGN KEY')) {
			error(400, { message: 'Hive not found' });
		}
		throw err;
	}

	if (result === undefined) {
		return json({ duplicate: true }, { status: 200 });
	}

	return json(result, { status: 201 });
};
