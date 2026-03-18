// src/lib/server/db/queries/hives.ts
//
// All Drizzle queries for the hives table.
// Route files import from here — never write Drizzle calls directly in routes.

import { eq, and, asc, sql } from 'drizzle-orm';
import { db } from '../index.js';
import { hives, inspections } from '../schema.js';
import type { Hive, NewHive } from '../schema.js';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A hive row extended with the latest inspection summary (may be null). */
export interface HiveWithLastInspection extends Hive {
	lastInspectedAt: number | null;
	lastHealthScore: number | null;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns all active hives ordered by hive number (nulls last) then name.
 * Joins with the most recent inspection per hive for the card display.
 */
export function getActiveHives(): HiveWithLastInspection[] {
	// Subquery to get the latest inspection per hive
	const latestInspections = db
		.select({
			hiveId: inspections.hiveId,
			lastInspectedAt: sql<number>`MAX(${inspections.inspectedAt})`.as('last_inspected_at'),
			lastHealthScore: inspections.healthScore,
		})
		.from(inspections)
		.groupBy(inspections.hiveId)
		.as('latest_inspections');

	const rows = db
		.select({
			id: hives.id,
			name: hives.name,
			number: hives.number,
			description: hives.description,
			isActive: hives.isActive,
			createdAt: hives.createdAt,
			updatedAt: hives.updatedAt,
			lastInspectedAt: latestInspections.lastInspectedAt,
			// We need the health score from the row with the max date, not any row
			lastHealthScore: sql<number | null>`(
				SELECT ${inspections.healthScore}
				FROM ${inspections}
				WHERE ${inspections.hiveId} = ${hives.id}
				ORDER BY ${inspections.inspectedAt} DESC
				LIMIT 1
			)`.as('last_health_score'),
		})
		.from(hives)
		.leftJoin(latestInspections, eq(hives.id, latestInspections.hiveId))
		.where(eq(hives.isActive, true))
		.orderBy(
			// number ASC NULLS LAST, then name ASC
			sql`CASE WHEN ${hives.number} IS NULL THEN 1 ELSE 0 END`,
			asc(hives.number),
			asc(hives.name)
		)
		.all();

	return rows as HiveWithLastInspection[];
}

/**
 * Returns all archived (inactive) hives ordered by name.
 */
export function getArchivedHives(): Hive[] {
	return db.select().from(hives).where(eq(hives.isActive, false)).orderBy(asc(hives.name)).all();
}

/**
 * Returns a single hive by ID, or null if not found.
 */
export function getHiveById(id: number): Hive | null {
	const row = db.select().from(hives).where(eq(hives.id, id)).get();
	return row ?? null;
}

/**
 * Returns the count of currently active hives.
 * Used to enforce the 10-hive active limit.
 */
export function countActiveHives(): number {
	const result = db
		.select({ count: sql<number>`count(*)` })
		.from(hives)
		.where(eq(hives.isActive, true))
		.get();
	return result?.count ?? 0;
}

/**
 * Checks whether an active hive with the given number already exists,
 * optionally excluding a specific hive ID (used during edit to allow
 * keeping the same number).
 */
export function activeHiveWithNumberExists(number: number, excludeId?: number): boolean {
	const conditions = excludeId
		? and(eq(hives.number, number), eq(hives.isActive, true), sql`${hives.id} != ${excludeId}`)
		: and(eq(hives.number, number), eq(hives.isActive, true));

	const row = db.select({ id: hives.id }).from(hives).where(conditions).get();
	return row !== undefined;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Inserts a new hive and returns the created row.
 */
export function createHive(data: {
	name: string;
	number?: number | null;
	description?: string | null;
}): Hive {
	const now = Math.floor(Date.now() / 1000);
	const inserted = db
		.insert(hives)
		.values({
			name: data.name,
			number: data.number ?? null,
			description: data.description ?? null,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		} satisfies NewHive)
		.returning()
		.get();
	return inserted;
}

/**
 * Updates hive fields. Returns the updated row, or null if not found.
 */
export function updateHive(
	id: number,
	data: Partial<Pick<Hive, 'name' | 'number' | 'description' | 'isActive'>>
): Hive | null {
	const now = Math.floor(Date.now() / 1000);
	const updated = db
		.update(hives)
		.set({ ...data, updatedAt: now })
		.where(eq(hives.id, id))
		.returning()
		.get();
	return updated ?? null;
}

/**
 * Deletes a hive and all its associated inspections (cascade via schema).
 * Returns true if a row was deleted.
 */
export function deleteHive(id: number): boolean {
	const result = db.delete(hives).where(eq(hives.id, id)).returning({ id: hives.id }).get();
	return result !== undefined;
}
