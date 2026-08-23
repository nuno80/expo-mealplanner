# Codebase Concerns

**Analysis Date:** 2026-07-04

## Tech Debt

**Duplicated protein-target configuration:**
- Issue: `INITIAL_PROTEIN_TRACKER` and `WEEKLY_PROTEIN_TARGETS` are defined identically back-to-back; `INITIAL_PROTEIN_TRACKER` is dead code (never imported) while generation uses `WEEKLY_PROTEIN_TARGETS`.
- Files: `src/services/mealPlan.service.ts` (lines 33-43 and 52-65)
- Impact: Two sources of truth for Mediterranean Diet quotas; future edits silently diverge.
- Fix approach: Delete `INITIAL_PROTEIN_TRACKER`, keep `WEEKLY_PROTEIN_TARGETS`, and export it for reuse by tests.

**Duplicated and diverged `ApiRecipe` interface:**
- Issue: `ApiRecipe` is declared in both `src/lib/api.ts` (25-49) and `src/services/sync.service.ts` (51-80). The `sync.service.ts` version has extra fields (`ingredients`, `steps`, `tags`, `fiber_per_100g`, `protein_source`) while `lib/api.ts` is stale. They are not cross-imported.
- Files: `src/lib/api.ts`, `src/services/sync.service.ts`
- Impact: Type drift; edits to one don't propagate to the other. New fields risk silent missing-type errors.
- Fix approach: Define a single `ApiRecipe` in `src/lib/api.ts` (or a `src/types/api.ts`), then re-export and import everywhere.

**Deleted `api/` directory still referenced:**
- Issue: `git status` shows deletions of `api/.dev.vars`, `api/src/index.ts`, `api/src/routes/recipes.ts`, `api/wrangler.toml`, etc., but `src/lib/api.ts` still hardcodes `PROD_API_URL = "https://nutriplanit-api.nutriplanit.workers.dev"` and `DEV_API_URL = "http://localhost:8787"` (wrangler defaults). The local backend source is gone from the repo.
- Files: `src/lib/api.ts` (lines 9-20)
- Impact: Cannot run/debug the backend locally; `DEV_API_URL` is unreachable. `USE_PROD_IN_DEV = true` masks the issue by always hitting prod.
- Fix approach: Either restore the `api/` worker as a submodule/package, or remove the `__DEV__` branch entirely and document that the client only talks to the deployed worker.

**Hardcoded `USE_PROD_IN_DEV = true`:**
- Issue: Development builds silently hit production API; no local/staging safety net. Changes to dev recipe data won't be visible until prod is updated.
- Files: `src/lib/api.ts` (line 13)
- Impact: Dev testing pollutes / depends on production recipe catalog; debugging sync issues requires redeploy.
- Fix approach: Toggle via `process.env.EXPO_PUBLIC_USE_PROD_API` and default to `false` in dev.

**Monolithic meal-plan service:**
- Issue: `src/services/mealPlan.service.ts` is 1341 lines mixing query, generation, swap, regenerate, progress, snack-toggle, and recalculation logic in one file.
- Files: `src/services/mealPlan.service.ts`
- Impact: Hard to navigate, hard to test, high merge-conflict surface. Multiple `any` casts (lines 160, 168, 935) indicate type-safety erosion.
- Fix approach: Split into `mealPlan.queries.ts`, `mealPlan.generator.ts`, `mealPlan.swap.ts`, `mealPlan.recalc.ts`. Replace `as any[]`/`Record<string, any>` with Drizzle's inferred types or named interfaces.

**`deleteFamilyMember` does not cascade-clean meal plans referencing it:**
- Issue: Schema declares `onDelete: "cascade"` on `familyMembers` for `mealPlans`, but `updateMemberWeight` and `deleteFamilyMember` (`src/services/user.service.ts` lines 182-220, 225-226) perform raw deletes without checking for selected-member references in the active `familyStore`.
- Files: `src/services/user.service.ts`
- Impact: Deleting the currently-selected member can leave `selectedMemberId` pointing at a deleted row, causing blank screens in `(tabs)/plan.tsx` until next app restart.
- Fix approach: In `deleteFamilyMember`, also clear `useFamilyStore.selectedMemberId` if it matches, or expose a hook wrapper that handles store invalidation.

**Stale duplicate of `mealPlan.logic.ts` in the playground:**
- Issue: `apps/algorithm-playground/src/services/mealPlan.logic.ts` is a v2.4 copy of the canonical `src/services/mealPlan.logic.ts` (now v2.6 Harvard Plate + Quotas). Its header comment says "Keep in sync with mobile app" but it has already diverged (no `tags` handling, no vegetable-side logic).
- Files: `apps/algorithm-playground/src/services/mealPlan.logic.ts`
- Impact: Playground results no longer reflect the real algorithm; any "ground truth" debugging is misleading.
- Fix approach: Either delete the playground (it is not part of the mobile build) or import the canonical logic from `src/` via a shared package. If kept, add a sync test that fails on diff.

