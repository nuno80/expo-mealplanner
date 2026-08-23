# STACK.md

**Analysis Date:** 2026-07-05

## Overview

NutriPlanIT is an AI-powered meal planning mobile app for families. The codebase is a monorepo containing three primary components:

1. A React Native + Expo mobile application (root) — the main product.
2. A Cloudflare Worker API (`android/api/`) — exposes recipes via Hono on the Workers runtime.
3. A Python content-management CLI (`recipe-manager/`) — populates Turso with recipes via LLM (Gemini), USDA FoodData Central, and Cloudinary.

A secondary `apps/algorithm-playground/` Vite + React 18 web app exists for prototyping the meal-plan algorithm directly against Turso.

Confidence is marked per item: **Verified** = confirmed from a config file / import; **Inferred** = derived indirectly.

## Languages

| Language | Version | Used where | Evidence | Confidence |
|---|---|---|---|---|
| TypeScript | ~5.9.2 (mobile), ~5.7.0 (api), ~5.5.0 (playground) | Mobile app, Cloudflare Worker, algorithm playground | `package.json:62`, `android/api/package.json:16`, `apps/algorithm-playground/package.json:21` | Verified |
| JavaScript | (transpiled target) | Config/build scripts (`babel.config.js`, `metro.config.js`, `tailwind.config.js`, `scripts/validate_env.js`) | repo root configs | Verified |
| Python | >= 3.11 (3.11.2 on dev machine) | `recipe-manager/` CLI: recipe import, parsing, scraping, image upload | `recipe-manager/pyproject.toml:6` | Verified |
| SQL | ( SQLite / libSQL dialect ) | Drizzle migrations in `drizzle/`, `.sql` files inlined via `babel-plugin-inline-import` | `drizzle/migrations/*`, `babel.config.js:9` | Verified |

## Runtime & Platform

| Item | Value | Evidence | Confidence |
|---|---|---|---|
| Mobile runtime | Expo SDK ~54.0.30, React Native 0.81.5, React 19.1.0 (New Architecture enabled) | `package.json:21,34,36`; `app.json:10` `"newArchEnabled": true` | Verified |
| Node.js | v24.15.0 (dev machine) — required for toolchain and scripts | `node --version` output | Verified |
| Mobile target platforms | iOS (`com.nutriplanit.app`) and Android (`com.nutriplanit.app`, `edgeToEdgeEnabled`), Web (Metro bundler) | `app.json:16-31` | Verified |
| EAS build distribution | Development / Preview (internal APK), Production (`autoIncrement`) | `eas.json:6-22` | Verified |
| EAS project ID | `f20f1a57-921b-4b7f-bbf8-a83edf4ef98e` (also the expo-updates URL) | `app.json:38-49` | Verified |
| Cloudflare Worker compatibility date | `2024-12-01` | `android/api/wrangler.toml:3` | Verified |
| Python package manager | UV 0.6.14 with `uv.lock` | `recipe-manager/uv.lock`, `uv --version` | Verified |

## Package Managers

| Manager | Version | Lockfile | Evidence | Confidence |
|---|---|---|---|---|
| pnpm | 10.11.0 | `pnpm-lock.yaml` | `pnpm --version`; lockfile at repo root | Verified |
| npm | (fallback, used by `android/api`) | `android/api/package-lock.json` | `android/api/package-lock.json` | Verified |
| uv | 0.6.14 | `recipe-manager/uv.lock` | `recipe-manager/uv.lock` | Verified |

`.npmrc` sets `legacy-peer-deps=true` (used for React Native peer-dep tolerances) — Verified (`/.npmrc:1`).

## Frameworks — Core

| Framework | Version | Purpose | Evidence | Confidence |
|---|---|---|---|---|
| Expo | ~54.0.30 | Mobile app shell, router, OTA updates, native modules | `package.json:21` | Verified |
| expo-router | ^6.0.21 | File-based navigation (entry: `expo-router/entry`) | `package.json:4,27` | Verified |
| React Native | 0.81.5 | Native UI runtime (New Arch) | `package.json:36`; `app.json:10` | Verified |
| React | 19.1.0 | UI library | `package.json:34` | Verified |
| Hono | ^4.6.0 | Cloudflare Worker HTTP API framework | `android/api/package.json:12`; `android/api/src/index.ts:1` | Verified |
| Cloudflare Workers | runtime | Hosts the Hono API; wrangler dev/deploy | `android/api/wrangler.toml:1-2`; `android/api/package.json:5-8` | Verified |
| NativeWind | ^4.2.1 | TailwindCSS-style styling for React Native | `package.json:33`; `metro.config.js:2`; `babel.config.js:5-6` | Verified |
| Tailwind CSS | ^3.4.19 | Style utility engine (via NativeWind) | `package.json:46`; `tailwind.config.js` | Verified |
| Vite | ^5.4.0 | Dev server/build for algorithm playground | `apps/algorithm-playground/package.json:22` | Verified |

