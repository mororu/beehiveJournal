// src/lib/server/db/queries/honeyHarvests.ts
//
// All Drizzle queries for the honey_harvests table.

import { eq, desc } from 'drizzle-orm';
import { db } from '../index.js';
import { honeyHarvests } from '../schema.js';
import type { HoneyHarvest, NewHoneyHarvest } from '../schema.js';

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns all honey harvests ordered by harvested_at descending.
 */
export function getHarvestEntries(): HoneyHarvest[] {
	return db.select().from(honeyHarvests).orderBy(desc(honeyHarvests.harvestedAt)).all();
}

/**
 * Returns a single honey harvest by ID, or null if not found.
 */
export function getHarvestById(id: number): HoneyHarvest | null {
	const row = db.select().from(honeyHarvests).where(eq(honeyHarvests.id, id)).get();
	return row ?? null;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Inserts a new honey harvest and returns the created row.
 * Returns undefined if a row with the same clientId already exists (offline dedup).
 * `lot` must be provided by the caller — always recomputed server-side from
 * `harvestedAt` via formatLot() (see $lib/client/utils/date.ts).
 */
export function createHarvestEntry(data: {
	harvestedAt: number;
	amountKg: number;
	lot: string;
	notes?: string | null;
	clientId?: string | null;
}): HoneyHarvest | undefined {
	const now = Math.floor(Date.now() / 1000);
	return db
		.insert(honeyHarvests)
		.values({
			harvestedAt: data.harvestedAt,
			amountKg: data.amountKg,
			lot: data.lot,
			notes: data.notes ?? null,
			clientId: data.clientId ?? null,
			createdAt: now,
			updatedAt: now,
		} satisfies NewHoneyHarvest)
		.onConflictDoNothing()
		.returning()
		.get();
}

/**
 * Deletes a honey harvest by ID. Returns true if a row was deleted.
 */
export function deleteHarvestEntry(id: number): boolean {
	const result = db
		.delete(honeyHarvests)
		.where(eq(honeyHarvests.id, id))
		.returning({ id: honeyHarvests.id })
		.get();
	return result !== undefined;
}
