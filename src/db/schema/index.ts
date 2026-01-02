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

// ============================================================================
// RECIPES TABLE
// Curated recipes with bilingual support and nutritional info.
// ============================================================================
export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(), // UUID
  nameIt: text("name_it").notNull(),
  nameEn: text("name_en").notNull(),
  slug: text("slug").notNull().unique(),
  descriptionIt: text("description_it"),
  descriptionEn: text("description_en"),
  category: text("category").notNull(), // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  imageUrl: text("image_url"), // Cloudinary URL
  prepTimeMin: integer("prep_time_min"),
  cookTimeMin: integer("cook_time_min"),
  totalTimeMin: integer("total_time_min"),
  servings: integer("servings").notNull().default(1),
  difficulty: text("difficulty").notNull().default("easy"), // 'easy' | 'medium' | 'hard'

  // Nutritional info per 100g
  kcalPer100g: integer("kcal_per_100g").notNull(),
  proteinPer100g: real("protein_per_100g").notNull(),
  carbsPer100g: real("carbs_per_100g").notNull(),
  fatPer100g: real("fat_per_100g").notNull(),
  fiberPer100g: real("fiber_per_100g"),

  // Per serving
  kcalPerServing: integer("kcal_per_serving"),
  servingWeightG: integer("serving_weight_g"),

  // Protein source for meal plan rotation (Mediterranean Diet)
  proteinSource: text("protein_source").notNull().default("mixed"),

  isPublished: integer("is_published", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ============================================================================
// INGREDIENTS TABLE
// Master ingredients with USDA nutritional data and cooking factors.
// ============================================================================
export const ingredients = sqliteTable("ingredients", {
  id: text("id").primaryKey(), // UUID
  usdaFdcId: text("usda_fdc_id"), // USDA FoodData Central ID
  nameIt: text("name_it").notNull(),
  nameEn: text("name_en").notNull(),
  category: text("category"), // 'Cereali', 'Verdure', etc.

  // Nutritional info per 100g
  kcalPer100g: integer("kcal_per_100g").notNull(),
  proteinPer100g: real("protein_per_100g").notNull(),
  carbsPer100g: real("carbs_per_100g").notNull(),
  fatPer100g: real("fat_per_100g").notNull(),
  fiberPer100g: real("fiber_per_100g"),

  // Cooking factor: raw → cooked weight multiplier (e.g., 2.1 for pasta)
  cookedWeightFactor: real("cooked_weight_factor").default(1),
  defaultUnit: text("default_unit").notNull().default("g"), // 'g', 'ml', 'pz'

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ============================================================================
// RECIPE_INGREDIENTS TABLE (Join)
// Links recipes to ingredients with quantities.
// ============================================================================
export const recipeIngredients = sqliteTable("recipe_ingredients", {
  id: text("id").primaryKey(), // UUID
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  ingredientId: text("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "restrict" }),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull().default("g"), // 'g', 'ml', 'pz', 'cucchiaio'
  isOptional: integer("is_optional", { mode: "boolean" })
    .notNull()
    .default(false),
  notesIt: text("notes_it"), // "peso sgocciolato"
  notesEn: text("notes_en"), // "drained weight"
  order: integer("order").notNull().default(0),
});

// ============================================================================
// RECIPE_STEPS TABLE
// Preparation instructions for recipes.
// ============================================================================
export const recipeSteps = sqliteTable("recipe_steps", {
  id: text("id").primaryKey(), // UUID
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  instructionIt: text("instruction_it").notNull(),
  instructionEn: text("instruction_en").notNull(),
  imageUrl: text("image_url"), // v2.0: step-by-step photos
});

// ============================================================================
// TAGS TABLE
// Flexible tags for diets and restrictions (v2.0 prepared).
// ============================================================================
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(), // UUID
  slug: text("slug").notNull().unique(), // 'gluten-free', 'vegan'
  nameIt: text("name_it").notNull(),
  nameEn: text("name_en").notNull(),
  icon: text("icon"), // Emoji or icon name
});

// ============================================================================
// RECIPE_TAGS TABLE (Many-to-Many)
// ============================================================================
export const recipeTags = sqliteTable("recipe_tags", {
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  tagId: text("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});

// ============================================================================
// MEAL_PLANS TABLE
// Weekly meal plan for a family member.
// ============================================================================
export const mealPlans = sqliteTable("meal_plans", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  familyMemberId: text("family_member_id")
    .notNull()
    .references(() => familyMembers.id, { onDelete: "cascade" }),
  weekStart: integer("week_start", { mode: "timestamp" }).notNull(), // Monday of the week
  targetKcalWeekly: integer("target_kcal_weekly").notNull(), // target_kcal × 7
  actualKcalWeekly: integer("actual_kcal_weekly"), // Sum of planned meals
  status: text("status").notNull().default("draft"), // 'draft' | 'active' | 'completed'
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ============================================================================
// PLANNED_MEALS TABLE
// Individual meals in a meal plan with personalized portions.
// ============================================================================
export const plannedMeals = sqliteTable("planned_meals", {
  id: text("id").primaryKey(), // UUID
  mealPlanId: text("meal_plan_id")
    .notNull()
    .references(() => mealPlans.id, { onDelete: "cascade" }),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "restrict" }),
  day: integer("day").notNull(), // 1-7 (Mon-Sun)
  mealType: text("meal_type").notNull(), // 'breakfast' | 'lunch' | 'dinner' | 'snack_am' | 'snack_pm'
  portionGrams: integer("portion_grams").notNull(), // Personalized portion
  portionKcal: integer("portion_kcal").notNull(), // Calories for this portion
  isCompleted: integer("is_completed", { mode: "boolean" })
    .notNull()
    .default(false),
  // Soft delete for snack toggle - when true, meal is skipped and others are recalculated
  isSkipped: integer("is_skipped", { mode: "boolean" })
    .notNull()
    .default(false),

  // v2.0 Side Dish Support (NutriPlanIT 2.0)
  // Optional side dish to fill caloric/macro gaps (e.g., Bread with Salad)
  sideRecipeId: text("side_recipe_id").references(() => recipes.id, {
    onDelete: "set null",
  }),
  sidePortionGrams: integer("side_portion_grams"),
  sidePortionKcal: integer("side_portion_kcal"),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ============================================================================
// SAVED_RECIPES TABLE
// User's favorite/saved recipes.
// ============================================================================
export const savedRecipes = sqliteTable("saved_recipes", {
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  savedAt: integer("saved_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ============================================================================
// WEIGHT_LOG TABLE
// Weight tracking for progress monitoring.
// ============================================================================
export const weightLogs = sqliteTable("weight_logs", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  familyMemberId: text("family_member_id")
    .notNull()
    .references(() => familyMembers.id, { onDelete: "cascade" }),
  date: integer("date", { mode: "timestamp" }).notNull(),
  weightKg: real("weight_kg").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ============================================================================
// SHOPPING_LISTS TABLE
// Weekly shopping lists.
// ============================================================================
export const shoppingLists = sqliteTable("shopping_lists", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  mealPlanId: text("meal_plan_id").references(() => mealPlans.id, {
    onDelete: "set null",
  }),
  weekStart: integer("week_start", { mode: "timestamp" }).notNull(),
  name: text("name").notNull(), // "Spesa settimana 1 Gen"
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ============================================================================
// SHOPPING_ITEMS TABLE
// Items in a shopping list.
// ============================================================================
export const shoppingItems = sqliteTable("shopping_items", {
  id: text("id").primaryKey(), // UUID
  shoppingListId: text("shopping_list_id")
    .notNull()
    .references(() => shoppingLists.id, { onDelete: "cascade" }),
  ingredientId: text("ingredient_id").references(() => ingredients.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(), // Ingredient name or custom item
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  isChecked: integer("is_checked", { mode: "boolean" })
    .notNull()
    .default(false),
  order: integer("order").notNull().default(0),
});