## Known Bugs

**Master-ingredient nutrition lost on sync:**
- Symptoms: Synced `ingredients` rows store `proteinPer100g`, `carbsPer100g`, `fatPer100g` as `0` even when the API payload includes them.
- Files: `src/services/sync.service.ts` (lines 197-207)
- Trigger: Any `syncRecipes()` call; the upsert hardcodes `proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0` instead of mapping from `apiIng`.
- Workaround: None; downstream `portion-calculator.ts` and `shoppingList.service.ts` consume zeroed macros, producing incorrect per-ingredient macro breakdowns.
- Fix: Map `apiIng.protein_per_100g ?? 0` etc. into `localIngredient`, or extend `ApiIngredient` to include these fields if the API provides them.

**`isSyncNeeded` only checks count, never staleness:**
- Symptoms: Once any recipes exist locally, `syncRecipes()` is never re-run automatically — so updates from the API never land until the user manually clears storage.
- Files: `src/services/sync.service.ts` (lines 309-312)
- Trigger: App restart with non-empty local DB.
- Workaround: Manual `clearLocalRecipes()` + restart.
- Fix: Track `lastSyncAt` in a metadata table (or AsyncStorage) and have `isSyncNeeded` return `true` when older than a configurable window (e.g., 24h).

## Security Considerations

**Supabase URL and anon key logged to console:**
- Risk: `console.log("Supabase URL initialized:", supabaseUrl)` runs on every app start in `src/lib/supabase.ts` (line 26). The anon key is not logged (good), but the URL plus the `console.warn` in `src/lib/supabase.ts` (21-24) may include context. More broadly, 34 `console.log`/`console.warn`/`console.error` calls across `src/` and `app/` (e.g., `src/services/sync.service.ts` line 93 logs `API_BASE_URL`; `src/stores/authStore.ts` lines 92-119 log auth state transitions) leak operational details in release builds.
- Files: `src/lib/supabase.ts`, `src/services/sync.service.ts`, `src/stores/authStore.ts`, `app/_layout.tsx` (line 41 hits `https://google.com` on every launch)
- Current mitigation: `__DEV__`-gated logging is not enforced; logs run in production.
- Recommendations: Wrap all debug logs behind a `if (__DEV__)` helper (e.g., `src/lib/log.ts`) and strip via Babel. Remove the Google connectivity probe in `app/_layout.tsx` — it leaks network state and adds latency.

**Deep-link token parsing without validation:**
- Risk: `app/_layout.tsx` (lines 50-72) extracts `access_token` and `refresh_token` from any URL containing both substrings and feeds them directly to `supabase.auth.setSession`. There is no origin/hostname check on the incoming deep link.
- Files: `app/_layout.tsx`
- Current mitigation: Supabase validates the token serverside, but a maliciously crafted link could still trigger a session-set attempt.
- Recommendations: Verify the URL scheme/host matches the configured `expo-linking` prefix before calling `setSession`; ignore tokens from unrelated hosts.

**Unrestricted `fetch` to user-controllable secrets surface:**
- Risk: `API_BASE_URL` is hardcoded (good), but data fetched from `${API_BASE_URL}/recipes` (`src/services/sync.service.ts` line 96) is upserted into local SQLite with no schema validation — the API is implicitly trusted. A compromised CDN/worker could inject malformed `quantity`/`kcal_per_100g` values that the local Zod schemas never see.
- Files: `src/services/sync.service.ts` (lines 96-117)
- Recommendations: Run the API payload through the existing Zod schemas (`src/schemas/recipe.ts`) before upsert; reject invalid recipes rather than persisting silently.

## Performance Bottlenecks

**Per-meal N+1 queries in portion recalculation:**
- Problem: `recalculateDay` (`src/services/mealPlan.service.ts` around lines 916-999) issues a separate `db.select()` for `recipes.kcalPer100g` per active meal, plus additional per-side queries inside the loop. For a day with 5 meals × up to 3 sides, this means ~20 sequential SQLite round-trips.
- Files: `src/services/mealPlan.service.ts`
- Cause: In-loop queries instead of a single `inArray()` batch fetch.
- Improvement path: Collect all `recipeId`/`sideRecipeId`/`side2RecipeId`/`vegSideRecipeId` from the day's meals, do one `db.select().from(recipes).where(inArray(recipes.id, allIds))`, build a `Map<id, recipe>`, and use it inside the loop.

