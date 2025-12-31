import type { InferSelectModel } from "drizzle-orm";
import type { familyMembers } from "@/db/schema";
import type {
	RecipeIngredientWithDetails,
	RecipeWithDetails,
} from "@/schemas/recipe";

type Recipe = RecipeWithDetails;
type FamilyMember = InferSelectModel<typeof familyMembers>;

export interface IngredientScalingResult {
	name: string;
	unit: string;
	totalRawPayload: number; // For the pot (e.g. 500g pasta)
	originalQuantity: number;
}

export interface FamilyMemberPortion {
	memberId: string;
	memberName: string;
	targetKcal: number;
	cookedWeightG: number; // What goes on the plate
}

/**
 * Calculates the target calories for a specific meal type for a family member.
 * Distribution matches the Plan Generation Logic:
 * - Breakfast: 20%
 * - Lunch: 35%
 * - Dinner: 35%
 * - Snacks: 10% (split if 2 snacks)
 */
export function calculateMealTarget(
	member: FamilyMember,
	mealType: "breakfast" | "lunch" | "dinner" | "snack" | string,
): number {
	const dailyTarget = member.targetKcal;

	switch (mealType) {
		case "breakfast":
			return Math.round(dailyTarget * 0.2);
		case "lunch":
			return Math.round(dailyTarget * 0.35);
		case "dinner":
			return Math.round(dailyTarget * 0.35);
		case "snack":
		case "snack_am":
		case "snack_pm":
			// If snacks enabled, allocate 10% total to snacks.
			// If single snack, 10%. If two, we might split, but for single calculation let's assume 5-10% depending on context.
			// Getting simple: 5% per snack slot if 2 slots, or 10% if 1.
			// Let's standard on 5% for a single snack slot for safety.
			return Math.round(dailyTarget * 0.05);
		default:
			return Math.round(dailyTarget * 0.35); // Fallback to main meal size
	}
}

/**
 * Calculates the cooked portion weight (in grams) for a specific kcals target.
 * Formula: (TargetKcal / RecipeKcalPer100g) * 100
 */
export function calculateCookedPortion(
	recipe: Recipe,
	targetKcal: number,
): number {
	if (!recipe.kcalPer100g || recipe.kcalPer100g === 0) return 0;
	return Math.round((targetKcal / recipe.kcalPer100g) * 100);
}

/**
 * Calculates the raw ingredients needed for the TOTAL caloric requirement of the group.
 */
export function calculateRawIngredients(
	recipe: Recipe,
	ingredients: RecipeIngredientWithDetails[],
	members: { member: FamilyMember; mealType: string }[],
): IngredientScalingResult[] {
	const totalTargetKcal = members.reduce(
		(sum, item) => sum + calculateMealTarget(item.member, item.mealType),
		0,
	);

	// Calculate Base Recipe Kcal
	// Priority: 1. Explicit kcalPerServing * servings
	//           2. Derived from 100g
	let baseRecipeTotalKcal = 0;

	if (recipe.kcalPerServing && recipe.servings) {
		baseRecipeTotalKcal = recipe.kcalPerServing * recipe.servings;
	} else if (recipe.kcalPer100g && recipe.servingWeightG && recipe.servings) {
		baseRecipeTotalKcal =
			(recipe.kcalPer100g * recipe.servingWeightG * recipe.servings) / 100;
	} else {
		// Fallback: This is risky if data is missing.
		// Assume the ingredients list `quantity` corresponds to `servings`.
		// We need a Kcal reference.
		// For MVP/Robustness: Use kcalPer100g.
		// If `kcalPerServing` is null, we try to estimate:
		// 500 kcal is a standard meal?
		baseRecipeTotalKcal = 500 * recipe.servings;
	}

	// Prevent division by zero
	if (baseRecipeTotalKcal === 0) baseRecipeTotalKcal = 1;

	const scalingFactor = totalTargetKcal / baseRecipeTotalKcal;

	return ingredients.map((ing) => ({
		name: ing.ingredient.nameIt || ing.ingredient.nameEn,
		unit: ing.unit,
		originalQuantity: ing.quantity,
		totalRawPayload: Number((ing.quantity * scalingFactor).toFixed(1)),
	}));
}
