// src/lib/server/db/queries/photos.ts
//
// All Drizzle queries for the inspection_photos table.
// Route files import from here — never write Drizzle calls directly in routes.

import { eq, count } from 'drizzle-orm';
import { db } from '../index.js';
import { inspectionPhotos } from '../schema.js';
import type { InspectionPhoto } from '../schema.js';

// Maximum photos allowed per inspection (enforced at app layer)
export const MAX_PHOTOS_PER_INSPECTION = 5;

// Allowed MIME types — only common image formats
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;

// Maximum individual photo size in bytes (10 MB)
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns all photo rows for an inspection (data included).
 * Ordered by creation time ascending.
 */
export function getPhotosByInspectionId(inspectionId: number): InspectionPhoto[] {
	return db
		.select()
		.from(inspectionPhotos)
		.where(eq(inspectionPhotos.inspectionId, inspectionId))
		.all();
}

/**
 * Returns photo metadata (id, inspectionId, mimeType, createdAt) without the binary data.
 * Use this when building image lists — avoids loading BLOBs into memory unnecessarily.
 */
export function getPhotoMetaByInspectionId(
	inspectionId: number
): Pick<InspectionPhoto, 'id' | 'inspectionId' | 'mimeType' | 'createdAt'>[] {
	return db
		.select({
			id: inspectionPhotos.id,
			inspectionId: inspectionPhotos.inspectionId,
			mimeType: inspectionPhotos.mimeType,
			createdAt: inspectionPhotos.createdAt,
		})
		.from(inspectionPhotos)
		.where(eq(inspectionPhotos.inspectionId, inspectionId))
		.all();
}

/**
 * Returns a single photo row by ID, or null if not found.
 */
export function getPhotoById(id: number): InspectionPhoto | null {
	const row = db.select().from(inspectionPhotos).where(eq(inspectionPhotos.id, id)).get();
	return row ?? null;
}

/**
 * Returns the count of photos for an inspection.
 */
export function countPhotosByInspectionId(inspectionId: number): number {
	const result = db
		.select({ count: count() })
		.from(inspectionPhotos)
		.where(eq(inspectionPhotos.inspectionId, inspectionId))
		.get();
	return result?.count ?? 0;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Inserts a new photo. Returns the created row.
 * Callers must enforce MAX_PHOTOS_PER_INSPECTION before calling this.
 */
export function createPhoto(data: {
	inspectionId: number;
	data: Buffer;
	mimeType: string;
}): InspectionPhoto {
	const now = Math.floor(Date.now() / 1000);
	const inserted = db
		.insert(inspectionPhotos)
		.values({
			inspectionId: data.inspectionId,
			data: data.data,
			mimeType: data.mimeType,
			createdAt: now,
		})
		.returning()
		.get();
	return inserted;
}

/**
 * Deletes a photo by ID.
 * Returns true if a row was deleted.
 */
export function deletePhoto(id: number): boolean {
	const result = db
		.delete(inspectionPhotos)
		.where(eq(inspectionPhotos.id, id))
		.returning({ id: inspectionPhotos.id })
		.get();
	return result !== undefined;
}

/**
 * Deletes all photos for an inspection.
 */
export function deletePhotosByInspectionId(inspectionId: number): void {
	db.delete(inspectionPhotos).where(eq(inspectionPhotos.inspectionId, inspectionId)).run();
}
