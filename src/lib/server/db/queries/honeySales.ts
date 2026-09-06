// src/lib/server/db/queries/honeySales.ts
//
// All Drizzle queries for the honey_sales table.

import { desc, eq } from 'drizzle-orm';
import { db } from '../index.js';
import { containerSizes, honeyHarvests, honeySales } from '../schema.js';
import type { HoneySale, NewHoneySale } from '../schema.js';
import { monthKey, yearOf, monthRange } from '../../statsBuckets.js';

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

// ─── Statistics ───────────────────────────────────────────────────────────────
//
// UTC bucketing rationale lives in $lib/server/statsBuckets.ts

export type GiftFilter = 'all' | 'exclude' | 'only';

export interface SoldLot {
	harvestId: number;
	lot: string;
	harvestedAt: number;
	amountKg: number;
}

export interface SalesMonthBucket {
	key: string; // "YYYY-MM"
	kg: number;
	chf: number;
}

export interface LotBreakdownRow {
	harvestId: number;
	lot: string;
	harvestedAt: number;
	kg: number; // PAID kg — gifts are reported separately so each row reconciles
	giftKg: number;
	chf: number;
	avgChfPerKg: number | null;
}

export interface ContainerBreakdownRow {
	containerSizeId: number;
	containerName: string;
	sizeG: number;
	containers: number; // PAID containers
	kg: number; // PAID kg
	giftKg: number;
	chf: number;
}

export interface CustomerBreakdownRow {
	customerName: string;
	kg: number; // PAID kg
	giftKg: number;
	chf: number;
}

export interface HoneySalesStats {
	totalSalesAllTime: number; // unfiltered row count — drives the page-level empty state
	saleCount: number; // rows matching the active filters
	containerCount: number; // SUM(amount) over paid + gift rows in the period
	paidKg: number; // kg from rows where is_gift = false
	giftKg: number; // kg from rows where is_gift = true
	paidContainers: number;
	giftContainers: number;
	revenueChf: number; // SUM(price_chf) — gifts contribute nothing
	avgChfPerKg: number | null; // revenueChf / paidKg; null when paidKg === 0
	perMonth: SalesMonthBucket[];
	byLot: LotBreakdownRow[];
	byContainer: ContainerBreakdownRow[];
	byCustomer: CustomerBreakdownRow[];
	spanFrom: string | null; // "YYYY-MM" of the earliest sale in the period
	spanTo: string | null; // "YYYY-MM" of the latest sale in the period
}

/**
 * Returns every calendar year that has at least one sale, newest first.
 *
 * Derived with yearOf() rather than SQL strftime so the dropdown can never
 * disagree with the month buckets.
 */
export function getHoneySalesYears(): number[] {
	const rows = db.select({ soldAt: honeySales.soldAt }).from(honeySales).all();
	return [...new Set(rows.map((r) => yearOf(r.soldAt)))].sort((a, b) => b - a);
}

/**
 * The year selected by default when no ?year= is given.
 *
 * A local one-liner rather than importing currentStatsYear from stings.ts:
 * a honey page must not depend on the stings domain module.
 */
export function currentSalesYear(): number {
	return new Date().getUTCFullYear();
}

/**
 * Every harvest with at least one sale, newest harvestedAt first.
 *
 * Ignores every active filter deliberately: switching the year must never
 * shrink or empty the lot dropdown under the user.
 *
 * Keyed on harvest id, not on `lot` — honey_harvests has no unique index on
 * `lot` and the label is recomputed as `L` + ddmmyyyy, so two harvests on the
 * same day carry an identical label. Grouping by label would silently merge
 * two distinct lots into one plausible-looking figure.
 */
export function getSoldLots(): SoldLot[] {
	return (
		db
			.selectDistinct({
				harvestId: honeyHarvests.id,
				lot: honeyHarvests.lot,
				harvestedAt: honeyHarvests.harvestedAt,
				amountKg: honeyHarvests.amountKg,
			})
			.from(honeyHarvests)
			.innerJoin(honeySales, eq(honeySales.harvestId, honeyHarvests.id))
			// The id tiebreak is load-bearing, not cosmetic: two harvests on the same day
			// would otherwise fall back to rowid order here and to the byLot sort order in
			// the breakdown table, listing the same two lots in opposite orders.
			.orderBy(desc(honeyHarvests.harvestedAt), desc(honeyHarvests.id))
			.all()
	);
}

