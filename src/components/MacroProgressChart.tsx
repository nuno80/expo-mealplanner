
import type { DailyProgress } from "@/services/mealPlan.service";
import { Text, View } from "react-native";

interface MacroProgressChartProps {
  daily: DailyProgress[];
  targetKcalDaily: number;
}

const DAY_LABELS = ["L", "M", "M", "G", "V", "S", "D"];

// Macro colors
const COLORS = {
  protein: "#10B981", // green
  carbs: "#F59E0B", // amber
  fat: "#EF4444", // red
  empty: "#E5E7EB", // gray-200
};

/**
 * Stacked bar chart showing daily macro consumption.
 * Each day shows protein/carbs/fat as stacked colored segments.
 */
export function MacroProgressChart({
  daily,
  targetKcalDaily,
}: MacroProgressChartProps) {
  // Find max kcal for scaling (use target or max actual, whichever is higher)
  const maxKcal = Math.max(targetKcalDaily, ...daily.map((d) => d.kcal));

  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm border border-ui-100">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-bold text-ui-900">Calorie Consumate</Text>
        <Text className="text-sm text-ui-500">
          Target: {targetKcalDaily} kcal/giorno
        </Text>
      </View>

      {/* Chart */}
      <View className="flex-row justify-between items-end h-40 mb-2">
        {daily.map((day, index) => {
          const height = maxKcal > 0 ? (day.kcal / maxKcal) * 100 : 0;
          const proteinRatio = day.kcal > 0 ? (day.protein * 4) / day.kcal : 0;
          const carbsRatio = day.kcal > 0 ? (day.carbs * 4) / day.kcal : 0;
          const fatRatio = day.kcal > 0 ? (day.fat * 9) / day.kcal : 0;

          const hasData = day.completedMeals > 0;

          return (
            <View key={day.day} className="items-center flex-1">
              {/* Bar container */}
              <View
                className="w-6 rounded-t-md overflow-hidden justify-end"
                style={{ height: "100%" }}
              >
                {hasData ? (
                  <View
                    style={{
                      height: `${Math.max(height, 5)}%`,
                      justifyContent: "flex-end",
                    }}
                  >
                    {/* Fat (top) */}
                    <View
                      style={{
                        height: `${fatRatio * 100}%`,
                        backgroundColor: COLORS.fat,
                        minHeight: fatRatio > 0 ? 3 : 0,
                      }}
                    />
                    {/* Carbs (middle) */}
                    <View
                      style={{
                        height: `${carbsRatio * 100}%`,
                        backgroundColor: COLORS.carbs,
                        minHeight: carbsRatio > 0 ? 3 : 0,
                      }}
                    />
                    {/* Protein (bottom) */}
                    <View
                      style={{
                        height: `${proteinRatio * 100}%`,
                        backgroundColor: COLORS.protein,
                        minHeight: proteinRatio > 0 ? 3 : 0,
                      }}
                    />
                  </View>
                ) : (
                  <View
                    style={{
                      height: 4,
                      backgroundColor: COLORS.empty,
                      borderRadius: 2,
                    }}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Day labels */}
      <View className="flex-row justify-between">
        {daily.map((day, index) => (
          <View key={day.day} className="items-center flex-1">
            <Text className="text-xs font-medium text-ui-400">
              {DAY_LABELS[index]}
            </Text>
          </View>
        ))}
      </View>

      {/* Legend */}
      <View className="flex-row justify-center gap-6 mt-4 pt-3 border-t border-ui-100">
        <View className="flex-row items-center gap-1.5">
          <View
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.protein }}
          />
          <Text className="text-xs text-ui-600">Proteine</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.carbs }}
          />
          <Text className="text-xs text-ui-600">Carboidrati</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.fat }}
          />
          <Text className="text-xs text-ui-600">Grassi</Text>
        </View>
      </View>
    </View>
  );
}