**Recipe sync performs N sequential transactions:**
- Problem: `syncRecipes()` loops `result.data` and awaits `upsertFullRecipe(apiRecipe)` one-at-a-time, each wrapping a transaction with multiple inner inserts (ingredients, steps, tags).
- Files: `src/services/sync.service.ts` (lines 115-117)
- Cause: Sequential `for...of` with `await`; each recipe = 1 transaction with ~3+k inserts.
- Improvement path: Batch into a single transaction (or chunked batches of 20) and use `db.insert(...).values([...])` multi-row inserts for `recipeIngredients`, `recipeSteps`, `recipeTags`.

**`useMealPlan` refetches on every mount and foreground:**
- Problem: `staleTime: 30s` + `refetchOnMount: true` + `refetchOnWindowFocus: true` (`src/hooks/useMealPlan.ts` lines 49-52) causes the large `getMealPlan` query (which logs timing — typically multi-hundred ms with sides fetch) to run on every tab switch and app foreground.
- Files: `src/hooks/useMealPlan.ts`
- Cause: Over-eager refetch config combined with the expensive query shape.
- Improvement path: Use targeted `invalidateQueries` after mutations (already done) and drop `refetchOnWindowFocus` for plan data; raise `staleTime` to 5 min to match the default `QueryClient`.

## Fragile Areas

**`mealPlan.service.ts` type casts:**
- Files: `src/services/mealPlan.service.ts` (lines 160 `as any[]`, 168 `new Map<string, any>()`, 935 `Record<string, any>`)
- Why fragile: Bypasses Drizzle's inference at the joins. Adding a column to `plannedMeals` or `recipes` schema will not surface a TS error here; the cast silently drops new fields.
- Safe modification: When touching the `plannedMeals` select shape, re-derive the type via `typeof mealsQuery._.resultType` (Drizzle helper) or define an explicit `PlannedMealRow` interface in `src/schemas/mealPlan.ts`.
- Test coverage: None — no unit tests for this file.

**`useFamilyStore.selectedMemberId` race with onboarding:**
- Files: `app/_layout.tsx` (lines 120-152), `src/stores/familyStore.ts`
- Why fragile: `selectedMemberId` is initialized inside a `useEffect` that depends on `session`, `migrationsReady`, and `selectedMemberId` itself. The effect re-runs when `selectedMemberId` changes (deps array), and `(tabs)/plan.tsx` reads it before initialization completes, leading to brief empty-state flashes.
- Safe modification: Initialize `selectedMemberId` synchronously inside the auth `setSession` action (or a dedicated `hydrateSelectedMember` action) instead of a layout effect.
- Test coverage: None.

**Mixed indentation across the codebase:**
- Files: `biome.json` mandates tabs; `src/services/mealPlan.service.ts`, `src/services/recipe.service.ts`, `src/db/schema/index.ts` use 2-space indent; `app/`, `src/stores/`, `src/services/sync.service.ts` use tabs.
- Why fragile: Biome's auto-format on save will re-indent entire files, producing noisy diffs that hide real changes and complicate code review.
- Safe modification: Run `pnpm dlx @biomejs/biome format --write` once, commit the reformat separately, then enforce via pre-commit hook.

## Scaling Limits

**Local SQLite single-writer:**
- Current capacity: `expo-sqlite` opens `nutriplanit.db` synchronously via `openDatabaseSync` (`src/db/client.ts`); all services share one `db` instance.
- Limit: Concurrent writes (e.g., sync running while user completes a meal) can throw `SQLITE_BUSY`. No retry/backoff is implemented.
- Scaling path: Wrap writes in `db.transaction(...)` with a short retry, or use the WAL pragma (`PRAGMA journal_mode=WAL`) on db open.

## Dependencies at Risk

**`react-native-worklets` AND `react-native-worklets-core` both installed:**
- Risk: Two competing worklet runtimes (`react-native-worklets` 0.5.1 and `react-native-worklets-core` ^1.6.2) are declared in `package.json`. Only `react-native-reanimated` ~4.1.1 needs one; shipping both risks duplicate native symbols / build conflicts on Android.
- Impact: Potential build failures, increased APK size, undefined behavior if both register a JSI binding.
- Migration plan: Remove whichever is not actually imported. A `grep` for `react-native-worklets-core` in `src/` returns no hits — drop it.

