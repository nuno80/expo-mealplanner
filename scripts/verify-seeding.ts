/**
 * Quick query to verify seeding results.
 * Usage: npx tsx scripts/verify-seeding.ts
 * Output written to /tmp/verify-seeding.txt
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import { writeFileSync } from "fs";

dotenv.config({ path: "recipe-manager/.env" });
dotenv.config({ path: "apps/algorithm-playground/.env.local" });

const url = process.env.TURSO_DATABASE_URL ?? process.env.VITE_TURSO_URL;
const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.VITE_TURSO_TOKEN;

if (!url) { console.error("No Turso URL found."); process.exit(1); }

const client = createClient({ url, authToken });
const out: string[] = [];

async function verify() {
  const vs = await client.execute("SELECT COUNT(*) as cnt FROM recipes WHERE category = 'vegetable_side' AND is_published = 1");
  out.push(`Vegetable sides: ${vs.rows[0].cnt}`);

  const tg = await client.execute("SELECT COUNT(*) as cnt FROM recipes WHERE tags IS NOT NULL AND tags != ''");
  out.push(`Tagged recipes: ${tg.rows[0].cnt}`);

  const tagged = await client.execute("SELECT name_it, tags, category FROM recipes WHERE tags IS NOT NULL AND tags != '' ORDER BY category, name_it");
  out.push("\nTagged recipes:");
  for (const r of tagged.rows) out.push(`  ${r.category} - ${r.name_it}: ${r.tags}`);

  const cats = await client.execute("SELECT category, COUNT(*) as cnt FROM recipes WHERE is_published = 1 GROUP BY category ORDER BY category");
  out.push("\nRecipes by category:");
  for (const r of cats.rows) out.push(`  ${r.category}: ${r.cnt}`);

  const bread = await client.execute("SELECT name_it, kcal_per_100g, carbs_per_100g, category FROM recipes WHERE (name_it LIKE '%pane%' OR name_it LIKE '%riso%' OR name_it LIKE '%patate%') AND is_published = 1");
  out.push("\nBread/starch items:");
  for (const r of bread.rows) {
    const ok = (r.kcal_per_100g as number) >= 80 && (r.carbs_per_100g as number) >= 15;
    out.push(`  ${ok ? "OK" : "WARN"} ${r.name_it}: ${r.kcal_per_100g} kcal/100g, ${r.carbs_per_100g}g CHO (${r.category})`);
  }

  const result = out.join("\n");
  writeFileSync("/tmp/verify-seeding.txt", result);
  console.log("Output written to /tmp/verify-seeding.txt");
}

verify().catch(console.error);
