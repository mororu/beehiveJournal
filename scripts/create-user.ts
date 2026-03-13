#!/usr/bin/env tsx
/**
 * scripts/create-user.ts
 *
 * Creates a new user in the beehiveJournal database with a securely hashed password.
 * This script is run once at deployment time — there is no registration UI.
 *
 * Usage (local dev):
 *   npm run create-user -- <username> <password>
 *   e.g.: npm run create-user -- manuel mysecretpassword
 *
 * Usage (inside Docker container):
 *   docker exec beehivejournal-app node scripts/create-user.js <username> <password>
 */

import argon2 from 'argon2';
import Database from 'better-sqlite3';
import path from 'path';

// ── Argument validation ───────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0) {
	console.error('Usage: npm run create-user -- <username> <password>');
	console.error('');
	console.error('Examples:');
	console.error('  npm run create-user -- manuel mysecretpassword');
	console.error(
		'  docker exec beehivejournal-app node scripts/create-user.js manuel mysecretpassword'
	);
	process.exit(1);
}

if (args.length < 2) {
	console.error('Error: Both <username> and <password> are required.');
	console.error('Usage: npm run create-user -- <username> <password>');
	process.exit(1);
}

const [username, password] = args;

if (!username || username.trim().length === 0) {
	console.error('Error: Username cannot be empty.');
	process.exit(1);
}

if (!password || password.length < 8) {
	console.error('Error: Password must be at least 8 characters long.');
	process.exit(1);
}

// ── Database connection ───────────────────────────────────────────────────────

const databasePath = process.env.DATABASE_PATH;
if (!databasePath) {
	console.error('Error: DATABASE_PATH environment variable is not set.');
	console.error('For local dev: ensure .env.local contains DATABASE_PATH=./data/dev.sqlite');
	console.error('For Docker: DATABASE_PATH is set in docker-compose.yml');
	process.exit(1);
}

const resolvedPath = path.resolve(databasePath);
console.log(`Connecting to database at: ${resolvedPath}`);

let db: Database.Database;
try {
	db = new Database(resolvedPath);
} catch {
	console.error(`Error: Cannot open database at ${resolvedPath}`);
	console.error('Has the database been initialised? Run: npm run db:migrate');
	process.exit(1);
}

// Enable foreign keys (good practice even in scripts)
db.pragma('foreign_keys = ON');

// ── Check if users table exists ───────────────────────────────────────────────

const tableCheck = db
	.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
	.get();

if (!tableCheck) {
	console.error('Error: The `users` table does not exist in the database.');
	console.error('Run the database migration first: npm run db:migrate');
	db.close();
	process.exit(1);
}

// ── Check for existing username ───────────────────────────────────────────────

const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

if (existingUser) {
	console.error(`Error: A user with username '${username}' already exists.`);
	console.error('The create-user script does not overwrite existing users.');
	db.close();
	process.exit(1);
}

// ── Hash the password ─────────────────────────────────────────────────────────

console.log('Hashing password with Argon2id...');

let passwordHash: string;
try {
	passwordHash = await argon2.hash(password, {
		// Argon2id is the OWASP-recommended variant.
		type: argon2.argon2id,
		// OWASP recommended parameters (2023):
		memoryCost: 65536, // 64 MB
		timeCost: 3, // iterations
		parallelism: 4, // threads
	});
} catch (error) {
	console.error('Error: Failed to hash password:', error);
	db.close();
	process.exit(1);
}

// ── Insert the user ───────────────────────────────────────────────────────────

const now = Math.floor(Date.now() / 1000); // Unix epoch in seconds

try {
	db.prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)').run(
		username,
		passwordHash,
		now
	);

	console.log(`\nSuccess! User '${username}' created.`);
	console.log(`Database: ${resolvedPath}`);
	console.log(`Created at: ${new Date(now * 1000).toISOString()}`);
} catch (error) {
	console.error('Error: Failed to insert user into database:', error);
} finally {
	db.close();
}
