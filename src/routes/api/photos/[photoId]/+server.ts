// src/routes/api/photos/[photoId]/+server.ts
//
// Serves a single inspection photo by ID.
// The photo BLOB and MIME type are fetched from SQLite and returned as a
// proper image response with caching headers.
//
// Route: GET /api/photos/[photoId]

import { error } from '@sveltejs/kit';
import { getPhotoById } from '$lib/server/db/queries/photos.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = ({ params }) => {
	const id = parseInt(params.photoId, 10);
	if (isNaN(id)) error(404, 'Foto nicht gefunden');

	const photo = getPhotoById(id);
	if (!photo) error(404, 'Foto nicht gefunden');

	return new Response(new Uint8Array(photo.data as Buffer), {
		headers: {
			'Content-Type': photo.mimeType,
			// Cache for 1 year — photos are immutable (deleted, never updated)
			'Cache-Control': 'private, max-age=31536000, immutable',
		},
	});
};
