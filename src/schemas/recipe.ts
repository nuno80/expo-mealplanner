import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export const RecipeCategorySchema = z.enum([
	"breakfast",
	"lunch",
	"dinner",
	"snack",
]);
export type RecipeCategory = z.infer<typeof RecipeCategorySchema>;

export const DifficultySchema = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof DifficultySchema>;

// ============================================================================
// INGREDIENT
// ============================================================================

export const IngredientSchema = z.object({
	id: z.string().uuid(),
	usdaFdcId: z.string().nullish(),
	nameIt: z.string(),
	nameEn: z.string(),
	category: z.string().nullish(),
	kcalPer100g: z.number().int().nonnegative(),
	proteinPer100g: z.number().nonnegative(),
	carbsPer100g: z.number().nonnegative(),
	fatPer100g: z.number().nonnegative(),
	fiberPer100g: z.number().nonnegative().nullish(),
	cookedWeightFactor: z.number().positive().default(1),
	defaultUnit: z.string().default("g"),
	createdAt: z.date(),
});
export type Ingredient = z.infer<typeof IngredientSchema>;

// ============================================================================
// RECIPE INGREDIENT (Join with quantity)
// ============================================================================

export const RecipeIngredientSchema = z.object({
	id: z.string().uuid(),
	recipeId: z.string().uuid(),
	ingredientId: z.string().uuid(),
	quantity: z.number().positive(),
	unit: z.string().default("g"),
	isOptional: z.boolean().default(false),
	notesIt: z.string().nullish(),
	notesEn: z.string().nullish(),
	order: z.number().int().nonnegative().default(0),
});
export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;

/** With full ingredient details */
export const RecipeIngredientWithDetailsSchema = RecipeIngredientSchema.extend({
	ingredient: IngredientSchema,
});
export type RecipeIngredientWithDetails = z.infer<
	typeof RecipeIngredientWithDetailsSchema
>;

// ============================================================================
// RECIPE STEP
// ============================================================================

export const RecipeStepSchema = z.object({
	id: z.string().uuid(),
	recipeId: z.string().uuid(),
	stepNumber: z.number().int().positive(),
	instructionIt: z.string(),
	instructionEn: z.string(),
	imageUrl: z.string().url().nullish(),
});
export type RecipeStep = z.infer<typeof RecipeStepSchema>;

// ============================================================================
// RECIPE
// ============================================================================

export const RecipeSchema = z.object({
	id: z.string().uuid(),
	nameIt: z.string(),
	nameEn: z.string(),
	slug: z.string(),
	descriptionIt: z.string().nullish(),
	descriptionEn: z.string().nullish(),
	category: RecipeCategorySchema,
	imageUrl: z.string().url().nullish(),
	prepTimeMin: z.number().int().nonnegative().nullish(),
	cookTimeMin: z.number().int().nonnegative().nullish(),
	totalTimeMin: z.number().int().nonnegative().nullish(),
	servings: z.number().int().positive().default(1),
	difficulty: DifficultySchema.default("easy"),
	kcalPer100g: z.number().int().nonnegative(),
	proteinPer100g: z.number().nonnegative(),
	carbsPer100g: z.number().nonnegative(),
	fatPer100g: z.number().nonnegative(),
	fiberPer100g: z.number().nonnegative().nullish(),
	kcalPerServing: z.number().int().nonnegative().nullish(),
	servingWeightG: z.number().int().positive().nullish(),
	isPublished: z.boolean().default(false),
	createdAt: z.date(),
	updatedAt: z.date(),
});
export type Recipe = z.infer<typeof RecipeSchema>;

/** Full recipe with ingredients and steps (for detail view) */
export const RecipeWithDetailsSchema = RecipeSchema.extend({
	ingredients: z.array(RecipeIngredientWithDetailsSchema),
	steps: z.array(RecipeStepSchema),
});
export type RecipeWithDetails = z.infer<typeof RecipeWithDetailsSchema>;

/** Minimal recipe for list view */
export const RecipeListItemSchema = RecipeSchema.pick({
	id: true,
	nameIt: true,
	nameEn: true,
	slug: true,
	category: true,
	imageUrl: true,
	totalTimeMin: true,
	difficulty: true,
	kcalPerServing: true,
	servingWeightG: true,
	kcalPer100g: true,
});
export type RecipeListItem = z.infer<typeof RecipeListItemSchema>;

// ============================================================================
// TAG
// ============================================================================

export const TagSchema = z.object({
	id: z.string().uuid(),
	slug: z.string(),
	nameIt: z.string(),
	nameEn: z.string(),
	icon: z.string().nullish(),
});
export type Tag = z.infer<typeof TagSchema>;
