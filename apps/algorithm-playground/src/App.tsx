import { useEffect, useState } from "react";
import { DebugLogPanel } from "./components/DebugLogPanel";
import { FamilyProfileForm } from "./components/FamilyProfileForm";
import { MealPlanGenerator } from "./components/MealPlanGenerator";
import { MealPlanTable } from "./components/MealPlanTable";
import { ProteinTrackerHeatmap } from "./components/ProteinTrackerHeatmap";
import { ACTIVITY_MULTIPLIERS, calculateTargetKcal, calculateTDEE, DEFAULT_CALORIE_ADJUSTMENTS } from "./lib/tdee";
import { computeKitchenDemo, loadRecipes } from "./services/mealPlanPlayground";
import type { DebugLogEntry, FamilyMember, MealPlan, ProteinTracker, Recipe } from "./types";
import { INITIAL_PROTEIN_TRACKER } from "./types";

// Default profiles for testing
const DEFAULT_PROFILES: FamilyMember[] = [
  // Armando: 1980, male, 176cm, 78kg, 2 workouts/week = light, cut
  (() => {
    const { tdee } = calculateTDEE({ sex: "male", weightKg: 78, heightCm: 176, birthYear: 1980, activityLevel: "light" });
    const targetKcal = calculateTargetKcal(tdee, DEFAULT_CALORIE_ADJUSTMENTS.cut);
    return {
      id: "armando-default",
      name: "Armando",
      sex: "male" as const,
      birthYear: 1980,
      heightCm: 176,
      weightKg: 78,
      activityLevel: "light" as const,
      goal: "cut" as const,
      calorieAdjustment: DEFAULT_CALORIE_ADJUSTMENTS.cut,
      tdee,
      targetKcal,
      snacksEnabled: false,
    };
  })(),
  // Maria: 1982, female, 156cm, 50kg, 4 workouts/week = moderate, cut
  (() => {
    const { tdee } = calculateTDEE({ sex: "female", weightKg: 50, heightCm: 156, birthYear: 1982, activityLevel: "moderate" });
    const targetKcal = calculateTargetKcal(tdee, DEFAULT_CALORIE_ADJUSTMENTS.cut);
    return {
      id: "maria-default",
      name: "Maria",
      sex: "female" as const,
      birthYear: 1982,
      heightCm: 156,
      weightKg: 50,
      activityLevel: "moderate" as const,
      goal: "cut" as const,
      calorieAdjustment: DEFAULT_CALORIE_ADJUSTMENTS.cut,
      tdee,
      targetKcal,
      snacksEnabled: false,
    };
  })(),
  // Federico: 2008, male, 177cm, 67kg, 8 workouts/week = very_active, bulk
  (() => {
    const { tdee } = calculateTDEE({ sex: "male", weightKg: 67, heightCm: 177, birthYear: 2008, activityLevel: "very_active" });
    const targetKcal = calculateTargetKcal(tdee, DEFAULT_CALORIE_ADJUSTMENTS.bulk);
    return {
      id: "federico-default",
      name: "Federico",
      sex: "male" as const,
      birthYear: 2008,
      heightCm: 177,
      weightKg: 67,
      activityLevel: "very_active" as const,
      goal: "bulk" as const,
      calorieAdjustment: DEFAULT_CALORIE_ADJUSTMENTS.bulk,
      tdee,
      targetKcal,
      snacksEnabled: true, // Bulk = snacks enabled
    };
  })(),
];

