// src/lib/server/db/queries/diary.ts
//
// All Drizzle queries for the diary_entries table.

import { desc, eq, or, sql } from 'drizzle-orm';
import { db } from '../index.js';
import { diaryEntries } from '../schema.js';
import type { DiaryEntry, NewDiaryEntry } from '../schema.js';

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns diary entries ordered newest first.
 * Optional case-insensitive substring search on `title` OR `body` (via LOWER()
 * to match German umlauts — SQLite's default LIKE is ASCII-only case-insensitive).
 */
export function getDiaryEntries(opts?: { search?: string }): DiaryEntry[] {
	const q = opts?.search?.trim();
	if (!q) {
		return db.select().from(diaryEntries).orderBy(desc(diaryEntries.entryDate)).all();
	}
	const pattern = `%${q.toLowerCase()}%`;
	return db
		.select()
		.from(diaryEntries)
		.where(
			or(
				sql`lower(${diaryEntries.title}) like ${pattern}`,
				sql`lower(${diaryEntries.body}) like ${pattern}`
			)
		)
		.orderBy(desc(diaryEntries.entryDate))
		.all();
}

export function getDiaryEntryById(id: number): DiaryEntry | null {
	return db.select().from(diaryEntries).where(eq(diaryEntries.id, id)).get() ?? null;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export function createDiaryEntry(data: {
	entryDate: number;
	title: string;
	body: string | null;
	weatherLat: number | null;
	weatherLon: number | null;
	weatherTemp: number | null;
	weatherDesc: string | null;
	weatherWindSpeed: number | null;
	weatherCode: number | null;
	weatherUnavailable: boolean;
	weatherHistory: string | null; // pre-serialised JSON
}): DiaryEntry {
	const now = Math.floor(Date.now() / 1000);
	return db
		.insert(diaryEntries)
		.values({ ...data, createdAt: now, updatedAt: now } satisfies NewDiaryEntry)
		.returning()
		.get();
}

export function updateDiaryEntry(
	id: number,
	data: Partial<{
		entryDate: number;
		title: string;
		body: string | null;
		weatherLat: number | null;
		weatherLon: number | null;
		weatherTemp: number | null;
		weatherDesc: string | null;
		weatherWindSpeed: number | null;
		weatherCode: number | null;
		weatherUnavailable: boolean;
		weatherHistory: string | null;
	}>
): DiaryEntry | null {
	const now = Math.floor(Date.now() / 1000);
	return (
		db
			.update(diaryEntries)
			.set({ ...data, updatedAt: now })
			.where(eq(diaryEntries.id, id))
			.returning()
			.get() ?? null
	);
}

export function deleteDiaryEntry(id: number): boolean {
	return (
		db
			.delete(diaryEntries)
			.where(eq(diaryEntries.id, id))
			.returning({ id: diaryEntries.id })
			.get() !== undefined
	);
}
