// src/lib/server/db/queries/honeySales.ts
//
// All Drizzle queries for the honey_sales table.

import { desc, eq } from 'drizzle-orm';
import { db } from '../index.js';
import { containerSizes, honeyHarvests, honeySales } from '../schema.js';
import type { HoneySale, NewHoneySale } from '../schema.js';

// Flat view row — consumers read `view.soldAt` (not `view.sale.soldAt`), mirroring
// the flat access pattern used elsewhere (see diary/[entryId]/edit).
export type HoneySaleView = HoneySale & {
	lot: string;
	harvestedAt: number;
	containerName: string;
	containerSizeG: number;
};

type WriteInput = {
	harvestId: number;
	containerSizeId: number;
	soldAt: number;
	amount: number;
	customerName: string;
	isGift: boolean;
	priceChf: number | null;
	notes: string | null;
};

// Both FKs are notNull — innerJoin gives non-nullable joined columns.
const baseSelect = {
	id: honeySales.id,
	harvestId: honeySales.harvestId,
	containerSizeId: honeySales.containerSizeId,
	soldAt: honeySales.soldAt,
	amount: honeySales.amount,
	customerName: honeySales.customerName,
	priceChf: honeySales.priceChf,
	isGift: honeySales.isGift,
	notes: honeySales.notes,
	createdAt: honeySales.createdAt,
	updatedAt: honeySales.updatedAt,
	lot: honeyHarvests.lot,
	harvestedAt: honeyHarvests.harvestedAt,
	containerName: containerSizes.name,
	containerSizeG: containerSizes.sizeG,
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export function getHoneySales(): HoneySaleView[] {
	return db
		.select(baseSelect)
		.from(honeySales)
		.innerJoin(honeyHarvests, eq(honeyHarvests.id, honeySales.harvestId))
		.innerJoin(containerSizes, eq(containerSizes.id, honeySales.containerSizeId))
		.orderBy(desc(honeySales.soldAt))
		.all();
}

export function getHoneySaleById(id: number): HoneySaleView | null {
	return (
		db
			.select(baseSelect)
			.from(honeySales)
			.innerJoin(honeyHarvests, eq(honeyHarvests.id, honeySales.harvestId))
			.innerJoin(containerSizes, eq(containerSizes.id, honeySales.containerSizeId))
			.where(eq(honeySales.id, id))
			.get() ?? null
	);
}

// ─── Write ────────────────────────────────────────────────────────────────────

// Gift invariant enforced inside the helper so every caller is safe:
// if isGift → priceChf = null; else priceChf is rounded to 2 dp.
function normalisePrice(isGift: boolean, priceChf: number | null): number | null {
	if (isGift) return null;
	if (priceChf === null) return null;
	return Math.round(priceChf * 100) / 100;
}

export function createHoneySale(data: WriteInput): HoneySale {
	const now = Math.floor(Date.now() / 1000);
	return db
		.insert(honeySales)
		.values({
			harvestId: data.harvestId,
			containerSizeId: data.containerSizeId,
			soldAt: data.soldAt,
			amount: data.amount,
			customerName: data.customerName,
			priceChf: normalisePrice(data.isGift, data.priceChf),
			isGift: data.isGift,
			notes: data.notes,
			createdAt: now,
			updatedAt: now,
		} satisfies NewHoneySale)
		.returning()
		.get();
}

// Non-partial signature — the route must pass the full record shape so a
// "toggle isGift off with a new price" edit cannot silently leave price = NULL.
export function updateHoneySale(id: number, data: WriteInput): HoneySale | null {
	const now = Math.floor(Date.now() / 1000);
	return (
		db
			.update(honeySales)
			.set({
				harvestId: data.harvestId,
				containerSizeId: data.containerSizeId,
				soldAt: data.soldAt,
				amount: data.amount,
				customerName: data.customerName,
				priceChf: normalisePrice(data.isGift, data.priceChf),
				isGift: data.isGift,
				notes: data.notes,
				updatedAt: now,
			})
			.where(eq(honeySales.id, id))
			.returning()
			.get() ?? null
	);
}

export function deleteHoneySale(id: number): boolean {
	return (
		db.delete(honeySales).where(eq(honeySales.id, id)).returning({ id: honeySales.id }).get() !==
		undefined
	);
}