function App() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(DEFAULT_PROFILES);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(DEFAULT_PROFILES[0]?.id ?? null);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [proteinTracker, setProteinTracker] = useState<ProteinTracker>(INITIAL_PROTEIN_TRACKER);
  const [debugLog, setDebugLog] = useState<DebugLogEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Kitchen Demo state
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [kitchenLog, setKitchenLog] = useState<string[]>([]);
  const [isLoadingKitchen, setIsLoadingKitchen] = useState(false);

  // Load recipes on mount
  useEffect(() => {
    loadRecipes().then((r) => {
      setRecipes(r);
      if (r.length > 0) setSelectedRecipeId(r[0].id);
    });
  }, []);

  const addFamilyMember = (member: FamilyMember) => {
    setFamilyMembers((prev) => [...prev, member]);
    if (!selectedMemberId) {
      setSelectedMemberId(member.id);
    }
  };

  const selectedMember = familyMembers.find((m) => m.id === selectedMemberId) ?? null;

  return (
    <div className="app">
      <header>
        <h1>Algorithm Playground</h1>
        <span>NutriPlanIT v2.1 • Meal Plan Testing</span>
      </header>

      <main>
        <aside className="sidebar">
          <h2>Family Profiles</h2>
          <FamilyProfileForm onAdd={addFamilyMember} />

          {familyMembers.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <div className="form-group">
                <label>Select Member</label>
                <select
                  value={selectedMemberId ?? ""}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                >
                  {familyMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.targetKcal} kcal)
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected member stats */}
              {selectedMember && (
                <div className="card" style={{ marginTop: "0.5rem" }}>
                  <h3 style={{ marginBottom: "0.5rem" }}>
                    {selectedMember.name} • {selectedMember.goal.toUpperCase()}
                  </h3>
                  <p style={{ fontSize: "0.7rem", color: "#888", marginBottom: "0.5rem" }}>
                    {selectedMember.sex === "male" ? "♂" : "♀"} {new Date().getFullYear() - selectedMember.birthYear}y •
                    {selectedMember.heightCm}cm • {selectedMember.weightKg}kg •
                    {selectedMember.activityLevel.replace("_", " ")}
                  </p>
                  <div className="tdee-result">
                    <div className="tdee-item">
                      <div className="value">{Math.round(selectedMember.tdee / ACTIVITY_MULTIPLIERS[selectedMember.activityLevel])}</div>
                      <div className="label">BMR</div>
                    </div>
                    <div className="tdee-item">
                      <div className="value">{selectedMember.tdee}</div>
                      <div className="label">TDEE</div>
                    </div>
                    <div className="tdee-item">
                      <div className="value" style={{ color: selectedMember.goal === "cut" ? "#e94560" : "#4ade80" }}>
                        {selectedMember.targetKcal}
                      </div>
                      <div className="label">Target</div>
                    </div>
                    <div className="tdee-item">
                      <div className="value">
                        {Math.round(selectedMember.weightKg * (selectedMember.goal === "cut" ? 2.1 : 1.7))}g
                      </div>
                      <div className="label">Proteine</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: "1rem" }}>
            <MealPlanGenerator
              member={selectedMember}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
              onGenerate={(result) => {
                setMealPlan(result.mealPlan);
                setProteinTracker(result.proteinTracker);
                setDebugLog(result.debugLog);
              }}
            />
          </div>
        </aside>

        <section className="content">
          {/* Protein Tracker */}
          <div className="card">
            <h3>Protein Source Tracker (Weekly)</h3>
            <ProteinTrackerHeatmap tracker={proteinTracker} />
          </div>

          {/* Meal Plan */}
          {mealPlan && (
            <div className="card" style={{ flex: 1, overflow: "auto" }}>
              <h3>
                Meal Plan for {selectedMember?.name} • Week of{" "}
                {mealPlan.weekStart.toLocaleDateString()}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "#888", marginBottom: "1rem" }}>
                Target: {mealPlan.targetKcalWeekly} kcal/week • Actual:{" "}
                {mealPlan.actualKcalWeekly} kcal (
                {Math.round((mealPlan.actualKcalWeekly / mealPlan.targetKcalWeekly) * 100)}
                %)
              </p>
              <MealPlanTable meals={mealPlan.meals} />
            </div>
          )}

          {/* Kitchen Demo */}
          <div className="card">
            <h3>👨‍🍳 Kitchen Tab Demo</h3>
            <p style={{ fontSize: "0.75rem", color: "#888", marginBottom: "1rem" }}>
              Calculate raw/cooked portions for all family members
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <select
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                style={{ flex: 1 }}
              >
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nameIt} ({r.kcalPer100g} kcal/100g)
                  </option>
                ))}
              </select>
              <button
                onClick={async () => {
                  if (!selectedRecipeId) return;
                  setIsLoadingKitchen(true);
                  try {
                    const result = await computeKitchenDemo(selectedRecipeId, "lunch", 1, familyMembers);
                    setKitchenLog(result);
                  } finally {
                    setIsLoadingKitchen(false);
                  }
                }}
                disabled={isLoadingKitchen || !selectedRecipeId}
              >
                {isLoadingKitchen ? "Loading..." : "🧮 Calculate"}
              </button>
            </div>
            {kitchenLog.length > 0 && (
              <pre style={{
                background: "#1a1a2e",
                padding: "1rem",
                borderRadius: "8px",
                fontSize: "0.8rem",
                whiteSpace: "pre-wrap",
                maxHeight: "300px",
                overflow: "auto"
              }}>
                {kitchenLog.join("\n")}
              </pre>
            )}
          </div>

          {/* Debug Log */}
          {debugLog.length > 0 && (
            <div className="card">
              <h3>Debug Log ({debugLog.length} entries)</h3>
              <DebugLogPanel entries={debugLog} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
