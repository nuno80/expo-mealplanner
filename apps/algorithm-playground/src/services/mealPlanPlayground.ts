// ============================================================================
// MEAL PLAN PLAYGROUND SERVICE - v2.4 (Legume-Grain Complementation)
// Adapted from /src/services/mealPlan.service.ts for browser testing
// ============================================================================

import { query } from "@/lib/db";
import type {
  DebugLogEntry,
  FamilyMember,
  MealPlan,
  MealType,
  PlannedMeal,
  ProteinSource,
  ProteinTracker,
  Recipe,
  SnackPreference,
} from "@/types";
import { INITIAL_PROTEIN_TRACKER } from "@/types";
import {
  calculateMealComposition,
  MEAL_DISTRIBUTION,
  type LogicRecipe,
} from "./mealPlan.logic";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Cooldown in days before a recipe can be reused (Mod 1) */
const RECIPE_COOLDOWN_DAYS = 3;

/** Threshold for "High Density" recipes in Bulk mode */
const BULK_DENSITY_THRESHOLD = 150;

const MEAL_TYPE_TO_CATEGORY: Record<MealType, string> = {
  breakfast: "breakfast",
  lunch: "main_course",
  dinner: "main_course",
  snack_am: "snack",
  snack_pm: "snack",
};

// ============================================================================
// RECIPE LOADING
// ============================================================================

export async function loadRecipes(): Promise<Recipe[]> {
  const rows = await query<{
    id: string;
    name_it: string;
    name_en: string;
    category: string;
    kcal_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    protein_source: string;
    image_url: string | null;
    total_time_min: number | null;
    tags: string | null;  // Mod 18: JSON array of tags
  }>(
    `SELECT id, name_it, name_en, category, kcal_per_100g, protein_per_100g,
            carbs_per_100g, fat_per_100g, protein_source, image_url, total_time_min,
            tags
     FROM recipes
     WHERE is_published = 1`
  );

  return rows.map((r) => ({
    id: r.id,
    nameIt: r.name_it,
    nameEn: r.name_en,
    category: r.category as Recipe["category"],
    kcalPer100g: r.kcal_per_100g,
    proteinPer100g: r.protein_per_100g,
    carbsPer100g: r.carbs_per_100g,
    fatPer100g: r.fat_per_100g,
    proteinSource: r.protein_source as ProteinSource,
    imageUrl: r.image_url,
    totalTimeMin: r.total_time_min,
    tags: r.tags ? JSON.parse(r.tags) : [],  // Mod 18: Parse JSON tags
  }));
}

// ============================================================================
// FAMILY MEMBERS LOADING (for Kitchen Tab)
// ============================================================================

export async function loadFamilyMembers(): Promise<FamilyMember[]> {
  const rows = await query<{
    id: string;
    name: string;
    birth_year: number;
    sex: string;
    height_cm: number;
    weight_kg: number;
    activity_level: string;
    goal: string;
    calorie_adjustment: number;
    tdee: number;
    target_kcal: number;
    snacks_enabled: number;
  }>(`SELECT id, name, birth_year, sex, height_cm, weight_kg, activity_level,
            goal, calorie_adjustment, tdee, target_kcal, snacks_enabled
     FROM family_members`);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    birthYear: r.birth_year,
    sex: r.sex as FamilyMember["sex"],
    heightCm: r.height_cm,
    weightKg: r.weight_kg,
    activityLevel: r.activity_level as FamilyMember["activityLevel"],
    goal: r.goal as FamilyMember["goal"],
    calorieAdjustment: r.calorie_adjustment,
    tdee: r.tdee,
    targetKcal: r.target_kcal,
    snacksEnabled: r.snacks_enabled === 1,
  }));
}

// ============================================================================
// INGREDIENT LOADING (for Kitchen Tab)
// ============================================================================

import type { Ingredient } from "./kitchen.logic";

