// src/routes/diary/[entryId]/edit/+page.server.ts

import { error, fail, redirect } from '@sveltejs/kit';
import { getDiaryEntryById, updateDiaryEntry } from '$lib/server/db/queries/diary.js';
import { fromDateInput } from '$lib/client/utils/date.js';
import { fetchDayWeather, fetchWeatherHistory } from '$lib/server/weather.js';
import type { Actions, PageServerLoad } from './$types.js';

const MAX_TITLE_LEN = 200;
const MAX_BODY_LEN = 5000;

export const load: PageServerLoad = ({ params }) => {
	const id = parseInt(params.entryId, 10);
	if (isNaN(id)) error(404, 'Eintrag nicht gefunden');
	const entry = getDiaryEntryById(id);
	if (!entry) error(404, 'Eintrag nicht gefunden');
	return { entry };
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const id = parseInt(params.entryId, 10);
		if (isNaN(id)) error(400, 'Ungültige Eintrags-ID');
		const existing = getDiaryEntryById(id);
		if (!existing) error(404, 'Eintrag nicht gefunden');

		const data = await request.formData();
		const title = ((data.get('title') as string | null) ?? '').trim();
		const body = ((data.get('body') as string | null) ?? '').trim() || null;
		const entryDateRaw = ((data.get('entryDate') as string | null) ?? '').trim();
		const latRaw = ((data.get('lat') as string | null) ?? '').trim();
		const lonRaw = ((data.get('lon') as string | null) ?? '').trim();

		if (!title) {
			return fail(400, { error: 'Titel ist erforderlich', title, body: body ?? '', entryDateRaw });
		}
		if (title.length > MAX_TITLE_LEN) {
			return fail(400, {
				error: `Titel darf höchstens ${MAX_TITLE_LEN} Zeichen enthalten`,
				title,
				body: body ?? '',
				entryDateRaw,
			});
		}
		if (body && body.length > MAX_BODY_LEN) {
			return fail(400, {
				error: `Text darf höchstens ${MAX_BODY_LEN} Zeichen enthalten`,
				title,
				body,
				entryDateRaw,
			});
		}

		let entryDate: number;
		if (entryDateRaw) {
			entryDate = fromDateInput(entryDateRaw);
			if (isNaN(entryDate)) {
				return fail(400, {
					error: 'Ungültiges Datum',
					title,
					body: body ?? '',
					entryDateRaw,
				});
			}
		} else {
			entryDate = existing.entryDate;
		}

		if (entryDate === existing.entryDate) {
			updateDiaryEntry(id, { title, body });
		} else {
			const lat = latRaw ? parseFloat(latRaw) : null;
			const lon = lonRaw ? parseFloat(lonRaw) : null;
			const gpsUsable =
				lat !== null && lon !== null && Number.isFinite(lat) && Number.isFinite(lon);

			if (!gpsUsable) {
				// Date changed but no GPS this time — preserve existing weather columns
				// rather than wiping them. The stored snapshot is stale (it belongs to
				// the *previous* date) but the user has no better data to offer.
				updateDiaryEntry(id, { entryDate, title, body });
			} else {
				// Run both fetches in parallel — see comment in new/+page.server.ts.
				const [dayWeather, history] = await Promise.all([
					fetchDayWeather({ lat: lat!, lon: lon!, epochSeconds: entryDate }),
					fetchWeatherHistory({ lat: lat!, lon: lon!, endEpochSeconds: entryDate }),
				]);
				const weatherUnavailable = dayWeather === null && history === null;
				updateDiaryEntry(id, {
					entryDate,
					title,
					body,
					weatherLat: lat,
					weatherLon: lon,
					weatherTemp: dayWeather?.temp ?? null,
					weatherDesc: dayWeather?.desc ?? null,
					weatherWindSpeed: dayWeather?.windSpeed ?? null,
					weatherCode: dayWeather?.code ?? null,
					weatherUnavailable,
					weatherHistory: history ? JSON.stringify(history) : null,
				});
			}
		}

		redirect(302, `/diary/${id}`);
	},
};
