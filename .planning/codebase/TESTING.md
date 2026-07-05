# Testing Patterns

**Analysis Date:** 2026-07-05

## Test Framework

**Runner:**
- **None configured.** The project has NO formal test runner.
  - No `jest`, `vitest`, `@testing-library/*`, `@react-native-testing-library/*`, `playwright`, or `detox` in `package.json` dependencies or devDependencies.
  - No config files exist: searched for `jest.config.*`, `vitest.config.*`, `playwright.config.*`, `detox.config.*`, `jest.setup.*`, `setupTests.*`, `setup.ts` — none found.
  - No `test`, `test:unit`, `test:e2e`, `test:watch`, `test:coverage` scripts in `package.json` `scripts` block (`package.json` only defines `start`, `android`, `ios`, `web`, `db:generate`, `db:push`, `db:migrate`).
  - No `__tests__/` directories, no `*.test.{ts,tsx,js,jsx}` files, no `*.spec.{ts,tsx,js,jsx}` files anywhere in the repo.
  - No `mocks/`, `fixtures/`, `factories/`, or `__mocks__/` directories.
  - No CI pipeline exists: `.github/workflows/` missing, no `.gitlab-ci.yml`, no other CI YAML. `eas.json` only defines EAS Build profiles (`development`, `preview`, `production`) — no `build` hooks or test automation.

**Assertion Library:**
- None (no `chai`, `expect` from a runner, etc.). Ad-hoc scripts use `===` comparisons with manual `process.exit(allPassed ? 0 : 1)`.

**Run Commands:**
```bash
# No "npm test" / "pnpm test" alias exists. The current "test" commands are ad-hoc:
npx tsx scripts/test-gapfill.ts              # Gap-fill logic verifier (UNIT-style)
npx tsx scripts/verify-algorithm.ts         # Algorithm analyzer (light)
npx tsx scripts/verify-algorithm-e2e.ts     # Algorithm full E2E verifier
npx tsx scripts/verify-seeding.ts           # DB seeding verifier
npx tsx scripts/check-recipe-logic.ts       # Debug script
npx tsx scripts/debug-ingredients.ts         # Debug script
npx tsx scripts/debug-sides.ts               # Debug script
node scripts/validate_env.js                 # Env var validator
```

These are manual ad-hoc scripts, not a real test suite. There is no watch mode, no coverage reporting, no parallel execution, no automatic pass/fail aggregation across files, and no integration with CI or pre-commit hooks.

## Test File Organization

**Location:**
- **None (formal tests).** All test-like scripts live in `scripts/` at the repo root, NOT co-located with source.
- Testable pure logic lives in `src/services/mealPlan.logic.ts` (imported by `scripts/test-gapfill.ts` and `scripts/verify-algorithm-e2e.ts`) and `apps/algorithm-playground/src/services/mealPlan.logic.ts` (a sibling copy used by the Vite playground).

**Naming:**
- Ad-hoc scripts use prefixes `verify-*`, `test-*`, `debug-*`, `check-*`, `seed-*`, `tag-*` (kebab-case, lowercase).
- `package.json` (root) uses `temp-expo` package name despite app `slug` being `nutriplanit` — naming inconsistency noted (see CONCERNS.md).

**Structure:**
```
scripts/                  # Manual verification & debug scripts (all .ts, run via tsx)
├── test-gapfill.ts              # Closest thing to a unit test — uses mock LogicRecipe objects
├── verify-algorithm.ts          # Analytical verifier (reads existing plans from DB)
├── verify-algorithm-e2e.ts      # Full E2E: creates temp user/member, runs logic, writes /tmp/report
├── verify-seeding.ts            # DB-state verifier
├── check-recipe-logic.ts        # Debug
├── debug-ingredients.ts         # Debug
├── debug-sides.ts               # Debug
├── seed-sides.ts                # Data seeding utility
├── seed-veg-sides.ts            # Data seeding utility
├── tag-recipes.ts               # Data tagging utility
├── validate_env.js              # Env var validator
└── README.md                    # Documents the scripts (in Italian)
```

No `__tests__/`, `test/`, or `tests/` directories exist in `src/` or `app/`.

## Test Structure

**Suite Organization:**
There is no suite organization (`describe`/`it`/`test` blocks from a runner). The closest analog is `scripts/test-gapfill.ts`, which uses inline console.log sections and a hardcoded result aggregator:

