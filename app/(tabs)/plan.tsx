import { MealCard } from "@/components/MealCard";
import { ProgressBar } from "@/components/ProgressRing";
import {
  getWeekStart,
  useDeleteMealPlanForWeek,
  useGenerateMealPlan,
  useMealPlan,
  useMealPlanStatus,
  useToggleSnackForDay,
} from "@/hooks/useMealPlan";
import type { MealType, PlannedMealWithRecipe } from "@/schemas/mealPlan";
import { useFamilyStore } from "@/stores/familyStore";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DAY_NAMES = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];
const MEAL_ORDER: MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack_am",
  "snack_pm",
];

function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  const startMonth = weekStart.toLocaleDateString("it-IT", { month: "short" });
  const endMonth = weekEnd.toLocaleDateString("it-IT", { month: "short" });

  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

export default function PlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = getWeekStart(weekOffset);
  const { selectedMemberId } = useFamilyStore();

  const { data: mealPlan, isLoading } = useMealPlan(
    selectedMemberId ?? undefined,
    weekStart,
  );
  const { data: planStatus } = useMealPlanStatus(
    selectedMemberId ?? undefined,
    weekStart,
  );

  const toggleSnack = useToggleSnackForDay();

  const handleDayOptions = useCallback((day: number, hasSnacks: boolean) => {
    if (!mealPlan?.id) return;

    Alert.alert(
      "Opzioni Giorno",
      "Gestisci i pasti per questo giorno",
      [
        {
          text: hasSnacks ? "Rimuovi Spuntini" : "Ripristina Spuntini",
          onPress: () => toggleSnack.mutate({
            mealPlanId: mealPlan.id,
            day,
            enabled: !hasSnacks
          }),
          style: hasSnacks ? "destructive" : "default"
        },
        { text: "Annulla", style: "cancel" }
      ]
    );
  }, [mealPlan?.id, toggleSnack]);

  const generatePlan = useGenerateMealPlan();
  const deletePlan = useDeleteMealPlanForWeek();

  // Handle regenerate with confirmation
  const handleRegenerate = useCallback(() => {
    if (!selectedMemberId) return;

    const doRegenerate = async () => {
      if (planStatus?.exists) {
        await deletePlan.mutateAsync({ familyMemberId: selectedMemberId, weekStart });
      }
      generatePlan.mutate({ familyMemberId: selectedMemberId, weekStart });
    };

    if (planStatus?.exists && planStatus.completedMealsCount > 0) {
      Alert.alert(
        "Rigenerare il piano?",
        `Hai già completato ${planStatus.completedMealsCount} pasti su ${planStatus.totalMealsCount}. Rigenerando perderai questi progressi.`,
        [
          { text: "Annulla", style: "cancel" },
          { text: "Rigenera", style: "destructive", onPress: doRegenerate },
        ],
      );
    } else if (planStatus?.exists) {
      Alert.alert(
        "Rigenerare il piano?",
        "Il piano attuale verrà sostituito con uno nuovo.",
        [
          { text: "Annulla", style: "cancel" },
          { text: "Rigenera", onPress: doRegenerate },
        ],
      );
    } else {
      doRegenerate();
    }
  }, [selectedMemberId, weekStart, planStatus, deletePlan, generatePlan]);

  // Memoize meals grouped by day to avoid recalculating on every render
  const mealsByDay = useMemo(() => {
    const grouped: Record<number, PlannedMealWithRecipe[]> = {};
    mealPlan?.meals.forEach((meal) => {
      if (!grouped[meal.day]) grouped[meal.day] = [];
      grouped[meal.day].push(meal);
    });

    // Sort each day's meals by meal type order
    for (const day of Object.keys(grouped)) {
      grouped[Number(day)].sort(
        (a, b) =>
          MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType),
      );
    }
    return grouped;
  }, [mealPlan?.meals]);

  // Memoize getDayKcal callback
  const getDayKcal = useCallback(
    (day: number) =>
      mealsByDay[day]?.reduce((sum, m) => sum + m.portionKcal, 0) ?? 0,
    [mealsByDay],
  );

  const dailyTarget = mealPlan
    ? Math.round(mealPlan.targetKcalWeekly / 7)
    : 2000;

  return (
    <View className="flex-1 bg-ui-50" style={{ paddingTop: insets.top }}>
      {/* Sticky Header */}
      <View className="bg-white rounded-b-[30px] shadow-sm shadow-ui-200 z-20 pb-4 px-5 pt-2">
        <Text className="text-2xl font-bold text-ui-900 mb-4">
          Piano Settimanale
        </Text>

        <View className="bg-ui-50 rounded-2xl p-1.5 flex-row items-center justify-between border border-ui-100">
          <Pressable
            onPress={() => setWeekOffset((o) => o - 1)}
            className="w-10 h-10 bg-white rounded-xl items-center justify-center shadow-sm"
          >
            <Text className="text-ui-600 font-bold">←</Text>
          </Pressable>

          <View className="items-center">
            <Text className="text-xs font-bold text-ui-400 uppercase tracking-widest mb-0.5">
              SETTIMANA
            </Text>
            <Text className="text-base font-bold text-ui-900">
              {formatWeekRange(weekStart)}
            </Text>
          </View>

          <Pressable
            onPress={() => setWeekOffset((o) => o + 1)}
            className="w-10 h-10 bg-white rounded-xl items-center justify-center shadow-sm"
          >
            <Text className="text-ui-600 font-bold">→</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Show generate button if no plan OR if plan has no meals (broken refs) */}
        {(!mealPlan || mealPlan.meals.length === 0) && !isLoading ? (
          <View className="items-center py-10 bg-white rounded-3xl p-6 shadow-sm border border-ui-100 mt-4">
            <View className="w-20 h-20 bg-brand-50 rounded-full items-center justify-center mb-4">
              <Text className="text-3xl">📅</Text>
            </View>
            <Text className="text-xl font-bold text-ui-900 text-center mb-2">
              Pianifica la tua settimana
            </Text>
            <Text className="text-ui-500 text-center mb-6 px-4">
              Genera un menu bilanciato basato sui tuoi macro e preferenze con
              un solo tocco.
            </Text>
            <Pressable
              onPress={() => {
                if (!selectedMemberId) return;

                Alert.alert(
                  "Configura il tuo Piano",
                  "Quanti spuntini vuoi includere ogni giorno?",
                  [
                    {
                      text: "Solo pasti principali (3)",
                      onPress: () => generatePlan.mutate({
                        familyMemberId: selectedMemberId,
                        weekStart,
                        snackPreference: "none"
                      })
                    },
                    {
                      text: "1 Spuntino (Pomeriggio)",
                      onPress: () => generatePlan.mutate({
                        familyMemberId: selectedMemberId,
                        weekStart,
                        snackPreference: "one"
                      })
                    },
                    {
                      text: "2 Spuntini (Mattina & Pom.)",
                      onPress: () => generatePlan.mutate({
                        familyMemberId: selectedMemberId,
                        weekStart,
                        snackPreference: "two"
                      })
                    },
                    {
                      text: "Annulla",
                      style: "cancel"
                    }
                  ]
                );
              }}
              disabled={generatePlan.isPending || !selectedMemberId}
              className="bg-brand-500 w-full py-4 rounded-xl shadow-lg shadow-brand-500/30 active:bg-brand-600"
            >
              <Text className="text-white font-bold text-center text-lg">
                {generatePlan.isPending
                  ? "Generazione in corso..."
                  : "✨ Genera Piano Magic"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-6">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const meals = mealsByDay[day] ?? [];
              const dayKcal = getDayKcal(day);
              const dayDate = new Date(weekStart);
              dayDate.setDate(dayDate.getDate() + day - 1);
              const isOver = dayKcal > dailyTarget;

              return (
                <View key={day}>
                  {/* Day Date Header */}
                  <View className="flex-row items-end gap-3 mb-3 ml-1">
                    <Text className="text-3xl font-bold text-ui-900 leading-none">
                      {dayDate.getDate()}
                    </Text>
                    <View>
                      <Text className="text-xs font-bold text-ui-400 uppercase leading-none mb-1">
                        {DAY_NAMES[day - 1]}
                      </Text>
                      <Text className="text-sm font-medium text-ui-500 leading-none">
                        {dayDate.toLocaleDateString("it-IT", { month: "long" })}
                      </Text>
                    </View>
                    <View className="flex-1" />
                    <View className="items-end">
                      <Text
                        className={`text-xs font-bold ${isOver ? "text-red-500" : "text-brand-600"}`}
                      >
                        {dayKcal} / {dailyTarget} kcal
                      </Text>
                      <View className="w-24 mt-1">
                        <ProgressBar
                          current={dayKcal}
                          target={dailyTarget}
                          height={4}
                          showLabel={false}
                          color={isOver ? "#EF4444" : "#10B981"}
                        />
                      </View>
                    </View>

                    {/* Day Options Menu */}
                    <Pressable
                      className="p-2 -mr-2"
                      onPress={() => {
                        const hasSnacks = meals.some(m => (m.mealType === 'snack_am' || m.mealType === 'snack_pm') && !m.isSkipped);
                        handleDayOptions(day, hasSnacks);
                      }}
                    >
                      <Text className="text-ui-400 text-lg font-bold tracking-widest pl-2">•••</Text>
                    </Pressable>
                  </View>

                  {/* Meals List */}
                  <View className="gap-0">
                    {meals.map((meal) => (
                      <MealCard
                        key={meal.id}
                        meal={meal}
                        onPress={() =>
                          router.push({
                            pathname: "/(modals)/recipe-detail",
                            params: { id: meal.recipeId },
                          })
                        }
                        onSwap={() =>
                          router.push({
                            pathname: "/(modals)/meal-swap",
                            params: {
                              mealId: meal.id,
                              mealType: meal.mealType,
                              recipeName: meal.recipe.nameIt,
                            },
                          })
                        }
                      />
                    ))}
                    {meals.length === 0 && (
                      <View className="bg-ui-50 border-2 border-dashed border-ui-200 rounded-xl p-4 items-center">
                        <Text className="text-ui-400 font-medium">
                          Riposo (o digiuno?)
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View >
        )}
      </ScrollView >

      {/* Floating Action Bar */}
      {
        mealPlan && (
          <View className="absolute bottom-8 self-center flex-row gap-4 shadow-xl shadow-brand-900/10">
            <Pressable
              onPress={() => router.push("/(modals)/shopping-list")}
              className="bg-brand-500 px-6 py-3.5 rounded-full flex-row items-center gap-2"
            >
              <Text className="text-white font-bold">🛒 Lista Spesa</Text>
            </Pressable>
            <Pressable
              className="bg-white px-4 py-3.5 rounded-full border border-ui-200"
              onPress={handleRegenerate}
              disabled={generatePlan.isPending || deletePlan.isPending}
            >
              <Text className="text-xl">🔄</Text>
            </Pressable>
          </View>
        )
      }
    </View >
  );
}
