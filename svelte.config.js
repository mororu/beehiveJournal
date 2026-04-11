import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			// Output directory for the Node.js build
			out: 'build',
			// Precompress static assets (gzip + brotli) for faster serving through Nginx
			precompress: true,
			// Match the 10MB limit set in nginx client_max_body_size
			bodySize: 10 * 1024 * 1024,
		}),

		// Alias for cleaner imports — $lib resolves to src/lib
		alias: {
			$lib: 'src/lib',
		},
	},

	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true },
	},
};

export default config;
