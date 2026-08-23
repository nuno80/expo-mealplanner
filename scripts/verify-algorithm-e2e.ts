/**
 * FULL Algorithm v2.6 Verification (End-to-End)
 *
 * This script:
 * 1. Fetches recipes from Turso
 * 2. Runs the v2.6 algorithm logic (imported from mealPlan.logic.ts)
 * 3. Inserts planned meals into DB
 * 4. Analyzes results for Harvard Plate, protein quotas, caloric accuracy
 * 5. Writes detailed report to /tmp/verify-algorithm.txt
 *
 * Usage: npx tsx scripts/verify-algorithm-e2e.ts
 */
import { createClient } from "@libsql/client";
import { randomUUID } from "crypto";
import * as dotenv from "dotenv";
import { writeFileSync } from "fs";
import { calculateMealComposition, MEAL_DISTRIBUTION } from "../src/services/mealPlan.logic";

dotenv.config({ path: "recipe-manager/.env" });
dotenv.config({ path: "apps/algorithm-playground/.env.local" });

const url = process.env.TURSO_DATABASE_URL ?? process.env.VITE_TURSO_URL;
const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.VITE_TURSO_TOKEN;
if (!url) { console.error("No Turso URL"); process.exit(1); }

const client = createClient({ url, authToken });
const out: string[] = [];
const log = (msg: string) => { console.log(msg); out.push(msg); };

const TEMP_USER_ID = "00000000-0000-0000-0000-000000000099";

interface TestProfile {
  name: string;
  goal: "cut" | "maintain" | "bulk";
  targetKcal: number;
  snackPreference: "none" | "one" | "two";
  weightKg: number;
}

const profiles: TestProfile[] = [
  { name: "V2-Cut", goal: "cut", targetKcal: 1800, snackPreference: "none", weightKg: 75 },
  { name: "V2-Maintain", goal: "maintain", targetKcal: 2200, snackPreference: "one", weightKg: 80 },
  { name: "V2-Bulk", goal: "bulk", targetKcal: 3200, snackPreference: "two", weightKg: 70 },
];

// Weekly protein quotas (Mediterranean Diet)
const WEEKLY_PROTEIN_TARGETS: Record<string, { min: number; max: number }> = {
  legumes: { min: 3, max: 5 },
  fish: { min: 3, max: 4 },
  white_meat: { min: 2, max: 3 },
  eggs: { min: 2, max: 4 },
  dairy: { min: 2, max: 3 },
  red_meat: { min: 0, max: 1 },
  plant_based: { min: 0, max: 3 },
  mixed: { min: 0, max: 3 },
  none: { min: 0, max: 1 },
};

interface DBRecipe {
  id: string;
  name_it: string;
  category: string;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  protein_source: string;
  tags: string | null;
}

async function fetchRecipes(): Promise<Record<string, DBRecipe[]>> {
  const result = await client.execute(
    "SELECT id, name_it, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, protein_source, tags FROM recipes WHERE is_published = 1"
  );

  const all = result.rows as unknown as DBRecipe[];
  return {
    breakfast: all.filter(r => r.category === "breakfast"),
    main_course: all.filter(r => r.category === "main_course"),
    side_dish: all.filter(r => r.category === "side_dish"),
    snack: all.filter(r => r.category === "snack"),
    vegetable_side: all.filter(r => r.category === "vegetable_side"),
  };
}

