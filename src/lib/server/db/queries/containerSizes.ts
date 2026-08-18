// src/lib/server/db/queries/containerSizes.ts
//
// All Drizzle queries for the container_sizes table.

import { asc, eq } from 'drizzle-orm';
import { db } from '../index.js';
import { containerSizes } from '../schema.js';
import type { ContainerSize, NewContainerSize } from '../schema.js';

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns all container sizes ordered by sizeG ASC, then name ASC (deterministic).
 */
export function getContainerSizes(): ContainerSize[] {
	return db
		.select()
		.from(containerSizes)
		.orderBy(asc(containerSizes.sizeG), asc(containerSizes.name))
		.all();
}

/**
 * Returns a single container size by ID, or null if not found.
 */
export function getContainerSizeById(id: number): ContainerSize | null {
	return db.select().from(containerSizes).where(eq(containerSizes.id, id)).get() ?? null;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export function createContainerSize(data: { name: string; sizeG: number }): ContainerSize {
	const now = Math.floor(Date.now() / 1000);
	return db
		.insert(containerSizes)
		.values({
			name: data.name,
			sizeG: data.sizeG,
			createdAt: now,
			updatedAt: now,
		} satisfies NewContainerSize)
		.returning()
		.get();
}

export function updateContainerSize(
	id: number,
	data: { name: string; sizeG: number }
): ContainerSize | null {
	const now = Math.floor(Date.now() / 1000);
	return (
		db
			.update(containerSizes)
			.set({ name: data.name, sizeG: data.sizeG, updatedAt: now })
			.where(eq(containerSizes.id, id))
			.returning()
			.get() ?? null
	);
}

/**
 * Deletes a container size by ID. Returns { ok: false, reason: 'referenced' }
 * when the size is referenced by a honey_sales row (FK RESTRICT triggers a
 * SQLITE_CONSTRAINT error). Any other error is rethrown.
 */
export function deleteContainerSize(
	id: number
): { ok: true } | { ok: false; reason: 'referenced' } {
	try {
		db.delete(containerSizes).where(eq(containerSizes.id, id)).run();
		return { ok: true };
	} catch (err) {
		if (err instanceof Error && err.name === 'SqliteError') {
			const code = (err as unknown as { code?: unknown }).code;
			// Prefer the specific FK/trigger subcodes; fall back to the generic
			// SQLITE_CONSTRAINT prefix because better-sqlite3 build flags don't
			// always expose the specialised code (see tech-spec "Container FK
			// strategy" bullet).
			if (
				code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
				code === 'SQLITE_CONSTRAINT_TRIGGER' ||
				(typeof code === 'string' && code.startsWith('SQLITE_CONSTRAINT'))
			) {
				return { ok: false, reason: 'referenced' };
			}
		}
		throw err;
	}
}
