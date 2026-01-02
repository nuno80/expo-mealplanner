ALTER TABLE `planned_meals` ADD `side_recipe_id` text REFERENCES recipes(id);--> statement-breakpoint
ALTER TABLE `planned_meals` ADD `side_portion_grams` integer;--> statement-breakpoint
ALTER TABLE `planned_meals` ADD `side_portion_kcal` integer;