import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ============================================================================
// USERS TABLE
// Synced from Supabase Auth. Stores user preferences and premium status.
// ============================================================================
export const users = sqliteTable("users", {
	id: text("id").primaryKey(), // UUID from Supabase Auth
	email: text("email").notNull(),
	displayName: text("display_name"),
	locale: text("locale").notNull().default("it"), // 'it' | 'en'
	isPremium: integer("is_premium", { mode: "boolean" })
		.notNull()
		.default(false),
	premiumUntil: integer("premium_until", { mode: "timestamp" }),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

// ============================================================================
// FAMILY MEMBERS TABLE
// Each user can have multiple family members with individual TDEE/goals.
// The first member (is_primary=true) represents the user themselves.
// ============================================================================
export const familyMembers = sqliteTable("family_members", {
	id: text("id").primaryKey(), // UUID
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(), // e.g., "Papà", "Marco"
	isPrimary: integer("is_primary", { mode: "boolean" })
		.notNull()
		.default(false),

	// Physical stats
	birthYear: integer("birth_year").notNull(),
	sex: text("sex").notNull(), // 'male' | 'female' - validated by Zod
	heightCm: integer("height_cm").notNull(),
	weightKg: real("weight_kg").notNull(), // decimal(5,2)
	activityLevel: text("activity_level").notNull(), // enum validated by Zod

	// Goals
	goal: text("goal").notNull(), // 'cut' | 'maintain' | 'bulk'
	calorieAdjustment: integer("calorie_adjustment").notNull().default(0), // e.g., -400 or +300
	tdee: integer("tdee").notNull(), // Calculated: BMR × activity multiplier
	targetKcal: integer("target_kcal").notNull(), // TDEE + adjustment

	// Macros (percentage)
	macroProteinPct: integer("macro_protein_pct").notNull().default(30),
	macroCarbPct: integer("macro_carb_pct").notNull().default(40),
	macroFatPct: integer("macro_fat_pct").notNull().default(30),

	// Options
	snacksEnabled: integer("snacks_enabled", { mode: "boolean" })
		.notNull()
		.default(false),

	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});
