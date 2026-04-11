-- SQLite does not support DROP NOT NULL on existing columns,
-- so we recreate the todos table with hive_id nullable.
PRAGMA foreign_keys = OFF;
--> statement-breakpoint
CREATE TABLE `todos_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hive_id` integer,
	`title` text NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`hive_id`) REFERENCES `hives`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `todos_new` SELECT `id`, `hive_id`, `title`, `is_completed`, `created_at`, `updated_at` FROM `todos`;
--> statement-breakpoint
DROP TABLE `todos`;
--> statement-breakpoint
ALTER TABLE `todos_new` RENAME TO `todos`;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_todos_hive` ON `todos` (`hive_id`);
--> statement-breakpoint
PRAGMA foreign_keys = ON;