```typescript
// scripts/test-gapfill.ts — current "test" pattern (NOT a real test runner)
import { calculateMealComposition, type LogicRecipe } from "../src/services/mealPlan.logic";

// Mock ricette per testing
const highProteinLowCarb: LogicRecipe = {
  id: "test-chicken",
  category: "main_course",
  kcalPer100g: 165,
  proteinPer100g: 31,
  carbsPer100g: 0,
  fatPer100g: 3.6,
};
// ... more fixtures inline ...

console.log("📋 TEST 1: Petto di pollo (P:31g, C:0g)");
const result1 = calculateMealComposition(targetKcal, highProteinLowCarb, sideDishes, true);
const test1Pass = result1.sideRecipeId !== null;
console.log(`   Risultato: ${test1Pass ? "✅" : "❌"}`);

// ... more tests ...

const allPassed = test1Pass && test2Pass && test2bPass && test3Pass && test4Pass;
console.log(`RISULTATO FINALE: ${allPassed ? "✅ TUTTI I TEST PASSATI" : "❌ ALCUNI TEST FALLITI"}`);
process.exit(allPassed ? 0 : 1);
```

`verify-algorithm-e2e.ts` and `verify-algorithm.ts` import logic from `src/services/mealPlan.logic.ts`, spin up a temp user/family member in a live Turso database (via `@libsql/client`), generate plans, validate them against Harvard Plate rules and protein quotas, and write a report to `/tmp/verify-algorithm.txt` — effectively an integration test, but with no runner or assertion framework.

**Patterns:**
- **Setup:** Inline hardcoded fixtures (e.g. `highProteinLowCarb`, `sideDishes` in `scripts/test-gapfill.ts`). E2E scripts create temp DB rows with fixed sentinel IDs like `TEMP_USER_ID = "00000000-0000-0000-0000-000000000099"` and `TEMP_MEMBER_PREFIX = "test-v26-"`.
- **Teardown:** Manual cleanup via SQL `DELETE FROM family_members WHERE id = ?` (in `verify-algorithm-e2e.ts`); on failure the script may leave orphan temp rows.
- **Assertion:** Manual `const testXPass = <bool>; console.log(...)`. No diff, no serializer, no stack traces on failure.
- **Exit code:** `process.exit(allPassed ? 0 : 1)` (`scripts/test-gapfill.ts` line 152). Other verify scripts do not consistently exit non-zero on validation failure.

## Mocking

**Framework:** None. No `jest.mock`, no `vi.mock`, no `msw`, no `nock`, no module-level mock registry.

**Patterns:**
```typescript
// Ad-hoc inline object construction — the only "mocking" present
const highProteinLowCarb: LogicRecipe = {
  id: "test-chicken",
  category: "main_course",
  kcalPer100g: 165,
  proteinPer100g: 31,
  carbsPer100g: 0,
  fatPer100g: 3.6,
};
```

No mocking of:
- `expo-router` hooks (`useLocalSearchParams`, `useRouter`, `useSegments`)
- `expo-sqlite` (`openDatabaseAsync`, `SQLiteProvider`)
- `@supabase/supabase-js` client
- `@tanstack/react-query` (`useQuery`, `useMutation`, `QueryClient`)
- `zustand` stores (`useAuthStore`, `useFamilyStore` in `src/stores/`)
- `react-hook-form` / `zod` resolvers
- `AsyncStorage` / `expo-secure-store`
- `expo-reanimated` (worklets)

`scripts/verify-algorithm.ts` and `scripts/verify-algorithm-e2e.ts` use a **live Turso DB connection** via `@libsql/client` (`createClient({ url, authToken })`) configured from `.env` files — they do NOT mock the database. This makes them effectively integration tests requiring network + credentials.

**What to Mock (recommended for future setup):**
- `expo-sqlite` database handle for `src/db/` and `src/services/*.service.ts` unit tests
- `@supabase/supabase-js` client for `src/services/sync.service.ts`
- `@tanstack/react-query` query/mutation hooks for component tests
- `zustand` stores for component tests (use `jest.setup.ts` to reset between tests)
- `expo-router` navigation params for `app/` route components
- `AsyncStorage` / `expo-secure-store` for auth flow tests

**What NOT to Mock:**
- `src/services/mealPlan.logic.ts` — pure-function module, ideal for direct unit testing without mocks (already exercised this way by `scripts/test-gapfill.ts`)
- Zod schemas in `src/schemas/` — pure, test directly
- `src/utils/` helpers — pure, test directly

## Fixtures and Factories

**Test Data:**
```typescript
// Inline literal objects only — no factory functions, no builders, no data tables
const sideDishes: LogicRecipe[] = [
  { id: "test-bread", category: "side_dish", kcalPer100g: 250, proteinPer100g: 8, carbsPer100g: 45, fatPer100g: 3 },
  { id: "test-rice",  category: "side_dish", kcalPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 },
];

// E2E test profiles array
const profiles: TestProfile[] = [
  { name: "V2-Cut",      goal: "cut",      targetKcal: 1800, snackPreference: "none", weightKg: 75 },
  { name: "V2-Maintain", goal: "maintain", targetKcal: 2200, snackPreference: "one",  weightKg: 80 },
  { name: "V2-Bulk",     goal: "bulk",     targetKcal: 3200, snackPreference: "two",  weightKg: 70 },
];
```

