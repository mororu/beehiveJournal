import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';

// Fail fast if DATABASE_PATH is not configured.
// This is checked at module load time — if the env var is missing,
// the server will crash immediately on startup, not silently later.
const databasePath = process.env.DATABASE_PATH;
if (!databasePath) {
	throw new Error(
		'DATABASE_PATH environment variable is not set.\n' +
			'For local development, create a .env.local file with:\n' +
			'  DATABASE_PATH=./data/dev.sqlite\n' +
			'For production, set DATABASE_PATH=/data/db.sqlite'
	);
}

// Singleton pattern: one Database connection per Node.js process.
// better-sqlite3 is synchronous — this is correct and intentional for a
// single-user app. SQLite's single-writer model means async adds no benefit.
const sqlite = new Database(databasePath);

// Enable WAL mode for better concurrent read performance.
// WAL allows reads to proceed while a write is in progress.
// This persists across connections — run once at startup.
sqlite.pragma('journal_mode = WAL');

// Enable foreign key constraints — SQLite disables them by default.
// This ensures cascade deletes and set-null references work correctly.
sqlite.pragma('foreign_keys = ON');

// Create and export the typed Drizzle ORM instance.
// The schema object maps table names to Drizzle table definitions,
// enabling fully type-safe queries throughout the application.
export const db = drizzle(sqlite, { schema });

// Auto-migrate on startup.
// Runs all pending migrations from the migrations folder.
// Safe to run on every startup — idempotent (already-applied migrations are skipped).
migrate(db, { migrationsFolder: 'src/lib/server/db/migrations' });

// Export the raw sqlite connection for use cases that need it
// (e.g., the create-user script running outside SvelteKit context).
export { sqlite };
