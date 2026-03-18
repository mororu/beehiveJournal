// src/routes/hives/[hiveId]/inspect/+page.server.ts

import { error, fail, redirect } from '@sveltejs/kit';
import { getHiveById } from '$lib/server/db/queries/hives.js';
import { createInspection } from '$lib/server/db/queries/inspections.js';
import { fromDatetimeLocal } from '$lib/client/utils/date.js';
import type { Actions, PageServerLoad } from './$types.js';

const VALID_QUEEN_STATUSES = ['seen', 'not_seen', 'cells_present'] as const;
type QueenStatus = (typeof VALID_QUEEN_STATUSES)[number];

export const load: PageServerLoad = ({ params }) => {
	const id = parseInt(params.hiveId, 10);
	if (isNaN(id)) error(404, 'Hive not found');

	const hive = getHiveById(id);
	if (!hive) error(404, 'Hive not found');

	return { hive };
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		const hiveId = parseInt(params.hiveId, 10);
		if (isNaN(hiveId)) error(404, 'Hive not found');

		const hive = getHiveById(hiveId);
		if (!hive) error(404, 'Hive not found');

		const data = await request.formData();

		// ── Required fields ───────────────────────────────────────────────────
		const healthScoreRaw = data.get('healthScore') as string | null;
		const queenStatus = (data.get('queenStatus') as string | null) ?? '';
		const inspectedAtRaw = (data.get('inspectedAt') as string | null)?.trim() ?? '';

		if (!healthScoreRaw) {
			return fail(400, { error: 'Health score is required' });
		}

		const healthScore = parseInt(healthScoreRaw, 10);
		if (isNaN(healthScore) || healthScore < 1 || healthScore > 5) {
			return fail(400, { error: 'Health score must be between 1 and 5' });
		}

		if (!VALID_QUEEN_STATUSES.includes(queenStatus as QueenStatus)) {
			return fail(400, { error: 'Queen status is required' });
		}

		const inspectedAt = inspectedAtRaw
			? fromDatetimeLocal(inspectedAtRaw)
			: Math.floor(Date.now() / 1000);

		// ── Optional text fields ──────────────────────────────────────────────
		const behaviourNotes = (data.get('behaviourNotes') as string | null)?.trim() || null;
		const nextInspectNote = (data.get('nextInspectNote') as string | null)?.trim() || null;

		// ── Weather fields (sent as hidden inputs by the client) ─────────────
		const weatherUnavailable = data.get('weatherUnavailable') === 'true';
		const weatherTempRaw = data.get('weatherTemp') as string | null;
		const weatherWindSpeedRaw = data.get('weatherWindSpeed') as string | null;
		const weatherCodeRaw = data.get('weatherCode') as string | null;
		const weatherLatRaw = data.get('weatherLat') as string | null;
		const weatherLonRaw = data.get('weatherLon') as string | null;

		const inspection = createInspection({
			hiveId,
			inspectedAt,
			healthScore,
			queenStatus,
			behaviourNotes,
			nextInspectNote,
			weatherUnavailable,
			weatherDesc: (data.get('weatherDesc') as string | null)?.trim() || null,
			weatherTemp: weatherTempRaw ? parseFloat(weatherTempRaw) : null,
			weatherWindSpeed: weatherWindSpeedRaw ? parseFloat(weatherWindSpeedRaw) : null,
			weatherCode: weatherCodeRaw ? parseInt(weatherCodeRaw, 10) : null,
			weatherLat: weatherLatRaw ? parseFloat(weatherLatRaw) : null,
			weatherLon: weatherLonRaw ? parseFloat(weatherLonRaw) : null,
			clientId: (data.get('clientId') as string | null) || null,
		});

		redirect(302, `/hives/${hiveId}`);
		// satisfy TS — redirect always throws
		return { inspectionId: inspection.id };
	},
};
