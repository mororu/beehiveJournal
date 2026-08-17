// src/routes/diary/new/+page.server.ts

import { fail, redirect } from '@sveltejs/kit';
import { createDiaryEntry } from '$lib/server/db/queries/diary.js';
import { fromDateInput } from '$lib/client/utils/date.js';
import { fetchDayWeather, fetchWeatherHistory } from '$lib/server/weather.js';
import type { Actions } from './$types.js';

const MAX_TITLE_LEN = 200;
const MAX_BODY_LEN = 5000;

export const actions: Actions = {
	default: async ({ request }) => {
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
			const d = new Date();
			d.setHours(12, 0, 0, 0);
			entryDate = Math.floor(d.getTime() / 1000);
		}

		const lat = latRaw ? parseFloat(latRaw) : null;
		const lon = lonRaw ? parseFloat(lonRaw) : null;
		const gpsUsable = lat !== null && lon !== null && Number.isFinite(lat) && Number.isFinite(lon);

		let dayWeather = null;
		let history = null;
		if (gpsUsable) {
			// Run both fetches in parallel so worst-case wait is ~8 s (single timeout),
			// not ~16 s (sequential) — safe under most hosting form-action timeouts.
			[dayWeather, history] = await Promise.all([
				fetchDayWeather({ lat: lat!, lon: lon!, epochSeconds: entryDate }),
				fetchWeatherHistory({ lat: lat!, lon: lon!, endEpochSeconds: entryDate }),
			]);
		}

		const weatherUnavailable = !gpsUsable || (dayWeather === null && history === null);

		const entry = createDiaryEntry({
			entryDate,
			title,
			body,
			weatherLat: gpsUsable ? lat : null,
			weatherLon: gpsUsable ? lon : null,
			weatherTemp: dayWeather?.temp ?? null,
			weatherDesc: dayWeather?.desc ?? null,
			weatherWindSpeed: dayWeather?.windSpeed ?? null,
			weatherCode: dayWeather?.code ?? null,
			weatherUnavailable,
			weatherHistory: history ? JSON.stringify(history) : null,
		});

		redirect(302, `/diary/${entry.id}`);
	},
};
