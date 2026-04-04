// src/routes/hives/[hiveId]/inspections/[inspectionId]/edit/+page.server.ts

import { error, fail, redirect } from '@sveltejs/kit';
import { getHiveById } from '$lib/server/db/queries/hives.js';
import { getInspectionById, updateInspection } from '$lib/server/db/queries/inspections.js';
import {
	getPhotoMetaByInspectionId,
	countPhotosByInspectionId,
	createPhoto,
	deletePhoto,
	getPhotoById,
	MAX_PHOTOS_PER_INSPECTION,
	MAX_PHOTO_BYTES,
	ALLOWED_MIME_TYPES,
} from '$lib/server/db/queries/photos.js';
import { fromDatetimeLocal } from '$lib/client/utils/date.js';
import type { Actions, PageServerLoad } from './$types.js';

const VALID_QUEEN_STATUSES = ['seen', 'not_seen', 'cells_present'] as const;
type QueenStatus = (typeof VALID_QUEEN_STATUSES)[number];

export const load: PageServerLoad = ({ params }) => {
	const hiveId = parseInt(params.hiveId, 10);
	const inspId = parseInt(params.inspectionId, 10);
	if (isNaN(hiveId) || isNaN(inspId)) error(404, 'Not found');

	const hive = getHiveById(hiveId);
	if (!hive) error(404, 'Bienenstock nicht gefunden');

	const inspection = getInspectionById(inspId);
	if (!inspection || inspection.hiveId !== hiveId) error(404, 'Kontrolle nicht gefunden');

	const photos = getPhotoMetaByInspectionId(inspId);
	return { hive, inspection, photos };
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		const hiveId = parseInt(params.hiveId, 10);
		const inspId = parseInt(params.inspectionId, 10);
		if (isNaN(hiveId) || isNaN(inspId)) error(404, 'Not found');

		const inspection = getInspectionById(inspId);
		if (!inspection || inspection.hiveId !== hiveId) error(404, 'Kontrolle nicht gefunden');

		const data = await request.formData();
		const healthScoreRaw = data.get('healthScore') as string | null;
		const queenStatus = (data.get('queenStatus') as string | null) ?? '';
		const inspectedAtRaw = (data.get('inspectedAt') as string | null)?.trim() ?? '';
		const behaviourNotes = (data.get('behaviourNotes') as string | null)?.trim() || null;
		const nextInspectNote = (data.get('nextInspectNote') as string | null)?.trim() || null;

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

		const inspectedAt = inspectedAtRaw ? fromDatetimeLocal(inspectedAtRaw) : inspection.inspectedAt;

		updateInspection(inspId, {
			healthScore,
			queenStatus,
			inspectedAt,
			behaviourNotes,
			nextInspectNote,
		});

		// ── Photo deletions ───────────────────────────────────────────────────
		const removeIdsRaw = data.getAll('removePhotoIds') as string[];
		for (const raw of removeIdsRaw) {
			const photoId = parseInt(raw, 10);
			if (!isNaN(photoId)) {
				// Verify photo belongs to this inspection before deleting
				const photo = getPhotoById(photoId);
				if (photo && photo.inspectionId === inspId) {
					deletePhoto(photoId);
				}
			}
		}

		// ── Photo additions ───────────────────────────────────────────────────
		const photoFiles = data.getAll('photos') as File[];
		const validPhotos = photoFiles.filter((f) => f instanceof File && f.size > 0);

		if (validPhotos.length > 0) {
			const currentCount = countPhotosByInspectionId(inspId);
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
				createPhoto({ inspectionId: inspId, data: buffer, mimeType });
			}
		}

		redirect(302, `/hives/${hiveId}/inspections/${inspId}`);
	},
};
