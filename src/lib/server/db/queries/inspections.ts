// src/lib/server/db/queries/inspections.ts
//
// All Drizzle queries for the inspections table.
// Route files import from here — never write Drizzle calls directly in routes.

import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../index.js';
import { inspections } from '../schema.js';
import type { Inspection, NewInspection } from '../schema.js';

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns all inspections for a hive, ordered newest-first.
 * Optional date range filter (Unix epoch seconds).
 */
export function getInspectionsByHiveId(
	hiveId: number,
	opts?: { from?: number; to?: number }
): Inspection[] {
	let query = db.select().from(inspections).where(eq(inspections.hiveId, hiveId)).$dynamic();

	if (opts?.from !== undefined) {
		query = query.where(sql`${inspections.inspectedAt} >= ${opts.from}`);
	}
	if (opts?.to !== undefined) {
		query = query.where(sql`${inspections.inspectedAt} <= ${opts.to}`);
	}

	return query.orderBy(desc(inspections.inspectedAt)).all();
}

/**
 * Returns a single inspection by ID, or null if not found.
 */
export function getInspectionById(id: number): Inspection | null {
	const row = db.select().from(inspections).where(eq(inspections.id, id)).get();
	return row ?? null;
}

/**
 * Returns an inspection by its clientId (UUID), or null if not found.
 * Used for server-side deduplication — if a clientId has already been persisted,
 * return the existing record instead of creating a duplicate.
 */
export function getInspectionByClientId(clientId: string): Inspection | null {
	const row = db.select().from(inspections).where(eq(inspections.clientId, clientId)).get();
	return row ?? null;
}

/**
 * Returns the count of inspections for a hive.
 * Used in the delete-hive confirmation message.
 */
export function countInspectionsByHiveId(hiveId: number): number {
	const result = db
		.select({ count: sql<number>`count(*)` })
		.from(inspections)
		.where(eq(inspections.hiveId, hiveId))
		.get();
	return result?.count ?? 0;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Inserts a new inspection and returns the created row.
 */
export function createInspection(data: {
	hiveId: number;
	inspectedAt: number;
	healthScore: number;
	queenStatus: string;
	fluglochBeobachtung?: string | null;
	verhalten?: string | null;
	behaviourNotes?: string | null;
	nextInspectNote?: string | null;
	weatherTemp?: number | null;
	weatherDesc?: string | null;
	weatherWindSpeed?: number | null;
	weatherCode?: number | null;
	weatherLat?: number | null;
	weatherLon?: number | null;
	weatherUnavailable?: boolean;
	clientId?: string | null;
}): Inspection {
	const now = Math.floor(Date.now() / 1000);
	const inserted = db
		.insert(inspections)
		.values({
			hiveId: data.hiveId,
			inspectedAt: data.inspectedAt,
			healthScore: data.healthScore,
			queenStatus: data.queenStatus,
			fluglochBeobachtung: data.fluglochBeobachtung ?? null,
			verhalten: data.verhalten ?? null,
			behaviourNotes: data.behaviourNotes ?? null,
			nextInspectNote: data.nextInspectNote ?? null,
			weatherTemp: data.weatherTemp ?? null,
			weatherDesc: data.weatherDesc ?? null,
			weatherWindSpeed: data.weatherWindSpeed ?? null,
			weatherCode: data.weatherCode ?? null,
			weatherLat: data.weatherLat ?? null,
			weatherLon: data.weatherLon ?? null,
			weatherUnavailable: data.weatherUnavailable ?? false,
			clientId: data.clientId ?? null,
			createdAt: now,
			updatedAt: now,
		} satisfies NewInspection)
		.returning()
		.get();
	return inserted;
}

/**
 * Updates inspection fields. Returns the updated row, or null if not found.
 */
export function updateInspection(
	id: number,
	data: Partial<
		Pick<
			Inspection,
			| 'inspectedAt'
			| 'healthScore'
			| 'queenStatus'
			| 'fluglochBeobachtung'
			| 'verhalten'
			| 'behaviourNotes'
			| 'nextInspectNote'
		>
	>
): Inspection | null {
	const now = Math.floor(Date.now() / 1000);
	const updated = db
		.update(inspections)
		.set({ ...data, updatedAt: now })
		.where(eq(inspections.id, id))
		.returning()
		.get();
	return updated ?? null;
}

/**
 * Deletes an inspection by ID.
 * Returns true if a row was deleted.
 */
export function deleteInspection(id: number): boolean {
	const result = db
		.delete(inspections)
		.where(eq(inspections.id, id))
		.returning({ id: inspections.id })
		.get();
	return result !== undefined;
}
