import { z } from "zod";
import { RecipeSchema } from "./recipe";

// ============================================================================
// ENUMS
// ============================================================================

export const MealPlanStatusSchema = z.enum(["draft", "active", "completed"]);
export type MealPlanStatus = z.infer<typeof MealPlanStatusSchema>;

export const MealTypeSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack_am",
  "snack_pm",
]);
export type MealType = z.infer<typeof MealTypeSchema>;

// ============================================================================
// MEAL PLAN
// ============================================================================

export const MealPlanSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  familyMemberId: z.string().uuid(),
  weekStart: z.date(),
  targetKcalWeekly: z.number().int().positive(),
  actualKcalWeekly: z.number().int().nonnegative().nullish(),
  status: MealPlanStatusSchema.default("draft"),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type MealPlan = z.infer<typeof MealPlanSchema>;

// ============================================================================
// PLANNED MEAL
// ============================================================================

export const PlannedMealSchema = z.object({
  id: z.string().uuid(),
  mealPlanId: z.string().uuid(),
  recipeId: z.string().uuid(),
  day: z.number().int().min(1).max(7), // 1 = Mon, 7 = Sun
  mealType: MealTypeSchema,
  portionGrams: z.number().int().positive(),
  portionKcal: z.number().int().nonnegative(),
  isCompleted: z.boolean().default(false),
  isSkipped: z.boolean().default(false),
  // v2.0 Side Dish
  sideRecipeId: z.string().uuid().nullish(),
  sidePortionGrams: z.number().int().positive().nullish(),
  sidePortionKcal: z.number().int().nonnegative().nullish(),
  createdAt: z.date(),
});
export type PlannedMeal = z.infer<typeof PlannedMealSchema>;

/** Planned meal with recipe details (for displaying in plan view) */
export const PlannedMealWithRecipeSchema = PlannedMealSchema.extend({
  recipe: RecipeSchema.pick({
    id: true,
    nameIt: true,
    nameEn: true,
    imageUrl: true,
    category: true,
    kcalPer100g: true,
  }),
  sideRecipe: RecipeSchema.pick({
    id: true,
    nameIt: true,
    nameEn: true,
  }).nullish(),
});
export type PlannedMealWithRecipe = z.infer<typeof PlannedMealWithRecipeSchema>;

/** Full meal plan with all planned meals (for week view) */
export const MealPlanWithMealsSchema = MealPlanSchema.extend({
  meals: z.array(PlannedMealWithRecipeSchema),
});
export type MealPlanWithMeals = z.infer<typeof MealPlanWithMealsSchema>;

// ============================================================================
// GENERATE MEAL PLAN (Input for algorithm)
// ============================================================================

export const GenerateMealPlanInputSchema = z.object({
  familyMemberId: z.string().uuid(),
  weekStart: z.date(),
  /** Override target (optional, defaults to member's targetKcal × 7) */
  targetKcalWeekly: z.number().int().positive().optional(),
  /** Snack preference: none (3 meals), one (4 meals), two (5 meals) */
  snackPreference: z.enum(["none", "one", "two"]).optional(),
  /** Deprecated: use snackPreference instead */
  includeSnacks: z.boolean().optional(),
});
export type GenerateMealPlanInput = z.infer<typeof GenerateMealPlanInputSchema>;

// ============================================================================
// SWAP MEAL (Input for swap action)
// ============================================================================

export const SwapMealInputSchema = z.object({
  plannedMealId: z.string().uuid(),
  newRecipeId: z.string().uuid(),
});
export type SwapMealInput = z.infer<typeof SwapMealInputSchema>;

// ============================================================================
// SAVED RECIPE
// ============================================================================

export const SavedRecipeSchema = z.object({
  userId: z.string().uuid(),
  recipeId: z.string().uuid(),
  savedAt: z.date(),
});
export type SavedRecipe = z.infer<typeof SavedRecipeSchema>;

// ============================================================================
// WEIGHT LOG
// ============================================================================

export const WeightLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  familyMemberId: z.string().uuid(),
  date: z.date(),
  weightKg: z.number().positive(),
  notes: z.string().nullish(),
  createdAt: z.date(),
});
export type WeightLog = z.infer<typeof WeightLogSchema>;

export const AddWeightLogInputSchema = z.object({
  familyMemberId: z.string().uuid(),
  date: z.date(),
  weightKg: z.number().positive().min(10).max(500),
  notes: z.string().max(200).nullish(),
});
export type AddWeightLogInput = z.infer<typeof AddWeightLogInputSchema>;
