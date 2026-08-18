CREATE TABLE `container_sizes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`size_g` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `honey_sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`harvest_id` integer NOT NULL,
	`container_size_id` integer NOT NULL,
	`sold_at` integer NOT NULL,
	`amount` integer NOT NULL,
	`customer_name` text NOT NULL,
	`price_chf` real,
	`is_gift` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`harvest_id`) REFERENCES `honey_harvests`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`container_size_id`) REFERENCES `container_sizes`(`id`) ON UPDATE no action ON DELETE restrict
);