export async function loadIngredientsForRecipe(recipeId: string): Promise<Ingredient[]> {
  const rows = await query<{
    id: string;
    name_it: string;
    name_en: string;
    quantity: number;
    unit: string;
    cooked_weight_factor: number | null;
  }>(`SELECT i.id, i.name_it, i.name_en, ri.quantity, ri.unit,
            COALESCE(i.cooked_weight_factor, 1.0) as cooked_weight_factor
     FROM recipe_ingredients ri
     JOIN ingredients i ON ri.ingredient_id = i.id
     WHERE ri.recipe_id = '${recipeId}'`);

  return rows.map((r) => ({
    id: r.id,
    nameIt: r.name_it,
    nameEn: r.name_en,
    quantity: r.quantity,
    unit: r.unit,
    cookedWeightFactor: r.cooked_weight_factor ?? 1,
  }));
}

// ============================================================================
// MEAL PLAN GENERATION
// ============================================================================

export interface GenerateMealPlanResult {
  mealPlan: MealPlan;
  proteinTracker: ProteinTracker;
  debugLog: DebugLogEntry[];
}

export async function generateMealPlan(
  member: FamilyMember,
  weekStart: Date
): Promise<GenerateMealPlanResult> {
  const debugLog: DebugLogEntry[] = [];
  const log = (
    type: DebugLogEntry["type"],
    message: string,
    data?: Record<string, unknown>
  ) => {
    debugLog.push({ timestamp: new Date(), type, message, data });
  };

  log("info", `Starting meal plan generation for ${member.name}`);
  log("info", `Target: ${member.targetKcal} kcal/day, Goal: ${member.goal}`);

  // Load recipes
  const allRecipes = await loadRecipes();
  log("info", `Loaded ${allRecipes.length} published recipes`);

  // Initialize protein tracker
  const proteinTracker: ProteinTracker = JSON.parse(
    JSON.stringify(INITIAL_PROTEIN_TRACKER)
  );

  // Determine snack preference & distribution
  let snackPreference: SnackPreference = member.snacksEnabled ? "two" : "none";

  // Mod 7: Mandatory Minimum Meals
  // > 2800 kcal: Force 5 meals
  if (member.targetKcal > 2800) {
    if (snackPreference !== "two") {
      log("warning", `Target ${member.targetKcal} > 2800: forcing 5 meals (mandatory snacks)`);
      snackPreference = "two";
    }
  }
  // > 2200 kcal: Force min 4 meals
  else if (member.targetKcal > 2200 && snackPreference === "none") {
    log("warning", `Target ${member.targetKcal} > 2200: forcing 4 meals (mandatory snack)`);
    snackPreference = "one";
  }

  let mealDistribution = MEAL_DISTRIBUTION[snackPreference];

  // Mod 7: Bulk Distribution (Smoother Curve)
  // Use bulk_two (20-15-25-15-25) instead of standard two (20-10-30-10-30)
  if (member.targetKcal > 2800) {
    log("decision", `Target ${member.targetKcal} > 2800: using 'bulk_two' distribution (20-15-25-15-25)`);
    // @ts-ignore - 'bulk_two' is a virtual key added in logic
    mealDistribution = MEAL_DISTRIBUTION["bulk_two"];
  }

  log(
    "info",
    `Snack preference: ${snackPreference}, meals per day: ${mealDistribution.length}`
  );

  // Get side dishes for gap fill
  const sideRecipes = allRecipes.filter((r) => r.category === "side_dish");
  log("info", `Found ${sideRecipes.length} side dishes for gap fill`);

  // Mod 18: Get vegetable side dishes for Harvard Plate
  const vegSideRecipes = allRecipes.filter((r) => r.category === "vegetable_side");
  log("info", `Found ${vegSideRecipes.length} vegetable sides for Harvard Plate`);

  // Mod 1: Track recipe usage with day number (anti-repetition)
  const recipeLastUsedDay: Map<string, number> = new Map();

  // Mod 2: Track last side dish used
  let lastSideId: string | null = null;

  // Mod 4: Track recipes used TODAY per meal type (for same-day fallback)
  const todayRecipeIds: Set<string> = new Set();

  // Generate meals
  const meals: PlannedMeal[] = [];
  let totalKcal = 0;

  for (let day = 1; day <= 7; day++) {
    log("info", `--- Day ${day} ---`);

    let lunchProteinSource: ProteinSource | null = null;
    todayRecipeIds.clear(); // Reset for new day

    // Mod 13: Track daily protein source usage (max 2 per day)
    const dailyProteinCounts: Partial<Record<ProteinSource, number>> = {};

    for (const { type: mealType, ratio } of mealDistribution) {
      const targetKcal = Math.round(member.targetKcal * ratio);
      const category = MEAL_TYPE_TO_CATEGORY[mealType];

      // Filter recipes by category
      let availableRecipes = allRecipes.filter((r) => r.category === category);

      // Mod 19: Breakfast Quota Enforcement
      // Filter out protein sources that have reached their weekly max
      if (mealType === "breakfast") {
        const originalCount = availableRecipes.length;
        const quotaFilteredBreakfast = availableRecipes.filter((r) => {
          const source = r.proteinSource;
          const quota = proteinTracker[source];
          if (!quota) return true; // Unknown source, allow
          return quota.current < quota.max;
        });

        if (quotaFilteredBreakfast.length > 0) {
          availableRecipes = quotaFilteredBreakfast;
          if (quotaFilteredBreakfast.length < originalCount) {
            const excludedSources = Object.entries(proteinTracker)
              .filter(([, q]) => q.current >= q.max)
              .map(([s]) => s);
            log("decision", `breakfast: Excluding ${excludedSources.join(", ")} (quota full)`);
          }
        } else {
          log("warning", `breakfast: All sources at quota, allowing any`);
        }
      }

      // Mod 8: Expanded Snack Pool (Hybrid Bulk)
      if (
        member.goal === "bulk" &&
        member.targetKcal > 2800 &&
        (mealType === "snack_am" || mealType === "snack_pm")
      ) {
        log("decision", `${mealType}: Expanding pool with dense Breakfast items (>120kcal/100g)`);

        const denseBreakfasts = allRecipes.filter(
          (r) => r.category === "breakfast" && r.kcalPer100g > 120
        );

        if (denseBreakfasts.length > 0) {
          availableRecipes = [...availableRecipes, ...denseBreakfasts];
          log("info", `Added ${denseBreakfasts.length} breakfast items to snack pool`);
        }
      }

      // For main meals, apply protein source logic
      if (mealType === "lunch" || mealType === "dinner") {
        // Save original pool for fallback
        const originalCategoryRecipes = [...availableRecipes];

        // Get priority sources (under min quota)
        const prioritySources = Object.entries(proteinTracker)
          .filter(([, q]) => q.current < q.min)
          .map(([source]) => source as ProteinSource);

        // Get available sources (under max quota)
        const availableSources = Object.entries(proteinTracker)
          .filter(([, q]) => q.current < q.max)
          .map(([source]) => source as ProteinSource);

        // Priority: Use under-min sources first
        if (prioritySources.length > 0) {
          const priorityRecipes = availableRecipes.filter((r) =>
            prioritySources.includes(r.proteinSource)
          );
          if (priorityRecipes.length > 0) {
            availableRecipes = priorityRecipes;
            log(
              "decision",
              `Prioritizing ${prioritySources.join(", ")} (under min quota)`
            );
          }
        }

        // Filter to available sources (weekly quota)
        const quotaFilteredRecipes = availableRecipes.filter((r) =>
          availableSources.includes(r.proteinSource)
        );

        // Mod 15: Fallback if quota filter empties pool
        if (quotaFilteredRecipes.length > 0) {
          availableRecipes = quotaFilteredRecipes;
        } else if (availableRecipes.length > 0) {
          log(
            "warning",
            `${mealType}: Weekly quota exhausted for all sources, ignoring quota to avoid skipping meal`
          );
          // Keep availableRecipes as-is (ignoring weekly quota)
        }

        // Mod 13: Filter sources that reached daily limit (max 2)
        // Also soft preference to avoid breakfast source at lunch
        const breakfastSource = meals.find(m => m.day === day && m.mealType === "breakfast")?.recipe.proteinSource;

        const dailyFilteredRecipes = availableRecipes.filter(r => {
          const count = dailyProteinCounts[r.proteinSource] || 0;
          // Hard Limit: Max 2 times per day
          if (count >= 2) return false;
          // Soft Preference: Try to avoid repeating breakfast source at lunch (unless necessary)
          if (mealType === "lunch" && r.proteinSource === breakfastSource && availableRecipes.length > 2) {
            // Only exclude if we have enough other options
            return false;
          }
          return true;
        });

        // Mod 15b: Fallback if daily filter empties pool
        if (dailyFilteredRecipes.length > 0) {
          availableRecipes = dailyFilteredRecipes;
        } else if (availableRecipes.length > 0) {
          log(
            "warning",
            `${mealType}: Daily protein limit reached for all sources, relaxing limit`
          );
        }

        // Dinner differentiation: avoid same source as lunch
        if (mealType === "dinner" && lunchProteinSource) {
          const differentSourceRecipes = availableRecipes.filter(
            (r) => r.proteinSource !== lunchProteinSource
          );
          if (differentSourceRecipes.length > 0) {
            availableRecipes = differentSourceRecipes;
            log("decision", `Dinner: Avoiding ${lunchProteinSource} (lunch source)`);
          } else {
            log(
              "warning",
              `Dinner: No different source available, allowing same as lunch`
            );
          }
        }

        // Mod 15c: Ultimate fallback - if still empty, use any recipe from category
        if (availableRecipes.length === 0 && originalCategoryRecipes.length > 0) {
          log(
            "warning",
            `${mealType}: All filters exhausted, falling back to any ${category} recipe`
          );
          availableRecipes = originalCategoryRecipes;
        }
      }

      // Mod 1: Anti-repetition - exclude recipes used in last COOLDOWN days
      const nonRecentRecipes = availableRecipes.filter((r) => {
        const lastUsed = recipeLastUsedDay.get(r.id);
        if (!lastUsed) return true;
        return day - lastUsed >= RECIPE_COOLDOWN_DAYS;
      });

      if (nonRecentRecipes.length > 0) {
        availableRecipes = nonRecentRecipes;
      } else {
        log(
          "warning",
          `All ${category} recipes used recently, allowing older ones`
        );
      }

      // Mod 4: For dinner, also exclude recipes used today (same-day protection)
      if (mealType === "dinner") {
        const notUsedTodayRecipes = availableRecipes.filter(
          (r) => !todayRecipeIds.has(r.id)
        );
        if (notUsedTodayRecipes.length > 0) {
          availableRecipes = notUsedTodayRecipes;
        } else {
          log(
            "warning",
            `All dinner recipes already used today, allowing repeat`
          );
        }
      }

      // NEW: Bulk Priority Selection (Mod 6)
      if (member.goal === "bulk") {
        const highDensityRecipes = availableRecipes.filter(
          (r) => r.kcalPer100g >= BULK_DENSITY_THRESHOLD
        );
        // Only prioritize if we have options
        if (highDensityRecipes.length > 0) {
          // Use filtered pool
          availableRecipes = highDensityRecipes;
          log(
            "decision",
            `${mealType}: Prioritizing HIGH DENSITY recipes (> ${BULK_DENSITY_THRESHOLD} kcal/100g) for Bulk`
          );
        } else if (availableRecipes.length > 0) {
          log(
            "warning",
            `${mealType}: No high density recipes available for Bulk, falling back to all available`
          );
        }
      }

      // Random selection
      if (availableRecipes.length === 0) {
        log("error", `No recipes available for ${mealType}!`);
        continue;
      }

      const selectedIndex = Math.floor(Math.random() * availableRecipes.length);
      const selectedRecipe = availableRecipes[selectedIndex];

      log(
        "decision",
        `${mealType}: Selected "${selectedRecipe.nameIt}" (${selectedRecipe.proteinSource}, ${selectedRecipe.kcalPer100g} kcal/100g)`
      );

      // Calculate portion with gap fill logic
      const isMainMeal = mealType === "lunch" || mealType === "dinner";
      const logicRecipe: LogicRecipe = {
        id: selectedRecipe.id,
        category: selectedRecipe.category,
        kcalPer100g: selectedRecipe.kcalPer100g,
        proteinPer100g: selectedRecipe.proteinPer100g,
        carbsPer100g: selectedRecipe.carbsPer100g,
        fatPer100g: selectedRecipe.fatPer100g,
        proteinSource: selectedRecipe.proteinSource, // Mod 16: For legume-grain complementation
        tags: selectedRecipe.tags, // Mod 18: For Harvard Plate
      };
      const logicSides = sideRecipes.map((r) => ({
        id: r.id,
        category: r.category,
        kcalPer100g: r.kcalPer100g,
        proteinPer100g: r.proteinPer100g,
        carbsPer100g: r.carbsPer100g,
        fatPer100g: r.fatPer100g,
        proteinSource: r.proteinSource, // Mod 16: Side dishes also need source info
        tags: r.tags, // Mod 18
      }));

      // Mod 2: Pass lastSideId for side rotation
      // Mod 6: Pass dailyTargetKcal as second argument
      const composition = calculateMealComposition(
        targetKcal,
        member.targetKcal, // Pass daily target
        logicRecipe,
        logicSides,
        isMainMeal,
        { lastSideId }
      );

      // Add debug logs from composition
      for (const logLine of composition.debugLog) {
        log("info", logLine);
      }

      // Find side recipe if selected
      let sideRecipe: Recipe | null = null;
      if (composition.sideRecipeId) {
        sideRecipe =
          sideRecipes.find((r) => r.id === composition.sideRecipeId) ?? null;
        // Update last side ID for rotation
        lastSideId = composition.sideRecipeId;
      }

      // Find side2 recipe if selected (Double Side feature)
      let side2Recipe: Recipe | null = null;
      if (composition.side2RecipeId) {
        side2Recipe =
          sideRecipes.find((r) => r.id === composition.side2RecipeId) ?? null;
      }

      // Mod 18: Harvard Plate - Add vegetable side if main lacks vegetables
      let vegSideRecipe: Recipe | null = null;
      let vegSidePortionGrams: number | null = null;
      let vegSidePortionKcal: number | null = null;

      if (isMainMeal && vegSideRecipes.length > 0) {
        const mainHasVegetables = selectedRecipe.tags?.includes("vegetable_heavy");

        if (!mainHasVegetables) {
          // Select a random vegetable side (with rotation)
          const availableVegSides = vegSideRecipes.filter(
            (r) => !recipeLastUsedDay.has(r.id) || day - (recipeLastUsedDay.get(r.id) ?? 0) >= 2
          );

          const vegSidePool = availableVegSides.length > 0 ? availableVegSides : vegSideRecipes;
          const vegIndex = Math.floor(Math.random() * vegSidePool.length);
          vegSideRecipe = vegSidePool[vegIndex];

          // Fixed portion: ~100-150g for vegetables (low calorie, good volume)
          vegSidePortionGrams = 150;
          vegSidePortionKcal = Math.round((vegSidePortionGrams / 100) * vegSideRecipe.kcalPer100g);

          log(
            "decision",
            `[Harvard] Main lacks vegetables, adding ${vegSideRecipe.nameIt} (${vegSidePortionGrams}g = ${vegSidePortionKcal} kcal)`
          );

          recipeLastUsedDay.set(vegSideRecipe.id, day);
        } else {
          log(
            "info",
            `[Harvard] Main is vegetable_heavy, skipping vegetable side`
          );
        }
      }

      // Create planned meal
      const meal: PlannedMeal = {
        id: crypto.randomUUID(),
        day,
        mealType,
        recipeId: selectedRecipe.id,
        recipe: selectedRecipe,
        portionGrams: composition.mainGrams,
        portionKcal: composition.mainKcal,
        sideRecipeId: composition.sideRecipeId,
        sideRecipe,
        sidePortionGrams: composition.sideGrams,
        sidePortionKcal: composition.sideKcal,
        side2RecipeId: composition.side2RecipeId,
        side2Recipe,
        side2PortionGrams: composition.side2Grams,
        side2PortionKcal: composition.side2Kcal,
        vegSideRecipeId: vegSideRecipe?.id ?? null,
        vegSideRecipe,
        vegSidePortionGrams,
        vegSidePortionKcal,
      };

      meals.push(meal);
      totalKcal += composition.mainKcal + (composition.sideKcal ?? 0) + (composition.side2Kcal ?? 0) + (vegSidePortionKcal ?? 0);

      // Mod 13: Increment daily protein count
      const source = selectedRecipe.proteinSource;
      dailyProteinCounts[source] = (dailyProteinCounts[source] || 0) + 1;

      // Update trackers
      recipeLastUsedDay.set(selectedRecipe.id, day); // Mod 1
      todayRecipeIds.add(selectedRecipe.id); // Mod 4

      // Mod 14: Count breakfast dairy towards weekly quota
      // This prevents overloading dairy when multiple dairy breakfasts are selected
      if (mealType === "breakfast" && selectedRecipe.proteinSource === "dairy") {
        proteinTracker["dairy"].current++;
        log("decision", `breakfast: Counting dairy towards weekly quota (${proteinTracker["dairy"].current}/${proteinTracker["dairy"].max})`);
      }

      if (mealType === "lunch" || mealType === "dinner") {
        proteinTracker[selectedRecipe.proteinSource].current++;
        if (mealType === "lunch") {
          lunchProteinSource = selectedRecipe.proteinSource;
        }
      }
    }
  }

  log(
    "info",
    `Generation complete. Total: ${totalKcal} kcal (target: ${member.targetKcal * 7} kcal/week)`
  );

  const mealPlan: MealPlan = {
    id: crypto.randomUUID(),
    familyMemberId: member.id,
    weekStart,
    targetKcalWeekly: member.targetKcal * 7,
    actualKcalWeekly: totalKcal,
    meals,
  };

  return {
    mealPlan,
    proteinTracker,
    debugLog,
  };
}

