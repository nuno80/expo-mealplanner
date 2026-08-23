# INTEGRATIONS.md

**Analysis Date:** 2026-07-05

## Overview

NutriPlanIT integrates with several external services across three components:

- **Mobile app (root)** — Supabase Auth, Cloudflare Worker (recipe sync), local SQLite (offline-first), Expo OTA updates.
- **Cloudflare Worker API (`android/api/`)** — Turso (libSQL cloud) read-only recipe catalog.
- **Recipe Manager CLI (`recipe-manager/`)** — Turso (writes), Google Gemini LLM (recipe parsing), USDA FoodData Central (nutrition lookups), Cloudinary (image CDN).

All secrets are referenced by **name only** — values are never quoted. The repo contains a live `.env.local` at the root with real Supabase and Cloudflare credentials; treat it as exposed and rotate if needed.

Confidence: **Verified** = observed in code/config; **Inferred** = derived from docs/README cross-referenced against code.

## APIs & External Services

### Supabase Auth — `Verified`

- **Purpose:** Authentication for the mobile app (`src/stores/authStore.ts`, `src/lib/supabase.ts`).
- **SDK / client:** `@supabase/supabase-js` ^2.89.0 (`package.json:18`); singleton created in `src/lib/supabase.ts:28-35`.
- **Custom storage adapter:** `ExpoSecureStoreAdapter` wraps `expo-secure-store` for session persistence (`src/lib/supabase.ts:5-15`). Flags: `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`.
- **URL polyfill required:** `import "react-native-url-polyfill/auto"` precedes the SDK import (`src/lib/supabase.ts:1`) — required by Supabase-JS on React Native.
- **Auth env vars (EXPO_PUBLIC, inlined at build):**
  - `EXPO_PUBLIC_SUPABASE_URL` — read at `src/lib/supabase.ts:17`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — read at `src/lib/supabase.ts:18`
- **Warnings on missing creds:** `src/lib/supabase.ts:20-24` logs a console warning when these are absent.
- **Session types used:** `Session, User` from `@supabase/supabase-js` (`src/stores/authStore.ts:1`).

### Cloudflare Worker API (Hono) — `Verified`

- **Purpose:** Serves published recipes to the mobile app (`README.md:57-60`; `src/lib/api.ts:10`).
- **Source:** `android/api/src/index.ts`, `android/api/src/routes/recipes.ts`, `android/api/src/db.ts`.
- **Framework:** Hono `^4.6.0` (`android/api/package.json:12`); Hono CORS middleware enabled with `origin: "*"` (`android/api/src/index.ts:9-13`).
- **Runtime:** Cloudflare Workers; `compatibility_date = "2024-12-01"` (`android/api/wrangler.toml:3`).
- **Worker name:** `nutriplanit-api` (`android/api/wrangler.toml:1`); entry `src/index.ts` (`android/api/wrangler.toml:2`).
- **Client base URL constants (`src/lib/api.ts:9-20`):**
  - DEV: `http://localhost:8787` (Android emulator overridden to `http://10.0.2.2:8787`)
  - PROD: `https://nutriplanit-api.nutriplanit.workers.dev`
  - `USE_PROD_IN_DEV = true` flag forces the production URL even in dev (currently active).
- **Retry / sync logic:** `src/services/sync.service.ts:17` imports `API_BASE_URL` and pushes local meal-plan rows.

## Data Storage

### Local SQLite (offline-first on device) — `Verified`

- **Provider / engine:** `expo-sqlite` ^16.0.10 (`package.json:29`); database file `nutriplanit.db` (`src/db/client.ts:5`).
- **ORM:** `drizzle-orm` ^0.45.1 with `drizzle-orm/expo-sqlite` driver (`src/db/client.ts:1-3`).
- **Schema:** `src/db/schema/index.ts` — uses `sqliteTable`, `integer`, `real`, `text` and `relations` (`src/db/schema/index.ts:1-2`).
- **Migrations runtime:** `drizzle-orm/expo-sqlite/migrator` via `useMigrations` (`src/db/migrate.ts:1-3`). Migrations bundled through `babel-plugin-inline-import` for `.sql` (`babel.config.js:9`) and live in `drizzle/migrations.js` + `drizzle/0000_*` … `0007_*` SQL files.
- **Drizzle config:** `drizzle.config.ts` (dialect `sqlite`, driver `expo`, out `./drizzle`).
- **Scripts:** `pnpm db:generate | db:push | db:migrate` (`package.json:10-12`).

### Turso (libSQL Cloud) — `Verified`

