# CONVENTIONS.md

**Analysis Date:** 2026-07-05

## Overview

NutriPlanIT is an Expo (SDK 54) + React Native + NativeWind mobile application. The codebase is split between an `app/` directory (Expo Router file-based routes, grouped by feature using route group parentheses like `(auth)` / `(tabs)` / `(onboarding)` / `(modals)`) and a `src/` directory (feature-organized library code: `components/`, `hooks/`, `stores/`, `services/`, `schemas/`, `db/`, `lib/`, `utils/`, `types/`). Linting and formatting are enforced by **Biome 2.x** (`biome.json`); ESLint is absent and not used. TypeScript is configured in **strict mode** via `tsconfig.json` which extends `expo/tsconfig.base`. Conventions are prescriptive per `GEMINI.md` (the project's agent guide) and consistently followed across sampled files.

## File Naming

**Pattern:** Mixed, role-dependent.

| Role | Convention | Example |
|------|------------|---------|
| Components (`src/components/`) | `PascalCase.tsx` | `MealCard.tsx`, `RecipeCard.tsx`, `FamilyMemberSelector.tsx` |
| UI primitives (`src/components/ui/`) | `PascalCase.tsx` | `PasswordInput.tsx` |
| Hooks (`src/hooks/`) | `camelCase` starting with `use` | `useRecipes.ts`, `useDebouncedValue.ts`, `useMealPlan.ts` |
| Services (`src/services/`) | `kebab-case.service.ts` | `mealPlan.service.ts`, `recipe.service.ts`, `familyMember.service.ts` |
| Stores (`src/stores/`) | `camelCaseStore.ts` | `authStore.ts`, `familyStore.ts` |
| Schemas (`src/schemas/`) | `camelCase.ts` (domain noun) | `auth.ts`, `recipe.ts`, `mealPlan.ts`, `weightLog.ts` |
| Lib (`src/lib/`) | `camelCase.ts` or `kebab-case` (api/supabase) | `supabase.ts`, `tdee.ts`, `api.ts`, `nativewind.ts` |
| Utils (`src/utils/`) | `kebab-case.ts` | `portion-calculator.ts` |
| DB | `client.ts`, `migrate.ts`, `schema/index.ts` | `src/db/client.ts:1` |
| Drizzle logic co-located | `<feature>.logic.ts`, `<feature>.types.ts` | `src/services/mealPlan.logic.ts`, `mealPlan.types.ts` |
| Route files in `app/` | Expo Router convention (lowercase, `index.tsx`, `_layout.tsx`, `kebab-case` screens) | `app/(tabs)/plan.tsx`, `app/(auth)/login.tsx` |
| Scripts (`scripts/`) | `kebab-case.ts` / `kebab-case.js` | `verify-algorithm.ts`, `seed-sides.ts`, `validate_env.js` |

**Verified.** `src/components/` entries: `Card.tsx`, `MealCard.tsx`, `RecipeCard.tsx`, `FamilyMemberSelector.tsx`, `MacroProgressChart.tsx`, `ProgressRing.tsx`, `WeeklyKcalRing.tsx`, `WeightChart.tsx`, `ui/PasswordInput.tsx` — all PascalCase. `src/hooks/` files: `useDebouncedValue.ts`, `useFamilyMembers.ts`, `useMealPlan.ts`, `useRecipes.ts`, `useShoppingList.ts`, `useWeightLogs.ts` — all `use*` camelCase.

## Folder Organization

**Pattern:** Feature-based split inside `src/`, route-group split inside `app/`.

```
app/
├── _layout.tsx                  # Root layout (QueryClientProvider, SafeAreaProvider)
├── index.tsx                    # Root redirect based on auth/onboarding state
├── (auth)/                       # Auth route group: login, signup, welcome, *-password
├── (onboarding)/                 # Multi-step onboarding: goal, profile, tdee, family
├── (tabs)/                       # Main app tabs: index (dashboard), plan, recipes, progress, profile
├── (modals)/                     # Modal screens: recipe-detail, meal-swap, add-weight, shopping-list
└── global.css                    # NativeWind global entry

src/
├── components/                   # Presentational + connected components
│   ├── cooking/                 # Cooking-flow subcomponents
│   └── ui/                      # Generic primitives (PasswordInput)
├── hooks/                       # React Query wrappers (use* (feature) - data hooks)
├── stores/                      # Zustand stores (one per concern: authStore, familyStore)
├── services/                    # Data-access + business logic (plain TS, no React)
│   ├── *.service.ts             # DB queries via Drizzle, exported as async functions
│   ├── *.logic.ts               # Pure algorithm functions (e.g. mealPlan.logic.ts)
│   └── *.types.ts               # Local-only service types if not in schemas/
├── schemas/                     # Zod schemas + inferred TS types (source of truth for domain models)
├── db/                          # Drizzle client + schema (src/db/schema/index.ts barrel)
├── lib/                         # Infrastructure adapters (supabase, api, nativewind, tdee)
├── utils/                       # Pure helpers (portion-calculator.ts)
├── types/                       # Ambient .d.ts (expo-vector-icons.d.ts)
└── data/                        # (Empty; placeholder)
```

**Verified.** Directories listed via `Read` on `src/` and `app/`. `src/data/` is currently empty.

## Component Patterns

**Function declaration, named exports, `React.memo` for presentational list cards.**

- Presentational cards wrap export in `React.memo(function Name(...))` and set `displayName`:
  - `src/components/MealCard.tsx:22` — `export const MealCard = React.memo(function MealCard({...}) { ... });` then `MealCard.displayName = "MealCard";` (`MealCard.tsx:166`)
  - `src/components/RecipeCard.tsx:12` — same `React.memo(function RecipeCard(...))` pattern, `RecipeCard.displayName = "RecipeCard";` (`RecipeCard.tsx:101`)
- Stateless presentational primitives use a plain named function declaration (no memo):
  - `src/components/Card.tsx:14` — `export function Card({ children, className = "", variant = "elevated" }: CardProps) { ... }`
- UI primitives (forwarding `props` to a built-in) use a plain named function:
  - `src/components/ui/PasswordInput.tsx:5` — `export function PasswordInput(props: TextInputProps) { ... }`
- Connected components with hooks also use plain named function declarations:
  - `src/components/FamilyMemberSelector.tsx:13` — `export function FamilyMemberSelector({ variant = "header", onSelect }: FamilyMemberSelectorProps) { ... }`
- App screens (Expo Router) are **default-exported** function declarations:
  - `app/(auth)/login.tsx:18` — `export default function LoginScreen() { ... }`
  - `app/(tabs)/plan.tsx:43` — `export default function PlanScreen() { ... }`
  - `app/_layout.tsx:165` — `export default function RootLayout() { ... }`
  - `app/index.tsx:9` — `export default function Index() { ... }`

**Props typing:** Always via a local `interface`, named `<ComponentName>Props` and declared immediately above the component (not exported).

- `src/components/MealCard.tsx:6-12` — `interface MealCardProps { meal: PlannedMealWithRecipe; locale?: "it" | "en"; onPress?: () => void; onSwap?: () => void; onComplete?: () => void; }`
- `src/components/Card.tsx:4-8` — `interface CardProps { children: ReactNode; className?: string; variant?: "elevated" | "flat" | "outlined"; }`
- `src/components/FamilyMemberSelector.tsx:8-11` — `interface FamilyMemberSelectorProps { variant?: "header" | "modal"; onSelect?: (member: FamilyMember) => void; }`

**Arrow vs function:** Mixed but consistent by role — **function declarations** for everything except `React.memo` wrappers, which use **arrow assignment** (`export const X = React.memo(function X(...) {...})`). No `React.FC` usage detected.

## TypeScript Usage

**Strictness:** `tsconfig.json:4` sets `"strict": true`; extends `expo/tsconfig.base`; `jsxImportSource: "nativewind"` (`tsconfig.json:5`).

**Path alias:** `@/*` → `./src/*` (`tsconfig.json:7-10`). Imports from `src/` use `@/`, imports from `app/` siblings use relative paths.

**`type` vs `interface`:**
- Use `interface` for **React component props** and **store shape types** (`AuthState`, `FamilyState`, `CardProps`, `MealCardProps`).
- Use `interface` for **plain data shapes** that need declaration merging or extension: `TdeeCalculationInput`, `MacroTargets`, `MealPlanConfig` (`src/services/mealPlan.types.ts:11`).
- Use `type` for **unions, aliases, and function-return shapes**: `OnboardingStep` (`src/stores/authStore.ts:14`), `Goal = "cut" | "maintain" | "bulk"` (`src/lib/tdee.ts:3`), `SnackPreference` (`src/services/mealPlan.types.ts:9`), `ProteinTracker = Record<...>` (`src/services/mealPlan.service.ts:31`).

**Strict typing via Zod inference (primary pattern):** Domain models live in `src/schemas/` as Zod schemas, with types inferred and re-exported beside them. **Verified across all schema files:**
- `src/schemas/auth.ts:8-9` — `export const SexSchema = z.enum([...]);` then `export type Sex = z.infer<typeof SexSchema>;`
- `src/schemas/recipe.ts:7-16` — `RecipeCategorySchema` + `export type RecipeCategory = z.infer<typeof RecipeCategorySchema>;`
- `src/schemas/recipe.ts:101-129` — `RecipeSchema` (full) + `RecipeListItemSchema = RecipeSchema.pick({...})` (`recipe.ts:139-151`) + `RecipeWithDetailsSchema = RecipeSchema.extend({...})` (`recipe.ts:132`). This `.pick` / `.extend` composability is the canonical way to express list-vs-detail views.

**Import type modifier:** Type-only imports use `import type` consistently:
- `src/components/MealCard.tsx:1` — `import type { MealType, PlannedMealWithRecipe } from "@/schemas/mealPlan";`
- `src/components/Card.tsx:1` — `import type { ReactNode } from "react";`
- `src/lib/tdee.ts:1` — `import type { ActivityLevel, Sex } from "@/schemas/auth";`

**`any` usage:** Minimal but present. `catch (error: any)` in initialization code:
- `src/stores/authStore.ts:118` — `} catch (error: any) { ... error.message || error }`
- The overall convention is to log `error.message || error` rather than rethrow. Zod-validated input makes runtime `any` rare in feature code.

## Styling Approach

**Primary: NativeWind (Tailwind) via `className`.** Confirmed in `tsconfig.json:5` (`jsxImportSource: "nativewind"`), `app/_layout.tsx:3` (`import "./global.css"`), and `tailwind.config.js:3` (content globs for `app/` and `src/`).

**Tailwind theme extensions** (`tailwind.config.js:6-55`):
- `brand` / `primary` (orange palette, `brand-500` = `#f97316` is the primary brand color)
- `success` (green) for positive/completion states
- `ui` (slate gray scale) for neutral surfaces and borders
- Custom `3xl` / `4xl` border radii

**className conventions:**
- Composition via template literals with conditional segments: `src/components/MealCard.tsx:35-36` uses `` className={`flex-row items-center bg-white p-2 pr-4 rounded-2xl mb-3 border border-ui-100 ${meal.isCompleted ? "opacity-60 bg-ui-50" : ""}`} ``
- Inline fallback className passthrough: `src/components/Card.tsx:40` — `` className={`${baseStyle} ${variants[variant]} ${className}`} ``
- `src/components/ui/PasswordInput.tsx:13` — forwards `props.className` into the merged string.

**Inline `style` prop for non-Tailwind concerns:** Used for **shadows** (NativeWind shadow support is limited in older versions) and **computed numeric values**:
- `src/components/MealCard.tsx:37-47` — `style={!meal.isCompleted ? { shadowColor: "#64748b", shadowOffset: {...}, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 } : {}}`
- `src/components/RecipeCard.tsx:35-41` — same pattern, plus `style={{ opacity: 0.8 }}` (`RecipeCard.tsx:60`).
- `app/(auth)/login.tsx:47` — `style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom }}` for safe-area insets that depend on runtime values.

**No `StyleSheet.create` detected** anywhere in `src/` or `app/`. Use `className` first, `style={{...}}` for shadows/numeric-dynamic values.

## State Management Patterns

**Two-tier: Zustand for client UI/session state + TanStack Query for server/database state.**

### Zustand stores (`src/stores/`)

**Pattern:** `create<StateShape>((set, get) => ({ ...initialState, ...actionFunctions }))`. Named hook `use<Name>Store`. Types co-located in the store file under a `// === TYPES ===` divider.

- `src/stores/familyStore.ts:3-6` — `interface FamilyState { selectedMemberId: string | null; setSelectedMemberId: (id: string) => void; }`
- `src/stores/familyStore.ts:8-11` — `export const useFamilyStore = create<FamilyState>((set) => ({ selectedMemberId: null, setSelectedMemberId: (id) => set({ selectedMemberId: id }), }));`
- `src/stores/authStore.ts:57` — larger store: `export const useAuthStore = create<AuthState>((set, get) => ({ ...initialState, setSession, signOut, initialize, setOnboardingStep, ... }))`. Async actions (`signOut: async () => {...}`, `initialize: () => () => void`) are declared directly in the create callback. The `initialize` returns an unsubscribe function to be cleaned up by the caller (`authStore.ts:91-117`).

**Store typing convention:** Action signatures are typed in the `interface` (e.g., `signOut: () => Promise<void>;` at `authStore.ts:41`), so inside `create` they get parameter types inferred from the interface.

### TanStack Query hooks (`src/hooks/`)

**Pattern:** Each feature hook file exports a query-keys factory object and one or more `use<Name>` hooks wrapping `useQuery` / `useMutation` / `usePrefetch`.

- **Query keys** as a colocated factory with `as const` chains:
  - `src/hooks/useRecipes.ts:13-21` —
    ```ts
    export const recipeKeys = {
      all: ["recipes"] as const,
      lists: () => [...recipeKeys.all, "list"] as const,
      list: (category?: RecipeCategory) => [...recipeKeys.lists(), { category }] as const,
      details: () => [...recipeKeys.all, "detail"] as const,
      detail: (id: string) => [...recipeKeys.details(), id] as const,
      search: (query: string) => [...recipeKeys.all, "search", query] as const,
    };
    ```
  - `src/hooks/useMealPlan.ts:21-26` — `mealPlanKeys` factory, keys include `weekStart.toISOString()`.
- **Hook body** uses named `function useFoo(...)` declaration and returns the query result directly. `staleTime` is set per-query (e.g. 5 minutes for recipes, 30 seconds for meal plan):
  - `src/hooks/useRecipes.ts:30-36` — `export function useRecipes(category?: RecipeCategory) { return useQuery({ queryKey: recipeKeys.list(category), queryFn: () => getRecipes(category), staleTime: 1000 * 60 * 5 }); }`
  - `src/hooks/useMealPlan.ts:35-53` — adds `enabled: !!familyMemberId && !!weekStart`, `refetchOnMount: true`, `refetchOnWindowFocus: true`.

**QueryClient created once at app root (outside the component tree):** `app/_layout.tsx:19-26` —
```ts
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});
```
Then provided via `<QueryClientProvider client={queryClient}>` (`app/_layout.tsx:167`).

### Forms

**Pattern:** `react-hook-form` + `@hookform/resolvers/zod` + Zod schema. Controller pattern for each input.

- `app/(auth)/login.tsx:1-7` — imports `zodResolver`, `Controller`, `useForm`, `z`
- `app/(auth)/login.tsx:11-16` — local schema `const loginSchema = z.object({ email: ..., password: ... }); type LoginFormData = z.infer<typeof loginSchema>;` (note: login.tsx redefines email/password even though `LoginSchema` exists in `src/schemas/auth.ts:30` — a minor inconsistency)
- `app/(auth)/login.tsx:22-28` — `useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })`
- `app/(auth)/login.tsx:52-66` — `<Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (<TextInput ... onChangeText={onChange} onBlur={onBlur} value={value} />)} />`

**Per `GEMINI.md:137`: "Form con react-hook-form (no `useState`)"** is an enforced pre-PR rule.

## Import Organization

**Biome `assist.actions.source.organizeImports: "on"`** (`biome.json:28-33`) auto-organizes imports. Observed ordering in sampled files:

1. **Side-effect imports / polyfills first** (e.g. `'react-native-url-polyfill/auto'`, `'./global.css'`, `'@/lib/nativewind'`)
2. **External packages** (`react`, `react-native`, `expo-*`, `@tanstack/...`, `@supabase/...`, `drizzle-orm`, `zod`, `lucide-react-native`)
3. **`@/` aliased internal imports** (hooks, schemas, components, stores, services)
4. **Relative imports** for siblings/children only (e.g. `./global.css`, `./schema` in `src/db/client.ts:3`, `../../drizzle/migrations` in `src/db/migrate.ts:2`, `../src/services/mealPlan.logic` in `scripts/test-gapfill.ts:6`)

**Verified order examples:**
- `src/components/MealCard.tsx:1-4`:
  ```ts
  import type { MealType, PlannedMealWithRecipe } from "@/schemas/mealPlan";
  import { Image } from "expo-image";
  import React from "react";
  import { Pressable, Text, View } from "react-native";
  ```
  ⇢ Type-only `@/` import first, then external packages alphabetically.
- `src/stores/authStore.ts:1-8`: external (`@supabase/...`, `zustand`), then `@/lib/supabase`, then `@/schemas/auth`.
- `app/_layout.tsx:1-16`: polyfill/CSS side-effects, blank line, React Query/expo libs, blank line, then `@/db/migrate`, `@/lib/supabase`, services, stores.

**Quoting & indentation:** `"double"` quote style (`biome.json:22-25`); **tabs** for indentation (`biome.json:13-14`). Some files (notably `src/components/MealCard.tsx`, `RecipeCard.tsx`, `Card.tsx`) currently use **2-space indentation** with double quotes — these appear to predate the tab rule and are likely reformatting backlogs. `src/stores/authStore.ts`, `src/hooks/useRecipes.ts`, `src/lib/tdee.ts`, `src/components/FamilyMemberSelector.tsx` already use tabs. **Biome will rewrite to tabs on `biome format`** — when editing a file, match that file's current style and let Biome normalize.

## Error Handling

**Pattern:** Try/catch with `console.error` / `console.warn` logging and propagating no error to UI; failures mostly silent at module layer, surfaced via `Alert.alert` at screen layer.

- `app/_layout.tsx:99-115` — recipe sync wrapped in try/catch with `console.error("[App] Recipe sync failed:", err)` and silently completed.
- `app/_layout.tsx:139-141` — `catch (error) { console.error("Error checking onboarding:", error); }`
- `src/stores/authStore.ts:91-122` — `initialize()` uses try/catch with `console.error("[Auth] initialization fatal error:", error.message || error);` and returns `() => {}` no-op unsubscribe as a safety fallback.
- `src/lib/supabase.ts:20-24` — missing env vars logged with `console.warn` and client constructed with empty-string fallback rather than throwing.
- `app/(auth)/login.tsx:38-40` — `if (error) { Alert.alert("Errore", error.message); }` for user-facing Supabase errors.

**Logging tags:** Module-prefixed string log messages: `"[Auth] ..."`, `"[App] ..."`, `"[Network] ..."`. Verified at `authStore.ts:92`, `authStore.ts:97`, `app/_layout.tsx:41-42`, `app/_layout.tsx:104`.

**No centralized error boundary or toast system detected.** Errors are caught where they happen and either logged to console or shown via native `Alert.alert`.

## Zod-First Validation Convention

**Pattern (verified, enforced per `GEMINI.md:134` "Zod schema per dati esterni?"):**

- Define `const XSchema = z.object({...});` then `export type X = z.infer<typeof XSchema>;`
- Enums use `z.enum([...])` because SQLite stores them as plain `text` columns (see `src/schemas/auth.ts:5-7` comment) — Drizzle columns stay `text()`, validation lives in Zod.
- Compose via `.pick`, `.extend`, `.omit`, `.merge` rather than redeclaring for list/detail views: `RecipeListItemSchema = RecipeSchema.pick({...})` (`src/schemas/recipe.ts:139`), `RecipeWithDetailsSchema = RecipeSchema.extend({...})` (`recipe.ts:132`).
- Forms use **local** inline schemas (`app/(auth)/login.tsx:11-14`) OR shared schemas (`src/schemas/auth.ts:30` `LoginSchema`); both patterns appear. Hook up via `zodResolver(schema)`.

## Comments & Documentation

**Pattern:** Section banner comments using `// ===` dividers, JSDoc on exported functions, in-source `// NOTE:` / `// Deprecated:` markers, no JSDoc tooling configured (TypeDoc not installed).

- Section banners (the canonical file scaffold):
  ```ts
  // ============================================================================
  // QUERY KEYS
  // ============================================================================
  ```
  Verified in `src/hooks/useRecipes.ts:9-11`, `src/hooks/useMealPlan.ts:17-19`, `src/services/mealPlan.service.ts:17-19`, `src/stores/authStore.ts:10-12`.
- JSDoc on exported pure functions:
  - `src/lib/tdee.ts:5-8` — `/** Activity multipliers for TDEE calculation (Mifflin-St Jeor). Source: GEMINI.md domain rules. */`
  - `src/lib/tdee.ts:30-34`, `44-48`, `68-78` — full JSDoc with formulas.
  - `src/hooks/useRecipes.ts:27-29` — `/** Get all recipes, optionally filtered by category. */`
  - `src/utils/portion-calculator.ts:41-48` explains meal-kcal distribution.
- Inline `// Deprecated` markers in enums: `src/schemas/recipe.ts:13-14` (`"lunch"` / `"dinner"` recipe categories marked deprecated, kept for backwards compat).
- Domain-rule comments in Italian for nutritive content: `src/schemas/recipe.ts:23-30` (e.g. `// Pesce (3-4x/week) - preferire azzurro per Omega-3`).

**Verified.** No JSDoc config / TypeDoc dependency in `package.json`.

## Constants & Config Conventions

**Pattern:** UPPER_SNAKE_CASE module-level `const`s for static configuration, defined under a `// === CONFIGURATION ===` banner; `as const` for arrays of literals.

- `src/services/mealPlan.service.ts:33-43` — `const INITIAL_PROTEIN_TRACKER: ProteinTracker = {...}` (Mediterranean Diet weekly protein quotas).
- `src/services/mealPlan.service.ts:52-65` — `const WEEKLY_PROTEIN_TARGETS: Record<ProteinSource, {...}> = {...}`.
- `src/services/mealPlan.service.ts:67-77` — `const DAILY_MEAL_TYPES: MealType[] = [...]; const SNACK_MEAL_TYPES: MealType[] = [...]; const MEAL_TYPE_TO_CATEGORY = { ... } as const;`
- `src/lib/tdee.ts:9-15` — `const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {...}`.
- `app/(tabs)/plan.tsx:19-26` — screen-local `const DAY_NAMES = [...]; const MEAL_ORDER: MealType[] = [...];`
- `src/lib/api.ts:9-13` — `const DEV_API_URL = "http://localhost:8787"; const PROD_API_URL = "https://nutriplanit-api.nutriplanit.workers.dev"; const USE_PROD_IN_DEV = true;`

## Service File Pattern (`src/services/`)

**Verified pattern** (consistent across all 9 service files):

1. Top imports: `db` from `@/db/client`, schema tables from `@/db/schema`, types from `@/schemas/<feature>`, Drizzle operators from `drizzle-orm`, `randomUUID` from `expo-crypto` when persisting.
2. Section banners (`// === <AREA> ===`).
3. Config constants block with JSDoc.
4. **Export `async function` per query/operation** — each function is self-contained, no shared state.
   - `src/services/recipe.service.ts:23` — `export async function getRecipes(category?: RecipeCategory): Promise<RecipeListItem[]> { ... }`
   - `src/services/recipe.service.ts:55` — `export async function getRecipeById(recipeId: string): Promise<RecipeWithDetails | null> { ... }`
5. Pure algorithm logic split into sibling `<feature>.logic.ts` and types into `<feature>.types.ts` to keep service files under a reasonable size (see `src/services/mealPlan.logic.ts`, `mealPlan.types.ts`).
6. No class-based services, no singleton instances — plain exported async functions only.

## Naming for Hooks / Constants / Utils — Summary Table

| Kind | Pattern | Example |
|------|---------|---------|
| Data hook | `use<Domain>` (named function) | `useRecipes`, `useMealPlan`, `useFamilyMembers`, `useWeightLogs`, `useShoppingList` |
| Mutation hook | `use<Action><Domain>` (named function returning `useMutation`) | `useGenerateMealPlan`, `useToggleMealComplete` (`src/hooks/useMealPlan.ts`) |
| Query-keys factory | `<domain>Keys` (lowercase + `Keys`) | `recipeKeys`, `mealPlanKeys` |
| Pure UI hook | `use<Behavior>` | `useDebouncedValue` |
| Store hook | `use<Domain>Store` | `useAuthStore`, `useFamilyStore` |
| Static config | `UPPER_SNAKE_CASE` | `DAILY_MEAL_TYPES`, `WEEKLY_PROTEIN_TARGETS`, `ACTIVITY_MULTIPLIERS` |
| Local helper | `camelCase` (unexported if local) | `formatWeekRange` (`app/(tabs)/plan.tsx:28`), `getWeekStart` (hooks) |
| Pure util (file) | `kebab-case.ts`, exported `camelCase` functions | `src/utils/portion-calculator.ts` exports `calculateMealTarget`, `calculateCookedPortion` |
| Schema suffix | `*Schema` for zod const, plain name for the type | `LoginSchema` / `LoginInput` (`src/schemas/auth.ts:30,34`) |

## Validation Checklist (per `GEMINI.md:125-138`)

These are enforced at PR time even though CI is not present:

```bash
pnpm exec tsc --noEmit        # Type check
pnpm exec biome check ./      # Lint + format check
```

Per-PR self-check (manual):
- [ ] Zod schema for external data?
- [ ] `FlashList` with `estimatedItemSize`? (lists must use `@shopify/flash-list`, not `FlatList`)
- [ ] `expo-image` for images (not RN `<Image>`)?
- [ ] Forms via `react-hook-form` (no `useState` for form fields)?
- [ ] Task updated in `docs/task.md`?

## Special Files

- `app/global.css` — NativeWind global entry imported once in `app/_layout.tsx:3`. Do not import per-screen.
- `expo-env.d.ts`, `nativewind-env.d.ts` — generated type roots (declared in `tsconfig.json:13-20`). Do not edit by hand.
- `src/db/schema/index.ts` — single barrel exporting all Drizzle table definitions; consumed via `import * as schema from "./schema"` in `src/db/client.ts:3` and via named imports in services.
- `scripts/` — `tsx`-runnable Node scripts for seeding/verification/db ops (`scripts/README.md`). Not unit tests; run via `npx tsx scripts/<name>.ts`. Some script names start with `test-` (e.g. `test-gapfill.ts`) but they are console-runnable manual probes, **not** test-runner test files.

---

*Convention analysis: 2026-07-05*
