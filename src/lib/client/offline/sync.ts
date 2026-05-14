// src/lib/client/offline/sync.ts
//
// Background sync: reads pending entries from IndexedDB outbox and POSTs them
// to the server. Triggered on window 'online' event and document visibilitychange.
// Story 7.5.

import { browser } from '$app/environment';
import { invalidateAll } from '$app/navigation';
import { getAllOutboxEntries, removeFromOutbox, updateOutboxEntry } from './db.js';
import { pendingSync } from '$lib/client/stores/pendingSync.js';

let syncInProgress = false;

/**
 * Attempts to POST all pending outbox entries to the server.
 *
 * - Processes entries serially to avoid race conditions.
 * - Successfully synced entries are removed from the outbox.
 * - Failed entries remain with syncStatus:'error' and retry on the next call.
 * - After all attempts, refreshes the pending count store.
 * - Calls invalidateAll() so any open hive detail page reloads its inspection list.
 */
export async function syncOutbox(): Promise<void> {
	if (!browser) return;
	if (syncInProgress) return; // Prevent concurrent sync runs
	syncInProgress = true;

	try {
		const entries = await getAllOutboxEntries();
		if (entries.length === 0) return;

		let synced = 0;

		for (const entry of entries) {
			try {
				const res = await fetch(`/api/hives/${entry.hiveId}/inspections`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						inspectedAt: entry.inspectedAt,
						healthScore: entry.healthScore,
						queenStatus: entry.queenStatus,
						fluglochBeobachtung: entry.fluglochBeobachtung,
						verhalten: entry.verhalten ?? null,
						behaviourNotes: entry.behaviourNotes,
						nextInspectNote: entry.nextInspectNote,
						weatherTemp: entry.weatherTemp,
						weatherDesc: entry.weatherDesc,
						weatherWindSpeed: entry.weatherWindSpeed,
						weatherCode: entry.weatherCode,
						weatherLat: entry.weatherLat,
						weatherLon: entry.weatherLon,
						weatherUnavailable: entry.weatherUnavailable,
						clientId: entry.clientId, // server uses this for dedup (unique index)
					}),
				});

				if (res.ok || res.status === 409) {
					// 201 = created, 409 = already exists (duplicate clientId) — both count as synced
					await removeFromOutbox(entry.clientId);
					synced++;
				} else {
					// Server error (4xx other than 409, 5xx) — mark as error, retry next time
					await updateOutboxEntry(entry.clientId, { syncStatus: 'error' });
				}
			} catch {
				// Network error — entry stays pending, retries on next sync trigger
				await updateOutboxEntry(entry.clientId, { syncStatus: 'error' });
			}
		}

		// Refresh the pending count badge regardless of outcome
		await pendingSync.refresh();

		// Story 7.5 AC8: invalidate SvelteKit page data so hive detail refreshes
		if (synced > 0) {
			await invalidateAll();
		}
	} finally {
		syncInProgress = false;
	}
}

/**
 * Register background sync triggers.
 * Call once on app mount (in root layout $effect).
 *
 * Triggers:
 *  - window 'online' event (Story 7.5 AC2)
 *  - document visibilitychange to 'visible' (Story 7.5 AC3 — covers iOS Safari)
 */
export function registerSyncTriggers(): void {
	if (!browser) return;

	window.addEventListener('online', () => {
		syncOutbox();
	});

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible' && navigator.onLine) {
			syncOutbox();
		}
	});

	// Also attempt sync immediately on registration (e.g. app opened while online
	// with pending entries from a previous offline session)
	if (navigator.onLine) {
		syncOutbox();
	}
}
