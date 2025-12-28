import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
	id: text("id").primaryKey(), // Matches Supabase UUID
	email: text("email").notNull(),
	isPremium: integer("is_premium", { mode: "boolean" }).default(false),
	createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
		() => new Date(),
	),
});