Type definitions for fixtures use ad-hoc `interface` declarations (e.g. `interface TestProfile` in `scripts/verify-algorithm-e2e.ts`) co-located with the script. There is no shared fixture module — each script re-declares its own.

**Location:**
- No `fixtures/`, `factories/`, or `__fixtures__/` directories.
- Fixtures are inline literals at the top of each script.
- Temp DB entities use sentinel UUIDs (`TEMP_USER_ID = "00000000-0000-0000-0000-000000000099"`).

## Coverage

**Requirements:** None enforced. No coverage thresholds, no `--coverage` flag, no `c8`/`istanbul`/`vitest coverage` config.

**View Coverage:**
```bash
# Not available
```

## Test Types

**Unit Tests:**
- Only one true unit-style script: `scripts/test-gapfill.ts` (152 lines). Tests `calculateMealComposition` from `src/services/mealPlan.logic.ts` in isolation with mock objects. Five hand-rolled assertions covering: high-protein/low-carb triggers side dish, balanced meal doesn't, low-density meal triggers side dish, empty side-array fallback, breakfast (non-main) doesn't trigger. Exits non-zero on failure.
- No unit tests exist for: any component in `app/` or `src/components/`, any Zustand store logic, any other service (`familyMember.service.ts`, `recipe.service.ts`, `mealPlan.service.ts`, `shoppingList.service.ts`, `sync.service.ts`, `user.service.ts`, `weightLog.service.ts`), any Zod schema, any util in `src/utils/`, any hook in `src/hooks/`.

**Integration Tests:**
- `scripts/verify-algorithm-e2e.ts` (365 lines): end-to-end algorithm verification against a live Turso DB. Creates temp user + 3 family members (Cut/Maintain/Bulk), invokes `calculateMealComposition` from real `src/services/mealPlan.logic.ts`, inserts meal plans, validates Harvard Plate rules + weekly protein quotas + caloric deviation, writes `/tmp/verify-algorithm.txt`, cleans up.
- `scripts/verify-algorithm.ts` (257 lines): lighter variant — analyzes existing meal plans in DB without generating new ones.
- `scripts/verify-seeding.ts`: validates DB seeded state (counts `vegetable_side` recipes, tagged recipes per category, starchy items).
- All require Turso credentials (`.env` from `recipe-manager/.env` or `apps/algorithm-playground/.env.local`) and network access. NOT hermetic. Cannot run offline or in CI without secrets.

**E2E Tests:**
- **No UI E2E framework.** No Detox (`detox` not in deps), no Playwright, no Maestro flows. The "e2e" in `verify-algorithm-e2e.ts` refers to algorithm flow end-to-end, NOT UI-level E2E.
- No tests exercise: app navigation (`app/` routes), screen rendering, user flows (login, family member CRUD, meal plan generation via UI, shopping list generation), or device-level integration (camera, secure store, biometrics).

## Common Patterns

**Async Testing:**
```typescript
// Pattern from scripts/verify-algorithm-e2e.ts (top-level await via tsx — NOT compatible with Jest/Vitest without modifications)
async function createTempUser() {
  const existing = await client.execute({ sql: "SELECT id FROM users WHERE id = ?", args: [TEMP_USER_ID] });
  if (existing.rows.length === 0) {
    await client.execute({
      sql: "INSERT INTO users (id, email, display_name, locale, is_premium, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [TEMP_USER_ID, "test-v26@test.com", "Test v2.6", "it", 0, Date.now(), Date.now()],
    });
  }
}

// Run via top-level await:
createTempUser().then(() => { /* ... */ });
```

No `async/await` test wrapper from a runner (`async test(...)`, `it('...', async () => {})`). Async assertion helpers like `waitFor`, `findBy*` from Testing Library are absent.

**Error Testing:**
- Not present. No tests assert that functions throw (e.g. invalid Zod input, missing DB row, empty array edge cases beyond `test3Pass` in `test-gapfill.ts`).
- Error paths in services (`src/services/*.service.ts`) are uncovered.

## Recommended Setup for Current Stack

⚠️ **Honest summary:** This codebase has effectively zero formal test infrastructure. The scripts in `scripts/` are debug aids, not a test suite. They cannot run in CI without secrets, have no runner integration, no reporter, no coverage, and only cover one module (`src/services/mealPlan.logic.ts`) of ~10 services, plus zero components, zero stores, zero schemas, zero hooks.

