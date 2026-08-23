import { generateMealPlan, loadRecipes, type GenerateMealPlanResult } from "@/services/mealPlanPlayground";
import type { FamilyMember } from "@/types";

interface Props {
  member: FamilyMember | null;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  onGenerate: (result: GenerateMealPlanResult) => void;
}

export function MealPlanGenerator({
  member,
  isGenerating,
  setIsGenerating,
  onGenerate,
}: Props) {
  const handleGenerate = async () => {
    if (!member) return;

    setIsGenerating(true);
    try {
      // 1. First test if we can even load recipes
      const recipes = await loadRecipes();
      if (recipes.length === 0) {
        throw new Error("No published recipes found in database. Please check your Turso connection and data.");
      }

      // 2. Week start = next Monday
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + daysUntilMonday);
      weekStart.setHours(0, 0, 0, 0);

      const result = await generateMealPlan(member, weekStart);
      onGenerate(result);
    } catch (error) {
      console.error("Generation failed:", error);
      const message = error instanceof Error ? error.message : "Network error or database unreachable.";
      alert(`Errore Generazione: ${message}\n\nControlla la console (F12) per i dettagli tecnici.`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <button
        className="primary"
        style={{ width: "100%" }}
        onClick={handleGenerate}
        disabled={!member || isGenerating}
      >
        {isGenerating ? "Generating..." : "🎲 Generate Meal Plan"}
      </button>
      {!member && (
        <p style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.5rem" }}>
          Add a family member first
        </p>
      )}
    </div>
  );
}
