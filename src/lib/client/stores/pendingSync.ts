// src/lib/client/stores/pendingSync.ts
//
// Reactive store tracking the number of pending offline entries in the outbox.
// Updated by sync.ts after every add/remove operation.

import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { getOutboxCount, getHarvestsOutboxCount } from '$lib/client/offline/db.js';

function createPendingSyncStore() {
	const { subscribe, set } = writable<number>(0);

	async function refresh() {
		if (!browser) return;
		try {
			const [inspCount, harvestCount] = await Promise.all([
				getOutboxCount(),
				getHarvestsOutboxCount(),
			]);
			set(inspCount + harvestCount);
		} catch {
			// IndexedDB unavailable (e.g. private browsing in some browsers) — fail silently
			set(0);
		}
	}

	// Initial load from IndexedDB
	if (browser) {
		refresh();
	}

	return { subscribe, refresh };
}

/**
 * Reactive store: number of inspection entries waiting to sync.
 * Call `pendingSync.refresh()` after adding or removing outbox entries.
 */
export const pendingSync = createPendingSyncStore();
