CREATE TABLE `inspection_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inspection_id` integer NOT NULL REFERENCES `inspections`(`id`) ON DELETE CASCADE,
	`data` blob NOT NULL,
	`mime_type` text NOT NULL,
	`created_at` integer NOT NULL
);
