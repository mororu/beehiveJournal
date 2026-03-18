// src/routes/api/hives/[hiveId]/inspections/[inspectionId]/+server.ts
// GET    /api/hives/:hiveId/inspections/:inspId
// PATCH  /api/hives/:hiveId/inspections/:inspId
// DELETE /api/hives/:hiveId/inspections/:inspId

import { json, error } from '@sveltejs/kit';
import { getHiveById } from '$lib/server/db/queries/hives.js';
import {
	getInspectionById,
	updateInspection,
	deleteInspection,
} from '$lib/server/db/queries/inspections.js';
import type { RequestHandler } from './$types.js';

const VALID_QUEEN_STATUSES = ['seen', 'not_seen', 'cells_present'] as const;
type QueenStatus = (typeof VALID_QUEEN_STATUSES)[number];

function parseIds(params: Record<string, string>): { hiveId: number; inspId: number } {
	const hiveId = parseInt(params.hiveId, 10);
	const inspId = parseInt(params.inspectionId, 10);
	if (isNaN(hiveId) || isNaN(inspId)) error(400, { message: 'Invalid ID' });
	return { hiveId, inspId };
}

export const GET: RequestHandler = ({ params }) => {
	const { hiveId, inspId } = parseIds(params);
	if (!getHiveById(hiveId)) error(404, { message: 'Hive not found' });
	const inspection = getInspectionById(inspId);
	if (!inspection || inspection.hiveId !== hiveId) error(404, { message: 'Inspection not found' });
	return json(inspection);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const { hiveId, inspId } = parseIds(params);
	if (!getHiveById(hiveId)) error(404, { message: 'Hive not found' });

	const inspection = getInspectionById(inspId);
	if (!inspection || inspection.hiveId !== hiveId) error(404, { message: 'Inspection not found' });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, { message: 'Invalid JSON body' });
	}

	const b = body as Record<string, unknown>;
	const updates: Parameters<typeof updateInspection>[1] = {};

	if (b.healthScore !== undefined) {
		const hs = Number(b.healthScore);
		if (!Number.isInteger(hs) || hs < 1 || hs > 5) {
			error(400, { message: 'healthScore must be an integer 1–5' });
		}
		updates.healthScore = hs;
	}

	if (b.queenStatus !== undefined) {
		const qs = b.queenStatus as string;
		if (!VALID_QUEEN_STATUSES.includes(qs as QueenStatus)) {
			error(400, { message: 'queenStatus must be seen, not_seen, or cells_present' });
		}
		updates.queenStatus = qs;
	}

	if (b.inspectedAt !== undefined) {
		updates.inspectedAt = Math.floor(Number(b.inspectedAt));
	}

	if (b.behaviourNotes !== undefined) {
		updates.behaviourNotes = typeof b.behaviourNotes === 'string' ? b.behaviourNotes || null : null;
	}

	if (b.nextInspectNote !== undefined) {
		updates.nextInspectNote =
			typeof b.nextInspectNote === 'string' ? b.nextInspectNote || null : null;
	}

	const updated = updateInspection(inspId, updates);
	if (!updated) error(404, { message: 'Inspection not found' });
	return json(updated);
};

export const DELETE: RequestHandler = ({ params }) => {
	const { hiveId, inspId } = parseIds(params);
	if (!getHiveById(hiveId)) error(404, { message: 'Hive not found' });
	const inspection = getInspectionById(inspId);
	if (!inspection || inspection.hiveId !== hiveId) error(404, { message: 'Inspection not found' });
	deleteInspection(inspId);
	return new Response(null, { status: 204 });
};