**`zod` v4 with `@hookform/resolvers` v5:**
- Risk: `zod` is pinned to `^4.2.1` while `@hookform/resolvers` `^5.2.2` declares Zod v3 as its peer dependency (per the resolver's docs). The `zodResolver` import in `app/(auth)/login.tsx` (line 1) and `app/(auth)/signup.tsx` may produce subtle schema-coercion differences.
- Impact: Possible runtime validation quirks (error message shapes, `.refine` paths).
- Migration plan: Verify resolver peer-deps; either downgrade `zod` to v3 or upgrade resolvers once they officially support v4, and add a smoke test for form validation.

## Missing Critical Features

**No test suite of any kind:**
- Problem: `find` for `*.test.*`/`*.spec.*` returns zero hits under `src/`, `app/`, or `apps/algorithm-playground/src`; no `jest.config.*` or `vitest.config.*` exists. There are only ad-hoc verification scripts under `scripts/` (`verify-algorithm.ts`, `verify-seeding.ts`, etc.) that must be run manually.
- Blocks: Cannot safely refactor `mealPlan.service.ts` (1341 lines), cannot detect regressions in transformer sync (`upsertFullRecipe`), cannot assert equivalence between playground and app logic.
- Fix approach: Add Vitest for pure logic (`src/services/mealPlan.logic.ts`, `src/utils/portion-calculator.ts`, `src/lib/tdee.ts`) and React Native Testing Library for components. Wire a `pnpm test` script and a pre-commit hook.

**No internationalization despite `locale` field:**
- Problem: `users.locale` defaults to `"it"` (`src/db/schema/index.ts` line 12) and `LocaleSchema` supports `"it" | "en"`, but all UI strings are hardcoded Italian in `app/(auth)/login.tsx`, `app/(onboarding)/*`, etc. `recipe-detail.tsx` line 23 hardcodes `const locale = "it";` with a `TODO: get from user settings`.
- Blocks: English locale users see Italian UI.
- Fix approach: Introduce `expo-localization` + a `src/i18n/` dictionary; replace hardcoded strings with `t("...")`.

## Test Coverage Gaps

**Algorithm logic (highest priority):**
- What's not tested: Protein-quota enforcement, side-dish selection, Harvard Plate vegetable insertion, recalculation after snack toggle.
- Files: `src/services/mealPlan.logic.ts`, `src/services/mealPlan.service.ts` (`generateMealPlan`, `recalculateDay`, `swapMealRandom`)
- Risk: Silent nutritional drift; a refactor could break the Mediterranean Diet compliance contract with no signal.
- Priority: High

**Sync upsert logic:**
- What's not tested: `upsertFullRecipe` (transaction, conflict-skip by slug), tag auto-creation fallback, the bug where ingredient macros are zeroed.
- Files: `src/services/sync.service.ts`
- Risk: Recipe catalog corruption on partial sync; tag table polluted with slug-as-name entries.
- Priority: High

**Auth + onboarding state machine:**
- What's not tested: `authStore.initialize` unsubscribe path, deep-link token handling, `hasCompletedOnboarding` derivation from `getPrimaryMember`.
- Files: `src/stores/authStore.ts`, `app/_layout.tsx`, `app/(onboarding)/family.tsx`
- Risk: Onboarding loops or stale-session redirects; deep-link password recovery silently fails.
- Priority: Medium

## Accessibility

**No accessibility props on any tappable element:**
- Risk: Across all screens in `app/` and components in `src/components/`, there is exactly one `keyboardShouldPersistTaps` usage and zero `accessibilityLabel`/`accessibilityRole`/`accessibilityHint`/`aria-label` declarations. Icon-only `Pressable`s (e.g., close button in `src/components/cooking/CookingModeModal.tsx` line 111, meal-swap icons in `app/(modals)/meal-swap.tsx`) are invisible to screen readers.
- Files: every `.tsx` under `app/` and `src/components/`
- Current mitigation: None.
- Recommendations: Add `accessibilityRole="button"` + `accessibilityLabel` to every `Pressable`; run accessibility audit via React Native AccessibilityScanner; gate icon-only buttons behind `accessibilityHint`.

## State Management Pitfalls

**`queueMicrotask` workaround for cache updates:**
- Issue: `useGenerateMealPlan` defers `queryClient.setQueryData` via `queueMicrotask` (`src/hooks/useMealPlan.ts` lines 64-73) with a comment citing a "navigation context error during render". This is a smell indicating the mutation's `onSuccess` runs during a render phase it shouldn't.
- Files: `src/hooks/useMealPlan.ts`
- Impact: Cache and UI can briefly disagree; the microtask may run after unmount on fast navigations.
- Fix approach: Investigate the root "navigation context" error (likely the `useRouter()` hook used during render in `_layout.tsx`) and remove the microtask workaround.

**`useAuthStore` mixes auth and onboarding concerns:**
- Issue: The store holds `hasCompletedOnboarding`, `currentOnboardingStep`, and `onboardingData` alongside session state (`src/stores/authStore.ts` lines 27-51). Onboarding data is cleared on `completeOnboarding`/`signOut` but is persisted implicitly by Zustand default (no `persist` middleware means it's in-memory only), so a reload mid-onboarding loses progress.
- Files: `src/stores/authStore.ts`
- Impact: Onboarding restarts from step `goal` if the app crashes mid-flow, even though `family.tsx` writes to Supabase user metadata on completion.
- Fix approach: Split into `useAuthStore` (session) and `useOnboardingStore` (transient flow), and add `zustand/middleware/persist` for the onboarding step.

---

*Concerns audit: 2026-07-04*
