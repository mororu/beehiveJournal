import { blob, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ─── Users ───────────────────────────────────────────────────────────────────
// Single row — single-user app. Created by setup script at deploy time.
// No registration UI — the create-user.ts script handles initial setup.
export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(), // Argon2id hash
	createdAt: integer('created_at').notNull(), // Unix epoch (seconds)
});

// ─── Hives ───────────────────────────────────────────────────────────────────
// Represents a physical beehive. Up to 10 can be active simultaneously.
// Archived hives (is_active = false) retain all inspection history.
export const hives = sqliteTable('hives', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(), // e.g. "Juniper", "Lavender Blue"
	number: integer('number'), // optional display number; unique among active hives
	description: text('description'), // optional notes about this hive
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at').notNull(), // Unix epoch
	updatedAt: integer('updated_at').notNull(), // Unix epoch
});

// ─── Inspections ─────────────────────────────────────────────────────────────
// A single inspection visit log for a hive. Core data entry record.
// Weather fields are all nullable — a failed weather fetch is not a failed inspection.
export const inspections = sqliteTable(
	'inspections',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		hiveId: integer('hive_id')
			.notNull()
			.references(() => hives.id, { onDelete: 'cascade' }),
		inspectedAt: integer('inspected_at').notNull(), // Unix epoch; defaults to creation time on client
		healthScore: integer('health_score').notNull(), // 1–5 integer scale
		queenStatus: text('queen_status').notNull(), // 'seen' | 'not_seen' | 'cells_present'
		fluglochBeobachtung: text('flugloch_beobachtung'), // 'keine'|'wenig'|'mittel'|'hoch'|'sehr_hoch'; nullable
		verhalten: text('verhalten'), // 'ruhig'|'aufbrausend'|'aggressiv'; nullable
		behaviourNotes: text('behaviour_notes'), // free text; nullable; max 2000 chars enforced in app layer
		nextInspectNote: text('next_inspect_note'), // reminder for next visit; nullable; max 1000 chars

		// Weather snapshot — all nullable; captured client-side via GPS + Open-Meteo at form open time
		weatherTemp: real('weather_temp'), // °C from Open-Meteo
		weatherDesc: text('weather_desc'), // e.g. "Partly cloudy" (from WMO code mapping)
		weatherWindSpeed: real('weather_wind_speed'), // km/h from Open-Meteo
		weatherCode: integer('weather_code'), // WMO weather code from Open-Meteo API
		weatherLat: real('weather_lat'), // GPS latitude used for the weather fetch
		weatherLon: real('weather_lon'), // GPS longitude used for the weather fetch
		weatherUnavailable: integer('weather_unavailable', { mode: 'boolean' }).default(false),

		// Offline sync deduplication — UUID generated on client at entry creation time
		clientId: text('client_id'), // UUID v4; unique index prevents duplicate syncs

		createdAt: integer('created_at').notNull(), // Unix epoch
		updatedAt: integer('updated_at').notNull(), // Unix epoch
	},
	(t) => [uniqueIndex('inspections_client_id_unique').on(t.clientId)]
);

// ─── Inspection Photos ────────────────────────────────────────────────────────
// Binary photos attached to an inspection.
// Stored as BLOBs directly in SQLite — no filesystem dependency.
// Max 5 photos per inspection enforced at the app layer.
// mimeType is stored alongside the data so the HTTP response sets the right Content-Type.
export const inspectionPhotos = sqliteTable('inspection_photos', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	inspectionId: integer('inspection_id')
		.notNull()
		.references(() => inspections.id, { onDelete: 'cascade' }),
	data: blob('data', { mode: 'buffer' }).notNull(), // raw binary
	mimeType: text('mime_type').notNull(), // e.g. 'image/jpeg'
	createdAt: integer('created_at').notNull(), // Unix epoch
});

// ─── Sting Incidents ─────────────────────────────────────────────────────────
// Log of times Manuel was stung. Optionally linked to a hive.
// hive_id is nullable (set null on delete) — sting records survive hive deletion.
export const stingIncidents = sqliteTable(
	'sting_incidents',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		hiveId: integer('hive_id').references(() => hives.id, { onDelete: 'set null' }),
		stungAt: integer('stung_at').notNull(), // Unix epoch
		bodyLocation: text('body_location').notNull(), // e.g. "Left forearm", "Right hand"
		notes: text('notes'), // optional free text
		clientId: text('client_id'), // UUID v4 for offline dedup; nullable

		createdAt: integer('created_at').notNull(), // Unix epoch
	},
	(t) => [uniqueIndex('sting_incidents_client_id_unique').on(t.clientId)]
);

// ─── Todos ───────────────────────────────────────────────────────────────────
// Task items linked to a specific hive. Deleted when the hive is deleted (cascade).
export const todos = sqliteTable('todos', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	hiveId: integer('hive_id').references(() => hives.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at').notNull(), // Unix epoch
	updatedAt: integer('updated_at').notNull(), // Unix epoch
});

// ─── Inferred Types ──────────────────────────────────────────────────────────
// Export inferred TypeScript types for use throughout the app.
// These types are the single source of truth — never define manual interfaces for DB rows.
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Hive = typeof hives.$inferSelect;
export type NewHive = typeof hives.$inferInsert;
export type Inspection = typeof inspections.$inferSelect;
export type NewInspection = typeof inspections.$inferInsert;
export type StingIncident = typeof stingIncidents.$inferSelect;
export type NewStingIncident = typeof stingIncidents.$inferInsert;
export type InspectionPhoto = typeof inspectionPhotos.$inferSelect;
export type NewInspectionPhoto = typeof inspectionPhotos.$inferInsert;
export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
