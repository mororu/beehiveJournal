CREATE TABLE `honey_harvests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hive_id` integer NOT NULL,
	`harvested_at` integer NOT NULL,
	`amount_kg` real NOT NULL,
	`notes` text,
	`client_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`hive_id`) REFERENCES `hives`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `honey_harvests_client_id_unique` ON `honey_harvests` (`client_id`);