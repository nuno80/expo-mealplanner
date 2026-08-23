/**
 * Seed vegetable_side recipes for Harvard Plate logic (v2.6).
 * These are low-calorie vegetable preparations added to lunch/dinner.
 *
 * Usage: pnpm exec tsx scripts/seed-veg-sides.ts
 */
import { createClient } from "@libsql/client";
import { randomUUID } from "crypto";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { recipes } from "../src/db/schema";

dotenv.config({ path: "recipe-manager/.env" });

const url = process.env.TURSO_DATABASE_URL ?? process.env.VITE_TURSO_URL;
const authToken =
  process.env.TURSO_AUTH_TOKEN ?? process.env.VITE_TURSO_TOKEN;

if (!url) {
  // Try loading from algorithm-playground
  dotenv.config({ path: "apps/algorithm-playground/.env.local" });
}

const finalUrl = process.env.TURSO_DATABASE_URL ?? process.env.VITE_TURSO_URL;
const finalToken =
  process.env.TURSO_AUTH_TOKEN ?? process.env.VITE_TURSO_TOKEN;

if (!finalUrl) {
  console.error("❌ No Turso URL found. Set TURSO_DATABASE_URL or VITE_TURSO_URL.");
  process.exit(1);
}

const client = createClient({ url: finalUrl, authToken: finalToken });
const db = drizzle(client);

const vegSides = [
  {
    nameIt: "Zucchine Grigliate",
    nameEn: "Grilled Zucchini",
    slug: "zucchine-grigliate",
    kcalPer100g: 25,
    proteinPer100g: 1.5,
    carbsPer100g: 2.5,
    fatPer100g: 0.8,
    fiberPer100g: 1.2,
    servingWeightG: 150,
  },
  {
    nameIt: "Broccoli al Vapore",
    nameEn: "Steamed Broccoli",
    slug: "broccoli-vapore",
    kcalPer100g: 35,
    proteinPer100g: 2.8,
    carbsPer100g: 4.0,
    fatPer100g: 0.4,
    fiberPer100g: 2.6,
    servingWeightG: 150,
  },
  {
    nameIt: "Spinaci Saltati",
    nameEn: "Sautéed Spinach",
    slug: "spinaci-saltati",
    kcalPer100g: 30,
    proteinPer100g: 2.9,
    carbsPer100g: 1.5,
    fatPer100g: 1.0,
    fiberPer100g: 2.2,
    servingWeightG: 150,
  },
  {
    nameIt: "Cavolfiore al Forno",
    nameEn: "Roasted Cauliflower",
    slug: "cavolfiore-forno",
    kcalPer100g: 40,
    proteinPer100g: 2.0,
    carbsPer100g: 4.5,
    fatPer100g: 1.5,
    fiberPer100g: 2.0,
    servingWeightG: 150,
  },
  {
    nameIt: "Fagiolini Lessi",
    nameEn: "Boiled Green Beans",
    slug: "fagiolini-lessi",
    kcalPer100g: 30,
    proteinPer100g: 1.8,
    carbsPer100g: 4.5,
    fatPer100g: 0.3,
    fiberPer100g: 3.0,
    servingWeightG: 150,
  },
  {
    nameIt: "Peperoni Arrosto",
    nameEn: "Roasted Peppers",
    slug: "peperoni-arrosto",
    kcalPer100g: 35,
    proteinPer100g: 1.0,
    carbsPer100g: 6.0,
    fatPer100g: 0.8,
    fiberPer100g: 1.5,
    servingWeightG: 150,
  },
  {
    nameIt: "Melanzane Grigliate",
    nameEn: "Grilled Eggplant",
    slug: "melanzane-grigliate",
    kcalPer100g: 30,
    proteinPer100g: 1.0,
    carbsPer100g: 4.0,
    fatPer100g: 0.8,
    fiberPer100g: 3.0,
    servingWeightG: 150,
  },
  {
    nameIt: "Carote al Vapore",
    nameEn: "Steamed Carrots",
    slug: "carote-vapore",
    kcalPer100g: 40,
    proteinPer100g: 0.9,
    carbsPer100g: 8.0,
    fatPer100g: 0.2,
    fiberPer100g: 2.8,
    servingWeightG: 150,
  },
  {
    nameIt: "Finocchi Gratinati",
    nameEn: "Gratinated Fennel",
    slug: "finocchi-gratinati",
    kcalPer100g: 45,
    proteinPer100g: 1.5,
    carbsPer100g: 5.0,
    fatPer100g: 2.0,
    fiberPer100g: 3.1,
    servingWeightG: 150,
  },
  {
    nameIt: "Cime di Rapa Saltate",
    nameEn: "Sautéed Broccoli Rabe",
    slug: "cime-rapa-saltate",
    kcalPer100g: 30,
    proteinPer100g: 3.2,
    carbsPer100g: 2.0,
    fatPer100g: 0.7,
    fiberPer100g: 2.7,
    servingWeightG: 150,
  },
  {
    nameIt: "Bietola Saltata",
    nameEn: "Sautéed Swiss Chard",
    slug: "bietola-saltata",
    kcalPer100g: 25,
    proteinPer100g: 1.8,
    carbsPer100g: 2.5,
    fatPer100g: 0.8,
    fiberPer100g: 1.6,
    servingWeightG: 150,
  },
  {
    nameIt: "Asparagi Grigliati",
    nameEn: "Grilled Asparagus",
    slug: "asparagi-grigliati",
    kcalPer100g: 30,
    proteinPer100g: 2.2,
    carbsPer100g: 3.5,
    fatPer100g: 0.5,
    fiberPer100g: 2.1,
    servingWeightG: 150,
  },
];

async function seedVegSides() {
  console.log("🥦 Seeding Vegetable Side Dishes (Harvard Plate v2.6)...\n");

  let inserted = 0;
  let skipped = 0;

  for (const veg of vegSides) {
    try {
      const existing = await db
        .select({ id: recipes.id })
        .from(recipes)
        .where(eq(recipes.slug, veg.slug));

      if (existing.length > 0) {
        console.log(`  ⏭ ${veg.slug} (already exists)`);
        skipped++;
        continue;
      }

      await db.insert(recipes).values({
        id: randomUUID(),
        ...veg,
        category: "vegetable_side",
        proteinSource: "none",
        difficulty: "easy",
        isPublished: true,
        kcalPerServing: Math.round((veg.kcalPer100g / 100) * veg.servingWeightG),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      console.log(`  ✅ ${veg.nameIt} (${veg.kcalPer100g} kcal/100g)`);
      inserted++;
    } catch (e) {
      console.error(`  ❌ Error inserting ${veg.slug}:`, e);
    }
  }

  console.log(`\n🏁 Done: ${inserted} inserted, ${skipped} skipped.`);
}

seedVegSides().catch(console.error);
