# Architecture

**Analysis Date:** 2026-07-04

## Pattern Overview

**Overall:** Offline-first Expo Router mobile app with a layered feature architecture (Routes → Hooks → Services → DB/External). Local SQLite is the source of truth; a remote Cloudflare Worker (Hono) feeds curated recipes, and Supabase handles auth.

**Key Characteristics:**
- Expo Router file-based routing with route groups (`(auth)`, `(onboarding)`, `(tabs)`, `(modals)`) — entry declared in `package.json` as `expo-router/entry`.
- Offline-first: data persisted in local SQLite via Drizzle ORM (`src/db/client.ts`), seeded/synced from a remote API (`src/services/sync.service.ts`).
- Hybrid state management: **Zustand** for cross-screen app/auth state, **TanStack Query** for server/derived data fetching and mutations.
- Typed domain model: Zod schemas in `src/schemas/` double as validation + TypeScript types, consumed by both services and React Query hooks.
- Business logic isolated from UI in `src/services/` (pure functions where possible), exposed to components exclusively through `src/hooks/` React Query wrappers.
- Monorepo-adjacent: sibling standalone projects `apps/algorithm-playground/` (Vite) and `recipe-manager/` (Python) support algorithm prototyping and recipe authoring; they are not imported by the Expo app.

## Layers

**Routing / Presentation:**
- Purpose: Screen-level layouts, navigation, and presentational components; no direct DB access.
- Location: `app/` (Expo Router routes) and `src/components/` (reusable UI)
- Contains: `_layout.tsx` files, tab/modal/onboarding screens, presentational components (`MealCard.tsx`, `RecipeCard.tsx`, `WeightChart.tsx`, `src/components/ui/PasswordInput.tsx`, `src/components/cooking/CookingModeModal.tsx`)
- Depends on: `src/hooks/`, `src/stores/`, `src/schemas/` (for form types), `src/components/`
- Used by: Expo Router runtime

**State (App/Session):**
- Purpose: Global cross-screen state persisted across navigations (auth session, onboarding flow, selected family member).
- Location: `src/stores/authStore.ts`, `src/stores/familyStore.ts`
- Contains: Zustand stores with actions
- Depends on: `src/lib/supabase.ts`, `src/schemas/auth.ts`
- Used by: `app/_layout.tsx`, `app/index.tsx`, tab screens, components

**Data Access Hooks:**
- Purpose: Wrap `src/services/` functions in TanStack Query; define query keys, cache strategy, invalidation; the only sanctioned interface for components to reach data.
- Location: `src/hooks/useMealPlan.ts`, `src/hooks/useRecipes.ts`, `src/hooks/useFamilyMembers.ts`, `src/hooks/useWeightLogs.ts`, `src/hooks/useShoppingList.ts`, `src/hooks/useDebouncedValue.ts`
- Contains: `useQuery`/`useMutation` hooks + query-key factories (see `mealPlanKeys` in `src/hooks/useMealPlan.ts`)
- Depends on: `src/services/`, `@tanstack/react-query`
- Used by: `src/components/`, `app/` screens

**Services (Business Logic):**
- Purpose: Pure-ish domain operations against the local DB and remote API; no React dependencies.
- Location: `src/services/`
- Contains: `mealPlan.service.ts` (largest, 1341 lines — plan generation, swap, regenerate), `mealPlan.logic.ts` (pure composition math), `mealPlan.types.ts`, `recipe.service.ts`, `familyMember.service.ts`, `user.service.ts`, `weightLog.service.ts`, `shoppingList.service.ts`, `sync.service.ts`, `seed.service.ts`
- Depends on: `src/db/client.ts`, `src/db/schema/`, `src/schemas/`, `src/lib/api.ts`, `expo-crypto` (UUID)
- Used by: `src/hooks/`

**Domain Schemas / Validation:**
- Purpose: Zod schemas that validate inputs (forms, API payloads) and export inferred TypeScript types shared cross-layer.
- Location: `src/schemas/auth.ts`, `src/schemas/familyMember.ts`, `src/schemas/mealPlan.ts`, `src/schemas/recipe.ts`, `src/schemas/weightLog.ts`
- Depends on: `zod`
- Used by: `src/stores/`, `src/services/`, `src/hooks/`, `app/` forms (via `react-hook-form` + `@hookform/resolvers`)

