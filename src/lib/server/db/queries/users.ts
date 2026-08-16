// src/lib/server/db/queries/users.ts
//
// All Drizzle queries for the users table.
// Route files import from here — never write Drizzle calls directly in routes.

import { eq } from 'drizzle-orm';
import { db } from '../index.js';
import { users } from '../schema.js';
import type { User } from '../schema.js';

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns a user by username, or null if not found.
 */
export function getUserByUsername(username: string): User | null {
	const row = db.select().from(users).where(eq(users.username, username)).get();
	return row ?? null;
}

/**
 * Returns a user by ID, or null if not found.
 */
export function getUserById(id: number): User | null {
	const row = db.select().from(users).where(eq(users.id, id)).get();
	return row ?? null;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Replaces a user's password hash.
 * The caller is responsible for hashing — pass an Argon2 hash, never plaintext.
 * Returns the updated user, or null if the user does not exist.
 */
export function updateUserPassword(id: number, passwordHash: string): User | null {
	const updated = db.update(users).set({ passwordHash }).where(eq(users.id, id)).returning().get();
	return updated ?? null;
}
