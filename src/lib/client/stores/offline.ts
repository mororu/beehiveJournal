// src/lib/client/stores/offline.ts
//
// Reactive Svelte store tracking navigator.onLine status.
// Subscribes to window 'online'/'offline' events and updates in real-time.
// Safe to import in SSR — returns true (online) on the server where
// navigator is not defined.

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createOfflineStore() {
	// Default to true (online). Server-side rendering has no navigator.
	const { subscribe, set } = writable<boolean>(browser ? navigator.onLine : true);

	if (browser) {
		// Update store immediately to reflect current status
		set(navigator.onLine);

		// Story 7.3 AC2: listen to real-time connectivity changes
		window.addEventListener('online', () => set(true));
		window.addEventListener('offline', () => set(false));
	}

	return { subscribe };
}

/**
 * Reactive store: `true` = online, `false` = offline.
 *
 * Usage in Svelte components:
 *   import { isOnline } from '$lib/client/stores/offline.js';
 *   {#if !$isOnline} <OfflineBanner /> {/if}
 */
export const isOnline = createOfflineStore();
