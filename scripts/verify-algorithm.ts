/**
 * Algorithm v2.6 Verification Script
 * Tests meal plan generation across Cut/Maintain/Bulk profiles.
 * Creates temp family member, generates plans, validates, then cleans up.
 *
 * Usage: npx tsx scripts/verify-algorithm.ts
 * Output: /tmp/verify-algorithm.txt
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import { writeFileSync } from "fs";

dotenv.config({ path: "recipe-manager/.env" });
dotenv.config({ path: "apps/algorithm-playground/.env.local" });

const url = process.env.TURSO_DATABASE_URL ?? process.env.VITE_TURSO_URL;
const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.VITE_TURSO_TOKEN;
if (!url) { console.error("No Turso URL"); process.exit(1); }

const client = createClient({ url, authToken });
const out: string[] = [];
const log = (msg: string) => { console.log(msg); out.push(msg); };

const TEMP_USER_ID = "00000000-0000-0000-0000-000000000099";
const TEMP_MEMBER_PREFIX = "test-v26-";

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

async function createTempUser() {
  // Check if temp user exists
  const existing = await client.execute({ sql: "SELECT id FROM users WHERE id = ?", args: [TEMP_USER_ID] });
  if (existing.rows.length === 0) {
    await client.execute({
      sql: "INSERT INTO users (id, email, display_name, locale, is_premium, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [TEMP_USER_ID, "test-v26@test.com", "Test v2.6", "it", 0, Date.now(), Date.now()],
    });
    log("Created temp user");
  }
}

async function createTempMember(profile: TestProfile): Promise<string> {
  const id = `${TEMP_MEMBER_PREFIX}${profile.goal}`;
  // Delete existing
  await client.execute({ sql: "DELETE FROM family_members WHERE id = ?", args: [id] });

  await client.execute({
    sql: `INSERT INTO family_members (id, user_id, name, is_primary, birth_year, sex, height_cm, weight_kg, activity_level, goal, calorie_adjustment, tdee, target_kcal, snacks_enabled, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, TEMP_USER_ID, profile.name, 0, 1990, "male", 178, profile.weightKg, "moderate", profile.goal, 0, profile.targetKcal, profile.targetKcal, profile.snackPreference !== "none" ? 1 : 0, Date.now(), Date.now()],
  });
  return id;
}

async function analyzeGeneratedPlan(memberId: string, profile: TestProfile) {
  log(`\n${"=".repeat(70)}`);
  log(`PROFILE: ${profile.name} | Goal: ${profile.goal} | Target: ${profile.targetKcal} kcal/day | Snacks: ${profile.snackPreference}`);
  log("=".repeat(70));

  // Find the meal plan
  const plans = await client.execute({
    sql: "SELECT id, target_kcal_weekly, actual_kcal_weekly FROM meal_plans WHERE family_member_id = ? ORDER BY created_at DESC LIMIT 1",
    args: [memberId],
  });

  if (plans.rows.length === 0) {
    log("  ❌ No meal plan found!");
    return;
  }

  const plan = plans.rows[0];
  log(`\n📊 Plan: target=${plan.target_kcal_weekly} kcal/week, actual=${plan.actual_kcal_weekly} kcal/week`);
  const weeklyDeviation = Math.abs((plan.actual_kcal_weekly as number) - (plan.target_kcal_weekly as number));
  const devPct = ((weeklyDeviation / (plan.target_kcal_weekly as number)) * 100).toFixed(1);
  log(`   Deviation: ${weeklyDeviation} kcal (${devPct}%)`);

  // Get all meals
  const meals = await client.execute({
    sql: `SELECT pm.day, pm.meal_type, pm.portion_grams, pm.portion_kcal,
                 pm.side_recipe_id, pm.side_portion_grams, pm.side_portion_kcal,
                 pm.side2_recipe_id, pm.side2_portion_grams, pm.side2_portion_kcal,
                 pm.veg_side_recipe_id, pm.veg_side_portion_grams, pm.veg_side_portion_kcal,
                 r.name_it as recipe_name, r.category, r.protein_source, r.tags,
                 r.kcal_per_100g
          FROM planned_meals pm
          JOIN recipes r ON pm.recipe_id = r.id
          WHERE pm.meal_plan_id = ?
          ORDER BY pm.day, CASE pm.meal_type
            WHEN 'breakfast' THEN 1
            WHEN 'snack_am' THEN 2
            WHEN 'lunch' THEN 3
            WHEN 'snack_pm' THEN 4
            WHEN 'dinner' THEN 5
          END`,
    args: [plan.id as string],
  });

  // Analyze meals by day
  log(`\n📅 Meal Schedule (${meals.rows.length} meals):`);

  let totalKcal = 0;
  const proteinSources: Record<string, number> = {};
  let vegSideCount = 0;
  let mainMealCount = 0;
  let vegHeavyMainCount = 0;
  let vegSideMissing = 0;

  for (const m of meals.rows) {
    const mainKcal = m.portion_kcal as number;
    const sideKcal = (m.side_portion_kcal as number) || 0;
    const side2Kcal = (m.side2_portion_kcal as number) || 0;
    const vegKcal = (m.veg_side_portion_kcal as number) || 0;
    const mealTotal = mainKcal + sideKcal + side2Kcal + vegKcal;
    totalKcal += mealTotal;

    const ps = m.protein_source as string;
    proteinSources[ps] = (proteinSources[ps] || 0) + 1;

    const mealType = m.meal_type as string;
    const isMainMeal = mealType === "lunch" || mealType === "dinner";

    // Veg side tracking
    if (isMainMeal) {
      mainMealCount++;
      const tags = m.tags ? JSON.parse(m.tags as string) : [];
      const isVegHeavy = tags.includes("vegetable_heavy");

      if (isVegHeavy) {
        vegHeavyMainCount++;
      } else if (m.veg_side_recipe_id) {
        vegSideCount++;
      } else {
        vegSideMissing++;
      }
    }

    // Get veg side name if present
    let vegInfo = "";
    if (m.veg_side_recipe_id) {
      const vr = await client.execute({ sql: "SELECT name_it FROM recipes WHERE id = ?", args: [m.veg_side_recipe_id as string] });
      vegInfo = ` + 🥦${m.veg_side_portion_grams}g ${vr.rows[0]?.name_it ?? "?"}`;
    }

    let sideInfo = "";
    if (m.side_recipe_id) {
      const sr = await client.execute({ sql: "SELECT name_it FROM recipes WHERE id = ?", args: [m.side_recipe_id as string] });
      sideInfo = ` + ${m.side_portion_grams}g ${sr.rows[0]?.name_it ?? "?"}`;
    }

    log(`  D${m.day} ${String(mealType).padEnd(10)} ${String(m.recipe_name).padEnd(40).slice(0, 40)} ${String(m.portion_grams).padStart(4)}g ${String(mainKcal).padStart(4)}kcal [${ps}]${sideInfo}${vegInfo}`);
  }

  // Summary
  log(`\n📊 Totals:`);
  log(`  Total kcal calculated: ${totalKcal}`);
  log(`  Main meals (lunch+dinner): ${mainMealCount}`);
  log(`  With veg side: ${vegSideCount} | Veg-heavy (no side needed): ${vegHeavyMainCount} | Missing veg side: ${vegSideMissing}`);

  // Harvard Plate validation
  const harvardOk = vegSideMissing === 0;
  log(`\n${harvardOk ? "✅" : "⚠️"} Harvard Plate: ${harvardOk ? "PASS" : "FAIL"} (${vegSideMissing} main meals without vegetable side or vegetable_heavy tag)`);

  // Protein rotation
  log(`\n🥩 Protein Source Distribution:`);
  const sorted = Object.entries(proteinSources).sort((a, b) => b[1] - a[1]);
  for (const [source, count] of sorted) {
    log(`  ${source.padEnd(15)}: ${count}x`);
  }

  // Check protein quotas (approximate — only main_course counts for strict quota)
  const mainProtein: Record<string, number> = {};
  for (const m of meals.rows) {
    if ((m.meal_type as string) === "lunch" || (m.meal_type as string) === "dinner") {
      const ps = m.protein_source as string;
      mainProtein[ps] = (mainProtein[ps] || 0) + 1;
    }
  }

  const quotas: Record<string, [number, number]> = {
    legumes: [3, 5], fish: [3, 4], white_meat: [2, 3], eggs: [2, 4],
    dairy: [2, 3], red_meat: [0, 1], plant_based: [0, 3], mixed: [0, 3], none: [0, 1],
  };

  log(`\n🎯 Protein Quota Check (main meals only):`);
  let quotaIssues = 0;
  for (const [source, [min, max]] of Object.entries(quotas)) {
    const actual = mainProtein[source] || 0;
    const status = actual >= min && actual <= max ? "✅" : (actual < min ? "⬇️" : "⬆️");
    if (actual < min || actual > max) quotaIssues++;
    log(`  ${status} ${source.padEnd(15)}: ${actual}x (target: ${min}-${max})`);
  }
  log(`  ${quotaIssues === 0 ? "✅" : "⚠️"} Quota violations: ${quotaIssues}`);
}

async function cleanup() {
  for (const p of profiles) {
    const id = `${TEMP_MEMBER_PREFIX}${p.goal}`;
    // Delete meal plans (cascades to planned_meals)
    await client.execute({ sql: "DELETE FROM meal_plans WHERE family_member_id = ?", args: [id] });
    await client.execute({ sql: "DELETE FROM family_members WHERE id = ?", args: [id] });
  }
  await client.execute({ sql: "DELETE FROM users WHERE id = ?", args: [TEMP_USER_ID] });
  log("\n🧹 Cleanup: removed temp user and members");
}

async function main() {
  log("🧪 Algorithm v2.6 Verification\n");
  log("NOTE: This script creates temp data, generates plans via the app service,");
  log("      then analyzes results. Plans must be generated externally (app or");
  log("      by importing the service). This script only creates members and");
  log("      analyzes any existing plans.\n");

  await createTempUser();

  for (const profile of profiles) {
    const memberId = await createTempMember(profile);
    log(`\n✅ Created temp member: ${profile.name} (${memberId})`);
  }

  log("\n" + "─".repeat(70));
  log("⚠️  IMPORTANT: Now generate meal plans for these members from the app.");
  log("   Family members created:");
  for (const p of profiles) {
    log(`   - ${p.name}: ${TEMP_MEMBER_PREFIX}${p.goal} (${p.targetKcal} kcal, ${p.snackPreference} snack)`);
  }
  log("─".repeat(70));

  // Check if any plans already exist and analyze them
  for (const profile of profiles) {
    const memberId = `${TEMP_MEMBER_PREFIX}${profile.goal}`;
    const plans = await client.execute({
      sql: "SELECT id FROM meal_plans WHERE family_member_id = ? LIMIT 1",
      args: [memberId],
    });
    if (plans.rows.length > 0) {
      await analyzeGeneratedPlan(memberId, profile);
    } else {
      log(`\n⏳ No plan yet for ${profile.name} — generate via app then re-run this script.`);
    }
  }

  writeFileSync("/tmp/verify-algorithm.txt", out.join("\n"));
  console.log("\n📄 Full output: /tmp/verify-algorithm.txt");
}

main().catch(console.error);