**Data Persistence:**
- Purpose: Local SQLite source of truth via Drizzle ORM; schema and migrations.
- Location: `src/db/client.ts`, `src/db/schema/index.ts`, `src/db/migrate.ts`, `drizzle/` (generated migrations), `drizzle.config.ts`, `drizzle.config.turso.ts`
- Contains: 11 tables (`users`, `familyMembers`, `recipes`, `ingredients`, `recipeIngredients`, `recipeSteps`, `tags`, `recipeTags`, `mealPlans`, `plannedMeals`, `savedRecipes`, `weightLogs`, `shoppingLists`, `shoppingItems`) plus relations
- Depends on: `drizzle-orm`, `expo-sqlite`
- Used by: `src/services/`

**Infrastructure / Lib:**
- Purpose: External client singletons and pure utilities.
- Location: `src/lib/supabase.ts` (Supabase client with `expo-secure-store` adapter), `src/lib/api.ts` (API base URL + response types), `src/lib/tdee.ts` (TDEE/macro math), `src/lib/nativewind.ts` (NativeWind bootstrap)
- Used by: stores, services, root layout

## Data Flow

**App Boot:**
1. `expo-router/entry` loads `app/_layout.tsx` — registers URL polyfill, NativeWind/global CSS, wraps app in `QueryClientProvider` + `SafeAreaProvider`.
2. `RootLayoutContent` calls `useMigrationHelper()` (runs pending Drizzle migrations) and `useAuthStore.initialize()` (subscribes to Supabase `onAuthStateChange`).
3. Deep-link listener in `app/_layout.tsx` parses `access_token`/`refresh_token` from URLs (password recovery) and calls `supabase.auth.setSession`.
4. Once migrations ready and user logged in, `sync.service.ts` pulls curated recipes from the Cloudflare Worker API into local SQLite (gated by `isSyncNeeded`).
5. `app/index.tsx` redirects: no session → `/(auth)/welcome`; session but onboarding incomplete → `/(onboarding)/goal`; otherwise → `/(tabs)`.

**Meal Plan Generation (representative feature flow):**
1. Screen calls `useGenerateMealPlan()` from `src/hooks/useMealPlan.ts`.
2. Hook's `mutationFn` invokes `generateMealPlan()` in `src/services/mealPlan.service.ts`.
3. Service loads candidate recipes via `getRecipesForPlanning()` (`recipe.service.ts`), computes portions/macros via pure `calculateMealComposition()` in `mealPlan.logic.ts`, enforces Mediterranean Diet protein quotas, then inserts `mealPlans` + `plannedMeals` rows into SQLite through Drizzle.
4. On success the hook invalidates `mealPlanKeys.detail(...)` so `useMealPlan` refetches from local DB.

**State Management:**
- **Zustand** (`src/stores/`): ephemeral cross-screen state — auth session, onboarding progress, currently selected family member. Not persisted to disk in current implementation.
- **TanStack Query** (`src/hooks/`): all persisted-domain reads/mutations; default `staleTime` 5 min (`app/_layout.tsx`), overridden per-query (e.g., meal plan 30s with `refetchOnMount`/`refetchOnWindowFocus`).
- **Local SQLite** (Drizzle): durable source of truth; components never query it directly — only services do.

## Key Abstractions

**Service Module:**
- Purpose: One domain per file exposing pure functions operating on `db` + schema; no React imports.
- Examples: `src/services/mealPlan.service.ts`, `src/services/recipe.service.ts`, `src/services/familyMember.service.ts`
- Pattern: Plain exported async functions (`getMealPlan`, `generateMealPlan`, `swapMeal`, ...); types imported from `src/schemas/` and `src/services/mealPlan.types.ts`.

