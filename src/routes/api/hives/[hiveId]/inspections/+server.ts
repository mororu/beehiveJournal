// src/routes/api/hives/[hiveId]/inspections/+server.ts
// GET  /api/hives/:id/inspections  — list inspections for a hive
// POST /api/hives/:id/inspections  — create a new inspection (idempotent via clientId)

import { json, error } from '@sveltejs/kit';
import { getHiveById } from '$lib/server/db/queries/hives.js';
import {
	getInspectionsByHiveId,
	getInspectionByClientId,
	createInspection,
} from '$lib/server/db/queries/inspections.js';
import type { RequestHandler } from './$types.js';

const VALID_QUEEN_STATUSES = ['seen', 'not_seen', 'cells_present'] as const;
type QueenStatus = (typeof VALID_QUEEN_STATUSES)[number];

// Keep in sync with VALID_FLUGLOCH_STATUSES in +page.server.ts (same route)
const VALID_FLUGLOCH_STATUSES = ['keine', 'wenig', 'mittel', 'hoch', 'sehr_hoch'] as const;
type FluglochStatus = (typeof VALID_FLUGLOCH_STATUSES)[number];

export const GET: RequestHandler = ({ params, url }) => {
	const hiveId = parseInt(params.hiveId, 10);
	if (isNaN(hiveId)) error(400, { message: 'Invalid hive ID' });

	if (!getHiveById(hiveId)) error(404, { message: 'Hive not found' });

	const fromParam = url.searchParams.get('from');
	const toParam = url.searchParams.get('to');
	const opts: { from?: number; to?: number } = {};
	if (fromParam) opts.from = parseInt(fromParam, 10);
	if (toParam) opts.to = parseInt(toParam, 10);

	return json(getInspectionsByHiveId(hiveId, opts));
};

export const POST: RequestHandler = async ({ params, request }) => {
	const hiveId = parseInt(params.hiveId, 10);
	if (isNaN(hiveId)) error(400, { message: 'Invalid hive ID' });

	if (!getHiveById(hiveId)) error(404, { message: 'Hive not found' });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, { message: 'Invalid JSON body' });
	}

	const b = body as Record<string, unknown>;

	// Story 7.5 AC5: clientId deduplication — if we've seen this UUID before,
	// return the existing record rather than creating a duplicate.
	const clientId = typeof b.clientId === 'string' ? b.clientId || null : null;
	if (clientId) {
		const existing = getInspectionByClientId(clientId);
		if (existing) {
			// Return 200 (not 201) — entry already exists, sync client can treat this as success
			return json(existing, { status: 200 });
		}
	}

	// Validate required fields
	const healthScore = Number(b.healthScore);
	if (!Number.isInteger(healthScore) || healthScore < 1 || healthScore > 5) {
		error(400, { message: 'healthScore must be an integer 1–5' });
	}

	const queenStatus = b.queenStatus as string;
	if (!VALID_QUEEN_STATUSES.includes(queenStatus as QueenStatus)) {
		error(400, { message: 'queenStatus must be seen, not_seen, or cells_present' });
	}

	const fluglochBeobachtung =
		typeof b.fluglochBeobachtung === 'string' &&
		VALID_FLUGLOCH_STATUSES.includes(b.fluglochBeobachtung as FluglochStatus)
			? b.fluglochBeobachtung
			: null;

	const inspectedAt =
		b.inspectedAt !== undefined ? Math.floor(Number(b.inspectedAt)) : Math.floor(Date.now() / 1000);

	const inspection = createInspection({
		hiveId,
		inspectedAt,
		healthScore,
		queenStatus,
		fluglochBeobachtung,
		behaviourNotes: typeof b.behaviourNotes === 'string' ? b.behaviourNotes || null : null,
		nextInspectNote: typeof b.nextInspectNote === 'string' ? b.nextInspectNote || null : null,
		weatherTemp: b.weatherTemp != null ? Number(b.weatherTemp) : null,
		weatherDesc: typeof b.weatherDesc === 'string' ? b.weatherDesc || null : null,
		weatherWindSpeed: b.weatherWindSpeed != null ? Number(b.weatherWindSpeed) : null,
		weatherCode: b.weatherCode != null ? Math.floor(Number(b.weatherCode)) : null,
		weatherLat: b.weatherLat != null ? Number(b.weatherLat) : null,
		weatherLon: b.weatherLon != null ? Number(b.weatherLon) : null,
		weatherUnavailable: b.weatherUnavailable === true,
		clientId,
	});

	return json(inspection, { status: 201 });
};
