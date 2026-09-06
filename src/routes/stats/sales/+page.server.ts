// src/routes/stats/sales/+page.server.ts

import { error } from '@sveltejs/kit';
import {
	currentSalesYear,
	getHoneySalesStats,
	getHoneySalesYears,
	getSoldLots,
} from '$lib/server/db/queries/honeySales.js';
import type { GiftFilter } from '$lib/server/db/queries/honeySales.js';
import type { PageServerLoad } from './$types.js';

const GIFT_FILTERS: GiftFilter[] = ['all', 'exclude', 'only'];

export const load: PageServerLoad = ({ url }) => {
	const years = getHoneySalesYears();
	const lots = getSoldLots();

	// ── ?year= ────────────────────────────────────────────────────────────────
	const yearParam = url.searchParams.get('year');
	let year: number | null;
	if (yearParam === null || yearParam === '') {
		// No redirect to a canonical ?year= — the <select> reflects the resolved year,
		// so a bare /stats/sales link keeps meaning "whatever is current".
		const current = currentSalesYear();
		year = years.includes(current) ? current : (years[0] ?? current);
	} else if (yearParam === 'all') {
		year = null;
	} else {
		// Strict: reject '2025abc', '-4', '999999' rather than coercing them
		if (!/^\d{4}$/.test(yearParam)) error(400, 'Ungültiger Jahresfilter');
		const parsed = Number(yearParam);
		if (parsed < 2000 || parsed > 2100) error(400, 'Ungültiger Jahresfilter');
		year = parsed;
	}

	// ── ?lot= ─────────────────────────────────────────────────────────────────
	// An unknown lot id is rejected rather than silently ignored: unlike a year, a lot
	// has no meaningful "valid but empty" reading — every lot in the dropdown has at
	// least one sale by construction, and ON DELETE RESTRICT guarantees a sold lot can
	// never disappear. A *known* lot with no sales in the selected year is fine and
	// renders the in-period empty state.
	const lotParam = url.searchParams.get('lot');
	let harvestId: number | null;
	if (lotParam === null || lotParam === '' || lotParam === 'all') {
		harvestId = null;
	} else {
		if (!/^\d+$/.test(lotParam)) error(400, 'Ungültiger Los-Filter');
		const parsed = Number(lotParam);
		if (!lots.some((l) => l.harvestId === parsed)) error(400, 'Unbekanntes Los');
		harvestId = parsed;
	}

	// ── ?gifts= ───────────────────────────────────────────────────────────────
	const giftsParam = url.searchParams.get('gifts');
	let gifts: GiftFilter;
	if (giftsParam === null || giftsParam === '') {
		gifts = 'all';
	} else {
		if (!(GIFT_FILTERS as string[]).includes(giftsParam)) error(400, 'Ungültiger Geschenk-Filter');
		gifts = giftsParam as GiftFilter;
	}

	return {
		stats: getHoneySalesStats({ year, harvestId, gifts }),
		years,
		lots,
		selectedYear: year,
		selectedLot: harvestId,
		selectedGifts: gifts,
	};
};