## State, Forms & Data Validation

| Library | Version | Purpose | Evidence | Confidence |
|---|---|---|---|---|
| Zustand | ^5.0.9 | Lightweight global stores (`authStore`, `familyStore`) | `package.json:48`; `src/stores/authStore.ts:2`, `src/stores/familyStore.ts:1` | Verified |
| @tanstack/react-query | ^5.90.14 | Async server state / data hooks | `package.json:19`; `src/hooks/useRecipes.ts:1`, `useFamilyMembers.ts:1`, `useMealPlan.ts:1`, `useShoppingList.ts:1`, `useWeightLogs.ts:1` | Verified |
| react-hook-form | ^7.69.0 | Form state | `package.json:35` | Verified |
| @hookform/resolvers | ^5.2.2 | Adapters between RHF and schema validators | `package.json:15` | Verified |
| Zod | ^4.2.1 | Schema validation (`src/schemas/*.ts`) and form resolvers | `package.json:47`; `src/schemas/auth.ts:1`, `recipe.ts:1`, `familyMember.ts:1`, `mealPlan.ts:1`, `weightLog.ts:1`, `schemas/mealPlan.ts:2` | Verified |
| Pydantic | >=2.12.5 | Validation in Python CLI | `recipe-manager/pyproject.toml:13` | Verified |

## Database / ORM

| Tool | Version | Purpose | Evidence | Confidence |
|---|---|---|---|---|
| drizzle-orm | ^0.45.1 | TypeScript ORM for SQLite/local + Turso queries | `package.json:20`; `src/db/client.ts:1`; `src/db/schema/index.ts:2` | Verified |
| drizzle-kit | ^0.31.8 | Schema → migrations generator | `package.json:60`; `drizzle.config.ts`, `drizzle.config.turso.ts` | Verified |
| expo-sqlite | ^16.0.10 | Local SQLite engine on device (offline-first) | `package.json:29`; `src/db/client.ts:2,5` | Verified |
| @libsql/client | ^0.15.15 (root dev), ^0.14.0 (worker), ^0.6.0 (playground) | libSQL/Turso HTTP client used by Worker API, scripts and playground | `package.json:53`; `android/api/package.json:11`; `apps/algorithm-playground/package.json:12`; `android/api/src/db.ts:1-2` | Verified |
| libsql-client | >=0.3.1 | Python Turso client in `recipe-manager` | `recipe-manager/pyproject.toml:12` | Verified |

## Expo / React Native Modules

| Module | Version | Purpose | Evidence |
|---|---|---|---|
| expo-constants | ^18.0.12 | Read app config / EAS env | `package.json:22` |
| expo-crypto | ^15.0.8 | `randomUUID` for local IDs | `package.json:23`; `src/services/user.service.ts:2` |
| expo-dev-client | ^6.0.20 | Custom dev client builds | `package.json:24` |
| expo-image | ^3.0.11 | Image rendering (replaces RN `<Image>`) | `package.json:25`; `src/lib/nativewind.ts:1` |
| expo-linking | ^8.0.11 | Deep-link handling | `package.json:26` |
| expo-secure-store | ^15.0.8 | Encrypted KV used as Supabase session storage | `package.json:28`; `src/lib/supabase.ts:3-15` |
| expo-status-bar | ~3.0.9 | Status bar control | `package.json:30` |
| expo-updates | ~29.0.16 | OTA updates via EAS Update | `package.json:31`; `app.json:47-49` |
| @react-native-async-storage/async-storage | ^2.2.0 | Key-value storage | `package.json:16` |
| @shopify/flash-list | 2.0.2 | High-perf lists (per `GEMINI.md` mandated `estimatedItemSize`) | `package.json:17` |
| react-native-reanimated | ~4.1.1 | Animations; configured in Babel | `package.json:39`; `babel.config.js:10` |
| react-native-worklets | 0.5.1 / react-native-worklets-core ^1.6.2 | Worklets runtime for Reanimated | `package.json:44-45` |
| react-native-safe-area-context | ^5.6.2 | Safe-area insets | `package.json:40` |
| react-native-screens | ~4.16.0 | Native screen container | `package.json:41` |
| react-native-svg | 15.12.1 | SVG rendering (for charts/icons) | `package.json:42` |
| react-native-url-polyfill | ^3.0.0 | URL polyfill required by Supabase | `package.json:43`; `src/lib/supabase.ts:1` |
| lucide-react-native | ^0.562.0 | Icon set | `package.json:32` |
| react-native-css-interop | ^0.2.1 | CSS interop backing NativeWind | `package.json:38` |
| react-native-chart-kit | ^6.12.0 | Weight-tracking charts | `package.json:37` |

