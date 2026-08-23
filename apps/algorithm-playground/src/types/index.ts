// ============================================================================
// SHARED TYPES
// Adapted from mobile app schemas
// ============================================================================

import type { ActivityLevel, Goal, Sex } from "@/lib/tdee";

// Re-export for convenience
export type { ActivityLevel, Goal, Sex };

// ============================================================================
// FAMILY MEMBER
// ============================================================================

export interface FamilyMember {
  id: string;
  name: string;
  birthYear: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  calorieAdjustment: number;
  tdee: number;
  targetKcal: number;
  snacksEnabled: boolean;
}

export type SnackPreference = "none" | "one" | "two";

// ============================================================================
// RECIPE
// ============================================================================

export type ProteinSource =
  | "legumes"
  | "fish"
  | "white_meat"
  | "eggs"
  | "dairy"
  | "red_meat"
  | "plant_based"
  | "mixed"
  | "none";

export type RecipeCategory =
  | "breakfast"
  | "main_course"
  | "snack"
  | "side_dish"
  | "vegetable_side";  // Mod 18: Harvard Plate

/** Mod 18: Nutritional tags for Harvard Plate compliance */
export type NutritionalTag =
  | "vegetable_heavy"   // ≥30% vegetables in dish
  | "whole_grain"       // whole grain based
  | "protein_focused"   // ≥20g protein/100g
  | "legume_based"      // legumes as main ingredient
  | "starchy";          // high starch content

export interface Recipe {
  id: string;
  nameIt: string;
  nameEn: string;
  category: RecipeCategory;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  proteinSource: ProteinSource;
  imageUrl: string | null;
  totalTimeMin: number | null;
  tags?: NutritionalTag[];  // Mod 18: Harvard Plate tags
}

// ============================================================================
// MEAL PLAN
// ============================================================================

export type MealType = "breakfast" | "lunch" | "dinner" | "snack_am" | "snack_pm";

export interface PlannedMeal {
  id: string;
  day: number; // 1-7
  mealType: MealType;
  recipeId: string;
  recipe: Recipe;
  portionGrams: number;
  portionKcal: number;
  sideRecipeId: string | null;
  sideRecipe: Recipe | null;
  sidePortionGrams: number | null;
  sidePortionKcal: number | null;
  // Secondary side (e.g., bread) when primary side hits portion cap
  side2RecipeId: string | null;
  side2Recipe: Recipe | null;
  side2PortionGrams: number | null;
  side2PortionKcal: number | null;
  // Mod 18: Vegetable side for Harvard Plate compliance
  vegSideRecipeId: string | null;
  vegSideRecipe: Recipe | null;
  vegSidePortionGrams: number | null;
  vegSidePortionKcal: number | null;
}

export interface MealPlan {
  id: string;
  familyMemberId: string;
  weekStart: Date;
  targetKcalWeekly: number;
  actualKcalWeekly: number;
  meals: PlannedMeal[];
}

// ============================================================================
// PROTEIN TRACKER (for algorithm)
// ============================================================================

export interface ProteinQuota {
  min: number;
  max: number;
  current: number;
}

export type ProteinTracker = Record<ProteinSource, ProteinQuota>;

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

// ============================================================================
// DEBUG LOG
// ============================================================================

export interface DebugLogEntry {
  timestamp: Date;
  type: "info" | "decision" | "warning" | "error";
  message: string;
  data?: Record<string, unknown>;
}
