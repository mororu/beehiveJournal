// src/lib/server/db/queries/honeyHarvests.ts
//
// All Drizzle queries for the honey_harvests table.

import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../index.js';
import { honeyHarvests } from '../schema.js';
import type { HoneyHarvest, NewHoneyHarvest } from '../schema.js';

export type HarvestWithRemaining = HoneyHarvest & { soldKg: number; remainingKg: number };

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns all honey harvests ordered by harvested_at descending.
 */
export function getHarvestEntries(): HoneyHarvest[] {
	return db.select().from(honeyHarvests).orderBy(desc(honeyHarvests.harvestedAt)).all();
}

/**
 * Returns all honey harvests annotated with soldKg + remainingKg, using a
 * correlated subquery to sum sold grams per lot. A LEFT JOIN + GROUP BY would
 * row-multiply when a lot has >=2 sales unless every selected column appears in
 * the GROUP BY — the correlated subquery avoids that fragility.
 * COALESCE(size_g, 0) inside the SUM is belt-and-braces even though the FK is
 * ON DELETE RESTRICT.
 */
export function getHarvestEntriesWithRemaining(): HarvestWithRemaining[] {
	const rows = db.all<{
		id: number;
		harvested_at: number;
		amount_kg: number;
		lot: string;
		notes: string | null;
		client_id: string | null;
		created_at: number;
		updated_at: number;
		sold_g: number;
	}>(sql`
		SELECT
			hh.id,
			hh.harvested_at,
			hh.amount_kg,
			hh.lot,
			hh.notes,
			hh.client_id,
			hh.created_at,
			hh.updated_at,
			COALESCE((
				SELECT SUM(hs.amount * COALESCE(cs.size_g, 0))
				FROM honey_sales hs
				LEFT JOIN container_sizes cs ON cs.id = hs.container_size_id
				WHERE hs.harvest_id = hh.id
			), 0) AS sold_g
		FROM honey_harvests hh
		ORDER BY hh.harvested_at DESC
	`);
	return rows.map((r) => {
		const soldKg = r.sold_g / 1000;
		return {
			id: r.id,
			harvestedAt: r.harvested_at,
			amountKg: r.amount_kg,
			lot: r.lot,
			notes: r.notes,
			clientId: r.client_id,
			createdAt: r.created_at,
			updatedAt: r.updated_at,
			soldKg,
			remainingKg: r.amount_kg - soldKg,
		};
	});
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
