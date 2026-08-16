// src/lib/server/password.ts
//
// Central password hashing utilities.
//
// This module deliberately has NO SvelteKit imports ($app/*, $env/*) so that
// it can also be imported by standalone CLI scripts run via tsx
// (scripts/create-user.ts, scripts/reset-password.ts).
//
// Never call argon2 directly elsewhere — always go through these functions so
// the hashing parameters stay consistent across the app and the scripts.

import argon2 from 'argon2';

// ─── Policy ───────────────────────────────────────────────────────────────────

/** Minimum password length enforced in the UI and in the CLI scripts. */
export const MIN_PASSWORD_LENGTH = 8;

// OWASP-recommended Argon2id parameters (2023).
const ARGON2_OPTIONS = {
	type: argon2.argon2id,
	memoryCost: 65536, // 64 MB
	timeCost: 3, // iterations
	parallelism: 4, // threads
} as const;

// ─── Hash / Verify ────────────────────────────────────────────────────────────

/**
 * Hashes a plaintext password with Argon2id.
 * The returned string contains the algorithm, parameters and salt — store it as-is.
 */
export async function hashPassword(password: string): Promise<string> {
	return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies a plaintext password against a stored Argon2 hash.
 * Returns false instead of throwing on malformed hashes.
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
	try {
		return await argon2.verify(hash, password);
	} catch {
		return false;
	}
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates a new password against the policy.
 * Returns an error message, or null when the password is acceptable.
 */
export function validatePassword(password: string): string | null {
	if (!password || password.length === 0) {
		return 'Passwort darf nicht leer sein';
	}
	if (password.length < MIN_PASSWORD_LENGTH) {
		return `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein`;
	}
	return null;
}
