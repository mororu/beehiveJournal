#!/usr/bin/env tsx
/**
 * scripts/reset-password.ts
 *
 * Resets the password of an existing user. Use this when the password has been
 * forgotten — there is no self-service reset flow in the app (no email is stored).
 *
 * Unlike create-user.ts this script REQUIRES the user to already exist and only
 * replaces the password hash. All other data (hives, inspections, ...) is untouched.
 *
 * Usage (local dev):
 *   npm run reset-password -- <username> <newpassword>
 *   e.g.: npm run reset-password -- manuel mynewsecretpassword
 *
 * Usage (inside Docker container):
 *   docker exec beehivejournal-app node scripts/reset-password.js <username> <newpassword>
 */

import Database from 'better-sqlite3';
import path from 'path';
import { hashPassword, validatePassword } from '../src/lib/server/password.js';

// ── Argument validation ───────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0) {
	console.error('Usage: npm run reset-password -- <username> <newpassword>');
	console.error('');
	console.error('Examples:');
	console.error('  npm run reset-password -- manuel mynewsecretpassword');
	console.error(
		'  docker exec beehivejournal-app node scripts/reset-password.js manuel mynewsecretpassword'
	);
	process.exit(1);
}

if (args.length < 2) {
	console.error('Error: Both <username> and <newpassword> are required.');
	console.error('Usage: npm run reset-password -- <username> <newpassword>');
	process.exit(1);
}

const [username, password] = args;

if (!username || username.trim().length === 0) {
	console.error('Error: Username cannot be empty.');
	process.exit(1);
}

const passwordError = validatePassword(password);
if (passwordError) {
	console.error(`Error: ${passwordError}.`);
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

// ── The user must already exist ───────────────────────────────────────────────

const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as
	| { id: number }
	| undefined;

if (!existingUser) {
	console.error(`Error: No user with username '${username}' exists.`);
	console.error('To create a new user, run: npm run create-user -- <username> <password>');
	console.error('');
	const allUsers = db.prepare('SELECT username FROM users').all() as { username: string }[];
	if (allUsers.length > 0) {
		console.error('Known usernames:');
		for (const u of allUsers) console.error(`  - ${u.username}`);
	} else {
		console.error('There are no users in the database yet.');
	}
	db.close();
	process.exit(1);
}

// ── Hash the new password ─────────────────────────────────────────────────────

console.log('Hashing password with Argon2id...');

let passwordHash: string;
try {
	passwordHash = await hashPassword(password);
} catch (error) {
	console.error('Error: Failed to hash password:', error);
	db.close();
	process.exit(1);
}

// ── Update the user ───────────────────────────────────────────────────────────

try {
	db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, existingUser.id);

	console.log(`\nSuccess! Password for user '${username}' has been reset.`);
	console.log(`Database: ${resolvedPath}`);
	console.log('');
	console.log('Note: existing sessions stay valid until the cookie expires.');
	console.log('To force a logout everywhere, change JWT_SECRET and restart the server.');
} catch (error) {
	console.error('Error: Failed to update password:', error);
	process.exitCode = 1;
} finally {
	db.close();
}
