CREATE TABLE `family_members` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`birth_year` integer NOT NULL,
	`sex` text NOT NULL,
	`height_cm` integer NOT NULL,
	`weight_kg` real NOT NULL,
	`activity_level` text NOT NULL,
	`goal` text NOT NULL,
	`calorie_adjustment` integer DEFAULT 0 NOT NULL,
	`tdee` integer NOT NULL,
	`target_kcal` integer NOT NULL,
	`macro_protein_pct` integer DEFAULT 30 NOT NULL,
	`macro_carb_pct` integer DEFAULT 40 NOT NULL,
	`macro_fat_pct` integer DEFAULT 30 NOT NULL,
	`snacks_enabled` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`locale` text DEFAULT 'it' NOT NULL,
	`is_premium` integer DEFAULT false NOT NULL,
	`premium_until` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "display_name", "locale", "is_premium", "premium_until", "created_at", "updated_at") SELECT "id", "email", "display_name", "locale", "is_premium", "premium_until", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;