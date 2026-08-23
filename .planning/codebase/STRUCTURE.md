# Codebase Structure

**Analysis Date:** 2026-07-04

## Directory Layout

```
expo-mealplanner/                # NutriPlanIT - Expo meal planner monorepo root
├── app/                         # Expo Router file-based routes (entry: expo-router/entry)
│   ├── _layout.tsx              # Root layout: providers, auth listener, migrations, sync
│   ├── index.tsx                # Initial redirect gate (auth/onboarding/tabs)
│   ├── (auth)/                  # Unauthenticated flow (welcome, login, signup, forgot/reset)
│   ├── (onboarding)/            # First-run flow (goal, profile, tdee, family)
│   ├── (tabs)/                  # Main tab navigator (index/home, plan, recipes, progress, profile)
│   └── (modals)/                # Modal stack overlays (recipe-detail, meal-swap, add-weight, ...)
├── src/                         # App source (importable via `@/*` path alias)
│   ├── components/              # Reusable presentational components
│   │   ├── ui/                  # Generic UI primitives (PasswordInput)
│   │   └── cooking/             # Cooking-mode feature components
│   ├── db/                      # Drizzle ORM client, schema, migration runner
│   │   └── schema/              # SQLite table + relation definitions
│   ├── hooks/                   # TanStack Query hooks (only data API for components)
│   ├── lib/                     # Infra singletons + pure utilities (supabase, api, tdee)
│   ├── schemas/                 # Zod validation schemas (domain types)
│   ├── services/                # Business logic operating on db + external APIs
│   ├── stores/                  # Zustand stores (auth, family selection)
│   ├── types/                  # Ambient type declarations (expo-vector-icons)
│   └── utils/                   # Misc helpers (portion-calculator)
├── apps/                        # Sibling standalone projects (NOT imported by Expo app)
│   └── algorithm-playground/    # Vite app for prototyping the meal-plan algorithm
├── recipe-manager/              # Python tooling for authoring/importing recipes (Cloudinary, Gemini)
├── drizzle/                     # Generated Drizzle migrations (committed)
├── scripts/                     # Repo-level scripts
├── docs/                        # Project documentation
│   └── DB-esempio/              # Example DB snapshots
├── assets/                      # Static assets bundled with the app
├── android/                     # Native Android project (Expo prebuild)
├── dist/                        # Build output (web export)
├── package.json                 # pnpm package manifest + scripts
├── tsconfig.json                # TS config, `@/*` -> `./src/*` alias
├── app.json                     # Expo app config
├── babel.config.js              # Babel config (Expo preset + inline-import)
├── metro.config.js              # Metro bundler config
├── tailwind.config.js           # NativeWind/Tailwind config
├── nativewind-env.d.ts           # NativeWind ambient types
├── biome.json                   # Biome formatter/linter config
├── drizzle.config.ts            # Drizzle Kit config (SQLite/expo)
├── drizzle.config.turso.ts      # Alternate Drizzle Kit config for Turso/libSQL
├── eas.json                     # Expo Application Services build config
├── .env.example                 # Documented env vars
└── .env.local                   # Local secrets (NEVER read/commit)
```

## Directory Purposes

**`app/`:**
- Purpose: Expo Router routes — one file per screen, `_layout.tsx` per group.
- Contains: `.tsx` route files and group `_layout.tsx` navigators.
- Key files: `app/_layout.tsx`, `app/index.tsx`, `app/(tabs)/_layout.tsx`, `app/(modals)/_layout.tsx`, `app/(modals)/recipe-detail.tsx`, `app/(modals)/meal-swap.tsx`, `app/(tabs)/plan.tsx`.

**`src/components/`:**
- Purpose: Reusable presentational React Native components, no direct DB access.
- Contains: Feature cards (`MealCard.tsx`, `RecipeCard.tsx`), charts (`WeightChart.tsx`, `MacroProgressChart.tsx`, `WeeklyKcalRing.tsx`, `ProgressRing.tsx`), selectors (`FamilyMemberSelector.tsx`), generic `Card.tsx`, primitives under `ui/`, and cooking-mode UI under `cooking/CookingModeModal.tsx`.
- Used by: `app/` screens and other components.

**`src/services/`:**
- Purpose: All business/domain logic — the only layer that imports `src/db/client.ts`.
- Contains: One service module per domain plus shared logic/types files.
- Key files: `mealPlan.service.ts` (1341 lines — generation, swap, regenerate, toggle), `mealPlan.logic.ts` (pure macro/portion math), `mealPlan.types.ts`, `recipe.service.ts`, `familyMember.service.ts`, `user.service.ts`, `weightLog.service.ts`, `shoppingList.service.ts`, `sync.service.ts`, `seed.service.ts`.

**`src/hooks/`:**
- Purpose: TanStack Query wrappers over services — thesole data entry point for components.
- Contains: `useMealPlan.ts`, `useRecipes.ts`, `useFamilyMembers.ts`, `useWeightLogs.ts`, `useShoppingList.ts`, `useDebouncedValue.ts`.
- Pattern: Each hook exports a query-key factory plus `useXxx()` / `useXxxMutation()` functions.

**`src/schemas/`:**
- Purpose: Zod schemas per domain, also exporting inferred TypeScript types.
- Contains: `auth.ts`, `familyMember.ts`, `mealPlan.ts`, `recipe.ts`, `weightLog.ts`.

**`src/stores/`:**
- Purpose: Zustand stores for global ephemeral UI/app state.
- Contains: `authStore.ts` (session, onboarding flow), `familyStore.ts` (`selectedMemberId`).

**`src/db/`:**
- Purpose: Local SQLite (Drizzle ORM) source of truth.
- Contains: `client.ts` (opens `nutriplanit.db`, exports `db`), `schema/index.ts` (all tables + relations), `migrate.ts` (`useMigrationHelper` wrapping Drizzle's `useMigrations`).

**`src/lib/`:**
- Purpose: External client singletons and pure utilities.
- Contains: `supabase.ts`, `api.ts` (API base URL + response interfaces), `tdee.ts` (TDEE/macro calculations), `nativewind.ts`.

**`drizzle/`:**
- Purpose: Generated Drizzle Kit migration output consumed at runtime by `src/db/migrate.ts`.
- Generated: Yes (via `pnpm db:generate`)
- Committed: Yes

**`apps/algorithm-playground/`:**
- Purpose: Standalone Vite/React sandbox for iterating on the meal-plan algorithm before porting to `src/services/mealPlan.logic.ts`. Has its own `node_modules`, not part of the Expo build.

**`recipe-manager/`:**
- Purpose: Python project (separate venv) for authoring/importing recipes (Cloudinary uploads, Gemini parsing, libSQL/Turso writes). Produces data exposed by the Cloudflare Worker API that `sync.service.ts` consumes. Not imported by the Expo app.

## Key File Locations

**Entry Points:**
- `app/_layout.tsx`: Root layout — providers, auth listener, deep-link handling, migrations, recipe sync.
- `app/index.tsx`: Initial redirect based on auth + onboarding + migration status.
- `package.json` (`main: "expo-router/entry"`): Tells Expo Router where bootstrapping starts.

**Configuration:**
- `app.json`: Expo config (name, splash, plugins, etc.).
- `tsconfig.json`: Enables `strict`, sets `@/*` → `./src/*`.
- `babel.config.js`: Expo preset + `babel-plugin-inline-import`.
- `metro.config.js`: NativeWind/Metro integration.
- `tailwind.config.js` + `src/lib/nativewind.ts`: NativeWind setup.
- `biome.json`: Formatter and linter rules.
- `drizzle.config.ts` / `drizzle.config.turso.ts`: Drizzle Kit config for SQLite/expo and Turso respectively.
- `eas.json`: EAS build profiles.

**Core Logic:**
- `src/services/mealPlan.service.ts`: Meal-plan generation, swap, regenerate, completion toggling.
- `src/services/mealPlan.logic.ts`: Pure helpers for macro/portion composition.
- `src/lib/tdee.ts`: TDEE (Mifflin–St Jeor) and macro-split calculations.
- `src/utils/portion-calculator.ts`: Cooked/raw portion conversions.
- `src/services/sync.service.ts`: Offline-first recipe sync from remote API into local SQLite.

**Data Layer:**
- `src/db/client.ts`: `db` Drizzle instance over `expo-sqlite` (`nutriplanit.db`).
- `src/db/schema/index.ts`: All tables + relations.
- `src/db/migrate.ts`: `useMigrationHelper()` hook.
- `src/lib/supabase.ts`: Supabase client (SecureStore adapter).
- `src/lib/api.ts`: Cloudflare Worker API base URL + response interfaces.

## Naming Conventions

**Files:**
- Routes: lowercase kebab-case matching URL segment, e.g. `app/(modals)/meal-swap.tsx`, `app/(tabs)/recipe-detail.tsx`. Group dirs are parenthesized: `(tabs)`, `(auth)`, `(onboarding)`, `(modals)`.
- Layouts: `_layout.tsx` inside any route or group dir.
- Components: PascalCase `.tsx`, one component per file: `MealCard.tsx`, `RecipeCard.tsx`.
- Services: `<domain>.service.ts` (e.g. `recipe.service.ts`), with companion `.logic.ts` / `.types.ts` when a domain is large (`mealPlan.logic.ts`, `mealPlan.types.ts`).
- Hooks: `use<Feature>.ts` camelCase: `useMealPlan.ts`, `useRecipes.ts`.
- Stores: `<domain>Store.ts` camelCase: `authStore.ts`, `familyStore.ts`.
- Schemas: `<domain>.ts` lowercase: `auth.ts`, `mealPlan.ts`, `familyMember.ts`.
- DB: `client.ts`, `migrate.ts`, and `schema/index.ts` (single barrel for schema).

**Directories:**
- Route groups: parenthesized to keep them out of the URL: `(tabs)`, `(auth)`, `(onboarding)`, `(modals)`.
- Feature subfolders inside `src/components/`: lowercase (`ui/`, `cooking/`).
- Source root `src/` with feature-grouped subdirs (`components/`, `db/`, `hooks/`, `lib/`, `schemas/`, `services/`, `stores/`, `types/`, `utils/`).

**Exports:**
- Components: default export of the component function.
- Services: named exports of pure functions (no default export).
- Stores: named export of the resulting Zustand hook: `useAuthStore`, `useFamilyStore`.

## Where to Add New Code

**New Screen / Route:**
- Auth/onboarding/tab/modal: add `app/(<group>)/<route-name>.tsx`; register the `<Stack.Screen>`/`<Tabs.Screen>` in that group's `_layout.tsx`.
- Standalone top-level route: add `app/<route>.tsx` and a `<Stack.Screen>` in `app/_layout.tsx`.

**New Feature (full vertical slice):**
- Domain schema: `src/schemas/<domain>.ts` (Zod + `z.infer` types).
- DB table (if persisting): add table + relations to `src/db/schema/index.ts`, run `pnpm db:generate` then `pnpm db:push`; consumer code reads via `db` from `src/db/client.ts`.
- Business logic: `src/services/<domain>.service.ts` (and `.logic.ts` for pure math if large).
- Data hooks: `src/hooks/use<Domain>.ts` exporting a query-key factory + `useXxx`/`useXxxMutation`.
- UI: `src/components/<Component>.tsx` consuming hooks; wire into screens in `app/`.

**New Reusable Component:**
- Generic primitives: `src/components/ui/<Name>.tsx`.
- Feature-specific: `src/components/<Name>.tsx` (or subfolder like `src/components/cooking/`).

**New Utility:**
- Pure helpers: `src/lib/<name>.ts` (infra-ish) or `src/utils/<name>.ts` (domain helpers like `portion-calculator.ts`).

**New Zustand Store:**
- `src/stores/<domain>Store.ts`, exporting `use<Domain>Store`; subscribe in the root or group layout and clean up subscriptions on unmount.

**New External Integration:**
- Client singleton: `src/lib/<service>.ts` (mirrors `src/lib/supabase.ts` / `src/lib/api.ts`).
- Env vars: document in `.env.example` and read via `process.env.EXPO_PUBLIC_*`; never commit `.env.local`.

## Special Directories

**`drizzle/`:**
- Purpose: Generated Drizzle Kit migrations + `meta/` journal consumed by `useMigrations` at runtime.
- Generated: Yes (run `pnpm db:generate`).
- Committed: Yes (required at runtime by `src/db/migrate.ts`).

**`dist/`:**
- Purpose: Web export build output.
- Generated: Yes (`expo export`).
- Committed: Typically no (build artifact).

**`.expo/`:**
- Purpose: Expo CLI cache/types.
- Generated: Yes.
- Committed: No.

**`android/`:**
- Purpose: Native Android project from `expo prebuild`.
- Generated: Yes.
- Committed: Yes (managed workflow uses `expo run:android`).

**`apps/algorithm-playground/` and `recipe-manager/`:**
- Purpose: Sibling standalone projects (algorithm prototyping, recipe authoring). Independent toolchains (Vite/React and Python respectively) — not part of the Expo build or `@/*` import graph.
- Generated: No.
- Committed: Yes (excluding `recipe-manager/.venv/`).

---

*Structure analysis: 2026-07-04*
