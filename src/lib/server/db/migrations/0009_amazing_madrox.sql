CREATE TABLE `diary_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_date` integer NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`weather_lat` real,
	`weather_lon` real,
	`weather_temp` real,
	`weather_desc` text,
	`weather_wind_speed` real,
	`weather_code` integer,
	`weather_unavailable` integer DEFAULT false NOT NULL,
	`weather_history` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
