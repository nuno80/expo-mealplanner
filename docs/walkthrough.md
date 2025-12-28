# Phase 4 & 4.5: Core Features & Visual Polish - Walkthrough

> **Completed:** 2025-12-28
> **TypeScript:** ✅ Passing
> **Lint:** ✅ Minor warnings (unused variables for future use)

---

## What Was Built

### Backend (B1-B4)

**12 new database tables** added to [index.ts](file:///home/nuno/programmazione/expo-mealplanner/src/db/schema/index.ts):

| Table | Purpose |
|-------|---------|
| `recipes` | Bilingual recipes with nutrition data |
| `ingredients` | Master ingredients with USDA data |
| `recipeIngredients` | Join table with quantities |
| `recipeSteps` | Preparation instructions |
| `tags` / `recipeTags` | Diet tags (v2.0 ready) |
| `mealPlans` | Weekly plans per family member |
| `plannedMeals` | Individual meals with portions |
| `savedRecipes` | User favorites |
| `weightLogs` | Weight tracking |
| `shoppingLists` / `shoppingItems` | Grocery lists |

**Zod Schemas** for type-safe validation:
- [recipe.ts](file:///home/nuno/programmazione/expo-mealplanner/src/schemas/recipe.ts) - Recipe, Ingredient, Tag
- [mealPlan.ts](file:///home/nuno/programmazione/expo-mealplanner/src/schemas/mealPlan.ts) - MealPlan, PlannedMeal, WeightLog

**Services with business logic:**
- [recipe.service.ts](file:///home/nuno/programmazione/expo-mealplanner/src/services/recipe.service.ts) - List, search, detail
- [mealPlan.service.ts](file:///home/nuno/programmazione/expo-mealplanner/src/services/mealPlan.service.ts) - **Generation algorithm**, swap, complete, regenerate

### Visual Polish (Phase 4.5)

**Design System Upgrade:**
- **Tailwind Palette**: Added `brand` (Orange), `success` (Green), `ui` (Slate) semantic colors.
- **Components**:
  - `Card`: Softer shadows, variant support (elevated/flat/outlined).
  - `RecipeCard`: Full-height image background, gradient overlays for text readability, floating badges.
  - `MealCard`: Compact modern layout, brand-colored labels, cleaner action buttons.
  - `ProgressRing`: Refined typography and color usage (no SVG dep needed).
- **Screens**:
  - `HomeScreen`: Sticky header with user greeting, stats summary, and inspiration carousel.
  - `RecipesScreen`: Polished search bar with shadow, pill-shaped active tabs.
  - `PlanScreen`: Sticky week navigation header, large typography for dates.

---

### Meal Plan Algorithm

```
1. Get family member's target kcal (TDEE + adjustment)
2. Calculate weekly target = daily × 7
3. For each day (1-7):
   - Select recipes by category (breakfast/lunch/dinner)
   - Avoid repeats within last 3 days
   - Calculate portions to hit daily target (20/30/35/15% split)
4. Return plan with per-meal portions in grams
```

---

### Frontend (F1-F6)

**UI Components** created in [src/components/](file:///home/nuno/programmazione/expo-mealplanner/src/components/):
- `Card.tsx` - Base card with shadow
- `RecipeCard.tsx` - Grid recipe display
- `MealCard.tsx` - Plan meal display
- `ProgressRing.tsx` - Calorie progress

**TanStack Query Hooks** in [src/hooks/](file:///home/nuno/programmazione/expo-mealplanner/src/hooks/):
- `useRecipes.ts` - Recipe listing/search
- `useMealPlan.ts` - Plan CRUD with mutations

**Screens implemented:**

| Screen | File | Key Features |
|--------|------|--------------|
| HomeScreen | [index.tsx](file:///home/nuno/programmazione/expo-mealplanner/app/(tabs)/index.tsx) | Progress rings, next meal, weekly summary |
| RecipesScreen | [recipes.tsx](file:///home/nuno/programmazione/expo-mealplanner/app/(tabs)/recipes.tsx) | Search, category tabs, FlatList grid |
| PlanScreen | [plan.tsx](file:///home/nuno/programmazione/expo-mealplanner/app/(tabs)/plan.tsx) | Week navigation, day cards, regenerate |
| RecipeDetailModal | [recipe-detail.tsx](file:///home/nuno/programmazione/expo-mealplanner/app/(modals)/recipe-detail.tsx) | Image, nutrition, ingredients/steps tabs |
| MealSwapModal | [meal-swap.tsx](file:///home/nuno/programmazione/expo-mealplanner/app/(modals)/meal-swap.tsx) | Alternative selection |
| ShoppingListModal | [shopping-list.tsx](file:///home/nuno/programmazione/expo-mealplanner/app/(modals)/shopping-list.tsx) | Category groups, checkboxes |

---

## Verification Results

```bash
pnpm exec tsc --noEmit  # ✅ No errors
pnpm exec biome check ./  # ⚠️ 3 unused variable warnings (placeholders)
```

---

## What's Missing for Full Functionality

> [!IMPORTANT]
> The screens are built but require **data in the database**:

1. **Recipes** - Need to populate via Recipe Manager (Phase 6)
2. **User context** - `primaryMemberId` is hardcoded as `undefined`
3. **Drizzle migration** - Run `pnpm exec drizzle-kit push` to create tables

---

## Next Steps

1. **Phase 5**: Progress tracking (weight log UI)
2. **Phase 6**: Recipe Manager to populate DB
3. **Connect user context** to screens
