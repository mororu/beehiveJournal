// src/lib/server/statsBuckets.ts
//
// Shared UTC month/year bucketing for the statistics pages.
//
// Buckets are computed in UTC — deliberately, not in Europe/Zurich.
//
// Every date this app stores is an epoch anchored to the wall clock the user typed:
// the app container sets no TZ (node:20-alpine → UTC), so a timestamp written by
// fromDatetimeLocal() stores that wall clock as if it were UTC, and fromDateInput()
// anchors date-only values at local noon, which lands on the same UTC calendar day
// across both Zurich offsets (+1/+2h). Reading either back with getUTC*() therefore
// reproduces exactly the date that was entered.
//
// Bucketing in Europe/Zurich instead would shift every value and push evening
// entries into the following day, month or year.
//
// Consumers: sting_incidents.stung_at (queries/stings.ts) and
// honey_sales.sold_at (queries/honeySales.ts).

/** Unix epoch seconds → "YYYY-MM" in UTC. */
export function monthKey(epoch: number): string {
	const d = new Date(epoch * 1000);
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Unix epoch seconds → calendar year in UTC. */
export function yearOf(epoch: number): number {
	return new Date(epoch * 1000).getUTCFullYear();
}

/** Inclusive list of "YYYY-MM" keys from `from` to `to`; [] if from > to. */
export function monthRange(from: string, to: string): string[] {
	const [fromYear, fromMonth] = from.split('-').map(Number);
	const [toYear, toMonth] = to.split('-').map(Number);

	const keys: string[] = [];
	let year = fromYear;
	let month = fromMonth;

	while (year < toYear || (year === toYear && month <= toMonth)) {
		keys.push(`${year}-${String(month).padStart(2, '0')}`);
		month += 1;
		if (month > 12) {
			month = 1;
			year += 1;
		}
	}

	return keys;
}