All entries Verified from `package.json` lines cited.

## External SDKs / API Clients

| SDK | Version | Purpose | Evidence | Confidence |
|---|---|---|---|---|
| @supabase/supabase-js | ^2.89.0 | Auth client (Supabase) | `package.json:18`; `src/lib/supabase.ts:2`; `src/stores/authStore.ts:1` | Verified |
| cloudinary (Python) | >=1.44.1 | Recipe image upload/CDN | `recipe-manager/pyproject.toml:9` | Verified |
| google-genai (Python) | >=1.56.0 | Google Gemini LLM for recipe parsing | `recipe-manager/pyproject.toml:10`; README references "Gemini 1.5 Flash" | Verified |
| httpx | >=0.28.1 | HTTP client used by Python CLI | `recipe-manager/pyproject.toml:11` | Verified |
| beautifulsoup4 | >=4.14.3 | HTML scraping (legacy parser path) | `recipe-manager/pyproject.toml:8` | Verified |
| Typer + Rich | >=0.21.0 / >=14.2.0 | Python CLI UX | `recipe-manager/pyproject.toml:16,15` | Verified |
| python-dotenv | >=1.2.1 | Env loading for Python CLI/scripts | `recipe-manager/pyproject.toml:14` | Verified |

## Build & Dev Tooling

| Tool | Version | Purpose | Evidence | Confidence |
|---|---|---|---|---|
| babel-preset-expo | ^54.0.9 | TS/JSX transform pipeline | `package.json:57`; `babel.config.js:5` | Verified |
| babel-plugin-inline-import | ^3.0.0 | Inline `.sql` files (used by drizzle migrations) | `package.json:56`; `babel.config.js:9` | Verified |
| @expo/ngrok | ^4.1.3 | Tunnel for sharing dev build | `package.json:52` | Verified |
| dotenv / dotenv-cli | ^17.2.3 / ^11.0.0 | Inject env vars when running scripts (e.g. `pnpm dotenv -e recipe-manager/.env ...`) | `package.json:58-59`; `recipe-manager/README.md:181` | Verified |
| ts-node | ^10.9.2 | Runtime TS for build config (`drizzle-kit`) | `package.json:61` | Verified |
| tsx | ^4.21.0 (playground only) | Run TS scripts in playground | `apps/algorithm-playground/package.json:20` | Verified |
| @vitejs/plugin-react | ^4.3.0 | React plugin for Vite playground | `apps/algorithm-playground/package.json:19` | Verified |
| wrangler | ^3.99.0 | Cloudflare Workers dev/deploy | `android/api/package.json:17` | Verified |
| @cloudflare/workers-types | ^4.20241218.0 | TS types for Workers runtime | `android/api/package.json:15` | Verified |
| @biomejs/biome | ^2.3.10 | Linter + formatter (tab indent, double quotes) | `package.json:51`; `biome.json:2,14,25` | Verified |
| @types/node / @types/react | ^25.0.3 / ~19.1.0 | Node + React types | `package.json:54-55` | Verified |

## Lint & Format Configuration (Biome)

| Setting | Value | Evidence |
|---|---|---|
| Enabled | formatter + linter | `biome.json:13,17` |
| Indent style | Tab | `biome.json:14` |
| Quote style | Double | `biome.json:24` |
| Files included | `app/**`, `src/**`, `*.ts`, `*.tsx`, `*.js` | `biome.json:10` |
| Organize imports | on (assist) | `biome.json:28-33` |
| VCS | git, uses ignore file | `biome.json:3-6` |

