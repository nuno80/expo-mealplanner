
import { createClient } from "@libsql/client";
import "dotenv/config"; // Load env vars
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { recipes } from "../src/db/schema";
// Use native crypto for Node environment
import { randomUUID } from "crypto";

// Load .env.local if not loaded by dotenv/config automatically (it usually loads .env)
import * as dotenv from "dotenv";
dotenv.config({ path: "recipe-manager/.env" });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

// console.log("Debug Env Keys:", Object.keys(process.env).filter(k => k.includes("TURSO")));

if (!url) {
  console.error("❌ TURSO_DATABASE_URL not found in environment.");
  process.exit(1);
}

const client = createClient({
  url,
  authToken,
});

const db = drizzle(client);

async function seedSides() {
  console.log("🌱 Seeding Side Dishes to Turso...");

  const sides = [
    {
      nameIt: "Pane Integrale",
      nameEn: "Whole Wheat Bread",
      slug: "pane-integrale",
      category: "side_dish",
      kcalPer100g: 250,
      proteinPer100g: 13,
      carbsPer100g: 45,
      fatPer100g: 3,
      servingWeightG: 50,
      proteinSource: "plant_based",
      isPublished: true,
    },
    {
      nameIt: "Riso Basmati",
      nameEn: "Basmati Rice",
      slug: "riso-basmati",
      category: "side_dish",
      kcalPer100g: 350, // Raw
      proteinPer100g: 7,
      carbsPer100g: 78,
      fatPer100g: 1,
      servingWeightG: 80,
      proteinSource: "plant_based",
      isPublished: true,
    },
    {
      nameIt: "Patate al Forno",
      nameEn: "Baked Potatoes",
      slug: "patate-forno",
      category: "side_dish",
      kcalPer100g: 90,
      proteinPer100g: 2,
      carbsPer100g: 17,
      fatPer100g: 3,
      servingWeightG: 200,
      proteinSource: "plant_based",
      isPublished: true,
    },
    {
      nameIt: "Insalata Mista",
      nameEn: "Mixed Salad",
      slug: "insalata-mista",
      category: "side_dish",
      kcalPer100g: 20,
      proteinPer100g: 1,
      carbsPer100g: 3,
      fatPer100g: 0.5,
      servingWeightG: 100,
      proteinSource: "plant_based",
      isPublished: true,
    },
    {
      nameIt: "Verdure Grigliate",
      nameEn: "Grilled Vegetables",
      slug: "verdure-grigliate",
      category: "side_dish",
      kcalPer100g: 40,
      proteinPer100g: 2,
      carbsPer100g: 5,
      fatPer100g: 2,
      servingWeightG: 200,
      proteinSource: "plant_based",
      isPublished: true,
    }
  ];

  for (const side of sides) {
    // Check if exists
    try {
      const existing = await db
        .select()
        .from(recipes)
        .where(eq(recipes.slug, side.slug));

      if (existing.length > 0) {
        console.log(`Skipping ${side.slug} (already exists)`);
        continue;
      }

      await db.insert(recipes).values({
        id: randomUUID(),
        ...side,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      console.log(`Inserted ${side.slug}`);
    } catch (e) {
      console.error(`Error inserting ${side.slug}:`, e);
    }
  }

  console.log("✅ Seeding complete.");
}

// Execute
seedSides().catch(console.error);
