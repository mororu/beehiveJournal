// src/routes/api/stings/[stingId]/+server.ts
// GET    /api/stings/:id — get a single sting incident
// DELETE /api/stings/:id — delete a sting incident (returns 204)

import { json, error } from '@sveltejs/kit';
import { getStingById, deleteStingIncident } from '$lib/server/db/queries/stings.js';
import type { RequestHandler } from './$types.js';

function parseId(params: Record<string, string>): number {
	const id = parseInt(params.stingId, 10);
	if (isNaN(id)) error(400, { message: 'Invalid sting ID' });
	return id;
}

export const GET: RequestHandler = ({ params }) => {
	const id = parseId(params);
	const sting = getStingById(id);
	if (!sting) error(404, { message: 'Sting incident not found' });
	return json(sting);
};

export const DELETE: RequestHandler = ({ params }) => {
	const id = parseId(params);
	if (!getStingById(id)) error(404, { message: 'Sting incident not found' });
	deleteStingIncident(id);
	return new Response(null, { status: 204 });
};
