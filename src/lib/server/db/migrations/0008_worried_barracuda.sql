PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_honey_harvests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`harvested_at` integer NOT NULL,
	`amount_kg` real NOT NULL,
	`lot` text NOT NULL,
	`notes` text,
	`client_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
-- Hand-edited: the old `honey_harvests` table has no `lot` column. Compute it inline from
-- `harvested_at` via SQLite's strftime so that any accidental existing rows are migrated with a
-- valid `L` + ddmmyyyy label rather than an empty placeholder. Local time is used for parity with
-- the app-side formatLot() helper. Emergency backstop only — feature was not shipped with data.
INSERT INTO `__new_honey_harvests`("id", "harvested_at", "amount_kg", "lot", "notes", "client_id", "created_at", "updated_at") SELECT "id", "harvested_at", "amount_kg", strftime('L%d%m%Y', "harvested_at", 'unixepoch', 'localtime') AS "lot", "notes", "client_id", "created_at", "updated_at" FROM `honey_harvests`;--> statement-breakpoint
DROP TABLE `honey_harvests`;--> statement-breakpoint
ALTER TABLE `__new_honey_harvests` RENAME TO `honey_harvests`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `honey_harvests_client_id_unique` ON `honey_harvests` (`client_id`);