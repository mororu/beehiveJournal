// Server-only Open-Meteo helpers used by the diary feature.
// Two endpoints unified behind a single date-aware helper for the day-of snapshot,
// plus a separate helper for the 30-day history. Both return null on any failure
// (network, non-2xx, JSON shape) — callers set weatherUnavailable = true.

import { toDateInput } from '$lib/client/utils/date.js';
import { wmoDescription } from '$lib/utils/weather.js';

export type WeatherHistoryDay = {
	date: string; // "YYYY-MM-DD" local
	tMin: number | null; // °C
	tMax: number | null; // °C
	precip: number | null; // mm
	code: number | null; // WMO
};

export type DayWeather = {
	temp: number | null; // °C
	desc: string | null;
	windSpeed: number | null; // km/h
	code: number | null; // WMO
};

const FETCH_TIMEOUT_MS = 8_000;

function todayLocalMidnightEpoch(): number {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return Math.floor(d.getTime() / 1000);
}

function tomorrowLocalMidnightEpoch(): number {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + 1);
	return Math.floor(d.getTime() / 1000);
}

function round1(v: unknown): number | null {
	if (typeof v !== 'number' || !Number.isFinite(v)) return null;
	return Math.round(v * 10) / 10;
}

async function fetchJson(url: string): Promise<unknown | null> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Fetches the weather snapshot for a specific day at a specific location.
 * Uses the forecast endpoint for today/future entries (instantaneous current values)
 * and the archive endpoint for backdated entries (daily aggregates: max temp, max wind).
 */
export async function fetchDayWeather(opts: {
	lat: number;
	lon: number;
	epochSeconds: number;
}): Promise<DayWeather | null> {
	const { lat, lon, epochSeconds } = opts;
	const todayEpoch = todayLocalMidnightEpoch();
	const tomorrowEpoch = tomorrowLocalMidnightEpoch();

	// Today: forecast `current=` gives an instantaneous now-value that matches the
	// inspection form's semantics.
	if (epochSeconds >= todayEpoch && epochSeconds < tomorrowEpoch) {
		const url =
			`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
			`&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
		const json = (await fetchJson(url)) as {
			current?: {
				temperature_2m?: number;
				weather_code?: number;
				wind_speed_10m?: number;
			};
		} | null;
		const cw = json?.current;
		if (!cw) return null;
		const code = typeof cw.weather_code === 'number' ? cw.weather_code : null;
		return {
			temp: round1(cw.temperature_2m),
			desc: code !== null ? wmoDescription(code) : null,
			windSpeed: round1(cw.wind_speed_10m),
			code,
		};
	}

	// Strictly-future entries: forecast `daily=` for that specific date (day-max values).
	if (epochSeconds >= tomorrowEpoch) {
		const ymd = toDateInput(epochSeconds);
		const url =
			`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
			`&start_date=${ymd}&end_date=${ymd}` +
			`&daily=temperature_2m_max,wind_speed_10m_max,weather_code&timezone=auto`;
		const json = (await fetchJson(url)) as {
			daily?: {
				temperature_2m_max?: (number | null)[];
				wind_speed_10m_max?: (number | null)[];
				weather_code?: (number | null)[];
			};
		} | null;
		const d = json?.daily;
		if (!d || !Array.isArray(d.temperature_2m_max)) return null;
		const code =
			Array.isArray(d.weather_code) && typeof d.weather_code[0] === 'number'
				? d.weather_code[0]
				: null;
		return {
			temp: round1(d.temperature_2m_max[0] ?? null),
			desc: code !== null ? wmoDescription(code) : null,
			windSpeed: round1(d.wind_speed_10m_max?.[0] ?? null),
			code,
		};
	}

	// Backdated entries: archive endpoint (daily max values).
	const ymd = toDateInput(epochSeconds);
	const url =
		`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
		`&start_date=${ymd}&end_date=${ymd}` +
		`&daily=temperature_2m_max,wind_speed_10m_max,weather_code&timezone=auto`;
	const json = (await fetchJson(url)) as {
		daily?: {
			temperature_2m_max?: (number | null)[];
			wind_speed_10m_max?: (number | null)[];
			weather_code?: (number | null)[];
		};
	} | null;
	const d = json?.daily;
	if (!d || !Array.isArray(d.temperature_2m_max)) return null;
	const code =
		Array.isArray(d.weather_code) && typeof d.weather_code[0] === 'number'
			? d.weather_code[0]
			: null;
	return {
		temp: round1(d.temperature_2m_max[0] ?? null),
		desc: code !== null ? wmoDescription(code) : null,
		windSpeed: round1(d.wind_speed_10m_max?.[0] ?? null),
		code,
	};
}

/**
 * Fetches 30 daily aggregates ending on `endEpochSeconds` (inclusive).
 * Returned oldest → newest. If Open-Meteo returns fewer than 30 (e.g. near the
 * archive coverage boundary), returns whatever it returned rather than null.
 */
export async function fetchWeatherHistory(opts: {
	lat: number;
	lon: number;
	endEpochSeconds: number;
}): Promise<WeatherHistoryDay[] | null> {
	const { lat, lon, endEpochSeconds } = opts;
	const startEpoch = endEpochSeconds - 29 * 86400;
	const startYmd = toDateInput(startEpoch);
	const endYmd = toDateInput(endEpochSeconds);
	const url =
		`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
		`&start_date=${startYmd}&end_date=${endYmd}` +
		`&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto`;
	const json = (await fetchJson(url)) as {
		daily?: {
			time?: string[];
			temperature_2m_max?: (number | null)[];
			temperature_2m_min?: (number | null)[];
			precipitation_sum?: (number | null)[];
			weather_code?: (number | null)[];
		};
	} | null;
	const d = json?.daily;
	if (!d || !Array.isArray(d.time)) return null;

	const days: WeatherHistoryDay[] = [];
	for (let i = 0; i < d.time.length; i++) {
		days.push({
			date: d.time[i],
			tMin: round1(d.temperature_2m_min?.[i] ?? null),
			tMax: round1(d.temperature_2m_max?.[i] ?? null),
			precip: round1(d.precipitation_sum?.[i] ?? null),
			code:
				Array.isArray(d.weather_code) && typeof d.weather_code[i] === 'number'
					? (d.weather_code[i] as number)
					: null,
		});
	}
	return days;
}
