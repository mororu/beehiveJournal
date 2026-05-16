// src/lib/server/db/queries/honeyHarvests.ts
//
// All Drizzle queries for the honey_harvests table.

import { eq, desc } from 'drizzle-orm';
import { db } from '../index.js';
import { honeyHarvests, hives } from '../schema.js';
import type { HoneyHarvest, NewHoneyHarvest } from '../schema.js';

// ─── Extended type ────────────────────────────────────────────────────────────

/** A honey harvest row joined with the associated hive name (may be null). */
export interface HarvestWithHive extends HoneyHarvest {
	hiveName: string | null;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns all honey harvests ordered by harvested_at descending.
 * Optionally filtered by hiveId.
 * Joins with hives to include the hive name for display.
 */
export function getHarvestEntries(opts?: { hiveId?: number }): HarvestWithHive[] {
	const query = db
		.select({
			id: honeyHarvests.id,
			hiveId: honeyHarvests.hiveId,
			harvestedAt: honeyHarvests.harvestedAt,
			amountKg: honeyHarvests.amountKg,
			notes: honeyHarvests.notes,
			clientId: honeyHarvests.clientId,
			createdAt: honeyHarvests.createdAt,
			updatedAt: honeyHarvests.updatedAt,
			hiveName: hives.name,
		})
		.from(honeyHarvests)
		.leftJoin(hives, eq(honeyHarvests.hiveId, hives.id))
		.orderBy(desc(honeyHarvests.harvestedAt));

	if (opts?.hiveId !== undefined) {
		return query.where(eq(honeyHarvests.hiveId, opts.hiveId)).all() as HarvestWithHive[];
	}

	return query.all() as HarvestWithHive[];
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
 */
export function createHarvestEntry(data: {
	hiveId: number;
	harvestedAt: number;
	amountKg: number;
	notes?: string | null;
	clientId?: string | null;
}): HoneyHarvest | undefined {
	const now = Math.floor(Date.now() / 1000);
	return db
		.insert(honeyHarvests)
		.values({
			hiveId: data.hiveId,
			harvestedAt: data.harvestedAt,
			amountKg: data.amountKg,
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
