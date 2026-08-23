import type { Goal } from "@/lib/tdee";
import type { MealType } from "@/schemas/mealPlan";
import type { Recipe } from "@/schemas/recipe";

// ===================================
// TYPES
// ===================================

export type SnackPreference = "none" | "one" | "two";

export interface MealPlanConfig {
  familyMemberId: string;
  weightKg: number;
  goal: Goal;
  weekStart: Date;
  dailyTargetKcal: number;
  snackPreference: SnackPreference;
}

export interface PlannedMealResult {
  day: number;
  mealType: MealType;
  recipeId: string;
  portionGrams: number;
  portionKcal: number;
  sideRecipeId?: string | null;
  sidePortionGrams?: number | null;
  sidePortionKcal?: number | null;
}

export interface LogicRecipe
  extends Pick<
    Recipe,
    | "id"
    | "category"
    | "kcalPer100g"
    | "proteinPer100g"
    | "carbsPer100g"
    | "fatPer100g"
    | "proteinSource" // Mod 16: For legume-grain complementation
    | "tags" // Mod 18: For Harvard Plate
  > { }

// ===================================
// PROTEIN TRACKER (Mediterranean Diet)
// ===================================

export interface ProteinTracker {
  [key: string]: { min: number; max: number; current: number };
  legumes: { min: number; max: number; current: number };
  fish: { min: number; max: number; current: number };
  white_meat: { min: number; max: number; current: number };
  eggs: { min: number; max: number; current: number };
  dairy: { min: number; max: number; current: number };
  red_meat: { min: number; max: number; current: number };
  plant_based: { min: number; max: number; current: number };
  mixed: { min: number; max: number; current: number };
  none: { min: number; max: number; current: number };
}

export const INITIAL_PROTEIN_TRACKER: ProteinTracker = {
  legumes: { min: 3, max: 5, current: 0 },
  fish: { min: 3, max: 4, current: 0 },
  white_meat: { min: 2, max: 3, current: 0 },
  eggs: { min: 2, max: 4, current: 0 },
  dairy: { min: 2, max: 3, current: 0 },
  red_meat: { min: 0, max: 1, current: 0 },
  plant_based: { min: 0, max: 3, current: 0 },
  mixed: { min: 0, max: 3, current: 0 },
  none: { min: 0, max: 1, current: 0 },
};

// ===================================
// MEAL DISTRIBUTION (Calorie split by snack preference)
// ===================================

export const MEAL_DISTRIBUTION = {
  none: [
    { type: "breakfast" as const, ratio: 0.2 },
    { type: "lunch" as const, ratio: 0.4 },
    { type: "dinner" as const, ratio: 0.4 },
  ],
  one: [
    { type: "breakfast" as const, ratio: 0.2 },
    { type: "lunch" as const, ratio: 0.35 },
    { type: "snack_pm" as const, ratio: 0.1 },
    { type: "dinner" as const, ratio: 0.35 },
  ],
  two: [
    { type: "breakfast" as const, ratio: 0.2 },
    { type: "snack_am" as const, ratio: 0.1 },
    { type: "lunch" as const, ratio: 0.3 },
    { type: "snack_pm" as const, ratio: 0.1 },
    { type: "dinner" as const, ratio: 0.3 },
  ],
  // Mod 7: Bulk Distribution (Smoother curve for high calories)
  bulk_two: [
    { type: "breakfast" as const, ratio: 0.2 },
    { type: "snack_am" as const, ratio: 0.15 },
    { type: "lunch" as const, ratio: 0.25 },
    { type: "snack_pm" as const, ratio: 0.15 },
    { type: "dinner" as const, ratio: 0.25 },
  ],
} as const;