- **Purpose:** Source-of-truth recipe catalog shared by Worker API, Recipe Manager CLI, and `apps/algorithm-playground`.
- **TS client:** `@libsql/client` — versions vary by workspace:
  - root devDep ^0.15.15 (`package.json:53`)
  - Worker ^0.14.0 (`android/api/package.json:11`) — used in `android/api/src/db.ts:1-13`
  - playground ^0.6.0 (`apps/algorithm-playground/package.json:12`)
- **Python client:** `libsql-client>=0.3.1` (`recipe-manager/pyproject.toml:12`).
- **ORM:** Drizzle with `dialect: "turso"` (`drizzle.config.turso.ts:14`); outputs to `./drizzle/turso`.
- **Env vars (server-side Python/Worker):**
  - `TURSO_DATABASE_URL` — `drizzle.config.turso.ts:17`, `android/api/src/db.ts:5`
  - `TURSO_AUTH_TOKEN` — `drizzle.config.turso.ts:18`, `android/api/src/db.ts:6`
- **Worker secret wiring:** `android/api/wrangler.toml:5-8` (commented `[vars]`); Turso creds are configured via `wrangler secret` (per the inline comment), not committed. Type contract: `Env { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN }` (`android/api/src/db.ts:4-7`).
- **Push command (one-off):**
  ```bash
  pnpm dotenv -e recipe-manager/.env -- pnpm drizzle-kit push --config=drizzle.config.turso.ts
  ```
  (`recipe-manager/README.md:181`.)

### File / Image Storage — `Verified` (SDK) / `Inferred` (CDN URLs)

- **Service:** Cloudinary CDN (recipe images).
- **TS SDK in mobile:** None — mobile only renders remote URLs via `expo-image` (`src/lib/nativewind.ts:1`; `GEMINI.md:46`).
- **Python SDK:** `cloudinary>=1.44.1` (`recipe-manager/pyproject.toml:9`). Upload happens in `recipe-manager/src/recipe_manager/services/cloudinary.py` (per `recipe-manager/README.md:62-63`).
- **Folder convention:** uploads land in `nutriplanit/recipes/` (`recipe-manager/README.md:126`).
- **Env vars (Python service):**
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
  (`recipe-manager/.env.example:8-11`.)

### Caching

- **Service:** None — app relies on `@tanstack/react-query` in-memory cache and SQLite local reads. No external caching layer detected. Verified (no redis/memcached references).

## Authentication & Identity

- **Provider:** Supabase Auth (see Supabase section above).
- **Token storage:** `expo-secure-store` (iOS Keychain / Android Keystore wrapped). Verified (`src/lib/supabase.ts:3-15`).
- **App-side store:** Zustand auth store at `src/stores/authStore.ts` exposes `Session`/`User` (`src/stores/authStore.ts:1-3`). Verified.
- **No custom JWT/session server** detected. Inferred (only Supabase auth usage in code).

## Monitoring & Observability

- **Error tracking:** None detected.
- **Logs:** `console.log` / `console.warn` only — e.g. `src/lib/supabase.ts:21,26` (⚠️ logs the Supabase URL on init — see CONCERNS candidate). Verified.
- **EAS Update telemetry:** `expo-updates` configured to push from `https://u.expo.dev/f20f1a57-921b-4b7f-bbf8-a83edf4ef98e` (`app.json:47-49`). Verified.

## CI/CD & Deployment

| Item | Value | Evidence | Confidence |
|---|---|---|---|
| EAS CLI | >= 15.0.0, `appVersionSource: "remote"` | `eas.json:3-4` | Verified |
| EAS Update URL | `https://u.expo.dev/f20f1a57-921b-4b7f-bbf8-a83edf4ef98e` | `app.json:48` | Verified |
| Build profiles | `development` (internal apk), `preview` (internal apk), `production` (autoIncrement) | `eas.json:6-22` | Verified |
| OTA runtime version policy | `appVersion` | `app.json:44-46` | Verified |
| Worker deploy | `wrangler deploy` (manual; `android/api/package.json:7`) | Verified |
| CI pipeline | None detected (no `.github/workflows/*.yml` found) | search returned no GitHub Actions files | Verified |

## Environment Configuration

### Root secrets (mobile app) — `Verified`

`.env.example` (root, 9 lines):
- `EXPO_PUBLIC_SUPABASE_URL` — string-prefixed `EXPO_PUBLIC_*` so it is inlined into the JS bundle at build time.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `TURSO_DATABASE_URL` (used by scripts / `drizzle.config.turso.ts`)
- `TURSO_AUTH_TOKEN`
- `USDA_API_KEY` (recipe-manager scripts only)

`.env.local` (root) — **present** and **gitignored** but contains real credentials (Supabase URL+anon key, a `SUPABASE_DB_password`-style value, `CLOUDFLARE_API_TOKEN`). It is NOT safe to share; rotate if leaked.

