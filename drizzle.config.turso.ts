import type { Config } from "drizzle-kit";

/**
 * Drizzle config for Turso Cloud (remote database).
 * Used by Recipe Manager for content management.
 *
 * Usage: pnpm drizzle-kit push --config=drizzle.config.turso.ts
 *
 * Requires env vars: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
 */
export default {
  schema: "./src/db/schema/index.ts",
  out: "./drizzle/turso",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
