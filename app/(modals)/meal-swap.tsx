import {
  useSwapAlternatives,
  useSwapMeal,
  useSwapMealRandom,
} from "@/hooks/useMealPlan";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Meal Swap Modal - Two modes: Random or Manual selection.
 *
 * F2: Redesigned with:
 * - 🎲 Random swap button (immediate replacement)
 * - 📋 Manual selection from filtered list
 */
export default function MealSwapModal() {
  const insets = useSafeAreaInsets();
  const { mealId, mealType, recipeName } = useLocalSearchParams<{
    mealId: string;
    mealType?: string;
    recipeName?: string;
  }>();

  const [showList, setShowList] = useState(false);

  const swapMeal = useSwapMeal();
  const swapRandom = useSwapMealRandom();
  const { data: alternatives, isLoading } = useSwapAlternatives(
    showList ? mealId : undefined,
    { similarKcal: true },
  );

  // Get meal type label
  const mealTypeLabels: Record<string, string> = {
    breakfast: "Colazione",
    lunch: "Pranzo",
    dinner: "Cena",
    snack_am: "Snack mattina",
    snack_pm: "Snack pomeriggio",
  };
  const mealLabel = mealTypeLabels[mealType ?? ""] ?? "Pasto";

  const handleRandomSwap = async () => {
    if (!mealId) return;

    try {
      await swapRandom.mutateAsync(mealId);
      router.back();
    } catch (error) {
      console.error("Failed to random swap meal:", error);
    }
  };

  const handleManualSwap = async (recipeId: string) => {
    if (!mealId) return;

    try {
      await swapMeal.mutateAsync({
        plannedMealId: mealId,
        newRecipeId: recipeId,
      });
      router.back();
    } catch (error) {
      console.error("Failed to swap meal:", error);
    }
  };

  const isPending = swapMeal.isPending || swapRandom.isPending;

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-5 pb-4 border-b border-ui-100"
        style={{ paddingTop: insets.top + 10 }}
      >
        <Pressable onPress={() => router.back()} className="p-1">
          <Text className="text-xl text-ui-600">✕</Text>
        </Pressable>
        <Text className="text-lg font-bold text-ui-900">
          Sostituisci {mealLabel}
        </Text>
        <View className="w-8" />
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Current recipe info */}
        {recipeName && (
          <View className="bg-ui-50 rounded-2xl p-4 mb-6 border border-ui-100">
            <Text className="text-xs font-bold text-ui-400 uppercase tracking-wider mb-1">
              Pasto attuale
            </Text>
            <Text className="text-base font-semibold text-ui-900">
              {recipeName}
            </Text>
          </View>
        )}

        {/* Mode selection - only show if list not expanded */}
        {!showList && (
          <View className="gap-4">
            {/* Random swap button */}
            <Pressable
              onPress={handleRandomSwap}
              disabled={isPending}
              className="bg-brand-500 rounded-2xl p-5 items-center shadow-lg shadow-brand-500/20 active:bg-brand-600"
            >
              {swapRandom.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text className="text-3xl mb-2">🎲</Text>
                  <Text className="text-lg font-bold text-white">
                    Alternativa Casuale
                  </Text>
                  <Text className="text-sm text-white/80 mt-1">
                    Sostituisce subito con una ricetta simile
                  </Text>
                </>
              )}
            </Pressable>

            {/* Manual selection button */}
            <Pressable
              onPress={() => setShowList(true)}
              disabled={isPending}
              className="bg-white border-2 border-ui-200 rounded-2xl p-5 items-center active:bg-ui-50"
            >
              <Text className="text-3xl mb-2">📋</Text>
              <Text className="text-lg font-bold text-ui-900">
                Scegli dalla Lista
              </Text>
              <Text className="text-sm text-ui-500 mt-1">
                Sfoglia le alternative disponibili
              </Text>
            </Pressable>
          </View>
        )}

        {/* Manual selection list */}
        {showList && (
          <View className="gap-3">
            {/* Back to mode selection */}
            <Pressable
              onPress={() => setShowList(false)}
              className="flex-row items-center gap-2 mb-2"
            >
              <Text className="text-brand-500">←</Text>
              <Text className="text-brand-500 font-medium">
                Torna alle opzioni
              </Text>
            </Pressable>

            <Text className="text-sm text-ui-500 mb-2">
              Seleziona un'alternativa (ordinate per kcal simili):
            </Text>

            {isLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator size="large" color="#f97316" />
                <Text className="text-ui-400 mt-3">Caricamento alternative...</Text>
              </View>
            ) : !alternatives || alternatives.length === 0 ? (
              <View className="items-center py-10 bg-ui-50 rounded-2xl">
                <Text className="text-3xl mb-2">🤷</Text>
                <Text className="text-ui-500 font-medium">
                  Nessuna alternativa disponibile
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {alternatives.map((recipe) => (
                  <Pressable
                    key={recipe.id}
                    onPress={() => handleManualSwap(recipe.id)}
                    disabled={isPending}
                    className="flex-row items-center bg-ui-50 rounded-xl p-3 border border-ui-100 active:bg-ui-100"
                  >
                    {/* Image */}
                    <View className="w-16 h-16 rounded-lg overflow-hidden bg-ui-200 mr-3">
                      {recipe.imageUrl ? (
                        <Image
                          source={{ uri: recipe.imageUrl }}
                          contentFit="cover"
                          className="w-full h-full"
                        />
                      ) : (
                        <View className="w-full h-full items-center justify-center">
                          <Text className="text-2xl">🍽️</Text>
                        </View>
                      )}
                    </View>

                    {/* Info */}
                    <View className="flex-1">
                      <Text
                        className="text-base font-semibold text-ui-900"
                        numberOfLines={1}
                      >
                        {recipe.nameIt}
                      </Text>
                      <View className="flex-row items-center gap-3 mt-1">
                        <Text className="text-sm text-brand-500 font-medium">
                          {recipe.kcalPer100g} kcal/100g
                        </Text>
                        {recipe.totalTimeMin && (
                          <Text className="text-xs text-ui-400">
                            ⏱ {recipe.totalTimeMin}min
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Select button */}
                    <View className="bg-brand-500 px-3 py-1.5 rounded-lg">
                      <Text className="text-white text-sm font-medium">
                        Scegli
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