/**
 * Aggregates honey sales for the statistics page.
 *
 * One row fetch plus a JS reduce: a single round trip with all bucketing logic in one
 * place. At this volume (well under a thousand rows) that is imperceptible; past roughly
 * 5,000 rows, add an index on sold_at and move the buckets into SQL with
 * strftime('%Y-%m', sold_at, 'unixepoch') — correct because bucketing is UTC.
 *
 * Currency accumulates in integer Rappen and kilograms in integer grams, each divided
 * once at the end: summing floats row by row drifts (10.10 + 10.20 + 10.30 ≠ 30.60).
 *
 * price_chf is the LINE TOTAL for the whole sale, never a unit price — it is summed
 * flat and never multiplied by `amount`.
 *
 * @param filter.year - restrict to this calendar year of sold_at, or null for all time
 * @param filter.harvestId - restrict to this lot, or null for all lots
 * @param filter.gifts - 'all' | 'exclude' (paid only) | 'only' (gifts only)
 */
export function getHoneySalesStats(filter: {
	year: number | null;
	harvestId: number | null;
	gifts: GiftFilter;
}): HoneySalesStats {
	const rows = db
		.select(baseSelect)
		.from(honeySales)
		.innerJoin(honeyHarvests, eq(honeyHarvests.id, honeySales.harvestId))
		.innerJoin(containerSizes, eq(containerSizes.id, honeySales.containerSizeId))
		.all();

	const totalSalesAllTime = rows.length;

	const inPeriod = rows.filter((r) => {
		if (filter.year !== null && yearOf(r.soldAt) !== filter.year) return false;
		if (filter.harvestId !== null && r.harvestId !== filter.harvestId) return false;
		// Gift-ness is decided by is_gift alone. price_chf = 0 is a legal, deliberate
		// state (a paid-for-free sample) and is explicitly NOT a gift.
		if (filter.gifts === 'exclude' && r.isGift) return false;
		if (filter.gifts === 'only' && !r.isGift) return false;
		return true;
	});

	// Integer accumulators: grams and Rappen
	let containerCount = 0;
	let paidGrams = 0;
	let giftGrams = 0;
	let paidContainers = 0;
	let giftContainers = 0;
	let revenueRappen = 0;

	const monthMap = new Map<string, { grams: number; rappen: number }>();
	const lotMap = new Map<
		number,
		{ lot: string; harvestedAt: number; paidGrams: number; giftGrams: number; rappen: number }
	>();
	const containerMap = new Map<
		number,
		{
			containerName: string;
			sizeG: number;
			containers: number;
			paidGrams: number;
			giftGrams: number;
			rappen: number;
		}
	>();
	const customerMap = new Map<string, { paidGrams: number; giftGrams: number; rappen: number }>();

	for (const row of inPeriod) {
		const grams = row.amount * row.containerSizeG;
		// Gift-safe at the source, so all four accumulators inherit the invariant:
		// a gift contributes no revenue even if a row was edited directly in the DB
		// to violate C3 (isGift = true with a non-null price_chf).
		const rappen = row.isGift || row.priceChf === null ? 0 : Math.round(row.priceChf * 100);

		containerCount += row.amount;
		if (row.isGift) {
			giftGrams += grams;
			giftContainers += row.amount;
		} else {
			paidGrams += grams;
			paidContainers += row.amount;
		}
		revenueRappen += rappen;

		const mKey = monthKey(row.soldAt);
		const month = monthMap.get(mKey) ?? { grams: 0, rappen: 0 };
		month.grams += grams;
		month.rappen += rappen;
		monthMap.set(mKey, month);

		const lot = lotMap.get(row.harvestId) ?? {
			lot: row.lot,
			harvestedAt: row.harvestedAt,
			paidGrams: 0,
			giftGrams: 0,
			rappen: 0,
		};
		if (row.isGift) lot.giftGrams += grams;
		else lot.paidGrams += grams;
		lot.rappen += rappen;
		lotMap.set(row.harvestId, lot);

		const container = containerMap.get(row.containerSizeId) ?? {
			containerName: row.containerName,
			sizeG: row.containerSizeG,
			containers: 0,
			paidGrams: 0,
			giftGrams: 0,
			rappen: 0,
		};
		if (row.isGift) {
			container.giftGrams += grams;
		} else {
			container.containers += row.amount;
			container.paidGrams += grams;
		}
		container.rappen += rappen;
		containerMap.set(row.containerSizeId, container);

		const customer = customerMap.get(row.customerName) ?? {
			paidGrams: 0,
			giftGrams: 0,
			rappen: 0,
		};
		if (row.isGift) customer.giftGrams += grams;
		else customer.paidGrams += grams;
		customer.rappen += rappen;
		customerMap.set(row.customerName, customer);
	}

	// "YYYY-MM" sorts correctly as a plain string
	const presentKeys = [...monthMap.keys()].sort();
	const spanFrom = presentKeys[0] ?? null;
	const spanTo = presentKeys[presentKeys.length - 1] ?? null;

	// A concrete year always shows all twelve months so the seasonal shape is readable.
	// "Alle" spans first→last sale, so gaps render as zero bars instead of collapsing.
	let axisKeys: string[];
	if (filter.year !== null) {
		axisKeys = monthRange(`${filter.year}-01`, `${filter.year}-12`);
	} else if (spanFrom !== null && spanTo !== null) {
		axisKeys = monthRange(spanFrom, spanTo);
	} else {
		axisKeys = [];
	}
	const perMonth: SalesMonthBucket[] = axisKeys.map((key) => {
		const bucket = monthMap.get(key);
		return {
			key,
			kg: (bucket?.grams ?? 0) / 1000,
			chf: (bucket?.rappen ?? 0) / 100,
		};
	});

	const byLot: LotBreakdownRow[] = [...lotMap.entries()]
		.map(([harvestId, v]) => ({
			harvestId,
			lot: v.lot,
			harvestedAt: v.harvestedAt,
			kg: v.paidGrams / 1000,
			giftKg: v.giftGrams / 1000,
			chf: v.rappen / 100,
			avgChfPerKg: v.paidGrams === 0 ? null : Math.round(v.rappen / (v.paidGrams / 1000)) / 100,
		}))
		// Newest lot first, matching every other date-ordered list in the app.
		// Same tiebreak as getSoldLots() so the table and the dropdown agree.
		.sort((a, b) => b.harvestedAt - a.harvestedAt || b.harvestId - a.harvestId);

	const byContainer: ContainerBreakdownRow[] = [...containerMap.entries()]
		.map(([containerSizeId, v]) => ({
			containerSizeId,
			containerName: v.containerName,
			sizeG: v.sizeG,
			containers: v.containers,
			kg: v.paidGrams / 1000,
			giftKg: v.giftGrams / 1000,
			chf: v.rappen / 100,
		}))
		// Matches getContainerSizes(): sizeG ASC, then name ASC
		.sort((a, b) => a.sizeG - b.sizeG || a.containerName.localeCompare(b.containerName));

	const byCustomer: CustomerBreakdownRow[] = [...customerMap.entries()]
		.map(([customerName, v]) => ({
			customerName,
			kg: v.paidGrams / 1000,
			giftKg: v.giftGrams / 1000,
			chf: v.rappen / 100,
		}))
		// The kg tiebreaks keep the list meaningfully ordered under "Nur Geschenke",
		// where every chf AND every paid kg is 0 — without the giftKg fallback the
		// table would collapse into alphabetical order.
		.sort(
			(a, b) =>
				b.chf - a.chf ||
				b.kg - a.kg ||
				b.giftKg - a.giftKg ||
				a.customerName.localeCompare(b.customerName)
		);

	const paidKg = paidGrams / 1000;
	const revenueChf = revenueRappen / 100;

	return {
		totalSalesAllTime,
		saleCount: inPeriod.length,
		containerCount,
		paidKg,
		giftKg: giftGrams / 1000,
		paidContainers,
		giftContainers,
		revenueChf,
		avgChfPerKg: paidGrams === 0 ? null : Math.round(revenueRappen / paidKg) / 100,
		perMonth,
		byLot,
		byContainer,
		byCustomer,
		spanFrom,
		spanTo,
	};
}
