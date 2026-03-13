import { defineConfig } from 'drizzle-kit';

// Load DATABASE_PATH from environment (set in .env.local for dev, .env for production)
const databasePath = process.env.DATABASE_PATH;
if (!databasePath) {
	throw new Error(
		'DATABASE_PATH environment variable is not set. Check your .env.local file.'
	);
}

export default defineConfig({
	dialect: 'sqlite',
	schema: './src/lib/server/db/schema.ts',
	out: './src/lib/server/db/migrations',
	dbCredentials: {
		url: databasePath,
	},
	// Verbose output during migration — helpful for debugging
	verbose: true,
	// Strict mode — fail on any ambiguity rather than making assumptions
	strict: true,
});