### Missing Frameworks
- **Test runner:** Jest (recommended, best React Native ecosystem fit) OR Vitest (matches the Vite-based `apps/algorithm-playground` sub-project; leaner). Neither is present.
- **Component test utilities:** `react-test-renderer` (already in RN deps transitively) + `@testing-library/react-native` — neither present.
- **Mock infrastructure:** `jest-expo` preset (not present) — handles `expo-*` module mocking automatically. No `jest.setup.ts` exists.
- **Module mock helpers:** No `identity-obj-proxy` for mocking native modules.
- **E2E:** Detox (RN UI E2E) — not present. Playwright could cover the `apps/algorithm-playground` Vite web app only.
- **Coverage reporter:** None (`c8` / `istanbul` / Vitest built-in).
- **CI test automation:** No GitHub Actions, no EAS Build `preBuild`/`postBuild` hook commands in `eas.json`, no pre-commit hooks (`husky`/`lefthook` absent).

### Recommended Conventions to Add

1. **Runner:** Add `jest` + `jest-expo` + `@testing-library/react-native` + `@testing-library/jest-native` + `@types/jest` to devDependencies. Create `jest.config.js`:
   ```js
   module.exports = {
     preset: "jest-expo",
     setupFiles: ["<rootDir>/jest.setup.ts"],
     moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
     collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
     testPathIgnorePatterns: ["/node_modules/", "/android/", "/apps/algorithm-playground/"],
   };
   ```
2. **Path alias in tests:** Mirror `tsconfig.json` `paths` (`"@/*": ["./src/*"]`) in Jest `moduleNameMapper` so imports like `@/services/mealPlan.logic` resolve.
3. **Setup file `jest.setup.ts`:** Reset Zustand stores, mock `expo-secure-store`, mock `AsyncStorage` (`@react-native-async-storage/async-storage/jest/async-storage-mock`), mock `expo-router` navigation. Enable `@testing-library/jest-native` matchers via `import '@testing-library/jest-native/extend-expect'`.
4. **Co-locate unit tests:** Follow `*.test.ts(x)` next to source files (e.g. `src/services/mealPlan.logic.test.ts`, `src/schemas/recipe.test.ts`, `src/stores/authStore.test.ts`). Add to biome `files.includes`.
5. **Keep `scripts/` for what it's good at:** Promote `scripts/test-gapfill.ts` to a real Jest test in `src/services/mealPlan.logic.test.ts`; migrate the assertions verbatim (they are already `===` based). Move `verify-algorithm-e2e.ts` to `tests/integration/algorithm.e2e.test.ts` and gate behind an `INTEGRATION` env var so CI default run skips it.
6. **npm scripts:** Add to `package.json` `scripts`:
   ```json
   "test": "jest",
   "test:watch": "jest --watch",
   "test:coverage": "jest --coverage",
   "test:integration": "INTEGRATION=1 jest --config jest.integration.config.js"
   ```
7. **Fixtures location:** Create `src/__fixtures__/` for shared factory functions (`makeRecipe`, `makeFamilyMember`, `makeMealPlan`) to replace the inline literals currently duplicated across `scripts/*.ts`.
8. **CI:** Add `.github/workflows/test.yml` running `pnpm install --frozen-lockfile && pnpm test && pnpm lint` (Biome is already configured via `biome.json` — `pnpm dlx @biomejs/biome check`). Add a `preBuild` hook to `eas.json` profiles to run tests before EAS Build:
   ```json
   "build": {
     "production": {
       "preBuild": "pnpm test --ci"
     }
   }
   ```
9. **Parallel for `apps/algorithm-playground`:** That sub-project uses Vite — add `vitest` + `@testing-library/react` + `jsdom` for its isolated unit tests (separate `package.json` so it's confined). Currently `apps/algorithm-playground/package.json` has no test script.
10. **Coverage targets:** Start with `src/services/mealPlan.logic.ts` (the only tested module — port `test-gapfill.ts`), then `src/schemas/*` (Zod schemas are pure and trivially testable), then `src/services/*.service.ts` with mocked SQLite, then Zustand stores, finally React components.

### Modules Most in Need of Tests (priority order)
1. `src/services/mealPlan.logic.ts` — critical algorithm, only partially covered by `scripts/test-gapfill.ts` (no edge cases for empty inputs, NaN, calorie overshoot).
2. `src/schemas/*` — Zod schemas serialize forms and DB rows; untested.
3. `src/services/mealPlan.service.ts`, `recipe.service.ts`, `familyMember.service.ts`, `shoppingList.service.ts` — DB-bound, completely untested.
4. `src/stores/authStore.ts`, `src/stores/familyStore.ts` — Zustand stores with persistence; untested.
5. `src/hooks/` — custom hooks used by screens; untested.
6. `app/` screens — no component or integration tests; no UI E2E.

---

*Testing analysis: 2026-07-05*
