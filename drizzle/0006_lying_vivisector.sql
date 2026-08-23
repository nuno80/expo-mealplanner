ALTER TABLE `planned_meals` ADD `side2_recipe_id` text REFERENCES recipes(id);--> statement-breakpoint
ALTER TABLE `planned_meals` ADD `side2_portion_grams` integer;--> statement-breakpoint
ALTER TABLE `planned_meals` ADD `side2_portion_kcal` integer;--> statement-breakpoint
ALTER TABLE `planned_meals` ADD `veg_side_recipe_id` text REFERENCES recipes(id);--> statement-breakpoint
ALTER TABLE `planned_meals` ADD `veg_side_portion_grams` integer;--> statement-breakpoint
ALTER TABLE `planned_meals` ADD `veg_side_portion_kcal` integer;--> statement-breakpoint
ALTER TABLE `recipes` ADD `tags` text;