**Query-Key Factory:**
- Purpose: Stable, hierarchical cache keys for TanStack Query invalidation.
- Examples: `src/hooks/useMealPlan.ts` (`mealPlanKeys.all`, `.details()`, `.detail(memberId, weekStart)`)
- Pattern: `const xxxKeys = { all: [...], detail: (args) => [...] } as const;`

**Zod Schema Module:**
- Purpose: Single source of truth for a domain's shape — validates form/API input and exports `z.infer` types used across layers.
- Examples: `src/schemas/auth.ts`, `src/schemas/familyMember.ts`, `src/schemas/mealPlan.ts`, `src/schemas/recipe.ts`, `src/schemas/weightLog.ts`
- Pattern: paired with `react-hook-form` via `@hookform/resolvers/zod` in screens.

**Route Group:**
- Purpose: Group related screens under a shared layout and navigation presentation.
- Examples: `app/(auth)/`, `app/(onboarding)/`, `app/(tabs)/`, `app/(modals)/`
- Pattern: Parenthesized directory name does not appear in URL; each group has a `_layout.tsx` defining its navigator (`Stack` or `Tabs`).

## Entry Points

**App entry:**
- Location: `package.json` `main: "expo-router/entry"` → `app/_layout.tsx` (root layout)
- Triggers: App launch (native + web)
- Responsibilities: Provider wiring (React Query, SafeArea), migration runner, auth listener, deep-link/auth-event handling, recipe sync, onboarding gating.

**Initial route:**
- Location: `app/index.tsx`
- Responsibilities: Waits for migrations + auth check, then `Redirect` to auth / onboarding / tabs.

**Group layouts:**
- `app/(auth)/_layout.tsx` — `Stack` (welcome, login, signup)
- `app/(onboarding)/_layout.tsx` — `Stack` (goal, profile, tdee, family)
- `app/(tabs)/_layout.tsx` — `Tabs` (index Home, recipes, plan, progress, profile)
- `app/(modals)/_layout.tsx` — modal `Stack` (recipe-detail, meal-swap, add-weight, shopping-list, member-detail)

## Error Handling

**Strategy:** Defensive `try/catch` at action boundaries with `console.error`/`console.warn` logging; UI-level fallback states.

**Patterns:**
- Root layout guards: `app/_layout.tsx` wraps sync, onboarding-check, and auth-init in try/catch with console logs prefixed `[App]`, `[Auth]`, `[Network]`.
- Migration gate: `app/index.tsx` shows "Inizializzazione..." while `useMigrationHelper().success` is false; routes only once ready.
- Auth init failure path: `src/stores/authStore.ts` sets `isLoading: false, isInitialized: true` on `getSession` rejection.
- Missing Supabase config: `src/lib/supabase.ts` warns at module load and continues with empty strings (auth will fail noisily rather than crash).
- No centralized error boundary or toast system detected — errors are logged, not surfaced globally.

## Cross-Cutting Concerns

**Logging:** Prefixed `console.log`/`console.error`/`console.warn` (e.g. `[Auth]`, `[App]`, `[Network]`). No structured logging library.
**Validation:** Zod schemas in `src/schemas/` consumed both by services (runtime validation of inputs) and screens (form validation via `react-hook-form` + `@hookform/resolvers`).
**Authentication:** Supabase Auth with `expo-secure-store` as the token storage adapter (`src/lib/supabase.ts`); session propagated via `useAuthStore`. Deep links handled in `app/_layout.tsx` for password recovery.
**Localization:** Bilingual content stored at the data layer (`name_it`/`name_en`, `description_it`/`description_en` columns in `src/db/schema/index.ts`); `users.locale` defaults to `"it"`.
**Styling:** NativeWind 4.x (Tailwind for React Native) with `className` props; global CSS imported in `app/_layout.tsx` via `./global.css`; config in `tailwind.config.js` and `src/lib/nativewind.ts`.
**Database Migrations:** Drizzle Kit generates SQL into `drizzle/`; applied at runtime by `useMigrations` in `src/db/migrate.ts`. Scripts in `package.json`: `db:generate`, `db:push`, `db:migrate`.

---

*Architecture analysis: 2026-07-04*
