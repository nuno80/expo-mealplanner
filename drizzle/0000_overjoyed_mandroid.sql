CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`is_premium` integer DEFAULT false,
	`created_at` integer
);
