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

// ─── Honey Harvests ──────────────────────────────────────────────────────────
// Log of honey harvests. NOT tied to a specific hive — a single harvest lot is
// drawn from multiple hives, so per-hive contribution is intentionally not tracked.
// See tech-spec-honey-harvest-drop-hive-add-lot.md for the design rationale.
// `lot` is a display label recomputed server-side on every insert from `harvested_at`
// as `L` + ddmmyyyy (see formatLot in $lib/client/utils/date.ts).
export const honeyHarvests = sqliteTable(
	'honey_harvests',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		harvestedAt: integer('harvested_at').notNull(), // Unix epoch seconds (local noon of the chosen day — DST-safe anchor)
		amountKg: real('amount_kg').notNull(), // decimal kg, e.g. 11.4
		lot: text('lot').notNull(), // `L` + ddmmyyyy — recomputed server-side on every insert
		notes: text('notes'), // optional free text
		clientId: text('client_id'), // UUID v4 for offline dedup; nullable
		createdAt: integer('created_at').notNull(), // Unix epoch
		updatedAt: integer('updated_at').notNull(), // Unix epoch; reserved for future edit support
	},
	(t) => [uniqueIndex('honey_harvests_client_id_unique').on(t.clientId)]
);

// ─── Container Sizes ─────────────────────────────────────────────────────────
// Editable list of honey container types used for sales (e.g. "500g Glas").
// `sizeG` is the container capacity in grams. Total sale kg is derived at
// read time as `sale.amount × containerSize.sizeG / 1000` — never stored.
export const containerSizes = sqliteTable('container_sizes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(), // max 60 chars enforced at app layer
	sizeG: integer('size_g').notNull(), // grams, 1..5000 enforced at app layer
	createdAt: integer('created_at').notNull(), // Unix epoch
	updatedAt: integer('updated_at').notNull(), // Unix epoch
});

// ─── Honey Sales ─────────────────────────────────────────────────────────────
// Log of honey sold to a customer, or given as a gift.
// FK strategy: both harvestId and containerSizeId use ON DELETE RESTRICT to
// protect the audit trail — deleting a referenced harvest or container size
// is rejected until the referring sales are removed first.
// `priceChf` is null when `isGift = true`; else >= 0 (0 is a paid-for-free
// sample, distinct from a formal gift).
export const honeySales = sqliteTable('honey_sales', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	harvestId: integer('harvest_id')
		.notNull()
		.references(() => honeyHarvests.id, { onDelete: 'restrict' }),
	containerSizeId: integer('container_size_id')
		.notNull()
		.references(() => containerSizes.id, { onDelete: 'restrict' }),
	soldAt: integer('sold_at').notNull(), // Unix epoch seconds (local noon)
	amount: integer('amount').notNull(), // count of containers, 1..10000
	customerName: text('customer_name').notNull(), // max 200 chars enforced at app layer
	priceChf: real('price_chf'), // nullable — null when isGift = true; else >= 0
	isGift: integer('is_gift', { mode: 'boolean' }).notNull().default(false),
	notes: text('notes'), // nullable, max 2000 chars enforced at app layer
	createdAt: integer('created_at').notNull(), // Unix epoch
	updatedAt: integer('updated_at').notNull(), // Unix epoch
});

// ─── Diary Entries ───────────────────────────────────────────────────────────
// Global journal — one row per beekeeping milestone. Not tied to a hive.
// `entry_date` is Unix epoch seconds at local noon (DST-safe anchor).
// Weather snapshot mirrors the `inspections` column naming for cross-entity consistency.
// For today/future entries, weather_temp/wind are instantaneous (forecast API);
// for backdated entries they are the day's max (archive API).
// `weather_history` is JSON: 30 daily aggregates ending at entry_date (oldest → newest).
export const diaryEntries = sqliteTable('diary_entries', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	entryDate: integer('entry_date').notNull(), // Unix epoch seconds (local noon)
	title: text('title').notNull(), // max 200 chars enforced at app layer
	body: text('body'), // nullable, max 5000 chars enforced at app layer
	weatherLat: real('weather_lat'),
	weatherLon: real('weather_lon'),
	weatherTemp: real('weather_temp'),
	weatherDesc: text('weather_desc'),
	weatherWindSpeed: real('weather_wind_speed'),
	weatherCode: integer('weather_code'),
	weatherUnavailable: integer('weather_unavailable', { mode: 'boolean' }).notNull().default(false),
	weatherHistory: text('weather_history'), // JSON: WeatherHistoryDay[] | null
	createdAt: integer('created_at').notNull(), // Unix epoch
	updatedAt: integer('updated_at').notNull(), // Unix epoch
});

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
export type HoneyHarvest = typeof honeyHarvests.$inferSelect;
export type NewHoneyHarvest = typeof honeyHarvests.$inferInsert;
export type ContainerSize = typeof containerSizes.$inferSelect;
export type NewContainerSize = typeof containerSizes.$inferInsert;
export type HoneySale = typeof honeySales.$inferSelect;
export type NewHoneySale = typeof honeySales.$inferInsert;
export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type NewDiaryEntry = typeof diaryEntries.$inferInsert;
