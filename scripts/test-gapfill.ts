/**
 * Unit test per verificare la logica Gap Fill
 * Esegui con: npx tsx scripts/test-gapfill.ts
 */

import { calculateMealComposition, type LogicRecipe } from "../src/services/mealPlan.logic";

// Mock ricette per testing
const highProteinLowCarb: LogicRecipe = {
  id: "test-chicken",
  category: "main_course",
  kcalPer100g: 165,
  proteinPer100g: 31, // ALTO (>15)
  carbsPer100g: 0,    // BASSO (<10)
  fatPer100g: 3.6,
};

const balancedMeal: LogicRecipe = {
  id: "test-legumes",
  category: "main_course",
  kcalPer100g: 150,
  proteinPer100g: 8,  // MEDIO (<15)
  carbsPer100g: 15,   // MEDIO (>10)
  fatPer100g: 5,
};

const sideDishes: LogicRecipe[] = [
  {
    id: "test-bread",
    category: "side_dish",
    kcalPer100g: 250,
    proteinPer100g: 8,
    carbsPer100g: 45,
    fatPer100g: 3,
  },
  {
    id: "test-rice",
    category: "side_dish",
    kcalPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28,
    fatPer100g: 0.3,
  },
];

const targetKcal = 560; // Tipico target pranzo/cena

console.log("═══════════════════════════════════════════");
console.log("      TEST: NutriPlanIT Gap Fill Logic     ");
console.log("═══════════════════════════════════════════\n");

// TEST 1: High Protein + Low Carb → SHOULD trigger side dish
console.log("📋 TEST 1: Petto di pollo (P:31g, C:0g)");
console.log("   Aspettato: ✅ Side dish aggiunto");

const result1 = calculateMealComposition(
  targetKcal,
  highProteinLowCarb,
  sideDishes,
  true // isMainMeal
);

const test1Pass = result1.sideRecipeId !== null;
console.log(`   Risultato: ${test1Pass ? "✅" : "❌"} Side: ${result1.sideRecipeId ? "AGGIUNTO" : "NESSUNO"}`);
if (result1.sideRecipeId) {
  console.log(`   → Main: ${result1.mainGrams}g (${result1.mainKcal} kcal)`);
  console.log(`   → Side: ${result1.sideGrams}g (${result1.sideKcal} kcal)`);
  console.log(`   → Totale: ${result1.mainKcal + (result1.sideKcal ?? 0)} kcal (target: ${targetKcal})`);
}
console.log();

// TEST 2: Balanced meal → SHOULD NOT trigger side dish
console.log("📋 TEST 2: Insalata di legumi (P:8g, C:15g)");
console.log("   Aspettato: ❌ Nessun side dish");

const result2 = calculateMealComposition(
  targetKcal,
  balancedMeal,
  sideDishes,
  true // isMainMeal
);

const test2Pass = result2.sideRecipeId === null;
console.log(`   Risultato: ${test2Pass ? "✅" : "❌"} Side: ${result2.sideRecipeId ? "AGGIUNTO (ERRORE!)" : "NESSUNO"}`);
console.log(`   → Main: ${result2.mainGrams}g (${result2.mainKcal} kcal)`);
console.log();

// TEST 2B: Low density meal (salad/tofu) → SHOULD trigger side dish
console.log("📋 TEST 2B: Insalata greca (95 kcal/100g - bassa densità)");
console.log("   Aspettato: ✅ Side dish aggiunto (porzione altrimenti troppo grande)");

const lowDensityMeal: LogicRecipe = {
  id: "test-salad",
  category: "main_course",
  kcalPer100g: 95,  // BASSA DENSITÀ (<120)
  proteinPer100g: 4.1,
  carbsPer100g: 4.8,
  fatPer100g: 7.2,
};

const result2b = calculateMealComposition(
  targetKcal,
  lowDensityMeal,
  sideDishes,
  true
);

const test2bPass = result2b.sideRecipeId !== null;
console.log(`   Risultato: ${test2bPass ? "✅" : "❌"} Side: ${result2b.sideRecipeId ? "AGGIUNTO" : "NESSUNO"}`);
if (result2b.sideRecipeId) {
  console.log(`   → Main: ${result2b.mainGrams}g (${result2b.mainKcal} kcal)`);
  console.log(`   → Side: ${result2b.sideGrams}g (${result2b.sideKcal} kcal)`);
  console.log(`   → Totale: ${result2b.mainKcal + (result2b.sideKcal ?? 0)} kcal (target: ${targetKcal})`);
  console.log(`   → Porzione main: ${result2b.mainGrams}g vs senza side: ${Math.round(targetKcal / 95 * 100)}g`);
}
console.log();
console.log("📋 TEST 3: Fallback (nessun side dish disponibile)");
console.log("   Aspettato: ✅ Nessun crash, main = 100% target");

const result3 = calculateMealComposition(
  targetKcal,
  highProteinLowCarb,
  [], // Empty sides array
  true
);

const test3Pass = result3.sideRecipeId === null && result3.mainKcal === targetKcal;
console.log(`   Risultato: ${test3Pass ? "✅" : "❌"} Main: ${result3.mainKcal} kcal (target: ${targetKcal})`);
console.log();

// TEST 4: Breakfast (not main meal) → Should not trigger
console.log("📋 TEST 4: Colazione (isMainMeal=false)");
console.log("   Aspettato: ❌ Nessun side dish (solo pranzo/cena)");

const result4 = calculateMealComposition(
  targetKcal,
  highProteinLowCarb,
  sideDishes,
  false // isMainMeal = false
);

const test4Pass = result4.sideRecipeId === null;
console.log(`   Risultato: ${test4Pass ? "✅" : "❌"} Side: ${result4.sideRecipeId ? "AGGIUNTO (ERRORE!)" : "NESSUNO"}`);
console.log();

// SUMMARY
console.log("═══════════════════════════════════════════");
const allPassed = test1Pass && test2Pass && test2bPass && test3Pass && test4Pass;
console.log(`RISULTATO FINALE: ${allPassed ? "✅ TUTTI I TEST PASSATI" : "❌ ALCUNI TEST FALLITI"}`);
console.log("═══════════════════════════════════════════");

process.exit(allPassed ? 0 : 1);
