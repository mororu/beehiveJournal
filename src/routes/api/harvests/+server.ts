// src/routes/api/harvests/+server.ts
// GET  /api/harvests   — list all honey harvests
// POST /api/harvests   — create a new honey harvest (used by offline sync)

import { json, error } from '@sveltejs/kit';
import { getHarvestEntries, createHarvestEntry } from '$lib/server/db/queries/honeyHarvests.js';
import { formatLot } from '$lib/client/utils/date.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = () => {
	return json(getHarvestEntries());
};

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, { message: 'Invalid JSON' });
	}

	const b = body as Record<string, unknown>;

	if (b.amountKg === undefined || b.amountKg === null || b.amountKg === '') {
		error(400, { message: 'amountKg is required' });
	}
	const amountKg = typeof b.amountKg === 'number' ? b.amountKg : parseFloat(String(b.amountKg));
	if (isNaN(amountKg) || amountKg <= 0 || amountKg > 9999) {
		error(400, { message: 'amountKg must be a number between 0.1 and 9999' });
	}

	const harvestedAt =
		b.harvestedAt !== undefined ? Math.floor(Number(b.harvestedAt)) : Math.floor(Date.now() / 1000);
	// Guard against Infinity/-Infinity (isNaN alone passes them), non-positive epochs, and years > 2100.
	if (!Number.isFinite(harvestedAt) || harvestedAt <= 0 || harvestedAt > 4102444800) {
		error(400, { message: 'harvestedAt must be a valid unix epoch (seconds) before year 2100' });
	}

	const notes = typeof b.notes === 'string' ? b.notes.trim() || null : null;
	if (notes !== null && notes.length > 2000) {
		error(400, { message: 'notes must be 2000 characters or fewer' });
	}
	const clientId = typeof b.clientId === 'string' ? b.clientId || null : null;
	const lot = formatLot(harvestedAt);

	const result = createHarvestEntry({ harvestedAt, amountKg, lot, notes, clientId });

	if (result === undefined) {
		return json({ duplicate: true }, { status: 200 });
	}

	return json(result, { status: 201 });
};
