import type { MealType, PlannedMeal } from "@/types";

interface Props {
  meals: PlannedMeal[];
}

const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MEAL_ORDER: MealType[] = ["breakfast", "snack_am", "lunch", "snack_pm", "dinner"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Colazione",
  snack_am: "Snack AM",
  lunch: "Pranzo",
  snack_pm: "Snack PM",
  dinner: "Cena",
};

export function MealPlanTable({ meals }: Props) {
  // Group meals by day
  const mealsByDay: Record<number, Record<MealType, PlannedMeal | undefined>> = {};
  for (let day = 1; day <= 7; day++) {
    mealsByDay[day] = {} as Record<MealType, PlannedMeal | undefined>;
    for (const type of MEAL_ORDER) {
      mealsByDay[day][type] = meals.find((m) => m.day === day && m.mealType === type);
    }
  }

  // Find which meal types exist
  const existingMealTypes = MEAL_ORDER.filter((type) =>
    meals.some((m) => m.mealType === type)
  );

  return (
    <table className="meal-table">
      <thead>
        <tr>
          <th>Giorno</th>
          {existingMealTypes.map((type) => (
            <th key={type}>{MEAL_LABELS[type]}</th>
          ))}
          <th>Tot. kcal</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => {
          const dayMeals = mealsByDay[day];
          const totalKcal = existingMealTypes.reduce((sum, type) => {
            const meal = dayMeals[type];
            if (!meal) return sum;
            return (
              sum +
              meal.portionKcal +
              (meal.sidePortionKcal ?? 0) +
              (meal.side2PortionKcal ?? 0) +
              (meal.vegSidePortionKcal ?? 0)
            );
          }, 0);

          return (
            <tr key={day}>
              <td style={{ fontWeight: 600 }}>{DAYS[day - 1]}</td>
              {existingMealTypes.map((type) => {
                const meal = dayMeals[type];
                if (!meal) return <td key={type}>-</td>;

                return (
                  <td key={type} className="meal-cell">
                    <div className="recipe-name">{meal.recipe.nameIt}</div>
                    <div className="portion">
                      {meal.portionGrams}g • {meal.portionKcal} kcal
                    </div>
                    {meal.sideRecipe && (
                      <div className="side">
                        + {meal.sideRecipe.nameIt} ({meal.sidePortionGrams}g)
                      </div>
                    )}
                    {meal.side2Recipe && (
                      <div className="side" style={{ color: "#a8dadc" }}>
                        + {meal.side2Recipe.nameIt} ({meal.side2PortionGrams}g)
                      </div>
                    )}
                    {meal.vegSideRecipe && (
                      <div className="side" style={{ color: "#4ade80" }}>
                        🥦 {meal.vegSideRecipe.nameIt} ({meal.vegSidePortionGrams}g)
                      </div>
                    )}
                  </td>
                );
              })}
              <td style={{ fontWeight: 600, color: "#e94560" }}>{totalKcal}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
