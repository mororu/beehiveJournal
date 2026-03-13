CREATE TABLE `hives` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`number` integer,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inspections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hive_id` integer NOT NULL,
	`inspected_at` integer NOT NULL,
	`health_score` integer NOT NULL,
	`queen_status` text NOT NULL,
	`behaviour_notes` text,
	`next_inspect_note` text,
	`weather_temp` real,
	`weather_desc` text,
	`weather_wind_speed` real,
	`weather_code` integer,
	`weather_lat` real,
	`weather_lon` real,
	`weather_unavailable` integer DEFAULT false,
	`client_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`hive_id`) REFERENCES `hives`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sting_incidents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hive_id` integer,
	`stung_at` integer NOT NULL,
	`body_location` text NOT NULL,
	`notes` text,
	`client_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`hive_id`) REFERENCES `hives`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
--> statement-breakpoint
-- Query patterns: get inspections for a hive ordered by date (most common read path)
CREATE INDEX IF NOT EXISTS `idx_inspections_hive_date` ON `inspections` (`hive_id`, `inspected_at` DESC);
--> statement-breakpoint
-- Query pattern: get sting incidents for a specific hive
CREATE INDEX IF NOT EXISTS `idx_stings_hive` ON `sting_incidents` (`hive_id`);
--> statement-breakpoint
-- Offline sync deduplication: prevent duplicate submissions from the same client
CREATE UNIQUE INDEX IF NOT EXISTS `idx_inspections_client_id` ON `inspections` (`client_id`) WHERE `client_id` IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_stings_client_id` ON `sting_incidents` (`client_id`) WHERE `client_id` IS NOT NULL;