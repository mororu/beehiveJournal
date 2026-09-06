// src/lib/server/db/queries/stings.ts
//
// All Drizzle queries for the sting_incidents table.

import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../index.js';
import { stingIncidents, hives } from '../schema.js';
import type { StingIncident, NewStingIncident, Hive } from '../schema.js';

// ─── Extended type ────────────────────────────────────────────────────────────

/** A sting incident row joined with the associated hive name (may be null). */
export interface StingWithHive extends StingIncident {
	hiveName: string | null;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns all sting incidents ordered by stung_at descending.
 * Optionally filtered by hiveId.
 * Joins with hives to include the hive name for display.
 */
export function getStingIncidents(opts?: { hiveId?: number }): StingWithHive[] {
	const query = db
		.select({
			id: stingIncidents.id,
			hiveId: stingIncidents.hiveId,
			stungAt: stingIncidents.stungAt,
			bodyLocation: stingIncidents.bodyLocation,
			notes: stingIncidents.notes,
			clientId: stingIncidents.clientId,
			createdAt: stingIncidents.createdAt,
			hiveName: hives.name,
		})
		.from(stingIncidents)
		.leftJoin(hives, eq(stingIncidents.hiveId, hives.id))
		.orderBy(desc(stingIncidents.stungAt));

	if (opts?.hiveId !== undefined) {
		return query.where(eq(stingIncidents.hiveId, opts.hiveId)).all() as StingWithHive[];
	}

	return query.all() as StingWithHive[];
}

/**
 * Returns a single sting incident by ID, or null if not found.
 */
export function getStingById(id: number): StingIncident | null {
	const row = db.select().from(stingIncidents).where(eq(stingIncidents.id, id)).get();
	return row ?? null;
}

/**
 * Returns all hives that have at least one sting incident.
 * Used to populate the "Filter by hive" dropdown (AC7).
 */
export function getHivesWithStings(): Pick<Hive, 'id' | 'name'>[] {
	return db
		.selectDistinct({ id: hives.id, name: hives.name })
		.from(stingIncidents)
		.innerJoin(hives, eq(stingIncidents.hiveId, hives.id))
		.where(sql`${stingIncidents.hiveId} IS NOT NULL`)
		.orderBy(hives.name)
		.all();
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Inserts a new sting incident and returns the created row.
 */
export function createStingIncident(data: {
	stungAt: number;
	bodyLocation: string;
	hiveId?: number | null;
	notes?: string | null;
	clientId?: string | null;
}): StingIncident {
	const now = Math.floor(Date.now() / 1000);
	const inserted = db
		.insert(stingIncidents)
		.values({
			stungAt: data.stungAt,
			bodyLocation: data.bodyLocation,
			hiveId: data.hiveId ?? null,
			notes: data.notes ?? null,
			clientId: data.clientId ?? null,
			createdAt: now,
		} satisfies NewStingIncident)
		.returning()
		.get();
	return inserted;
}

/**
 * Deletes a sting incident by ID. Returns true if a row was deleted.
 */
export function deleteStingIncident(id: number): boolean {
	const result = db
		.delete(stingIncidents)
		.where(eq(stingIncidents.id, id))
		.returning({ id: stingIncidents.id })
		.get();
	return result !== undefined;
}

// ─── Statistics ───────────────────────────────────────────────────────────────
//
// Buckets are computed in UTC — deliberately, not in Europe/Zurich.
//
// fromDatetimeLocal() runs SERVER-side (src/routes/stings/new/+page.server.ts) and the
// app container sets no TZ (node:20-alpine → UTC), so stung_at stores the wall clock the
// user typed as if it were UTC. Reading it back with getUTC*() reproduces exactly the
// entered date. Bucketing in Europe/Zurich would shift every value +1/+2h and push
// evening entries into the following day, month or year.

/** Unix epoch seconds → "YYYY-MM" in UTC. */
function monthKey(epoch: number): string {
	const d = new Date(epoch * 1000);
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Unix epoch seconds → calendar year in UTC. */
function yearOf(epoch: number): number {
	return new Date(epoch * 1000).getUTCFullYear();
}

/** Inclusive list of "YYYY-MM" keys from `from` to `to`; [] if from > to. */
function monthRange(from: string, to: string): string[] {
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

export interface StingMonthBucket {
	key: string; // "YYYY-MM"
	count: number;
}

export interface StingLocationCount {
	label: string;
	count: number;
}

export interface StingStats {
	totalAllTime: number;
	totalInPeriod: number;
	perMonth: StingMonthBucket[];
	byLocation: StingLocationCount[]; // descending by count, then label A→Z
	topLocation: StingLocationCount | null;
	avgPerMonth: number; // one decimal, formatted for display by the page
	spanFrom: string | null; // "YYYY-MM" of the first sting in the period
	spanTo: string | null; // "YYYY-MM" of the last sting in the period
}

/**
 * Returns every calendar year that has at least one sting, newest first.
 *
 * Derived with yearOf() rather than SQL strftime so the dropdown can never
 * disagree with the month buckets.
 */
export function getStingYears(): number[] {
	const rows = db.select({ stungAt: stingIncidents.stungAt }).from(stingIncidents).all();
	return [...new Set(rows.map((r) => yearOf(r.stungAt)))].sort((a, b) => b - a);
}

/** The year selected by default when no ?year= is given. */
export function currentStatsYear(): number {
	return new Date().getUTCFullYear();
}

/**
 * Aggregates sting incidents for the statistics page.
 *
 * One row fetch plus a JS reduce: a single round trip with all bucketing logic in one
 * place. At this volume (well under a thousand rows) that is imperceptible; past roughly
 * 5,000 rows, add an index on stung_at and move the buckets into SQL with
 * strftime('%Y-%m', stung_at, 'unixepoch') — correct because bucketing is UTC.
 *
 * @param opts.year - restrict to this calendar year, or null for all time
 */
export function getStingStats(opts: { year: number | null }): StingStats {
	const rows = db
		.select({ stungAt: stingIncidents.stungAt, bodyLocation: stingIncidents.bodyLocation })
		.from(stingIncidents)
		.all();

	const totalAllTime = rows.length;
	const inPeriod = opts.year === null ? rows : rows.filter((r) => yearOf(r.stungAt) === opts.year);
	const totalInPeriod = inPeriod.length;

	const monthCounts = new Map<string, number>();
	const locationCounts = new Map<string, number>();
	for (const row of inPeriod) {
		const key = monthKey(row.stungAt);
		monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
		locationCounts.set(row.bodyLocation, (locationCounts.get(row.bodyLocation) ?? 0) + 1);
	}

	// "YYYY-MM" sorts correctly as a plain string
	const presentKeys = [...monthCounts.keys()].sort();
	const spanFrom = presentKeys[0] ?? null;
	const spanTo = presentKeys[presentKeys.length - 1] ?? null;

	// A concrete year always shows all twelve months so the seasonal shape is readable.
	// "Alle" spans first→last sting, so gaps render as zero bars instead of collapsing.
	let axisKeys: string[];
	if (opts.year !== null) {
		axisKeys = monthRange(`${opts.year}-01`, `${opts.year}-12`);
	} else if (spanFrom !== null && spanTo !== null) {
		axisKeys = monthRange(spanFrom, spanTo);
	} else {
		axisKeys = [];
	}
	const perMonth = axisKeys.map((key) => ({ key, count: monthCounts.get(key) ?? 0 }));

	const byLocation = [...locationCounts.entries()]
		.map(([label, count]) => ({ label, count }))
		.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
	const topLocation = byLocation[0] ?? null;

	const months = spanFrom !== null && spanTo !== null ? monthRange(spanFrom, spanTo).length : 0;
	const avgPerMonth =
		totalInPeriod === 0 ? 0 : Math.round((totalInPeriod / Math.max(1, months)) * 10) / 10;

	return {
		totalAllTime,
		totalInPeriod,
		perMonth,
		byLocation,
		topLocation,
		avgPerMonth,
		spanFrom,
		spanTo,
	};
}
