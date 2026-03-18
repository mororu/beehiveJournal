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