// ============================================================================
// KITCHEN TAB DEMO (for testing multi-member portion calculation)
// ============================================================================

import {
  calculateKitchenMetrics,
  formatKitchenMetrics,
} from "./kitchen.logic";

/**
 * Demo function: Calculates kitchen metrics for a recipe shared by family members.
 * Use this to test the "Kitchen Tab" functionality.
 * @param members - Family members (pass from App state)
 */
export async function computeKitchenDemo(
  recipeId: string,
  mealType: MealType,
  day: number,
  members: FamilyMember[]
): Promise<string[]> {
  if (members.length === 0) {
    return ["⚠️ No family members provided."];
  }

  // Load the recipe
  const allRecipes = await loadRecipes();
  const recipe = allRecipes.find((r) => r.id === recipeId);
  if (!recipe) {
    return [`⚠️ Recipe ${recipeId} not found.`];
  }

  // Load ingredients for recipe
  const ingredients = await loadIngredientsForRecipe(recipeId);
  if (ingredients.length === 0) {
    return [`⚠️ No ingredients found for recipe "${recipe.nameIt}".`];
  }

  // Calculate kitchen metrics
  const metrics = calculateKitchenMetrics(
    recipe,
    ingredients,
    members,
    mealType,
    day
  );

  // Format and return
  return formatKitchenMetrics(metrics);
}