Validation gates documented in `GEMINI.md:127-131` and `README.md:64-69`:
```bash
pnpm exec tsc --noEmit
pnpm exec biome check ./
```

## TypeScript Configuration

| Setting | Value | Evidence | Confidence |
|---|---|---|---|
| Extends | `expo/tsconfig/base` | `tsconfig.json:2` | Verified |
| strict | true | `tsconfig.json:4` | Verified |
| jsxImportSource | nativewind | `tsconfig.json:5` | Verified |
| Path alias | `@/*` → `./src/*` | `tsconfig.json:7-10` | Verified |
| Playground alias | `@` → `./src` | `apps/algorithm-playground/vite.config.ts:11-13` | Verified |

## Build / Scripts

From root `package.json:5-13` (Verified):
```bash
pnpm start             # expo start
pnpm android | ios | web
pnpm db:generate       # drizzle-kit generate
pnpm db:push           # drizzle-kit push
pnpm db:migrate        # drizzle-kit migrate
```

From `android/api/package.json:5-9` (Verified):
```bash
pnpm dev      # wrangler dev (localhost:8787)
pnpm deploy  # wrangler deploy
pnpm typecheck
```

From `apps/algorithm-playground/package.json:6-10` (Verified): `dev`, `build`, `preview`.

Utility scripts (run via `npx tsx scripts/<name>.ts`; Verified from `scripts/README.md:1-115`):
- Seeding: `seed-sides.ts`, `seed-veg-sides.ts`, `tag-recipes.ts`
- Verification: `verify-algorithm.ts`, `verify-algorithm-e2e.ts`, `verify-seeding.ts`
- Debug: `check-recipe-logic.ts`, `debug-ingredients.ts`, `debug-sides.ts`, `test-gapfill.ts`
- Env check (Node): `validate_env.js`

Recipe Manager CLI (`recipe-manager/README.md:7-21`, Verified):
```bash
uv run python -m recipe_manager import-llm
uv run python -m recipe_manager import-json ./recipes_data/
uv run python scripts/upload_images.py
```

## Migrations Output

- Local SQLite migrations generated to `./drizzle/` (`drizzle.config.ts:5-6`). Output present: `drizzle/migrations.js`, `drizzle/meta/`, 8 migration `.sql` files (`drizzle/0000_*` … `0007_*`).
- Turso migrations to `./drizzle/turso/` (`drizzle.config.turso.ts:13`).

## Platform Requirements

| Requirement | Detail | Evidence | Confidence |
|---|---|---|---|
| Mobile dev | Expo Go or `expo-dev-client` build; EAS CLI >= 15.0.0 for builds | `eas.json:3` | Verified |
| Node | >= LTS (24.x used in dev) | tool output | Verified |
| Python | >= 3.11 with UV | `recipe-manager/pyproject.toml:6` | Verified |
| Cloudflare account | For Workers deploy + secrets | `android/api/wrangler.toml`; `.env.local:CLOUDFLARE_API_TOKEN` | Verified |
| Turso account | For remote libSQL DB and Drizzle push | `drizzle.config.turso.ts:15-19`; `.env.example:4-6` | Verified |
| Supabase project | For Auth | `.env.example:1-2`; `src/lib/supabase.ts:17-18` | Verified |

## Notes on Internal monorepo nuance

- The repo package name in `package.json` is still `temp-expo` (`package.json:2`) while the product/slug is `nutriplanit` (`app.json:3-4`). Confirmed Verified.
- `README.md:42-54` mentions an `api/` directory at repo root, but the actual Worker lives at `android/api/`. README structure is partially **stale** relative to actual file layout — Verified (no `api/` directory at repo root; only `android/api/`).
- `react-native-worklets` (0.5.1) AND `react-native-worklets-core` (1.6.2) are both present as dependencies — both Verified in `package.json:44-45`; potential duplication flagged for CONCERNS.

---

## Confidence Summary

- **Verified**: Everything in tables above is cross-referenced against at least one file (config/import/path).
- **Inferred**: Stated Hono/Cloudflare deployment domain `https://nutriplanit-api.nutriplanit.workers.dev` (`src/lib/api.ts:10`) — Inferred production target based on the constant; not independently confirmed deployed. Cloudinary CDN usage in the mobile app is Inferred (only the Python `cloudinary` SDK is present; the mobile app consumes Cloudinary URLs via `expo-image`).

*Stack analysis: 2026-07-05*