### Root env consumers

| Variable | Read by | Path |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile app | `src/lib/supabase.ts:17` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile app | `src/lib/supabase.ts:18` |
| `TURSO_DATABASE_URL` | drizzle-kit (Turso config) | `drizzle.config.turso.ts:17` |
| `TURSO_AUTH_TOKEN` | drizzle-kit (Turso config) | `drizzle.config.turso.ts:18` |
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy (manual env) — `.env.local:6` (inferred use) | `.env.local` (Verified existence) |
| `SUPABASE_DB_password` | Inferred Postgres DB password for Supabase studio / direct DB access — not referenced in app code | `.env.local:4` |

### Recipe Manager env (Python service) — `Verified`

`recipe-manager/.env.example` (12 lines):
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `USDA_API_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `GEMINI_API_KEY`

### Algorithm Playground env — `Verified`

`apps/algorithm-playground/.env.example` (3 lines):
- `VITE_TURSO_URL`
- `VITE_TURSO_TOKEN`

Consumed by `apps/algorithm-playground/vite.config.ts:7,18` (proxy target + loadEnv).

### How env is loaded per component

| Component | Mechanism | Evidence |
|---|---|---|
| Mobile app | Expo build-time inlining of `EXPO_PUBLIC_*` | Expo convention; `src/lib/supabase.ts:17` |
| Worker (Cloudflare) | `wrangler secret put` (per `android/api/wrangler.toml:5-8`) — values exposed via `Bindings.Env` | `android/api/src/db.ts:4-7`, `android/api/src/index.ts:6` |
| Scripts (root TS) | `dotenv-cli` (`pnpm dotenv -e ...`) or direct `process.env` | `scripts/README.md:8-16`, `scripts/validate_env.js:6` |
| Recipe Manager (Py) | `python-dotenv` (`recipe-manager/pyproject.toml:14`) | `recipe-manager/README.md:72-77` |
| Algorithm Playground | Vite `loadEnv(mode, cwd, "")` | `apps/algorithm-playground/vite.config.ts:7` |

## External LLM & Nutrition Services (Recipe Manager only)

### Google Gemini — `Verified` (SDK) / `Inferred` (model version)

- **SDK:** `google-genai>=1.56.0` (`recipe-manager/pyproject.toml:10`).
- **Model:** README states "Gemini 1.5 Flash" (`recipe-manager/README.md:33`) — Inferred model version may differ at runtime.
- **Env var:** `GEMINI_API_KEY` (`recipe-manager/.env.example:12`).
- **System prompt file:** `recipe-manager/prompts/recipe_parser.md` (`recipe-manager/README.md:163-173`).
- **Parser service:** `recipe-manager/src/recipe_manager/services/llm_parser.py` (per README structure).

### USDA FoodData Central API — `Verified` (env name) / `Inferred` (endpoint usage)

- **Purpose:** Ingredient nutrition lookups (per `recipe-manager/README.md:34`).
- **Env var:** `USDA_API_KEY` (`.env.example:8`, `recipe-manager/.env.example:6`).
- **Client service:** `recipe-manager/src/recipe_manager/services/usda.py` (`recipe-manager/README.md:62-67`); the README explicitly lists it as "optional".
- **Endpoint:** Not referenced in the verified files; "Inferred" from the README's description only.

### Web scraper (Gily / legacy) — `Verified`

- `beautifulsoup4>=4.14.3` (`recipe-manager/pyproject.toml:8`); legacy parser path `import-text` (`recipe-manager/README.md:138`).

## Webhooks & Callbacks

- **Incoming:** None — no webhook routes registered in the Hono router (`android/api/src/index.ts:16-25` only exposes `/` health and `/recipes`).
- **Outgoing:** None — Supabase Auth fires standard email-link flows but no custom callback URLs detected in `app.json` or `src/lib/supabase.ts`.

## Integration Health Notes (candidates for CONCERNS.md)

1. **`.env.local` at repo root contains live secrets** (Supabase anon key, Cloudflare API token). Although `.gitignore` excludes it, the file's `Cloudflare API_TOKEN` grants Worker deployment rights — Verified existence. Flag for CONCERNS.
2. **`console.log("Supabase URL initialized:", supabaseUrl)`** (`src/lib/supabase.ts:26`) prints the project URL to device logs on every cold start — Verified; candidate for removal in production.
3. **CORS `origin: "*"`** on the Worker API (`android/api/src/index.ts:10`) allows any origin — comment in code already acknowledges this; candidate for tightening.
4. **API base URL hard-codes production in dev** (`USE_PROD_IN_DEV = true`, `src/lib/api.ts:13-20`) — Verified; any developer running the app locally silently hits prod.

---

*Integration audit: 2026-07-05*
