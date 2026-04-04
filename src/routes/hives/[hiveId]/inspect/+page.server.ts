// src/routes/hives/[hiveId]/inspect/+page.server.ts

import { error, fail, redirect } from '@sveltejs/kit';
import { getHiveById } from '$lib/server/db/queries/hives.js';
import { createInspection } from '$lib/server/db/queries/inspections.js';
import {
	createPhoto,
	countPhotosByInspectionId,
	MAX_PHOTOS_PER_INSPECTION,
	MAX_PHOTO_BYTES,
	ALLOWED_MIME_TYPES,
} from '$lib/server/db/queries/photos.js';
import { fromDatetimeLocal } from '$lib/client/utils/date.js';
import type { Actions, PageServerLoad } from './$types.js';

const VALID_QUEEN_STATUSES = ['seen', 'not_seen', 'cells_present'] as const;
type QueenStatus = (typeof VALID_QUEEN_STATUSES)[number];

export const load: PageServerLoad = ({ params }) => {
	const id = parseInt(params.hiveId, 10);
	if (isNaN(id)) error(404, 'Bienenstock nicht gefunden');

	const hive = getHiveById(id);
	if (!hive) error(404, 'Bienenstock nicht gefunden');

	return { hive };
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		const hiveId = parseInt(params.hiveId, 10);
		if (isNaN(hiveId)) error(404, 'Bienenstock nicht gefunden');

		const hive = getHiveById(hiveId);
		if (!hive) error(404, 'Bienenstock nicht gefunden');

		const data = await request.formData();

		// ── Required fields ───────────────────────────────────────────────────
		const healthScoreRaw = data.get('healthScore') as string | null;
		const queenStatus = (data.get('queenStatus') as string | null) ?? '';
		const inspectedAtRaw = (data.get('inspectedAt') as string | null)?.trim() ?? '';

		if (!healthScoreRaw) {
			return fail(400, { error: 'Gesundheitsbewertung ist erforderlich' });
		}

		const healthScore = parseInt(healthScoreRaw, 10);
		if (isNaN(healthScore) || healthScore < 1 || healthScore > 5) {
			return fail(400, { error: 'Gesundheitsbewertung muss zwischen 1 und 5 liegen' });
		}

		if (!VALID_QUEEN_STATUSES.includes(queenStatus as QueenStatus)) {
			return fail(400, { error: 'Königinnenstatus ist erforderlich' });
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

		// ── Photos ────────────────────────────────────────────────────────────
		const photoFiles = data.getAll('photos') as File[];
		const validPhotos = photoFiles.filter((f) => f instanceof File && f.size > 0);

		if (validPhotos.length > 0) {
			const currentCount = countPhotosByInspectionId(inspection.id);
			const available = MAX_PHOTOS_PER_INSPECTION - currentCount;

			if (validPhotos.length > available) {
				return fail(400, {
					error: `Maximal ${MAX_PHOTOS_PER_INSPECTION} Fotos pro Kontrolle erlaubt.`,
				});
			}

			for (const file of validPhotos) {
				if (file.size > MAX_PHOTO_BYTES) {
					return fail(400, { error: `Foto "${file.name}" ist zu groß (max. 10 MB).` });
				}
				const mimeType = file.type || 'image/jpeg';
				if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
					return fail(400, { error: `Dateityp "${mimeType}" wird nicht unterstützt.` });
				}

				const buffer = Buffer.from(await file.arrayBuffer());
				createPhoto({ inspectionId: inspection.id, data: buffer, mimeType });
			}
		}

		// ?saved=1 triggers the success toast on the hive detail page (Story 4.5)
		redirect(302, `/hives/${hiveId}?saved=1`);
	},
};
