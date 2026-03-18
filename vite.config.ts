import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			// Story 7.2: Service worker registers and updates automatically
			registerType: 'autoUpdate',

			// Point to the manifest we manage manually in static/
			manifest: false,

			// Story 7.2 AC3: precache the full app shell
			workbox: {
				// Glob patterns matched against the Vite build output
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],

				// Story 7.2 AC5: NetworkFirst for API data endpoints (5s timeout, 24h cache)
				runtimeCaching: [
					{
						urlPattern: /^https?:\/\/.*\/api\/hives(\/.*\/inspections)?$/,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-hives-cache',
							networkTimeoutSeconds: 5,
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24, // 24 hours
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
					// Story 7.2 AC6: Open-Meteo is NetworkOnly — weather must be fresh
					{
						urlPattern: /^https:\/\/api\.open-meteo\.com\//,
						handler: 'NetworkOnly',
					},
				],

				// Don't precache server-side SvelteKit route handlers
				navigateFallback: null,
			},

			devOptions: {
				// Enable in dev so SW is exercised during development testing
				enabled: false,
				type: 'module',
			},
		}),
	],
});