function toLogicRecipe(r: DBRecipe) {
  return {
    id: r.id,
    category: r.category,
    kcalPer100g: r.kcal_per_100g,
    proteinPer100g: r.protein_per_100g,
    carbsPer100g: r.carbs_per_100g,
    fatPer100g: r.fat_per_100g,
    proteinSource: r.protein_source,
    tags: r.tags ? JSON.parse(r.tags) : null,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function generateAndAnalyze(profile: TestProfile, recipesByCategory: Record<string, DBRecipe[]>) {
  log(`\n${"=".repeat(80)}`);
  log(`PROFILE: ${profile.name} | Goal: ${profile.goal} | ${profile.targetKcal} kcal/day | Snacks: ${profile.snackPreference}`);
  log("=".repeat(80));

  const memberId = `test-v26-${profile.goal}`;
  const dailyTarget = profile.targetKcal;
  const weeklyTarget = dailyTarget * 7;

  // Delete existing plans for this temp member
  const existingPlans = await client.execute({ sql: "SELECT id FROM meal_plans WHERE family_member_id = ?", args: [memberId] });
  for (const p of existingPlans.rows) {
    await client.execute({ sql: "DELETE FROM planned_meals WHERE meal_plan_id = ?", args: [p.id as string] });
    await client.execute({ sql: "DELETE FROM meal_plans WHERE id = ?", args: [p.id as string] });
  }

  // Create meal plan
  const planId = randomUUID();
  await client.execute({
    sql: "INSERT INTO meal_plans (id, user_id, family_member_id, week_start, target_kcal_weekly, actual_kcal_weekly, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: [planId, TEMP_USER_ID, memberId, Date.now(), weeklyTarget, 0, "active", Date.now(), Date.now()],
  });

  // Get meal distribution
  const distribution = MEAL_DISTRIBUTION[profile.snackPreference];

  // Initialize protein tracker
  const proteinTracker: Record<string, { min: number; max: number; current: number }> = {};
  for (const [k, v] of Object.entries(WEEKLY_PROTEIN_TARGETS)) {
    proteinTracker[k] = { ...v, current: 0 };
  }

  const recentlyUsed: Record<string, string[]> = { breakfast: [], main_course: [], snack: [] };
  const recentVegSideIds: string[] = [];

  const sides = recipesByCategory.side_dish.map(toLogicRecipe);
  const vegSides = recipesByCategory.vegetable_side;

  let totalKcal = 0;
  const allMeals: any[] = [];

  for (let day = 1; day <= 7; day++) {
    for (const slot of distribution) {
      const mealType = slot.type;
      const targetKcal = Math.round(dailyTarget * slot.ratio);

      let category: string;
      if (mealType === "breakfast") category = "breakfast";
      else if (mealType === "snack_am" || mealType === "snack_pm") category = "snack";
      else category = "main_course";

      const candidates = recipesByCategory[category] ?? [];
      if (candidates.length === 0) continue;

      const recent = recentlyUsed[category] ?? [];
      const available = candidates.filter(r => !recent.includes(r.id));
      const pool = available.length > 0 ? available : candidates;

      // For main meals: prioritize protein sources under min
      let selectedRecipe: DBRecipe;
      if (category === "main_course") {
        const underMin = pool.filter(r => {
          const ps = r.protein_source;
          const t = proteinTracker[ps];
          return t && t.current < t.min;
        });
        const notOverMax = pool.filter(r => {
          const ps = r.protein_source;
          const t = proteinTracker[ps];
          return !t || t.current < t.max;
        });
        const prioritized = underMin.length > 0 ? underMin : (notOverMax.length > 0 ? notOverMax : pool);
        selectedRecipe = shuffle(prioritized)[0];
      } else {
        selectedRecipe = shuffle(pool)[0];
      }

      // Track recent
      recentlyUsed[category] = [selectedRecipe.id, ...recent].slice(0, 6);

      // Track protein source
      const ps = selectedRecipe.protein_source;
      if (proteinTracker[ps]) proteinTracker[ps].current++;

      // Calculate meal composition (side dishes for gap fill)
      const composition = calculateMealComposition(
        targetKcal,
        dailyTarget,
        toLogicRecipe(selectedRecipe),
        sides,
        category === "main_course",
        { lastSideId: null },
      );

      // Harvard Plate: veg side for lunch/dinner
      let vegSideId: string | null = null;
      let vegSideGrams: number | null = null;
      let vegSideKcal: number | null = null;

      const isMainMeal = mealType === "lunch" || mealType === "dinner";
      const tags = selectedRecipe.tags ? JSON.parse(selectedRecipe.tags) : [];
      const isVegHeavy = tags.includes("vegetable_heavy");

      if (isMainMeal && !isVegHeavy && vegSides.length > 0) {
        const availableVeg = vegSides.filter(v => !recentVegSideIds.includes(v.id));
        const vegPool = availableVeg.length > 0 ? availableVeg : vegSides;
        const veg = vegPool[Math.floor(Math.random() * vegPool.length)];

        vegSideId = veg.id;
        vegSideGrams = 150;
        vegSideKcal = Math.round((150 / 100) * veg.kcal_per_100g);

        recentVegSideIds.push(veg.id);
        if (recentVegSideIds.length > 4) recentVegSideIds.shift();
      }

      const mealId = randomUUID();
      const mealTotalKcal = composition.mainKcal + (composition.sideKcal ?? 0) + (composition.side2Kcal ?? 0) + (vegSideKcal ?? 0);

      // Insert meal
      await client.execute({
        sql: `INSERT INTO planned_meals (id, meal_plan_id, recipe_id, day, meal_type, portion_grams, portion_kcal,
              side_recipe_id, side_portion_grams, side_portion_kcal,
              side2_recipe_id, side2_portion_grams, side2_portion_kcal,
              veg_side_recipe_id, veg_side_portion_grams, veg_side_portion_kcal,
              is_completed, is_skipped, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          mealId, planId, selectedRecipe.id, day, mealType,
          composition.mainGrams, composition.mainKcal,
          composition.sideRecipeId, composition.sideGrams, composition.sideKcal,
          composition.side2RecipeId, composition.side2Grams, composition.side2Kcal,
          vegSideId, vegSideGrams, vegSideKcal,
          0, 0, Date.now(),
        ],
      });

      totalKcal += mealTotalKcal;

      allMeals.push({
        day, mealType,
        recipeName: selectedRecipe.name_it,
        proteinSource: selectedRecipe.protein_source,
        mainGrams: composition.mainGrams,
        mainKcal: composition.mainKcal,
        sideKcal: composition.sideKcal,
        side2Kcal: composition.side2Kcal,
        vegSideKcal,
        vegSideId,
        isVegHeavy,
        mealTotal: mealTotalKcal,
      });
    }
  }

  // Update actual kcal
  await client.execute({ sql: "UPDATE meal_plans SET actual_kcal_weekly = ? WHERE id = ?", args: [totalKcal, planId] });

  // ── ANALYZE RESULTS ──
  log(`\n📊 Weekly: target=${weeklyTarget}, actual=${totalKcal}, deviation=${Math.abs(totalKcal - weeklyTarget)} kcal (${((Math.abs(totalKcal - weeklyTarget) / weeklyTarget) * 100).toFixed(1)}%)`);
  log(`📅 ${allMeals.length} meals generated\n`);

  let vegSideCount = 0, vegHeavyCount = 0, vegMissing = 0, mainCount = 0;

  for (const m of allMeals) {
    const isMain = m.mealType === "lunch" || m.mealType === "dinner";
    if (isMain) {
      mainCount++;
      if (m.isVegHeavy) vegHeavyCount++;
      else if (m.vegSideId) vegSideCount++;
      else vegMissing++;
    }

    let extras = "";
    if (m.sideKcal) extras += ` +side:${m.sideKcal}kcal`;
    if (m.side2Kcal) extras += ` +side2:${m.side2Kcal}kcal`;
    if (m.vegSideKcal) extras += ` +🥦${m.vegSideKcal}kcal`;
    if (m.isVegHeavy) extras += " [VEG-HEAVY]";

    log(`  D${m.day} ${m.mealType.padEnd(10)} ${m.recipeName.padEnd(42).slice(0, 42)} ${String(m.mainGrams).padStart(4)}g ${String(m.mainKcal).padStart(4)}kcal [${m.proteinSource}]${extras}`);
  }

  // Harvard Plate
  const harvardPass = vegMissing === 0;
  log(`\n${harvardPass ? "✅" : "⚠️"} Harvard Plate: ${vegSideCount}/${mainCount} with veg side, ${vegHeavyCount} veg-heavy, ${vegMissing} missing`);

  // Protein quotas
  log("\n🥩 Protein Quota Check (all sources):");
  let quotaIssues = 0;
  for (const [source, tracker] of Object.entries(proteinTracker)) {
    const { min, max, current } = tracker;
    const ok = current >= min && current <= max;
    if (!ok) quotaIssues++;
    const status = ok ? "✅" : (current < min ? "⬇️" : "⬆️");
    log(`  ${status} ${source.padEnd(15)}: ${current}x (target: ${min}-${max})`);
  }
  log(`  ${quotaIssues === 0 ? "✅" : "⚠️"} Quota violations: ${quotaIssues}`);

  return { harvardPass, quotaIssues, deviation: Math.abs(totalKcal - weeklyTarget) };
}

async function main() {
  log("🧪 Algorithm v2.6 — Full E2E Verification");
  log(`📅 ${new Date().toISOString()}\n`);

  const recipes = await fetchRecipes();
  log(`📋 Recipes loaded: breakfast=${recipes.breakfast.length}, main=${recipes.main_course.length}, sides=${recipes.side_dish.length}, vegSides=${recipes.vegetable_side.length}, snacks=${recipes.snack.length}\n`);

  // Ensure temp user exists
  const existing = await client.execute({ sql: "SELECT id FROM users WHERE id = ?", args: [TEMP_USER_ID] });
  if (existing.rows.length === 0) {
    await client.execute({
      sql: "INSERT INTO users (id, email, display_name, locale, is_premium, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [TEMP_USER_ID, "test-v26@test.com", "Test v2.6", "it", 0, Date.now(), Date.now()],
    });
  }

  // Create temp members
  for (const p of profiles) {
    const id = `test-v26-${p.goal}`;
    await client.execute({ sql: "DELETE FROM meal_plans WHERE family_member_id = ?", args: [id] });
    await client.execute({ sql: "DELETE FROM family_members WHERE id = ?", args: [id] });
    await client.execute({
      sql: `INSERT INTO family_members (id, user_id, name, is_primary, birth_year, sex, height_cm, weight_kg, activity_level, goal, calorie_adjustment, tdee, target_kcal, snacks_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, TEMP_USER_ID, p.name, 0, 1990, "male", 178, p.weightKg, "moderate", p.goal, 0, p.targetKcal, p.targetKcal, p.snackPreference !== "none" ? 1 : 0, Date.now(), Date.now()],
    });
  }

  // Generate and analyze
  const results: { profile: string; harvard: boolean; quotaIssues: number; deviation: number }[] = [];
  for (const p of profiles) {
    const r = await generateAndAnalyze(p, recipes);
    results.push({ profile: p.name, harvard: r.harvardPass, quotaIssues: r.quotaIssues, deviation: r.deviation });
  }

  // Summary
  log(`\n${"═".repeat(80)}`);
  log("SUMMARY");
  log("═".repeat(80));
  for (const r of results) {
    log(`  ${r.harvard && r.quotaIssues === 0 ? "✅" : "⚠️"} ${r.profile.padEnd(15)}: Harvard=${r.harvard ? "PASS" : "FAIL"}, QuotaIssues=${r.quotaIssues}, Deviation=${r.deviation}kcal`);
  }

  // Cleanup temp data
  log("\n🧹 Cleaning up temp data...");
  for (const p of profiles) {
    const id = `test-v26-${p.goal}`;
    await client.execute({ sql: "DELETE FROM meal_plans WHERE family_member_id = ?", args: [id] });
    await client.execute({ sql: "DELETE FROM family_members WHERE id = ?", args: [id] });
  }
  await client.execute({ sql: "DELETE FROM users WHERE id = ?", args: [TEMP_USER_ID] });
  log("✅ Cleanup complete");

  writeFileSync("/tmp/verify-algorithm.txt", out.join("\n"));
  console.log("\n📄 Full report: /tmp/verify-algorithm.txt");
}

main().catch(console.error);
