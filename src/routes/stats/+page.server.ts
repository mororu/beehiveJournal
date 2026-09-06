// src/routes/stats/+page.server.ts

import { error } from '@sveltejs/kit';
import { getStingStats, getStingYears, currentStatsYear } from '$lib/server/db/queries/stings.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = ({ url }) => {
	const years = getStingYears();
	const yearParam = url.searchParams.get('year');

	let year: number | null;
	if (yearParam === null || yearParam === '') {
		// No redirect to a canonical ?year= — the <select> reflects the resolved year,
		// so a bare /stats link keeps meaning "whatever is current".
		const current = currentStatsYear();
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

	return { stats: getStingStats({ year }), years, selectedYear: year };
};
